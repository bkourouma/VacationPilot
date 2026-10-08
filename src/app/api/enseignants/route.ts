import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const enseignants = await prisma.user.findMany({
      where: {
        role: { in: ["ENSEIGNANT", "ADMINISTRATION"] },
      },
      select: {
        id: true,
        nom: true,
        email: true,
        username: true,
        role: true,
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json(enseignants);
  } catch (error) {
    console.error("Erreur GET enseignants:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
