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

    const coursWithStats = coursList.map((c) => {
      const heuresEffectuees = c.seances.reduce((acc, s) => acc + s.nombreHeures, 0);
      return {
        ...c,
        heuresEffectuees,
        heuresRestantes: Math.max(0, c.volumeHoraire - heuresEffectuees),
        progression:
          c.volumeHoraire > 0
            ? Math.min(100, Math.round((heuresEffectuees / c.volumeHoraire) * 100))
            : 0,
      };
    });

    return NextResponse.json(coursWithStats);
  } catch (error) {
    console.error("Erreur GET cours classe:", error);
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

    // Si matiereId n'est pas fourni, on recherche par code ou on crée la matière au catalogue
    if (!targetMatiereId) {
      if (!code || !nom) {
        return NextResponse.json(
          { error: "Veuillez sélectionner une matière ou saisir un code et un intitulé." },
          { status: 400 }
        );
      }

      const cleanCode = code.trim().toUpperCase();
      let matiere = await prisma.matiere.findUnique({
        where: { code: cleanCode },
      });

      if (!matiere) {
        // Créer la nouvelle matière au catalogue
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

    // Vérifier si la matière existe
    const targetMatiere = await prisma.matiere.findUnique({
      where: { id: targetMatiereId },
    });

    if (!targetMatiere) {
      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    // Vérifier si ce cours est déjà programmé dans cette classe
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

    // Déterminer l'enseignant qui donne ce cours :
    // Règle stricte : un enseignant ne peut assigner un cours qu'à lui-même
    let assignedTeacherId = enseignantId;
    if (session.role === "ENSEIGNANT") {
      assignedTeacherId = session.userId;
    } else if (!assignedTeacherId) {
      // Pour l'administration : enseignant responsable par défaut
      assignedTeacherId = targetMatiere.enseignantId || null;
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
      ...nouveauCours,
      // Alias pour compatibilité
      code: nouveauCours.matiere.code,
      nom: nouveauCours.matiere.nom,
      description: nouveauCours.matiere.description,
      heuresEffectuees: 0,
      heuresRestantes: volH,
      progression: 0,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Erreur POST cours classe:", error);
    return NextResponse.json({ error: "Erreur lors de la programmation du cours" }, { status: 500 });
  }
}
