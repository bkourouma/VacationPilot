import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const chefs = await prisma.user.findMany({
      where: { role: "CHEF_CLASSE" },
      select: {
        id: true,
        username: true,
        nom: true,
        classeId: true,
        classe: {
          select: { id: true, code: true, nom: true },
        },
        createdAt: true,
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json(chefs);
  } catch (error) {
    console.error("Erreur GET chefs:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const { username, nom, password, classeId } = await request.json();

    if (!username || !nom || !password || !classeId) {
      return NextResponse.json(
        { error: "Tous les champs (identifiant, nom, mot de passe, classe) sont requis." },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cet identifiant est déjà utilisé." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const chef = await prisma.user.create({
      data: {
        username: cleanUsername,
        nom: nom.trim(),
        motDePasse: hashedPassword,
        role: "CHEF_CLASSE",
        classeId,
      },
      select: {
        id: true,
        username: true,
        nom: true,
        classeId: true,
        classe: true,
      },
    });

    return NextResponse.json(chef, { status: 201 });
  } catch (error) {
    console.error("Erreur POST chef:", error);
    return NextResponse.json({ error: "Erreur lors de la création." }, { status: 500 });
  }
}
