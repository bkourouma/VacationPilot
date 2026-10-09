import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Matricules proposés en raccourci sur la page d'accueil (mode développement uniquement).
// Le portail étudiant s'ouvre avec le seul matricule : en production, cette liste reste vide.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json([]);
  }

  const etudiants = await prisma.etudiant.findMany({
    select: { matricule: true },
    orderBy: { matricule: "asc" },
    take: 5,
  });

  return NextResponse.json(etudiants.map((e) => e.matricule));
}
