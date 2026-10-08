import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

import bcrypt from "bcryptjs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nom, username, password, classeId } = body;

    const dataToUpdate: {
      nom?: string;
      username?: string;
      classeId?: string | null;
      motDePasse?: string;
    } = {};

    if (nom) dataToUpdate.nom = nom.trim();
    if (username) dataToUpdate.username = username.trim().toLowerCase();
    if (classeId !== undefined) dataToUpdate.classeId = classeId || null;

    if (password && password.trim().length > 0) {
      dataToUpdate.motDePasse = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        nom: true,
        username: true,
        role: true,
        classeId: true,
        classe: {
          select: { id: true, code: true, nom: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erreur PUT chef:", error);
    return NextResponse.json({ error: "Erreur modification chef" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Chef de classe supprimé." });
  } catch (error) {
    console.error("Erreur DELETE chef:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}

