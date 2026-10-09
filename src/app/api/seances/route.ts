import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveProgressionForSeance } from "@/lib/seance-progression";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Un chef de classe ne voit que les séances de sa propre classe
    if (session.role === "CHEF_CLASSE" && !session.classeId) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const coursId = searchParams.get("coursId");
    const matiereId = searchParams.get("matiereId");
    const classeId = searchParams.get("classeId");
    const enseignantId = searchParams.get("enseignantId");

    let whereClause: Record<string, unknown> = {};

    if (coursId) {
      whereClause.coursId = coursId;
    } else if (matiereId) {
      whereClause.cours = {
        OR: [{ id: matiereId }, { matiereId: matiereId }],
        ...(classeId ? { classeId } : {}),
      };
    } else if (classeId) {
      whereClause.cours = {
        classeId,
        ...(session?.role === "ENSEIGNANT"
          ? { enseignantId: session.userId }
          : enseignantId
          ? { enseignantId }
          : {}),
      };
    } else if (session?.role === "ENSEIGNANT") {
      whereClause.cours = {
        enseignantId: session.userId,
      };
    }

    if (session.role === "CHEF_CLASSE") {
      whereClause = {
        AND: [whereClause, { cours: { classeId: session.classeId } }],
      };
    }

    const seances = await prisma.seance.findMany({
      where: whereClause,
      include: {
        cours: {
          include: {
            matiere: {
              include: {
                chapitres: { orderBy: { ordre: "asc" } },
              },
            },
            classe: true,
            enseignant: {
              select: { id: true, nom: true, email: true },
            },
          },
        },
        creePar: {
          select: { nom: true, role: true },
        },
        chapitres: {
          include: {
            chapitre: true,
          },
        },
        sousChapitreValidations: {
          include: {
            sousChapitre: true,
          },
        },
        presences: {
          include: {
            etudiant: {
              select: { id: true, matricule: true, nom: true, prenom: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formatted = seances.map((s) => ({
      ...s,
      matiereId: s.coursId,
      matiere: {
        id: s.cours.id,
        code: s.cours.matiere.code,
        nom: s.cours.matiere.nom,
        classeId: s.cours.classeId,
        classe: s.cours.classe,
        enseignantId: s.cours.enseignantId,
        enseignant: s.cours.enseignant,
        coefficient: s.cours.coefficient,
        volumeHoraire: s.cours.volumeHoraire,
      },
      chapitresCouverts: s.chapitres.map((sc) => sc.chapitre),
      sousChapitresCouverts: s.sousChapitreValidations.map((scv) => scv.sousChapitre),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Erreur GET seances:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Cherche une séance identique (même cours, même date, mêmes horaires) pour éviter les doublons
async function trouverSeanceIdentique(
  coursId: string,
  date: string,
  heureDebut?: string | null,
  heureFin?: string | null
) {
  return prisma.seance.findFirst({
    where: {
      coursId,
      date: new Date(date),
      heureDebut: heureDebut || null,
      heureFin: heureFin || null,
    },
    select: { id: true },
  });
}

const MESSAGE_SEANCE_EN_DOUBLE =
  "Une séance identique existe déjà pour ce cours (même date et mêmes horaires). Modifiez-la depuis l'historique au lieu d'en créer une seconde.";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await request.json();

    // Mode BATCH : création de plusieurs séances en une seule transaction
    if (body.batch && Array.isArray(body.seances) && body.seances.length > 0) {
      const seancesToCreate = body.seances;
      const firstTargetId = seancesToCreate[0].coursId || seancesToCreate[0].matiereId;

      const cours = await prisma.cours.findFirst({
        where: {
          OR: [{ id: firstTargetId }, { matiereId: firstTargetId }],
        },
        include: { classe: true },
      });

      if (!cours) {
        return NextResponse.json({ error: "Cours / Matière non trouvé." }, { status: 404 });
      }

      if (session.role === "CHEF_CLASSE" && session.classeId !== cours.classeId) {
        return NextResponse.json(
          { error: "Vous n'avez pas le droit de saisir les présences pour cette classe." },
          { status: 403 }
        );
      }

      for (const item of seancesToCreate) {
        const itemTargetId = item.coursId || item.matiereId || cours.id;
        const coursItem =
          itemTargetId === firstTargetId
            ? cours
            : await prisma.cours.findFirst({
                where: { OR: [{ id: itemTargetId }, { matiereId: itemTargetId }] },
              });
        if (
          coursItem &&
          (await trouverSeanceIdentique(coursItem.id, item.date, item.heureDebut, item.heureFin))
        ) {
          return NextResponse.json({ error: MESSAGE_SEANCE_EN_DOUBLE }, { status: 409 });
        }
      }

      const createdSeances = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const item of seancesToCreate) {
          const itemTargetId = item.coursId || item.matiereId || cours.id;
          let actualCoursId = cours.id;

          if (itemTargetId !== firstTargetId) {
            const itemCours = await tx.cours.findFirst({
              where: { OR: [{ id: itemTargetId }, { matiereId: itemTargetId }] },
            });
            if (itemCours) actualCoursId = itemCours.id;
          }

          const seance = await tx.seance.create({
            data: {
              date: new Date(item.date),
              heureDebut: item.heureDebut || null,
              heureFin: item.heureFin || null,
              nombreHeures: parseFloat(item.nombreHeures) || 1.0,
              description: item.description || null,
              coursId: actualCoursId,
              creeParId: session.userId,
            },
          });

          if (Array.isArray(item.presences) && item.presences.length > 0) {
            await tx.presence.createMany({
              data: item.presences.map((p: { etudiantId: string; statut?: string; remarque?: string }) => ({
                seanceId: seance.id,
                etudiantId: p.etudiantId,
                statut: p.statut || "PRESENT",
                remarque: p.remarque || null,
              })),
            });
          }

          await saveProgressionForSeance(
            tx,
            seance.id,
            actualCoursId,
            new Date(item.date),
            item.chapitreIds,
            item.sousChapitreIds
          );

          results.push(seance);
        }
        return results;
      });

      return NextResponse.json(
        {
          success: true,
          message: `${createdSeances.length} séance(s) enregistrée(s) avec succès.`,
          seances: createdSeances,
        },
        { status: 201 }
      );
    }

    // Mode STANDARD : création d'une seule séance
    const {
      coursId,
      matiereId,
      date,
      heureDebut,
      heureFin,
      nombreHeures,
      description,
      presences,
      chapitreIds,
      sousChapitreIds,
    } = body;

    const targetId = coursId || matiereId;

    if (!targetId || !date) {
      return NextResponse.json(
        { error: "Le cours/matière et la date sont obligatoires." },
        { status: 400 }
      );
    }

    const cours = await prisma.cours.findFirst({
      where: {
        OR: [{ id: targetId }, { matiereId: targetId }],
      },
      include: { classe: true },
    });

    if (!cours) {
      return NextResponse.json({ error: "Cours / Matière non trouvé." }, { status: 404 });
    }

    if (session.role === "CHEF_CLASSE" && session.classeId !== cours.classeId) {
      return NextResponse.json(
        { error: "Vous n'avez pas le droit de saisir les présences pour cette classe." },
        { status: 403 }
      );
    }

    if (await trouverSeanceIdentique(cours.id, date, heureDebut, heureFin)) {
      return NextResponse.json({ error: MESSAGE_SEANCE_EN_DOUBLE }, { status: 409 });
    }

    const parsedNbHeures = parseFloat(nombreHeures) || 2.0;
    const parsedDate = new Date(date);

    const resultat = await prisma.$transaction(async (tx) => {
      const seance = await tx.seance.create({
        data: {
          date: parsedDate,
          heureDebut: heureDebut || null,
          heureFin: heureFin || null,
          nombreHeures: parsedNbHeures,
          description: description || null,
          coursId: cours.id,
          creeParId: session.userId,
        },
      });

      if (Array.isArray(presences) && presences.length > 0) {
        await tx.presence.createMany({
          data: presences.map((p: { etudiantId: string; statut?: string; remarque?: string }) => ({
            seanceId: seance.id,
            etudiantId: p.etudiantId,
            statut: p.statut || "PRESENT",
            remarque: p.remarque || null,
          })),
        });
      }

      await saveProgressionForSeance(
        tx,
        seance.id,
        cours.id,
        parsedDate,
        chapitreIds,
        sousChapitreIds
      );

      return seance;
    });

    return NextResponse.json(resultat, { status: 201 });
  } catch (error) {
    console.error("Erreur POST seance:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la séance." },
      { status: 500 }
    );
  }
}
