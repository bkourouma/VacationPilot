import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classeId = searchParams.get("classeId");
    const mine = searchParams.get("mine") === "true";

    const whereClause: Record<string, unknown> = {};
    if (classeId) {
      whereClause.classeId = classeId;
    } else if (mine && session.role === "ENSEIGNANT") {
      whereClause.classe = {
        matieres: { some: { enseignantId: session.userId } },
      };
    }

    const etudiants = await prisma.etudiant.findMany({
      where: whereClause,
      include: {
        classe: true,
        _count: {
          select: { presences: true, notes: true },
        },
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json(etudiants);
  } catch (error) {
    console.error("Erreur GET etudiants:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Support de la saisie en masse (tableau d'étudiants)
    if (Array.isArray(body.etudiants)) {
      const { etudiants, classeId } = body;
      if (!classeId) {
        return NextResponse.json({ error: "L'identifiant de la classe est requis." }, { status: 400 });
      }

      // Vérification que la classe existe bien dans l'établissement
      const targetClasse = await prisma.classe.findUnique({ where: { id: classeId } });
      if (!targetClasse) {
        return NextResponse.json({ error: "La classe de destination n'existe pas." }, { status: 404 });
      }

      let createdCount = 0;
      let updatedCount = 0;
      let errorsCount = 0;

      // Récupération du plus grand matricule numérique existant pour continuité
      const allMatricules = await prisma.etudiant.findMany({ select: { matricule: true } });
      let nextNum = 34000;
      for (const m of allMatricules) {
        const num = parseInt(m.matricule, 10);
        if (!isNaN(num) && num > nextNum) {
          nextNum = num;
        }
      }

      for (let i = 0; i < etudiants.length; i++) {
        const item = etudiants[i];
        const nom = item.nom?.trim();
        const prenom = item.prenom?.trim() || "";
        if (!nom) continue;

        // Génération automatique d'un matricule si absent
        let matricule = item.matricule?.trim().toUpperCase();
        if (!matricule) {
          nextNum++;
          matricule = String(nextNum);
        }

        try {
          const existing = await prisma.etudiant.findUnique({
            where: { matricule },
          });

          if (existing) {
            await prisma.etudiant.update({
              where: { id: existing.id },
              data: {
                nom,
                prenom,
                contact: item.contact ? item.contact.trim() : existing.contact,
                email: item.email ? item.email.trim() : existing.email,
                classeId,
              },
            });
            updatedCount++;
          } else {
            await prisma.etudiant.create({
              data: {
                matricule,
                nom,
                prenom,
                contact: item.contact ? item.contact.trim() : null,
                email: item.email ? item.email.trim() : null,
                classeId,
              },
            });
            createdCount++;
          }
        } catch (e) {
          console.error("Erreur lors de l'insertion de l'étudiant:", e);
          errorsCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `${createdCount} auditeur(s) inscrit(s) avec succès${
          updatedCount > 0 ? ` (${updatedCount} mis à jour)` : ""
        }.`,
        createdCount,
        updatedCount,
        errorsCount,
      });
    }

    // Cas standard : un seul étudiant
    const { matricule: rawMatricule, nom, prenom, contact, email, classeId } = body;

    if (!nom || !classeId) {
      return NextResponse.json(
        { error: "Le nom et la classe sont obligatoires." },
        { status: 400 }
      );
    }

    const targetClasse = await prisma.classe.findUnique({ where: { id: classeId } });
    if (!targetClasse) {
      return NextResponse.json({ error: "La classe spécifiée n'existe pas." }, { status: 404 });
    }

    let matricule = rawMatricule?.trim().toUpperCase();
    if (!matricule) {
      // Génération automatique de matricule si non renseigné
      const allMatricules = await prisma.etudiant.findMany({ select: { matricule: true } });
      let nextNum = 34000;
      for (const m of allMatricules) {
        const num = parseInt(m.matricule, 10);
        if (!isNaN(num) && num > nextNum) {
          nextNum = num;
        }
      }
      matricule = String(nextNum + 1);
    }

    const existing = await prisma.etudiant.findUnique({
      where: { matricule },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Un étudiant avec le matricule ${matricule} existe déjà (${existing.nom} ${existing.prenom}).` },
        { status: 400 }
      );
    }

    const etudiant = await prisma.etudiant.create({
      data: {
        matricule,
        nom: nom.trim(),
        prenom: prenom ? prenom.trim() : "",
        contact: contact ? contact.trim() : null,
        email: email ? email.trim() : null,
        classeId,
      },
      include: { classe: true },
    });

    return NextResponse.json(etudiant, { status: 201 });
  } catch (error) {
    console.error("Erreur POST etudiant:", error);
    return NextResponse.json({ error: "Erreur lors de l'ajout" }, { status: 500 });
  }
}
