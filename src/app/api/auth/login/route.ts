import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Identifiant et mot de passe requis." },
        { status: 400 }
      );
    }

    const cleanId = username.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { email: cleanId },
        ],
      },
      include: { classe: true },
    });

    if (!user || !user.motDePasse) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.motDePasse);
    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const token = await signSession({
      userId: user.id,
      username: user.username,
      email: user.email,
      nom: user.nom,
      role: user.role as "ADMINISTRATION" | "ENSEIGNANT" | "CHEF_CLASSE",
      classeId: user.classeId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nom: user.nom,
        role: user.role,
        classeId: user.classeId,
        classe: user.classe,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erreur login:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion." },
      { status: 500 }
    );
  }
}
