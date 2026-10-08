import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; chapitreId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const { id: matiereId, chapitreId } = await params;
    const existing = await prisma.chapitre.findUnique({
      where: { id: chapitreId },
    });

    if (!existing || existing.matiereId !== matiereId) {
      return NextResponse.json({ error: "Chapitre non trouvé." }, { status: 404 });
    }

    const body = await request.json();
    const { titre, description, numero, ordre } = body;

    const updated = await prisma.chapitre.update({
      where: { id: chapitreId },
      data: {
        titre: titre ? titre.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        numero: numero !== undefined ? parseInt(numero) : undefined,
        ordre: ordre !== undefined ? parseInt(ordre) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT chapitre:", error);
    return NextResponse.json({ error: "Erreur modification chapitre." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; chapitreId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const { id: matiereId, chapitreId } = await params;
    const existing = await prisma.chapitre.findUnique({
      where: { id: chapitreId },
    });

    if (!existing || existing.matiereId !== matiereId) {
      return NextResponse.json({ error: "Chapitre non trouvé." }, { status: 404 });
    }

    await prisma.chapitre.delete({
      where: { id: chapitreId },
    });

    return NextResponse.json({ success: true, message: "Chapitre supprimé avec succès." });
  } catch (error) {
    console.error("Erreur DELETE chapitre:", error);
    return NextResponse.json({ error: "Erreur suppression chapitre." }, { status: 500 });
  }
}
