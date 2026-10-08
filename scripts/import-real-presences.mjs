import { PrismaClient } from "@prisma/client";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const excelPath = path.resolve(
  __dirname,
  "../docs/Presences_auditeurs_septembre_2026.xlsx"
);

// Configuration des 11 séances réelles (28 heures)
const SESSIONS_CONFIG = [
  {
    dateStr: "2026-09-01T18:30:00Z",
    date: new Date("2026-09-01T18:30:00Z"),
    heureDebut: "18:30",
    heureFin: "20:30",
    nombreHeures: 2.0,
    description: "Séance introductive du mardi 01/09/2026",
    defaultStatus: "PRESENT",
  },
  {
    dateStr: "2026-09-05T08:30:00Z",
    date: new Date("2026-09-05T08:30:00Z"),
    heureDebut: "08:30",
    heureFin: "12:30",
    nombreHeures: 4.0,
    description: "Séance du samedi 05/09/2026",
    defaultStatus: "PRESENT",
  },
  {
    dateStr: "2026-09-07T18:00:00Z",
    date: new Date("2026-09-07T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du lundi 07/09/2026 — 1 appel retenu (19:57)",
  },
  {
    dateStr: "2026-09-08T18:00:00Z",
    date: new Date("2026-09-08T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 08/09/2026 — 2 appels retenus (18:28, 20:06)",
  },
  {
    dateStr: "2026-09-11T18:00:00Z",
    date: new Date("2026-09-11T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du vendredi 11/09/2026 — 1 appel retenu (18:33)",
  },
  {
    dateStr: "2026-09-12T08:00:00Z",
    date: new Date("2026-09-12T08:00:00Z"),
    heureDebut: "08:00",
    heureFin: "12:00",
    nombreHeures: 4.0,
    description: "Séance du samedi 12/09/2026 — 2 appels retenus (10:36, 11:55)",
  },
  {
    dateStr: "2026-09-14T18:00:00Z",
    date: new Date("2026-09-14T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du lundi 14/09/2026 — 2 appels retenus (18:47, 20:17)",
  },
  {
    dateStr: "2026-09-15T18:00:00Z",
    date: new Date("2026-09-15T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 15/09/2026 — 3 appels retenus (18:30, 18:31, 19:56)",
  },
  {
    dateStr: "2026-09-19T08:00:00Z",
    date: new Date("2026-09-19T08:00:00Z"),
    heureDebut: "08:00",
    heureFin: "12:00",
    nombreHeures: 4.0,
    description: "Séance du samedi 19/09/2026 — 2 appels retenus (08:32, 12:03)",
  },
  {
    dateStr: "2026-09-21T18:30:00Z",
    date: new Date("2026-09-21T18:30:00Z"),
    heureDebut: "18:30",
    heureFin: "20:30",
    nombreHeures: 2.0,
    description: "Séance du lundi 21/09/2026 — 1 appel retenu (19:44 - Exercices NumPy)",
  },
  {
    dateStr: "2026-09-22T18:00:00Z",
    date: new Date("2026-09-22T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 22/09/2026 — 1 appel retenu (18:22 - Algèbre Linéaire)",
  },
];

async function main() {
  console.log("=== Importation des présences : Algèbre Linéaire avec Python (Baba KOUROUMA) ===");
  console.log(`Lecture du classeur : ${excelPath}`);

  const teacher = await prisma.user.findFirst({
    where: {
      OR: [
        { nom: { contains: "KOUROUMA" } },
        { username: "babadkourouma" },
      ],
    },
  });

  if (!teacher) {
    throw new Error("Enseignant Baba KOUROUMA non trouvé en base !");
  }

  const classe = await prisma.classe.findFirst({ where: { code: "LPRIGL-A" } });
  if (!classe) {
    throw new Error("Classe 'LPRIGL-A' introuvable !");
  }

  let matiereALP = await prisma.matiere.findFirst({
    where: {
      OR: [
        { code: "ALP" },
        { nom: { contains: "Algebre" } },
        { nom: { contains: "Algèbre" } },
      ],
    },
  });

  if (!matiereALP) {
    matiereALP = await prisma.matiere.create({
      data: {
        code: "ALP",
        nom: "Algebre lineaire avec python",
        enseignantId: teacher.id,
      },
    });
  }

  let coursALP = await prisma.cours.findFirst({
    where: {
      classeId: classe.id,
      matiereId: matiereALP.id,
    },
  });

  if (!coursALP) {
    coursALP = await prisma.cours.create({
      data: {
        classeId: classe.id,
        matiereId: matiereALP.id,
        enseignantId: teacher.id,
        volumeHoraire: 30.0,
        coefficient: 2.0,
      },
    });
  } else {
    coursALP = await prisma.cours.update({
      where: { id: coursALP.id },
      data: {
        enseignantId: teacher.id,
        volumeHoraire: Math.max(coursALP.volumeHoraire, 30.0),
      },
    });
  }

  // Nettoyage séances précédentes du cours ALP
  await prisma.presence.deleteMany({
    where: { seance: { coursId: coursALP.id } },
  });
  await prisma.seance.deleteMany({
    where: { coursId: coursALP.id },
  });

  const wb = xlsx.readFile(excelPath);
  const appSheet = wb.Sheets["Appels"];
  if (!appSheet) {
    throw new Error("Feuille 'Appels' introuvable dans le classeur Excel.");
  }

  const studentsAttendance = {};

  for (let r = 7; r <= 22; r++) {
    const cellMat = appSheet[xlsx.utils.encode_cell({ r, c: 0 })];
    const cellNom = appSheet[xlsx.utils.encode_cell({ r, c: 1 })];
    if (!cellMat) continue;
    const matricule = String(cellMat.v).trim();
    const nomComplet = cellNom ? String(cellNom.v).trim() : "";

    const getVal = (col) => {
      const cell = appSheet[xlsx.utils.encode_cell({ r, c: col })];
      return cell ? String(cell.v).trim() : "NV";
    };

    const p01 = "P";
    const p05 = "P";
    const p07 = getVal(2);
    const p08_1 = getVal(3);
    const p08_2 = getVal(4);
    const p08 = (p08_1 === "P" || p08_2 === "P") ? "P" : (p08_1 === "P*" || p08_2 === "P*") ? "P*" : "NV";
    const p11 = getVal(5);
    const p12_1 = getVal(6);
    const p12_2 = getVal(7);
    const p12 = (p12_1 === "P" || p12_2 === "P") ? "P" : (p12_1 === "P*" || p12_2 === "P*") ? "P*" : "NV";
    const p14_1 = getVal(8);
    const p14_2 = getVal(9);
    const p14 = (p14_1 === "P" || p14_2 === "P") ? "P" : (p14_1 === "P*" || p14_2 === "P*") ? "P*" : (p14_1 === "?" || p14_2 === "?") ? "?" : "NV";
    const p15_1 = getVal(10);
    const p15_2 = getVal(11);
    const p15_3 = getVal(12);
    const p15 = (p15_1 === "P" || p15_2 === "P" || p15_3 === "P") ? "P" : (p15_1 === "P*" || p15_2 === "P*" || p15_3 === "P*") ? "P*" : "NV";
    const p19_1 = getVal(13);
    const p19_2 = getVal(14);
    const p19 = (p19_1 === "P" || p19_2 === "P") ? "P" : (p19_1 === "P*" || p19_2 === "P*") ? "P*" : "NV";
    const p21 = getVal(15);
    const p22 = getVal(16);

    studentsAttendance[matricule] = {
      matricule,
      nomComplet,
      presences: [p01, p05, p07, p08, p11, p12, p14, p15, p19, p21, p22],
    };
  }

  const createdSeances = [];
  for (let i = 0; i < SESSIONS_CONFIG.length; i++) {
    const s = SESSIONS_CONFIG[i];
    const seance = await prisma.seance.create({
      data: {
        date: s.date,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        nombreHeures: s.nombreHeures,
        description: s.description,
        coursId: coursALP.id,
        creeParId: teacher.id,
      },
    });
    createdSeances.push({ ...s, seanceId: seance.id, index: i });
  }

  let totalPresences = 0;
  for (const [mat, data] of Object.entries(studentsAttendance)) {
    const etudiant = await prisma.etudiant.findUnique({
      where: { matricule: mat },
    });
    if (!etudiant) continue;

    for (const s of createdSeances) {
      const raw = data.presences[s.index] || "NV";
      let statut = "ABSENT";
      let remarque = null;

      if (raw === "P") {
        statut = "PRESENT";
      } else if (raw === "P*") {
        statut = "PRESENT";
        remarque = "Présent (P* - rapprochement Teams nom court unique)";
      } else if (raw === "?") {
        statut = "ABSENT";
        remarque = "À confirmer (pseudo Teams non officiel)";
      } else {
        statut = "ABSENT";
        remarque = "Non visible lors de l'appel Teams";
      }

      await prisma.presence.create({
        data: {
          seanceId: s.seanceId,
          etudiantId: etudiant.id,
          statut,
          remarque,
        },
      });
      totalPresences++;
    }
  }

  const totalHeures = SESSIONS_CONFIG.reduce((acc, s) => acc + s.nombreHeures, 0);
  console.log(`✓ ${createdSeances.length} séances créées, ${totalPresences} émargements pour ${totalHeures} heures.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
