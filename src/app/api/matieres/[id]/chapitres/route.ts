import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const matiere = await prisma.matiere.findUnique({
      where: { id },
      include: {
        chapitres: {
          orderBy: { ordre: "asc" },
          include: {
            sousChapitres: {
              orderBy: { ordre: "asc" },
            },
          },
        },
      },
    });

    if (!matiere) {
      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    return NextResponse.json({
      matiere: {
        id: matiere.id,
        code: matiere.code,
        nom: matiere.nom,
      },
      chapitres: matiere.chapitres,
    });
  } catch (error) {
    console.error("Erreur GET chapitres matiere:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const { id: matiereId } = await params;
    const matiere = await prisma.matiere.findUnique({
      where: { id: matiereId },
    });

    if (!matiere) {
      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    const body = await request.json();

    // Mode BATCH : remplacement ou enregistrement d'une liste de chapitres
    if (Array.isArray(body.chapitres)) {
      const { chapitres, replaceAll = true } = body;

      if (chapitres.length === 0) {
        return NextResponse.json(
          { error: "La liste des chapitres ne peut pas être vide." },
          { status: 400 }
        );
      }

      // Un chapitre ou sous-chapitre qui garde le même titre est mis à jour sur place :
      // sa progression déjà validée est conservée. Seuls les éléments retirés de la liste
      // (ou dont le titre change) sont supprimés ou recréés.
      const normaliser = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

      const result = await prisma.$transaction(async (tx) => {
        const existants = replaceAll
          ? await tx.chapitre.findMany({
              where: { matiereId },
              include: { sousChapitres: true },
            })
          : [];
        const nonReutilises = new Set(existants.map((c) => c.id));

        const created = [];
        for (let i = 0; i < chapitres.length; i++) {
          const item = chapitres[i];
          if (!item.titre || !item.titre.trim()) continue;

          const num = item.numero !== undefined ? parseInt(item.numero) : i + 1;
          const ord = item.ordre !== undefined ? parseInt(item.ordre) : i + 1;
          const numero = isNaN(num) ? i + 1 : num;
          const ordre = isNaN(ord) ? i + 1 : ord;
          const titre = item.titre.trim();
          const description = item.description?.trim() || null;

          const rawSousChapitres = Array.isArray(item.sousChapitres) ? item.sousChapitres : [];
          const sousChapitresData = rawSousChapitres
            .map((sc: unknown, scIdx: number) => {
              const scTitle =
                typeof sc === "string"
                  ? sc.trim()
                  : typeof sc === "object" && sc !== null && "titre" in sc
                  ? String((sc as { titre: unknown }).titre || "").trim()
                  : "";
              return scTitle ? { titre: scTitle, ordre: scIdx + 1 } : null;
            })
            .filter(Boolean) as Array<{ titre: string; ordre: number }>;

          const existant = existants.find(
            (c) => nonReutilises.has(c.id) && normaliser(c.titre) === normaliser(titre)
          );

          if (existant) {
            nonReutilises.delete(existant.id);
            await tx.chapitre.update({
              where: { id: existant.id },
              data: { numero, ordre, description },
            });

            const sousNonReutilises = new Set(existant.sousChapitres.map((sc) => sc.id));
            let sousAjoutes = false;
            for (const sc of sousChapitresData) {
              const sousExistant = existant.sousChapitres.find(
                (e) => sousNonReutilises.has(e.id) && normaliser(e.titre) === normaliser(sc.titre)
              );
              if (sousExistant) {
                sousNonReutilises.delete(sousExistant.id);
                await tx.sousChapitre.update({
                  where: { id: sousExistant.id },
                  data: { ordre: sc.ordre },
                });
              } else {
                sousAjoutes = true;
                await tx.sousChapitre.create({
                  data: { chapitreId: existant.id, titre: sc.titre, ordre: sc.ordre },
                });
              }
            }
            if (sousNonReutilises.size > 0) {
              await tx.sousChapitre.deleteMany({ where: { id: { in: [...sousNonReutilises] } } });
            }
            // Un sous-chapitre ajouté à un chapitre déjà validé le rend de nouveau incomplet
            if (sousAjoutes) {
              await tx.coursChapitreValidation.deleteMany({ where: { chapitreId: existant.id } });
            }

            created.push(
              await tx.chapitre.findUniqueOrThrow({
                where: { id: existant.id },
                include: { sousChapitres: { orderBy: { ordre: "asc" } } },
              })
            );
            continue;
          }

          const chap = await tx.chapitre.create({
            data: {
              matiereId,
              numero,
              titre,
              description,
              ordre,
              sousChapitres:
                sousChapitresData.length > 0
                  ? {
                      create: sousChapitresData,
                    }
                  : undefined,
            },
            include: {
              sousChapitres: {
                orderBy: { ordre: "asc" },
              },
            },
          });
          created.push(chap);
        }

        // Chapitres retirés de la liste : suppression (leurs validations suivent en cascade)
        if (nonReutilises.size > 0) {
          await tx.chapitre.deleteMany({ where: { id: { in: [...nonReutilises] } } });
        }

        return created;
      });

      return NextResponse.json(
        {
          success: true,
          message: `${result.length} chapitre(s) enregistré(s) avec succès.`,
          chapitres: result,
        },
        { status: 201 }
      );
    }

    // Mode UNIQUE : ajout d'un seul chapitre
    const { titre, description, numero, ordre, sousChapitres } = body;

    if (!titre || !titre.trim()) {
      return NextResponse.json(
        { error: "Le titre du chapitre est obligatoire." },
        { status: 400 }
      );
    }

    const currentCount = await prisma.chapitre.count({
      where: { matiereId },
    });

    const rawSousChapitres = Array.isArray(sousChapitres) ? sousChapitres : [];
    const sousChapitresData = rawSousChapitres
      .map((sc: unknown, scIdx: number) => {
        const scTitle =
          typeof sc === "string"
            ? sc.trim()
            : typeof sc === "object" && sc !== null && "titre" in sc
            ? String((sc as { titre: unknown }).titre || "").trim()
            : "";
        return scTitle ? { titre: scTitle, ordre: scIdx + 1 } : null;
      })
      .filter(Boolean) as Array<{ titre: string; ordre: number }>;

    const nouveauChapitre = await prisma.chapitre.create({
      data: {
        matiereId,
        numero: numero !== undefined ? parseInt(numero) : currentCount + 1,
        titre: titre.trim(),
        description: description?.trim() || null,
        ordre: ordre !== undefined ? parseInt(ordre) : currentCount + 1,
        sousChapitres:
          sousChapitresData.length > 0
            ? {
                create: sousChapitresData,
              }
            : undefined,
      },
      include: {
        sousChapitres: {
          orderBy: { ordre: "asc" },
        },
      },
    });

    return NextResponse.json(nouveauChapitre, { status: 201 });
  } catch (error) {
    console.error("Erreur POST chapitre(s):", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement des chapitres." },
      { status: 500 }
    );
  }
}
