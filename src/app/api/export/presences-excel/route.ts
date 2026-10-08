import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classeId = searchParams.get("classeId");
    const matiereId = searchParams.get("matiereId");

    if (!classeId) {
      return NextResponse.json({ error: "classeId requis" }, { status: 400 });
    }

    if (session.role === "CHEF_CLASSE" && session.classeId !== classeId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
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

    const whereSeance: Record<string, unknown> = {
      cours: {
        classeId,
        ...(matiereId ? { OR: [{ id: matiereId }, { matiereId: matiereId }] } : {}),
      },
    };

    const seances = await prisma.seance.findMany({
      where: whereSeance,
      include: {
        cours: {
          include: { matiere: true },
        },
        presences: true,
      },
      orderBy: { date: "asc" },
    });

    // Construction des en-têtes
    const rowTitre = [`Feuille de Présences - ${classe.nom} (${classe.anneeScolaire})`];
    const rowHeures = ["", "Nombre d'heures", ...seances.map((s) => `${s.nombreHeures}h`), "", "", ""];

    const rowHeaders = [
      "Matricule",
      "Nom et Prénom",
      ...seances.map((s) => {
        const d = new Date(s.date);
        const jour = String(d.getDate()).padStart(2, "0");
        const mois = String(d.getMonth() + 1).padStart(2, "0");
        return `${jour}/${mois} (${s.cours.matiere.code})`;
      }),
      "Total Présences",
      "Total Absences",
      "Taux Assiduité",
    ];

    const dataRows = classe.etudiants.map((etudiant) => {
      let nbPresent = 0;
      let nbAbsent = 0;
      let heuresPresent = 0;
      let heuresTotal = 0;

      const seanceStatuts = seances.map((s) => {
        heuresTotal += s.nombreHeures;
        const p = s.presences.find((pres) => pres.etudiantId === etudiant.id);
        const st = p ? p.statut : "NV";

        if (st === "PRESENT") {
          nbPresent++;
          heuresPresent += s.nombreHeures;
          return "P";
        } else if (st === "RETARD") {
          nbPresent++;
          heuresPresent += s.nombreHeures;
          return "R";
        } else if (st === "JUSTIFIE") {
          nbPresent++;
          heuresPresent += s.nombreHeures;
          return "J";
        } else {
          nbAbsent++;
          return "A";
        }
      });

      const taux =
        heuresTotal > 0 ? `${Math.round((heuresPresent / heuresTotal) * 100)}%` : "100%";

      return [
        etudiant.matricule,
        `${etudiant.nom} ${etudiant.prenom}`.trim(),
        ...seanceStatuts,
        nbPresent,
        nbAbsent,
        taux,
      ];
    });

    const worksheetData = [rowTitre, [], rowHeures, rowHeaders, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    const colWidths = [
      { wch: 14 },
      { wch: 32 },
      ...seances.map(() => ({ wch: 14 })),
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Présences");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Presences_${classe.code}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Erreur export Excel presences:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
