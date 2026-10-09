import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  isAnneeAcademiqueValide,
  MESSAGE_ANNEE_ACADEMIQUE,
  validateMaxLength,
} from "@/lib/validation";

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

    if (session.role === "CHEF_CLASSE" && session.classeId !== id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get("all") === "true";

    const isTeacher = session?.role === "ENSEIGNANT" && !getAll;

    const classe = await prisma.classe.findUnique({
      where: { id },
      include: {
        cours: {
          where: isTeacher ? { enseignantId: session?.userId } : undefined,
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
        },
        etudiants: {
          orderBy: { nom: "asc" },
        },
        chefsClasse: {
          select: { id: true, username: true, nom: true },
        },
      },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    // Fournir matieres pour rétrocompatibilité avec les composants existants
    const matieres = classe.cours.map((co) => {
      const heuresEffectuees = co.seances.reduce((acc, s) => acc + s.nombreHeures, 0);
      return {
        id: co.id, // Cours ID (qui sert pour les séances et évaluations de cette classe)
        matiereId: co.matiereId,
        code: co.matiere.code,
        nom: co.matiere.nom,
        description: co.matiere.description,
        coefficient: co.coefficient,
        volumeHoraire: co.volumeHoraire,
        enseignantId: co.enseignantId,
        enseignant: co.enseignant,
        seances: co.seances,
        coursId: co.id,
        heuresEffectuees,
        heuresRestantes: Math.max(0, co.volumeHoraire - heuresEffectuees),
        progression:
          co.volumeHoraire > 0
            ? Math.min(100, Math.round((heuresEffectuees / co.volumeHoraire) * 100))
            : 0,
      };
    });

    return NextResponse.json({
      ...classe,
      matieres,
    });
  } catch (error) {
    console.error("Erreur GET classe by ID:", error);
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
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { code, nom, anneeScolaire } = await request.json();

    const erreurSaisie =
      validateMaxLength(code, "Le code de la classe", 20) ||
      validateMaxLength(nom, "Le nom de la classe", 100) ||
      (anneeScolaire && !isAnneeAcademiqueValide(anneeScolaire)
        ? MESSAGE_ANNEE_ACADEMIQUE
        : null);
    if (erreurSaisie) {
      return NextResponse.json({ error: erreurSaisie }, { status: 400 });
    }

    if (code) {
      const doublon = await prisma.classe.findFirst({
        where: { code: code.trim().toUpperCase(), NOT: { id } },
      });
      if (doublon) {
        return NextResponse.json(
          { error: "Une classe avec ce code existe déjà." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.classe.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        nom: nom ? nom.trim() : undefined,
        anneeScolaire: anneeScolaire ? anneeScolaire.trim() : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT classe:", error);
    return NextResponse.json({ error: "Erreur modification" }, { status: 500 });
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
    await prisma.classe.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Classe supprimée" });
  } catch (error) {
    console.error("Erreur DELETE classe:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
