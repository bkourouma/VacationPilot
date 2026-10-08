import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

function normalizeStr(str: unknown): string {
  return String(str || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function splitFullName(raw: string): { nom: string; prenom: string } {
  const clean = raw.replace(/\u00A0/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { nom: "Auditeur", prenom: "" };
  if (parts.length === 1) return { nom: parts[0].toUpperCase(), prenom: "" };

  // Check if first word is ALL CAPS and subsequent words are not (e.g. "KOUAME Jean-Marc")
  const isFirstAllCaps = parts[0] === parts[0].toUpperCase() && /[A-Z]/.test(parts[0]);
  const isSecondAllCaps = parts[1] === parts[1].toUpperCase() && /[A-Z]/.test(parts[1]);

  if (isFirstAllCaps && !isSecondAllCaps) {
    return { nom: parts[0], prenom: parts.slice(1).join(" ") };
  }

  // Check if last word is ALL CAPS and first words are not (e.g. "Jean-Marc KOUAME")
  const lastIdx = parts.length - 1;
  const isLastAllCaps = parts[lastIdx] === parts[lastIdx].toUpperCase() && /[A-Z]/.test(parts[lastIdx]);
  if (isLastAllCaps && !isFirstAllCaps) {
    return { nom: parts[lastIdx], prenom: parts.slice(0, lastIdx).join(" ") };
  }

  // Common international/biblical/french given names check
  const COMMON_GIVEN_NAMES = new Set([
    "ELISEE", "CEDRIC", "FRANK", "CALEB", "SAMIRATOU", "ISRAEL", "VIANNEY", "ISAAC",
    "JEAN", "MARC", "PIERRE", "PAUL", "ERIC", "ALEXANDRE", "CHRISTIAN", "DANIEL",
    "DAVID", "EMMANUEL", "MICHEL", "STEPHANE", "PATRICK", "YVES", "OLIVIER", "THOMAS",
    "MARIE", "AMIE", "FATOU", "AWA", "AMINATA", "MARIAM", "AICHA", "KADY", "SALIMATA"
  ]);

  if (parts.length === 2) {
    const firstUpper = normalizeStr(parts[0]);
    const secondUpper = normalizeStr(parts[1]);
    if (COMMON_GIVEN_NAMES.has(firstUpper) && !COMMON_GIVEN_NAMES.has(secondUpper)) {
      // e.g. "Elisee Kambire" -> nom: KAMBIRE, prenom: Elisee
      return { nom: parts[1].toUpperCase(), prenom: parts[0] };
    }
  }

  // Default: First word is Nom, subsequent words are Prénoms
  return {
    nom: parts[0].toUpperCase(),
    prenom: parts.slice(1).join(" "),
  };
}

interface ParsedStudent {
  nom: string;
  prenom: string;
  matricule?: string;
  contact?: string | null;
  email?: string | null;
}

interface SheetParseResult {
  sheetName: string;
  headerRowIdx: number;
  dataStartRow: number;
  colNomPrenom: number;
  colNom: number;
  colPrenom: number;
  colMatricule: number;
  colContact: number;
  colEmail: number;
  students: ParsedStudent[];
}

function parseSheet(worksheet: XLSX.WorkSheet, sheetName: string): SheetParseResult | null {
  const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: "",
  });
  if (!rawRows || rawRows.length === 0) return null;

  // Filter completely blank rows
  const rows: { rawIdx: number; cells: (string | number | null)[] }[] = [];
  rawRows.forEach((r, idx) => {
    if (Array.isArray(r) && r.some((c) => String(c ?? "").trim() !== "")) {
      rows.push({ rawIdx: idx, cells: r });
    }
  });

  if (rows.length === 0) return null;

  let headerRowIdx = -1;
  let colMatricule = -1;
  let colNomPrenom = -1;
  let colNom = -1;
  let colPrenom = -1;
  let colContact = -1;
  let colEmail = -1;

  // 1. Scan for explicit header row in the first 25 non-empty rows
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i].cells;
    let foundNom = false;
    let foundMatricule = false;

    row.forEach((cell, colIdx) => {
      const txt = normalizeStr(cell);
      if (!txt) return;

      if (
        txt === "MATRICULE" ||
        txt === "MAT" ||
        txt === "MATR" ||
        txt.includes("CODE APPRENANT") ||
        txt.includes("CODE ETUDIANT") ||
        txt.includes("NUMERO ETUDIANT") ||
        txt === "N° MATRICULE" ||
        txt === "IDENTIFIANT" ||
        txt === "STUDENT ID" ||
        txt === "ID ETUDIANT"
      ) {
        colMatricule = colIdx;
        foundMatricule = true;
      }

      if (
        txt.includes("NOM ET PRENOM") ||
        txt.includes("NOM & PRENOM") ||
        txt.includes("NOMS ET PRENOMS") ||
        txt.includes("NOM ET PRENOMS") ||
        txt.includes("NOM PRENOM") ||
        txt.includes("NOM COMPLET") ||
        txt === "FULL NAME" ||
        txt === "FULLNAME" ||
        txt === "ETUDIANT" ||
        txt === "AUDITEUR" ||
        txt === "APPRENANT" ||
        txt === "ELEVE" ||
        txt === "BENEFICIAIRE" ||
        txt === "PARTICIPANT" ||
        txt === "IDENTITE" ||
        txt.includes("NOM AUDITEUR") ||
        txt.includes("NOM ETUDIANT") ||
        txt === "STUDENT NAME"
      ) {
        colNomPrenom = colIdx;
        foundNom = true;
      } else if (
        txt === "NOM" ||
        txt === "NOMS" ||
        txt === "NOM DE FAMILLE" ||
        txt === "LAST NAME" ||
        txt === "LASTNAME" ||
        txt === "SURNAME" ||
        txt === "FAMILY NAME"
      ) {
        colNom = colIdx;
        foundNom = true;
      } else if (
        txt === "PRENOM" ||
        txt === "PRENOMS" ||
        txt === "FIRST NAME" ||
        txt === "FIRSTNAME" ||
        txt === "GIVEN NAME"
      ) {
        colPrenom = colIdx;
      }

      if (
        txt.includes("CONTACT") ||
        txt.includes("TEL") ||
        txt.includes("PHONE") ||
        txt.includes("MOBILE") ||
        txt.includes("CELL") ||
        txt.includes("WHATSAPP")
      ) {
        colContact = colIdx;
      }

      if (txt.includes("MAIL") || txt.includes("EMAIL") || txt.includes("COURRIEL")) {
        colEmail = colIdx;
      }
    });

    if (foundNom || (foundMatricule && (colNom !== -1 || colNomPrenom !== -1))) {
      headerRowIdx = i;
      break;
    }
  }

  let dataStartRow = 0;
  if (headerRowIdx !== -1) {
    dataStartRow = headerRowIdx + 1;
  } else {
    // 2. Heuristic detection across data rows
    const maxCols = Math.max(...rows.map((r) => r.cells.length));
    const colStats = Array.from({ length: maxCols }, () => ({
      nameScore: 0,
      multiWordCount: 0,
      emailCount: 0,
      phoneCount: 0,
      numberCount: 0,
      values: [] as string[],
    }));

    rows.forEach((r) => {
      r.cells.forEach((val, cIdx) => {
        const str = String(val ?? "").trim();
        if (!str) return;
        colStats[cIdx].values.push(str);

        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
          colStats[cIdx].emailCount++;
          return;
        }

        if (/^[+0-9\s().-]{8,20}$/.test(str) && !/[a-zA-Z]/.test(str)) {
          colStats[cIdx].phoneCount++;
          return;
        }

        if (/^\d+$/.test(str)) {
          colStats[cIdx].numberCount++;
          return;
        }

        // Check if string looks like a person's name
        const letterCount = (str.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
        if (letterCount >= 3 && letterCount / str.length >= 0.6) {
          colStats[cIdx].nameScore++;
          if (str.includes(" ") || str.includes("'")) {
            colStats[cIdx].multiWordCount++;
          }
        }
      });
    });

    // Find candidate name columns
    const candidateNameCols = colStats
      .map((st, idx) => ({ idx, ...st }))
      .filter((st) => st.nameScore >= 2 && st.emailCount < st.nameScore && st.phoneCount < st.nameScore)
      .sort((a, b) => b.nameScore - a.nameScore);

    if (candidateNameCols.length >= 2) {
      // If two distinct name columns are present (e.g. Nom, Prenom)
      const colA = candidateNameCols[0].idx < candidateNameCols[1].idx ? candidateNameCols[0] : candidateNameCols[1];
      const colB = candidateNameCols[0].idx < candidateNameCols[1].idx ? candidateNameCols[1] : candidateNameCols[0];
      if (colA.multiWordCount === 0 || colB.multiWordCount === 0) {
        colNom = colA.idx;
        colPrenom = colB.idx;
      } else {
        colNomPrenom = candidateNameCols[0].idx;
      }
    } else if (candidateNameCols.length === 1) {
      if (candidateNameCols[0].multiWordCount >= candidateNameCols[0].nameScore * 0.3) {
        colNomPrenom = candidateNameCols[0].idx;
      } else {
        colNom = candidateNameCols[0].idx;
      }
    }

    const bestNameIdx = colNomPrenom !== -1 ? colNomPrenom : colNom;

    // Find email and contact columns
    colStats.forEach((st, cIdx) => {
      if (cIdx === colNomPrenom || cIdx === colNom || cIdx === colPrenom) return;
      if (colEmail === -1 && st.emailCount > 0 && st.emailCount >= st.values.length * 0.4) {
        colEmail = cIdx;
      }
      if (colContact === -1 && st.phoneCount > 0 && st.phoneCount >= st.values.length * 0.4) {
        colContact = cIdx;
      }
    });

    // Find matricule column: must be distinct (>= 80% unique), not small repeating attendance numbers (<= 20)
    colStats.forEach((st, cIdx) => {
      if (cIdx === colNomPrenom || cIdx === colNom || cIdx === colPrenom || cIdx === colEmail || cIdx === colContact) return;
      if (st.values.length < 2) return;

      const nonDateValues = st.values.filter((v) => !/^\d{1,2}\/\d{1,2}/.test(v) && !/^\d{4}-\d{2}/.test(v));
      const cleanNumericValues = nonDateValues.map((v) => parseInt(v, 10)).filter((n) => !isNaN(n));

      if (cleanNumericValues.length >= nonDateValues.length * 0.7 && cleanNumericValues.length > 0) {
        const uniqueRatio = new Set(cleanNumericValues).size / cleanNumericValues.length;
        const allSmall = cleanNumericValues.every((n) => n >= 0 && n <= 20);
        const isSequentialCounter =
          cleanNumericValues.length > 2 &&
          cleanNumericValues.every((n, i) => i === 0 || n === cleanNumericValues[i - 1] + 1);

        if (uniqueRatio >= 0.8 && !allSmall && !isSequentialCounter) {
          if (colMatricule === -1) {
            colMatricule = cIdx;
          }
        }
      }
    });

    // Detect if first row is a generic header like "Colonne 1", "Column 1", etc.
    if (rows.length > 0 && bestNameIdx !== -1) {
      const firstVal = normalizeStr(rows[0].cells[bestNameIdx]);
      if (
        firstVal.includes("COLONNE") ||
        firstVal.includes("COLUMN") ||
        firstVal.includes("NOM") ||
        firstVal === "NAME" ||
        firstVal.includes("ENTETE") ||
        firstVal.includes("HEADER")
      ) {
        dataStartRow = 1;
      } else {
        dataStartRow = 0;
      }
    }
  }

  if (colNom === -1 && colNomPrenom === -1) {
    return null;
  }

  // Extract student objects from data rows
  const students: ParsedStudent[] = [];
  for (let i = dataStartRow; i < rows.length; i++) {
    const r = rows[i].cells;
    let nom = "";
    let prenom = "";

    if (colNomPrenom !== -1 && r[colNomPrenom]) {
      const full = String(r[colNomPrenom]).trim();
      const norm = normalizeStr(full);
      // Skip summary / stats / total rows
      if (
        norm === "TOTAL" ||
        norm.startsWith("TOTAL ") ||
        norm === "MOYENNE" ||
        norm.includes("EFFECTIF") ||
        norm.includes("POURCENTAGE") ||
        norm === "SIGNATURE"
      ) {
        continue;
      }

      const split = splitFullName(full);
      nom = split.nom;
      prenom = split.prenom;
    } else if (colNom !== -1 && r[colNom]) {
      const rawNom = String(r[colNom]).trim();
      const norm = normalizeStr(rawNom);
      if (
        norm === "TOTAL" ||
        norm.startsWith("TOTAL ") ||
        norm === "MOYENNE" ||
        norm.includes("EFFECTIF") ||
        norm === "SIGNATURE"
      ) {
        continue;
      }
      nom = rawNom.toUpperCase();
      if (colPrenom !== -1 && r[colPrenom]) {
        prenom = String(r[colPrenom]).trim();
      }
    }

    if (nom) {
      let matricule: string | undefined = undefined;
      if (colMatricule !== -1 && r[colMatricule]) {
        const rawMat = String(r[colMatricule]).trim().replace(/\.0+$/, "").toUpperCase();
        if (rawMat && rawMat !== "MATRICULE" && rawMat !== "N°") {
          matricule = rawMat;
        }
      }

      const contact = colContact !== -1 && r[colContact] ? String(r[colContact]).trim() : null;
      const email = colEmail !== -1 && r[colEmail] ? String(r[colEmail]).trim().toLowerCase() : null;

      students.push({
        nom,
        prenom,
        matricule,
        contact,
        email,
      });
    }
  }

  return {
    sheetName,
    headerRowIdx,
    dataStartRow,
    colNomPrenom,
    colNom,
    colPrenom,
    colMatricule,
    colContact,
    colEmail,
    students,
  };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ENSEIGNANT" && session.role !== "ADMINISTRATION")) {
      return NextResponse.json(
        { error: "Action réservée aux enseignants ou à l'administration." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const classeId = formData.get("classeId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Veuillez fournir un fichier Excel (.xlsx, .xls)." },
        { status: 400 }
      );
    }

    if (!classeId) {
      return NextResponse.json(
        { error: "Veuillez sélectionner la classe de destination." },
        { status: 400 }
      );
    }

    const targetClasse = await prisma.classe.findUnique({ where: { id: classeId } });
    if (!targetClasse) {
      return NextResponse.json({ error: "La classe de destination n'existe pas." }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // Inspect all sheets in the workbook to select the best one
    let bestResult: SheetParseResult | null = null;
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const parsed = parseSheet(worksheet, sheetName);
      if (parsed && parsed.students.length > 0) {
        if (!bestResult || parsed.students.length > bestResult.students.length) {
          bestResult = parsed;
        }
      }
    }

    if (!bestResult || bestResult.students.length === 0) {
      return NextResponse.json(
        {
          error:
            "Format non reconnu : impossible de repérer les noms des étudiants dans les feuilles du fichier Excel. Vérifiez que votre fichier contient une colonne avec les noms et prénoms des élèves.",
        },
        { status: 400 }
      );
    }

    // Récupérer le plus grand numéro matricule existant pour incrément automatique propre
    const allMatricules = await prisma.etudiant.findMany({ select: { matricule: true } });
    let nextNum = 34000;
    for (const m of allMatricules) {
      const num = parseInt(m.matricule, 10);
      if (!isNaN(num) && num > nextNum) {
        nextNum = num;
      }
    }

    let importedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (const st of bestResult.students) {
      let matricule = st.matricule;
      const nom = st.nom;
      const prenom = st.prenom;
      const contact = st.contact || null;
      const email = st.email || null;

      try {
        // 1. Chercher si l'étudiant existe déjà par matricule explicite
        let existing = matricule
          ? await prisma.etudiant.findUnique({
              where: { matricule },
            })
          : null;

        // 2. Si pas de matricule ou non trouvé, chercher s'il existe déjà par nom & prénom dans cette classe
        if (!existing) {
          existing = await prisma.etudiant.findFirst({
            where: {
              classeId,
              nom: { equals: nom },
              prenom: { equals: prenom },
            },
          });
          if (existing) {
            matricule = existing.matricule;
          }
        }

        // 3. Si toujours pas de matricule attribué, en générer un nouveau unique
        if (!matricule) {
          nextNum++;
          matricule = String(nextNum);
        }

        if (existing) {
          await prisma.etudiant.update({
            where: { id: existing.id },
            data: {
              nom,
              prenom,
              contact: contact || existing.contact,
              email: email || existing.email,
              classeId,
            },
          });
          updatedCount++;
        } else {
          await prisma.etudiant.create({
            data: {
              matricule,
              nom,
              prenom,
              contact,
              email,
              classeId,
            },
          });
          importedCount++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Erreur pour "${nom} ${prenom}": ${msg}`);
      }
    }

    const totalProcessed = importedCount + updatedCount;
    const sheetInfo = workbook.SheetNames.length > 1 ? ` (feuille "${bestResult.sheetName}")` : "";

    return NextResponse.json({
      success: true,
      message: `Importation réussie : ${importedCount} nouvel(s) auditeur(s) inscrit(s), ${updatedCount} mis à jour dans la classe ${targetClasse.code}${sheetInfo}.`,
      sheetName: bestResult.sheetName,
      importedCount,
      updatedCount,
      totalProcessed,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (error) {
    console.error("Erreur import Excel:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors du traitement du fichier Excel." },
      { status: 500 }
    );
  }
}
