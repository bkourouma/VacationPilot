import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { saveProgressionForSeance } from "@/lib/seance-progression";

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
    // Retirer aussi les validations de chapitres et sous-chapitres obtenues grâce à cette séance,
    // sinon la progression resterait faussée après la suppression.
    await prisma.$transaction([
      prisma.coursSousChapitreValidation.deleteMany({ where: { seanceId: id } }),
      prisma.coursChapitreValidation.deleteMany({ where: { seanceId: id } }),
      prisma.seance.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, message: "Séance supprimée." });
  } catch (error) {
    console.error("Erreur DELETE seance:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
