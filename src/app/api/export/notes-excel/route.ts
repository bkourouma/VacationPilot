import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classeId = searchParams.get("classeId");
    const matiereId = searchParams.get("matiereId");

    if (!classeId) {
      return NextResponse.json({ error: "classeId requis" }, { status: 400 });
    }

    const classe = await prisma.classe.findUnique({
      where: { id: classeId },
      include: {
        etudiants: { orderBy: { nom: "asc" } },
      },
    });

    if (!classe) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    const whereEval: Record<string, unknown> = {
      cours: {
        classeId,
        ...(matiereId ? { OR: [{ id: matiereId }, { matiereId: matiereId }] } : {}),
      },
    };

    const evaluations = await prisma.evaluation.findMany({
      where: whereEval,
      include: {
        cours: {
          include: { matiere: true },
        },
        notes: true,
      },
      orderBy: { date: "asc" },
    });

    const rowTitre = [`Relevé de Notes - ${classe.nom} (${classe.anneeScolaire})`];
    const rowCoefs = [
      "",
      "Coefficients",
      ...evaluations.map((ev) => `Coef ${ev.coefficient} (/${ev.noteMax})`),
      "",
    ];

    const rowHeaders = [
      "Matricule",
      "Nom et Prénom",
      ...evaluations.map((ev) => `${ev.titre} (${ev.cours.matiere.code})`),
      "Moyenne (/20)",
    ];

    const dataRows = classe.etudiants.map((etudiant) => {
      let totalPondere = 0;
      let totalCoef = 0;

      const evalNotes = evaluations.map((ev) => {
        const n = ev.notes.find((note) => note.etudiantId === etudiant.id);
        if (n && n.valeur !== null) {
          totalPondere += (n.valeur / ev.noteMax) * 20 * ev.coefficient;
          totalCoef += ev.coefficient;
          return n.valeur;
        }
        return "-";
      });

      const moyenne =
        totalCoef > 0 ? (Math.round((totalPondere / totalCoef) * 100) / 100).toFixed(2) : "-";

      return [
        etudiant.matricule,
        `${etudiant.nom} ${etudiant.prenom}`.trim(),
        ...evalNotes,
        moyenne,
      ];
    });

    const worksheetData = [rowTitre, [], rowCoefs, rowHeaders, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const colWidths = [
      { wch: 14 },
      { wch: 32 },
      ...evaluations.map(() => ({ wch: 18 })),
      { wch: 16 },
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notes");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Notes_${classe.code}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erreur export Excel notes:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
