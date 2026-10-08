import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get("all") === "true";

    let whereClause: Record<string, unknown> = {};

    if (session?.role === "CHEF_CLASSE" && session.classeId) {
      whereClause = { id: session.classeId };
    } else if (session?.role === "ENSEIGNANT" && !getAll) {
      // Pour l'appel (présences) et les notes : strictement les classes où l'enseignant a un cours
      whereClause = {
        cours: {
          some: {
            enseignantId: session.userId,
          },
        },
      };
    }

    const classes = await prisma.classe.findMany({
      where: whereClause,
      include: {
        cours: {
          where:
            session?.role === "ENSEIGNANT" && !getAll
              ? { enseignantId: session.userId }
              : undefined,
          include: {
            matiere: true,
            enseignant: {
              select: { id: true, nom: true, email: true, username: true },
            },
            seances: {
              select: { id: true, nombreHeures: true },
            },
          },
          orderBy: { matiere: { nom: "asc" } },
        },
        chefsClasse: {
          select: { id: true, username: true, nom: true },
        },
        _count: {
          select: { etudiants: true, cours: true },
        },
      },
      orderBy: { code: "asc" },
    });

    // Fournir matieres pour rétrocompatibilité totale
    const formatted = classes.map((c) => {
      const matieres = c.cours.map((co) => ({
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
      }));

      return {
        ...c,
        cours: c.cours,
        matieres,
        _count: {
          ...c._count,
          cours: c.cours.length,
          matieres: c.cours.length,
        },
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Erreur GET classes:", error);
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

    const { code, nom, anneeScolaire } = await request.json();

    if (!code || !nom || !anneeScolaire) {
      return NextResponse.json(
        { error: "Tous les champs (Code, Nom, Année) sont obligatoires." },
        { status: 400 }
      );
    }

    const existing = await prisma.classe.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Une classe avec ce code existe déjà." },
        { status: 400 }
      );
    }

    const nouvelleClasse = await prisma.classe.create({
      data: {
        code: code.trim().toUpperCase(),
        nom: nom.trim(),
        anneeScolaire: anneeScolaire.trim(),
        creeParId: session.userId,
      },
    });

    return NextResponse.json(nouvelleClasse, { status: 201 });
  } catch (error) {
    console.error("Erreur POST classe:", error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
