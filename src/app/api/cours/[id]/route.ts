import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const cours = await prisma.cours.findUnique({
      where: { id },
      include: {
        matiere: true,
        classe: true,
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
        seances: {
          orderBy: { date: "desc" },
          include: {
            presences: true,
          },
        },
        evaluations: {
          orderBy: { date: "desc" },
          include: {
            notes: true,
          },
        },
      },
    });

    if (!cours) {
      return NextResponse.json({ error: "Cours non trouvé." }, { status: 404 });
    }

    const heuresEffectuees = cours.seances.reduce((acc, s) => acc + s.nombreHeures, 0);

    return NextResponse.json({
      ...cours,
      heuresEffectuees,
      heuresRestantes: Math.max(0, cours.volumeHoraire - heuresEffectuees),
      progression:
        cours.volumeHoraire > 0
          ? Math.min(100, Math.round((heuresEffectuees / cours.volumeHoraire) * 100))
          : 0,
    });
  } catch (error) {
    console.error("Erreur GET cours by ID:", error);
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
    const cours = await prisma.cours.findUnique({
      where: { id },
      include: { matiere: true },
    });

    if (!cours) {
      return NextResponse.json({ error: "Cours non trouvé." }, { status: 404 });
    }

    // Autoriser si admin ou si c'est l'enseignant assigné ou si aucun enseignant n'est assigné
    if (
      session.role === "ENSEIGNANT" &&
      cours.enseignantId &&
      cours.enseignantId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Vous n'avez pas l'autorisation de modifier ce cours." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { coefficient, volumeHoraire, enseignantId, code, nom, description } = body;

    const updated = await prisma.cours.update({
      where: { id },
      data: {
        coefficient: coefficient !== undefined ? parseFloat(coefficient) : undefined,
        volumeHoraire: volumeHoraire !== undefined ? parseFloat(volumeHoraire) : undefined,
        enseignantId:
          session.role === "ADMINISTRATION" && enseignantId !== undefined
            ? enseignantId || null
            : undefined,
      },
      include: {
        matiere: true,
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
      },
    });

    if (code || nom || description !== undefined) {
      await prisma.matiere.update({
        where: { id: cours.matiereId },
        data: {
          code: code ? code.trim().toUpperCase() : undefined,
          nom: nom ? nom.trim() : undefined,
          description: description !== undefined ? description?.trim() || null : undefined,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT cours:", error);
    return NextResponse.json({ error: "Erreur modification cours" }, { status: 500 });
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
    const cours = await prisma.cours.findUnique({
      where: { id },
      include: {
        _count: { select: { seances: true, evaluations: true } },
      },
    });

    if (!cours) {
      return NextResponse.json({ error: "Cours non trouvé." }, { status: 404 });
    }

    if (
      session.role === "ENSEIGNANT" &&
      cours.enseignantId &&
      cours.enseignantId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer le cours d'un autre enseignant." },
        { status: 403 }
      );
    }

    await prisma.cours.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Cours retiré de la classe avec succès." });
  } catch (error) {
    console.error("Erreur DELETE cours:", error);
    return NextResponse.json({ error: "Erreur suppression cours" }, { status: 500 });
  }
}
