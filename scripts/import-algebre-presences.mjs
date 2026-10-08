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
    col: 2, // Col C (0-indexed: 2) -> 01/09/2026
    dateStr: "2026-09-01T18:30:00Z",
    date: new Date("2026-09-01T18:30:00Z"),
    heureDebut: "18:30",
    heureFin: "20:30",
    nombreHeures: 2.0,
    description: "Séance introductive du mardi 01/09/2026",
    defaultStatus: "PRESENT",
  },
  {
    col: 3, // Col D -> 05/09/2026
    dateStr: "2026-09-05T08:30:00Z",
    date: new Date("2026-09-05T08:30:00Z"),
    heureDebut: "08:30",
    heureFin: "12:30",
    nombreHeures: 4.0,
    description: "Séance du samedi 05/09/2026",
    defaultStatus: "PRESENT",
  },
  {
    col: 4, // Col E -> 07/09/2026
    dateStr: "2026-09-07T18:00:00Z",
    date: new Date("2026-09-07T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du lundi 07/09/2026 — 1 appel retenu (19:57)",
  },
  {
    col: 5, // Col F -> 08/09/2026
    dateStr: "2026-09-08T18:00:00Z",
    date: new Date("2026-09-08T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 08/09/2026 — 2 appels retenus (18:28, 20:06)",
  },
  {
    col: 6, // Col G -> 11/09/2026
    dateStr: "2026-09-11T18:00:00Z",
    date: new Date("2026-09-11T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du vendredi 11/09/2026 — 1 appel retenu (18:33)",
  },
  {
    col: 7, // Col H -> 12/09/2026
    dateStr: "2026-09-12T08:00:00Z",
    date: new Date("2026-09-12T08:00:00Z"),
    heureDebut: "08:00",
    heureFin: "12:00",
    nombreHeures: 4.0,
    description: "Séance du samedi 12/09/2026 — 2 appels retenus (10:36, 11:55)",
  },
  {
    col: 8, // Col I -> 14/09/2026
    dateStr: "2026-09-14T18:00:00Z",
    date: new Date("2026-09-14T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du lundi 14/09/2026 — 2 appels retenus (18:47, 20:17)",
  },
  {
    col: 9, // Col J -> 15/09/2026
    dateStr: "2026-09-15T18:00:00Z",
    date: new Date("2026-09-15T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 15/09/2026 — 3 appels retenus (18:30, 18:31, 19:56)",
  },
  {
    col: 10, // Col K -> 19/09/2026
    dateStr: "2026-09-19T08:00:00Z",
    date: new Date("2026-09-19T08:00:00Z"),
    heureDebut: "08:00",
    heureFin: "12:00",
    nombreHeures: 4.0,
    description: "Séance du samedi 19/09/2026 — 2 appels retenus (08:32, 12:03)",
  },
  {
    col: 11, // Col L -> 21/09/2026
    dateStr: "2026-09-21T18:30:00Z",
    date: new Date("2026-09-21T18:30:00Z"),
    heureDebut: "18:30",
    heureFin: "20:30",
    nombreHeures: 2.0,
    description: "Séance du lundi 21/09/2026 — 1 appel retenu (19:44 - Exercices NumPy)",
  },
  {
    col: 12, // Col M -> 22/09/2026
    dateStr: "2026-09-22T18:00:00Z",
    date: new Date("2026-09-22T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 22/09/2026 — 1 appel retenu (18:22 - Algèbre Linéaire)",
  },
];

async function main() {
  console.log("=== Mise à jour des présences : Algèbre Linéaire avec Python (Baba KOUROUMA) ===");
  console.log(`Source Excel : ${excelPath}`);

  // 1. Utilisateur Baba KOUROUMA
  const teacher = await prisma.user.findFirst({
    where: {
      OR: [
        { nom: { contains: "KOUROUMA" } },
        { username: "babadkourouma" },
      ],
    },
  });

  if (!teacher) {
    throw new Error("Enseignant Baba KOUROUMA introuvable dans la base !");
  }
  console.log(`Enseignant identifié : ${teacher.nom} (id: ${teacher.id})`);

  // 2. Classe LPRIGL-A
  const classe = await prisma.classe.findFirst({
    where: { code: "LPRIGL-A" },
  });
  if (!classe) {
    throw new Error("Classe 'LPRIGL-A' introuvable !");
  }
  console.log(`Classe : ${classe.nom} (${classe.code})`);

  // 3. Matière Algèbre Linéaire
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
    console.log("✓ Matière ALP créée :", matiereALP.nom);
  } else {
    // S'assurer qu'elle est bien rattachée à Baba KOUROUMA
    if (matiereALP.enseignantId !== teacher.id) {
      await prisma.matiere.update({
        where: { id: matiereALP.id },
        data: { enseignantId: teacher.id },
      });
    }
    console.log(`Matière : ${matiereALP.nom} (${matiereALP.code})`);
  }

  // 4. Cours (ALP dans LPRIGL-A pour Baba KOUROUMA)
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
    console.log("✓ Cours ALP créé pour LPRIGL-A (ID:", coursALP.id, ")");
  } else {
    coursALP = await prisma.cours.update({
      where: { id: coursALP.id },
      data: {
        enseignantId: teacher.id,
        volumeHoraire: Math.max(coursALP.volumeHoraire, 30.0),
      },
    });
    console.log("✓ Cours ALP mis à jour (Volume horaire prévu :", coursALP.volumeHoraire, "h)");
  }

  // 5. Nettoyage des anciennes séances erronées de SQLSRV
  const coursSQLSRV = await prisma.cours.findFirst({
    where: {
      classeId: classe.id,
      matiere: { code: "SQLSRV" },
    },
  });

  if (coursSQLSRV) {
    const deletedSQLPresences = await prisma.presence.deleteMany({
      where: { seance: { coursId: coursSQLSRV.id } },
    });
    const deletedSQLSeances = await prisma.seance.deleteMany({
      where: { coursId: coursSQLSRV.id },
    });
    console.log(`Séances SQLSRV réaffectées/supprimées : ${deletedSQLSeances.count} séances, ${deletedSQLPresences.count} présences.`);
  }

  // 6. Nettoyage des anciennes séances sur le cours ALP
  const deletedOldPresences = await prisma.presence.deleteMany({
    where: { seance: { coursId: coursALP.id } },
  });
  const deletedOldSeances = await prisma.seance.deleteMany({
    where: { coursId: coursALP.id },
  });
  console.log(`Anciennes séances ALP nettoyées : ${deletedOldSeances.count} séances.`);

  // 7. Lecture de la feuille 'Appels' pour extraire les statuts réels
  const wb = xlsx.readFile(excelPath);
  const appSheet = wb.Sheets["Appels"];
  if (!appSheet) {
    throw new Error("Feuille 'Appels' introuvable dans le classeur Excel.");
  }

  // Auditeurs (lignes 8 à 23 dans Appels)
  // Mapping par date :
  // Col C (07/09), Col D-E (08/09), Col F (11/09), Col G-H (12/09), Col I-J (14/09), Col K-M (15/09), Col N-O (19/09), Col P (21/09), Col Q (22/09)
  const studentsAttendance = {};

  for (let r = 7; r <= 22; r++) { // 0-indexed in xlsx: r=7 is row 8
    const cellMat = appSheet[xlsx.utils.encode_cell({ r, c: 0 })];
    const cellNom = appSheet[xlsx.utils.encode_cell({ r, c: 1 })];
    if (!cellMat) continue;
    const matricule = String(cellMat.v).trim();
    const nomComplet = cellNom ? String(cellNom.v).trim() : "";

    const getVal = (col) => {
      const cell = appSheet[xlsx.utils.encode_cell({ r, c: col })];
      return cell ? String(cell.v).trim() : "NV";
    };

    // Calcul de la présence par séance :
    const p01 = "P"; // Introduction 01/09
    const p05 = "P"; // 05/09
    
    // 07/09 : Col C (2)
    const p07 = getVal(2);
    
    // 08/09 : Col D (3) ou Col E (4)
    const p08_1 = getVal(3);
    const p08_2 = getVal(4);
    const p08 = (p08_1 === "P" || p08_2 === "P") ? "P" : (p08_1 === "P*" || p08_2 === "P*") ? "P*" : "NV";

    // 11/09 : Col F (5)
    const p11 = getVal(5);

    // 12/09 : Col G (6) ou Col H (7)
    const p12_1 = getVal(6);
    const p12_2 = getVal(7);
    const p12 = (p12_1 === "P" || p12_2 === "P") ? "P" : (p12_1 === "P*" || p12_2 === "P*") ? "P*" : "NV";

    // 14/09 : Col I (8) ou Col J (9)
    const p14_1 = getVal(8);
    const p14_2 = getVal(9);
    const p14 = (p14_1 === "P" || p14_2 === "P") ? "P" : (p14_1 === "P*" || p14_2 === "P*") ? "P*" : (p14_1 === "?" || p14_2 === "?") ? "?" : "NV";

    // 15/09 : Col K (10), Col L (11), Col M (12)
    const p15_1 = getVal(10);
    const p15_2 = getVal(11);
    const p15_3 = getVal(12);
    const p15 = (p15_1 === "P" || p15_2 === "P" || p15_3 === "P") ? "P" : (p15_1 === "P*" || p15_2 === "P*" || p15_3 === "P*") ? "P*" : "NV";

    // 19/09 : Col N (13), Col O (14)
    const p19_1 = getVal(13);
    const p19_2 = getVal(14);
    const p19 = (p19_1 === "P" || p19_2 === "P") ? "P" : (p19_1 === "P*" || p19_2 === "P*") ? "P*" : "NV";

    // 21/09 : Col P (15)
    const p21 = getVal(15);

    // 22/09 : Col Q (16)
    const p22 = getVal(16);

    studentsAttendance[matricule] = {
      matricule,
      nomComplet,
      presences: [p01, p05, p07, p08, p11, p12, p14, p15, p19, p21, p22],
    };
  }

  console.log(`\n${Object.keys(studentsAttendance).length} auditeurs extraits avec leurs relevés d'appels.`);

  // 8. Création des 11 séances dans la BDD
  console.log("\n--- Création des 11 séances pour Algèbre Linéaire ---");
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
    console.log(`  ✓ [Séance ${i+1}] ${s.date.toISOString().split("T")[0]} (${s.heureDebut}-${s.heureFin}, ${s.nombreHeures}h) : ${s.description}`);
  }

  // 9. Enregistrement des présences pour chaque étudiant
  console.log("\n--- Enregistrement des présences réelles ---");
  let totalPresences = 0;
  let countP = 0;
  let countPStar = 0;
  let countNV = 0;

  for (const [mat, data] of Object.entries(studentsAttendance)) {
    const etudiant = await prisma.etudiant.findUnique({
      where: { matricule: mat },
    });

    if (!etudiant) {
      console.warn(`[ATTENTION] Étudiant matricule ${mat} non trouvé en BDD !`);
      continue;
    }

    for (const s of createdSeances) {
      const raw = data.presences[s.index] || "NV";

      let statut = "ABSENT";
      let remarque = null;

      if (raw === "P") {
        statut = "PRESENT";
        countP++;
      } else if (raw === "P*") {
        statut = "PRESENT";
        remarque = "Présent (P* - rapprochement Teams nom court unique)";
        countPStar++;
      } else if (raw === "?") {
        statut = "ABSENT";
        remarque = "À confirmer (pseudo Teams non officiel)";
        countNV++;
      } else {
        statut = "ABSENT";
        remarque = "Non visible lors de l'appel Teams";
        countNV++;
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

  console.log(`\nTotal émargements insérés : ${totalPresences}`);
  console.log(`  - Présents (P) : ${countP}`);
  console.log(`  - Présents avec rapprochement (P*) : ${countPStar}`);
  console.log(`  - Absents / Non visibles (NV) : ${countNV}`);

  // 10. Rattachement de la progression pédagogique (chapitres et sous-chapitres)
  console.log("\n--- Association de la progression pédagogique aux séances ---");
  const chapitresALP = await prisma.chapitre.findMany({
    where: { matiereId: matiereALP.id },
    orderBy: { ordre: "asc" },
    include: { sousChapitres: { orderBy: { ordre: "asc" } } },
  });

  if (chapitresALP.length >= 6) {
    const [ch1, ch2, ch3, ch4, ch5, ch6] = chapitresALP;
    const progressionMapping = [
      { seanceIdx: 0, chIds: [ch1.id], scIds: ch1.sousChapitres.map((sc) => sc.id) },
      { seanceIdx: 1, chIds: [ch2.id], scIds: ch2.sousChapitres.map((sc) => sc.id) },
      { seanceIdx: 2, chIds: [ch3.id], scIds: [ch3.sousChapitres[0].id] },
      { seanceIdx: 3, chIds: [ch3.id], scIds: [ch3.sousChapitres[1].id, ch3.sousChapitres[2].id] },
      { seanceIdx: 4, chIds: [ch4.id], scIds: [ch4.sousChapitres[0].id] },
      { seanceIdx: 5, chIds: [ch4.id, ch5.id], scIds: [ch4.sousChapitres[1].id, ch5.sousChapitres[0].id] },
      { seanceIdx: 6, chIds: [ch5.id], scIds: [ch5.sousChapitres[1].id, ch5.sousChapitres[2].id] },
      { seanceIdx: 7, chIds: [ch5.id], scIds: [ch5.sousChapitres[3].id] },
      { seanceIdx: 8, chIds: [ch6.id], scIds: [ch6.sousChapitres[0].id, ch6.sousChapitres[1].id] },
      { seanceIdx: 9, chIds: [ch6.id], scIds: [ch6.sousChapitres[2].id] },
      { seanceIdx: 10, chIds: [ch4.id, ch5.id, ch6.id], scIds: [] },
    ];

    for (const item of progressionMapping) {
      const seanceObj = createdSeances[item.seanceIdx];
      if (!seanceObj) continue;

      for (const chId of item.chIds) {
        await prisma.seanceChapitre.upsert({
          where: { seanceId_chapitreId: { seanceId: seanceObj.seanceId, chapitreId: chId } },
          update: { statut: "TERMINE" },
          create: { seanceId: seanceObj.seanceId, chapitreId: chId, statut: "TERMINE" },
        });
      }

      for (const scId of item.scIds) {
        await prisma.coursSousChapitreValidation.upsert({
          where: { coursId_sousChapitreId: { coursId: coursALP.id, sousChapitreId: scId } },
          update: { valide: true, seanceId: seanceObj.seanceId, dateValidation: seanceObj.date },
          create: {
            coursId: coursALP.id,
            sousChapitreId: scId,
            seanceId: seanceObj.seanceId,
            valide: true,
            dateValidation: seanceObj.date,
          },
        });
      }
    }

    // Validation globale des chapitres pour le cours
    for (const ch of chapitresALP) {
      await prisma.coursChapitreValidation.upsert({
        where: { coursId_chapitreId: { coursId: coursALP.id, chapitreId: ch.id } },
        update: { valide: true, dateValidation: SESSIONS_CONFIG[SESSIONS_CONFIG.length - 1].date },
        create: {
          coursId: coursALP.id,
          chapitreId: ch.id,
          valide: true,
          dateValidation: SESSIONS_CONFIG[SESSIONS_CONFIG.length - 1].date,
        },
      });
    }
    console.log("✓ Progression pédagogique (chapitres & sous-chapitres) associée avec succès !");
  }

  const totalHeures = SESSIONS_CONFIG.reduce((acc, s) => acc + s.nombreHeures, 0);
  console.log(`\nVolume horaire effectif réalisé : ${totalHeures} heures.`);
  console.log(`Progression : ${totalHeures}h / ${coursALP.volumeHoraire}h (${Math.round((totalHeures / coursALP.volumeHoraire)*100)}%)`);

  console.log("\n=== Mise à jour terminée avec un succès total ! ===");
}

main()
  .catch((e) => {
    console.error("Erreur lors de l'importation :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
