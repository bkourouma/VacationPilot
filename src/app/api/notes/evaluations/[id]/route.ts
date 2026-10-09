import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { validateNumber } from "@/lib/validation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const evaluation = await prisma.evaluation.findUnique({
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
        notes: {
          include: {
            etudiant: true,
          },
        },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Évaluation non trouvée." }, { status: 404 });
    }

    const formatted = {
      ...evaluation,
      matiereId: evaluation.coursId,
      matiere: {
        id: evaluation.cours.id,
        code: evaluation.cours.matiere.code,
        nom: evaluation.cours.matiere.nom,
        classeId: evaluation.cours.classeId,
        classe: evaluation.cours.classe,
      },
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Erreur GET evaluation by ID:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        {
          error:
            "Accès refusé : Seul l'enseignant ou l'administration est autorisé à modifier les notes.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { titre, coefficient, noteMax, date, notes } = await request.json();

    const evaluation = await prisma.evaluation.findUnique({
      where: { id },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Évaluation non trouvée." }, { status: 404 });
    }

    const erreurParametres =
      (coefficient !== undefined && coefficient !== null
        ? validateNumber(coefficient, "Le coefficient", 0.5, 10)
        : null) ||
      (noteMax !== undefined && noteMax !== null
        ? validateNumber(noteMax, "Le barème", 1, 100)
        : null);
    if (erreurParametres) {
      return NextResponse.json({ error: erreurParametres }, { status: 400 });
    }

    const max = noteMax !== undefined ? parseFloat(noteMax) : evaluation.noteMax;

    // Chaque note renseignée doit être un nombre compris entre 0 et le barème
    if (Array.isArray(notes)) {
      for (const n of notes) {
        if (!n.etudiantId || n.valeur === null || n.valeur === undefined || n.valeur === "") {
          continue;
        }
        const erreurNote = validateNumber(n.valeur, `La note "${n.valeur}"`, 0, max);
        if (erreurNote) {
          return NextResponse.json({ error: erreurNote }, { status: 400 });
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluation.update({
        where: { id },
        data: {
          titre: titre ? titre.trim() : undefined,
          coefficient: coefficient !== undefined ? parseFloat(coefficient) : undefined,
          noteMax: max,
          date: date ? new Date(date) : undefined,
        },
      });

      if (Array.isArray(notes)) {
        for (const n of notes) {
          if (!n.etudiantId) continue;

          if (n.valeur === null || n.valeur === undefined || n.valeur === "") {
            await tx.note.deleteMany({
              where: { evaluationId: id, etudiantId: n.etudiantId },
            });
            continue;
          }

          const val = parseFloat(n.valeur);
          if (isNaN(val)) continue;

          await tx.note.upsert({
            where: {
              evaluationId_etudiantId: {
                evaluationId: id,
                etudiantId: n.etudiantId,
              },
            },
            update: {
              valeur: Math.min(Math.max(val, 0), max),
              commentaire: n.commentaire !== undefined ? n.commentaire : undefined,
            },
            create: {
              evaluationId: id,
              etudiantId: n.etudiantId,
              valeur: Math.min(Math.max(val, 0), max),
              commentaire: n.commentaire || null,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Évaluation et notes mises à jour." });
  } catch (error) {
    console.error("Erreur PUT evaluation:", error);
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
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.evaluation.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Évaluation supprimée." });
  } catch (error) {
    console.error("Erreur DELETE evaluation:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
