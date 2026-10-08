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
    const matiere = await prisma.matiere.findUnique({
      where: { id },
      include: {
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
        cours: {
          include: {
            classe: true,
            enseignant: {
              select: { id: true, nom: true, email: true, username: true },
            },
            _count: { select: { seances: true, evaluations: true } },
          },
        },
      },
    });

    if (!matiere) {
      // Vérifier si c'est un coursId
      const cours = await prisma.cours.findUnique({
        where: { id },
        include: {
          matiere: true,
          classe: true,
          enseignant: {
            select: { id: true, nom: true, email: true, username: true },
          },
        },
      });

      if (cours) {
        return NextResponse.json({
          ...cours.matiere,
          coursId: cours.id,
          volumeHoraire: cours.volumeHoraire,
          coefficient: cours.coefficient,
        });
      }

      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    return NextResponse.json(matiere);
  } catch (error) {
    console.error("Erreur GET matiere:", error);
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
    const existing = await prisma.matiere.findUnique({ where: { id } });

    // Si pas trouvé comme Matiere, vérifier si c'est un Cours
    if (!existing) {
      const existingCours = await prisma.cours.findUnique({
        where: { id },
        include: { matiere: true },
      });

      if (existingCours) {
        const body = await request.json();
        const { coefficient, volumeHoraire, code, nom, description, enseignantId } = body;

        // Mettre à jour le cours
        await prisma.cours.update({
          where: { id },
          data: {
            coefficient: coefficient !== undefined ? parseFloat(coefficient) : undefined,
            volumeHoraire: volumeHoraire !== undefined ? parseFloat(volumeHoraire) : undefined,
            enseignantId:
              session.role === "ADMINISTRATION" && enseignantId !== undefined
                ? (enseignantId || null)
                : undefined,
          },
        });

        // Mettre à jour la matière associée si des infos sont fournies
        if (code || nom || description !== undefined) {
          await prisma.matiere.update({
            where: { id: existingCours.matiereId },
            data: {
              code: code ? code.trim().toUpperCase() : undefined,
              nom: nom ? nom.trim() : undefined,
              description: description !== undefined ? description?.trim() || null : undefined,
            },
          });
        }

        return NextResponse.json({ success: true, message: "Cours mis à jour avec succès." });
      }

      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    if (
      session.role === "ENSEIGNANT" &&
      existing.enseignantId &&
      existing.enseignantId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Vous n'avez pas le droit de modifier une matière assignée à un autre enseignant." },
        { status: 403 }
      );
    }

    const { code, nom, description, enseignantId } = await request.json();

    if (!code || !nom) {
      return NextResponse.json(
        { error: "Le code et le nom de la matière sont obligatoires." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanNom = nom.trim();

    // Vérifier si un autre enregistrement utilise déjà ce code
    const duplicate = await prisma.matiere.findFirst({
      where: {
        code: cleanCode,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Le code "${cleanCode}" est déjà utilisé par une autre matière (${duplicate.nom}).` },
        { status: 400 }
      );
    }

    let newEnseignantId = existing.enseignantId;
    if (session.role === "ADMINISTRATION" && enseignantId !== undefined) {
      newEnseignantId = enseignantId || null;
    } else if (session.role === "ENSEIGNANT" && !existing.enseignantId) {
      newEnseignantId = session.userId;
    }

    const updated = await prisma.matiere.update({
      where: { id },
      data: {
        code: cleanCode,
        nom: cleanNom,
        description: description?.trim() || null,
        enseignantId: newEnseignantId,
      },
      include: {
        enseignant: {
          select: { id: true, nom: true, email: true, username: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT matiere:", error);
    return NextResponse.json({ error: "Erreur modification matière" }, { status: 500 });
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
    const existing = await prisma.matiere.findUnique({
      where: { id },
      include: { _count: { select: { cours: true } } },
    });

    if (!existing) {
      // Vérifier si c'est un coursId
      const existingCours = await prisma.cours.findUnique({ where: { id } });
      if (existingCours) {
        if (
          session.role === "ENSEIGNANT" &&
          existingCours.enseignantId &&
          existingCours.enseignantId !== session.userId
        ) {
          return NextResponse.json(
            { error: "Vous ne pouvez pas retirer le cours d'un autre enseignant." },
            { status: 403 }
          );
        }
        await prisma.cours.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Cours retiré de la classe avec succès." });
      }

      return NextResponse.json({ error: "Matière non trouvée." }, { status: 404 });
    }

    if (
      session.role === "ENSEIGNANT" &&
      existing.enseignantId &&
      existing.enseignantId !== session.userId
    ) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer la matière d'un autre enseignant." },
        { status: 403 }
      );
    }

    if (existing._count.cours > 0) {
      return NextResponse.json(
        {
          error: `Impossible de supprimer cette matière car elle est actuellement programmée dans ${existing._count.cours} cours/classe(s). Veuillez d'abord retirer les cours associés dans les classes concernées.`,
        },
        { status: 400 }
      );
    }

    await prisma.matiere.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Matière supprimée avec succès du catalogue." });
  } catch (error) {
    console.error("Erreur DELETE matiere:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
