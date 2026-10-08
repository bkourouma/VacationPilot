import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mineOnly = searchParams.get("mine") === "true";

    const whereClause: Record<string, unknown> = {};
    if (mineOnly && session.role === "ENSEIGNANT") {
      whereClause.enseignantId = session.userId;
    }

    const matieres = await prisma.matiere.findMany({
      where: whereClause,
      include: {
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
        _count: {
          select: { cours: true, chapitres: true },
        },
        cours: {
          include: {
            classe: {
              select: { id: true, code: true, nom: true, anneeScolaire: true },
            },
            enseignant: {
              select: { id: true, nom: true, email: true },
            },
            _count: {
              select: { seances: true },
            },
          },
        },
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json(matieres);
  } catch (error) {
    console.error("Erreur GET matieres:", error);
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
    const { code, nom, description, enseignantId } = body;

    if (!code || !nom) {
      return NextResponse.json(
        { error: "Le code et l'intitulé de la matière sont obligatoires." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanNom = nom.trim();

    // Vérifier unicité du code matière
    const existing = await prisma.matiere.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Une matière avec le code "${cleanCode}" existe déjà (${existing.nom}).` },
        { status: 400 }
      );
    }

    // Affecter à l'enseignant spécifié ou à l'enseignant connecté
    let assignedTeacherId = enseignantId || null;
    if (!assignedTeacherId && session.role === "ENSEIGNANT") {
      assignedTeacherId = session.userId;
    }

    const matiere = await prisma.matiere.create({
      data: {
        code: cleanCode,
        nom: cleanNom,
        description: description?.trim() || null,
        enseignantId: assignedTeacherId,
      },
      include: {
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
      },
    });

    return NextResponse.json(matiere, { status: 201 });
  } catch (error) {
    console.error("Erreur POST matiere:", error);
    return NextResponse.json({ error: "Erreur lors de la création de la matière." }, { status: 500 });
  }
}
