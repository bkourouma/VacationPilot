import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    if (session.role === "CHEF_CLASSE") {
      return NextResponse.json(
        { error: "Accès refusé : Les chefs de classe n'ont aucun droit d'accès aux notes." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const coursId = searchParams.get("coursId");
    const matiereId = searchParams.get("matiereId");
    const classeId = searchParams.get("classeId");

    const whereClause: Record<string, unknown> = {};

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
        ...(session?.role === "ENSEIGNANT" ? { enseignantId: session.userId } : {}),
      };
    } else if (session?.role === "ENSEIGNANT") {
      whereClause.cours = {
        enseignantId: session.userId,
      };
    }

    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      include: {
        cours: {
          include: {
            matiere: true,
            classe: true,
            enseignant: {
              select: { id: true, nom: true, email: true },
            },
          },
        },
        notes: {
          include: {
            etudiant: {
              select: { id: true, matricule: true, nom: true, prenom: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formatted = evaluations.map((ev) => ({
      ...ev,
      matiereId: ev.coursId,
      matiere: {
        id: ev.cours.id,
        code: ev.cours.matiere.code,
        nom: ev.cours.matiere.nom,
        classeId: ev.cours.classeId,
        classe: ev.cours.classe,
        coefficient: ev.cours.coefficient,
        volumeHoraire: ev.cours.volumeHoraire,
      },
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Erreur GET evaluations:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : Seul l'enseignant ou l'administration est autorisé à créer des évaluations et à saisir les notes.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { coursId, matiereId, titre, coefficient, noteMax, date, notes } = body;

    const targetId = coursId || matiereId;

    if (!targetId || !titre) {
      return NextResponse.json(
        { error: "Le cours/matière et le titre de l'évaluation sont requis." },
        { status: 400 }
      );
    }

    const cours = await prisma.cours.findFirst({
      where: {
        OR: [{ id: targetId }, { matiereId: targetId }],
      },
    });

    if (!cours) {
      return NextResponse.json({ error: "Cours / Matière non trouvé." }, { status: 404 });
    }

    const coef = parseFloat(coefficient) || 1.0;
    const max = parseFloat(noteMax) || 20.0;
    const dateEval = date ? new Date(date) : new Date();

    const evaluation = await prisma.$transaction(async (tx) => {
      const ev = await tx.evaluation.create({
        data: {
          titre: titre.trim(),
          coefficient: coef,
          noteMax: max,
          date: dateEval,
          coursId: cours.id,
        },
      });

      if (Array.isArray(notes) && notes.length > 0) {
        for (const n of notes) {
          if (!n.etudiantId || n.valeur === null || n.valeur === undefined || n.valeur === "") {
            continue;
          }
          const val = parseFloat(n.valeur);
          if (isNaN(val)) continue;

          await tx.note.create({
            data: {
              evaluationId: ev.id,
              etudiantId: n.etudiantId,
              valeur: Math.min(Math.max(val, 0), max),
              commentaire: n.commentaire || null,
            },
          });
        }
      }

      return ev;
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error) {
    console.error("Erreur POST evaluation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'évaluation." },
      { status: 500 }
    );
  }
}
