import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get("all") === "true";

    const whereClause: Record<string, unknown> = { classeId: id };

    if (session?.role === "ENSEIGNANT" && !getAll) {
      whereClause.enseignantId = session.userId;
    }

    const coursList = await prisma.cours.findMany({
      where: whereClause,
      include: {
        matiere: true,
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
        seances: {
          select: { id: true, nombreHeures: true, date: true },
        },
      },
      orderBy: { matiere: { nom: "asc" } },
    });

    const matieresWithStats = coursList.map((c) => {
      const heuresEffectuees = c.seances.reduce((acc, s) => acc + s.nombreHeures, 0);
      return {
        id: c.id, // ID du cours pour que les séances et évaluations se lient correctement
        matiereId: c.matiereId,
        code: c.matiere.code,
        nom: c.matiere.nom,
        description: c.matiere.description,
        coefficient: c.coefficient,
        volumeHoraire: c.volumeHoraire,
        enseignantId: c.enseignantId,
        enseignant: c.enseignant,
        seances: c.seances,
        heuresEffectuees,
        heuresRestantes: Math.max(0, c.volumeHoraire - heuresEffectuees),
        progression:
          c.volumeHoraire > 0
            ? Math.min(100, Math.round((heuresEffectuees / c.volumeHoraire) * 100))
            : 0,
      };
    });

    return NextResponse.json(matieresWithStats);
  } catch (error) {
    console.error("Erreur GET matieres (cours):", error);
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

    const { id: classeId } = await params;
    const body = await request.json();
    const {
      matiereId,
      code,
      nom,
      description,
      coefficient,
      volumeHoraire,
      enseignantId,
    } = body;

    const coef = parseFloat(coefficient) || 1.0;
    const volH = parseFloat(volumeHoraire) || 20.0;

    let targetMatiereId = matiereId;

    if (!targetMatiereId) {
      if (!code || !nom) {
        return NextResponse.json(
          { error: "Le code et le nom de la matière sont obligatoires." },
          { status: 400 }
        );
      }

      const cleanCode = code.trim().toUpperCase();
      let matiere = await prisma.matiere.findUnique({
        where: { code: cleanCode },
      });

      if (!matiere) {
        matiere = await prisma.matiere.create({
          data: {
            code: cleanCode,
            nom: nom.trim(),
            description: description?.trim() || null,
            enseignantId:
              session.role === "ENSEIGNANT"
                ? session.userId
                : enseignantId || null,
          },
        });
      }
      targetMatiereId = matiere.id;
    }

    const targetMatiere = await prisma.matiere.findUnique({
      where: { id: targetMatiereId },
    });

    if (!targetMatiere) {
      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    const existingCours = await prisma.cours.findUnique({
      where: {
        classeId_matiereId: {
          classeId,
          matiereId: targetMatiereId,
        },
      },
    });

    if (existingCours) {
      return NextResponse.json(
        { error: "Cette matière est déjà programmée dans cette classe." },
        { status: 400 }
      );
    }

    let assignedTeacherId = enseignantId;
    if (!assignedTeacherId) {
      assignedTeacherId = targetMatiere.enseignantId || (session.role === "ENSEIGNANT" ? session.userId : null);
    }

    const nouveauCours = await prisma.cours.create({
      data: {
        classeId,
        matiereId: targetMatiereId,
        enseignantId: assignedTeacherId,
        coefficient: coef,
        volumeHoraire: volH,
      },
      include: {
        matiere: true,
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
        seances: true,
      },
    });

    const responseData = {
      id: nouveauCours.id,
      matiereId: nouveauCours.matiereId,
      code: nouveauCours.matiere.code,
      nom: nouveauCours.matiere.nom,
      description: nouveauCours.matiere.description,
      coefficient: nouveauCours.coefficient,
      volumeHoraire: nouveauCours.volumeHoraire,
      enseignantId: nouveauCours.enseignantId,
      enseignant: nouveauCours.enseignant,
      seances: nouveauCours.seances,
      heuresEffectuees: 0,
      heuresRestantes: volH,
      progression: 0,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Erreur POST matiere:", error);
    return NextResponse.json({ error: "Erreur création matière/cours" }, { status: 500 });
  }
}
