import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const seance = await prisma.seance.findUnique({
      where: { id },
      include: {
        cours: {
          include: {
            matiere: true,
            classe: {
              include: {
                etudiants: { orderBy: { nom: "asc" } },
              },
            },
          },
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
        creePar: {
          select: { nom: true, role: true },
        },
        presences: {
          include: {
            etudiant: true,
          },
        },
      },
    });

    if (!seance) {
      return NextResponse.json({ error: "Séance non trouvée." }, { status: 404 });
    }

    // Formatage pour rétrocompatibilité
    const formatted = {
      ...seance,
      matiereId: seance.coursId,
      matiere: {
        id: seance.cours.id,
        code: seance.cours.matiere.code,
        nom: seance.cours.matiere.nom,
        classeId: seance.cours.classeId,
        classe: seance.cours.classe,
        coefficient: seance.cours.coefficient,
        volumeHoraire: seance.cours.volumeHoraire,
      },
      chapitresCouverts: seance.chapitres.map((sc) => sc.chapitre),
      sousChapitresCouverts: seance.sousChapitreValidations.map((scv) => scv.sousChapitre),
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Erreur GET seance by ID:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Helper pour enregistrer la progression (chapitres et sous-chapitres) liée à une séance
async function saveProgressionForSeance(
  tx: Prisma.TransactionClient,
  seanceId: string,
  coursId: string,
  parsedDate: Date,
  chapitreIds?: string[],
  sousChapitreIds?: string[]
) {
  const coveredChapitreIds = new Set<string>(chapitreIds || []);

  if (Array.isArray(sousChapitreIds) && sousChapitreIds.length > 0) {
    for (const scId of sousChapitreIds) {
      const sc = await tx.sousChapitre.findUnique({
        where: { id: scId },
        select: { id: true, chapitreId: true },
      });
      if (sc) {
        coveredChapitreIds.add(sc.chapitreId);
        await tx.coursSousChapitreValidation.upsert({
          where: {
            coursId_sousChapitreId: { coursId, sousChapitreId: scId },
          },
          update: {
            valide: true,
            seanceId,
            dateValidation: parsedDate,
          },
          create: {
            coursId,
            sousChapitreId: scId,
            seanceId,
            valide: true,
            dateValidation: parsedDate,
          },
        });
      }
    }
  }

  if (Array.isArray(chapitreIds) && chapitreIds.length > 0) {
    for (const chId of chapitreIds) {
      await tx.coursChapitreValidation.upsert({
        where: {
          coursId_chapitreId: { coursId, chapitreId: chId },
        },
        update: {
          valide: true,
          seanceId,
          dateValidation: parsedDate,
        },
        create: {
          coursId,
          chapitreId: chId,
          seanceId,
          valide: true,
          dateValidation: parsedDate,
        },
      });

      const subs = await tx.sousChapitre.findMany({
        where: { chapitreId: chId },
        select: { id: true },
      });
      for (const sub of subs) {
        await tx.coursSousChapitreValidation.upsert({
          where: {
            coursId_sousChapitreId: { coursId, sousChapitreId: sub.id },
          },
          update: {
            valide: true,
            seanceId,
            dateValidation: parsedDate,
          },
          create: {
            coursId,
            sousChapitreId: sub.id,
            seanceId,
            valide: true,
            dateValidation: parsedDate,
          },
        });
      }
    }
  }

  for (const chId of coveredChapitreIds) {
    await tx.seanceChapitre.upsert({
      where: {
        seanceId_chapitreId: { seanceId, chapitreId: chId },
      },
      update: { statut: "TERMINE" },
      create: {
        seanceId,
        chapitreId: chId,
        statut: "TERMINE",
      },
    });

    const totalSubs = await tx.sousChapitre.count({ where: { chapitreId: chId } });
    if (totalSubs > 0) {
      const validSubs = await tx.coursSousChapitreValidation.count({
        where: {
          coursId,
          valide: true,
          sousChapitre: { chapitreId: chId },
        },
      });
      if (validSubs >= totalSubs) {
        await tx.coursChapitreValidation.upsert({
          where: {
            coursId_chapitreId: { coursId, chapitreId: chId },
          },
          update: {
            valide: true,
            seanceId,
            dateValidation: parsedDate,
          },
          create: {
            coursId,
            chapitreId: chId,
            seanceId,
            valide: true,
            dateValidation: parsedDate,
          },
        });
      }
    }
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { id } = await params;
    const {
      date,
      heureDebut,
      heureFin,
      nombreHeures,
      description,
      presences,
      chapitreIds,
      sousChapitreIds,
    } = await request.json();

    const seance = await prisma.seance.findUnique({
      where: { id },
      include: { cours: true },
    });

    if (!seance) {
      return NextResponse.json({ error: "Séance non trouvée." }, { status: 404 });
    }

    if (session.role === "CHEF_CLASSE" && session.classeId !== seance.cours.classeId) {
      return NextResponse.json(
        { error: "Vous n'avez pas l'autorisation pour cette classe." },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.seance.update({
        where: { id },
        data: {
          date: date ? new Date(date) : undefined,
          heureDebut: heureDebut !== undefined ? heureDebut : undefined,
          heureFin: heureFin !== undefined ? heureFin : undefined,
          nombreHeures: nombreHeures !== undefined ? parseFloat(nombreHeures) : undefined,
          description: description !== undefined ? description : undefined,
        },
      });

      if (Array.isArray(presences)) {
        for (const p of presences) {
          if (!p.etudiantId) continue;
          await tx.presence.upsert({
            where: {
              seanceId_etudiantId: {
                seanceId: id,
                etudiantId: p.etudiantId,
              },
            },
            update: {
              statut: p.statut,
              remarque: p.remarque !== undefined ? p.remarque : undefined,
            },
            create: {
              seanceId: id,
              etudiantId: p.etudiantId,
              statut: p.statut || "PRESENT",
              remarque: p.remarque || null,
            },
          });
        }
      }

      if (chapitreIds !== undefined || sousChapitreIds !== undefined) {
        await tx.seanceChapitre.deleteMany({ where: { seanceId: id } });
        await tx.coursSousChapitreValidation.deleteMany({ where: { seanceId: id } });
        await tx.coursChapitreValidation.deleteMany({ where: { seanceId: id } });

        const parsedDate = date ? new Date(date) : seance.date;
        await saveProgressionForSeance(
          tx,
          id,
          seance.coursId,
          parsedDate,
          chapitreIds,
          sousChapitreIds
        );
      }
    });

    return NextResponse.json({ success: true, message: "Séance mise à jour." });
  } catch (error) {
    console.error("Erreur PUT seance:", error);
    return NextResponse.json({ error: "Erreur mise à jour" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Seul l'enseignant ou l'administration peut supprimer une séance." },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.seance.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Séance supprimée." });
  } catch (error) {
    console.error("Erreur DELETE seance:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
