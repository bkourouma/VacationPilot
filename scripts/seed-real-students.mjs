import { PrismaClient } from "@prisma/client";
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const excelPath = path.resolve(__dirname, "../docs/Presences_auditeurs_septembre_2026.xlsx");

const studentsData = [
  { matricule: "33021", nom: "AGBATO", prenom: "KARL VIANNEY EMMANUEL", contact: "07 89 69 06 01", email: "emmanuelagbato14@gmail.com" },
  { matricule: "32260", nom: "AKA", prenom: "AHOU GERVAISE NAOMI", contact: "01 02 68 19 21", email: "naomiaka21@gmail.com" },
  { matricule: "33055", nom: "BAKARE", prenom: "MARIAM", contact: "07 15 85 77 70", email: "bakare.mariam.ad@gmail.com" },
  { matricule: "33592", nom: "BAMBA", prenom: "MOHAMED", contact: "07 08 33 23 78", email: "bmohamed_hard@yahoo.fr" },
  { matricule: "32197", nom: "BEKLOU", prenom: "HIEOUYA AUDE SAMIRAH", contact: "07 06 81 36 01", email: "samirah.beklou225@gmail.com" },
  { matricule: "32688", nom: "BESDALI", prenom: "YOHAN ARMSTRONG", contact: "07 58 45 50 14", email: "armstrong.besdali@gmail.com" },
  { matricule: "33036", nom: "BOUNDY", prenom: "ASSETOU IBRAHIM", contact: "07 78 57 88 42", email: "assetou.boundy14@gmail.com" },
  { matricule: "32365", nom: "CAMARA", prenom: "OFFE KALPI ANGE-EMMANUEL", contact: "07 03 97 34 34", email: "camsoffe@gmail.com" },
  { matricule: "32982", nom: "COULIBALY", prenom: "ALIMA VALERIE", contact: "05 54 79 63 93", email: "Coulibalyalimavalerie@gmail.com" },
  { matricule: "33042", nom: "COULIBALY", prenom: "KADIDIATOU", contact: "05 55 60 81 90", email: "Kady09073@gmail.com" },
  { matricule: "33596", nom: "DIAKITE", prenom: "MODIBO", contact: "05 75 62 77 30", email: "diakitemodibo395@gmail.com" },
  { matricule: "33614", nom: "GBLA", prenom: "TONGA ELIEL", contact: "07 67 79 56 02", email: "elielgbla@gmail.com" },
  { matricule: "32945", nom: "KACOU", prenom: "AYA AGNES EMMANUELLA LESLIE", contact: "07 87 41 02 84", email: "ayaagneskacou@gmail.com" },
  { matricule: "32965", nom: "N'GUESSAN", prenom: "KAMLAN GUY", contact: "07 20 61 99 24", email: "Kamlanguy92@gmail.com" },
  { matricule: "32926", nom: "N'GUESSAN", prenom: "MOAYE FABRICE", contact: "05 95 47 05 36", email: "nmoayefabricedesire@gmail.com" },
  { matricule: "32694", nom: "SAKO", prenom: "LADJI LOSSENY", contact: "07 16 71 95 33", email: "Sakolosseny40@gmail.com" }
];

const SESSIONS_CONFIG = [
  {
    col: 4,
    dateStr: "2026-09-07T18:00:00Z",
    date: new Date("2026-09-07T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du lundi 07/09/2026 — 1 appel retenu (19:57)",
  },
  {
    col: 5,
    dateStr: "2026-09-08T18:00:00Z",
    date: new Date("2026-09-08T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 08/09/2026 — 2 appels retenus (18:28, 20:06)",
  },
  {
    col: 6,
    dateStr: "2026-09-11T18:00:00Z",
    date: new Date("2026-09-11T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du vendredi 11/09/2026 — 1 appel retenu (18:33)",
  },
  {
    col: 7,
    dateStr: "2026-09-12T08:00:00Z",
    date: new Date("2026-09-12T08:00:00Z"),
    heureDebut: "08:00",
    heureFin: "12:00",
    nombreHeures: 4.0,
    description: "Séance du samedi 12/09/2026 — 2 appels retenus (10:36, 11:55)",
  },
  {
    col: 8,
    dateStr: "2026-09-14T18:00:00Z",
    date: new Date("2026-09-14T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du lundi 14/09/2026 — 2 appels retenus (18:47, 20:17)",
  },
  {
    col: 9,
    dateStr: "2026-09-15T18:00:00Z",
    date: new Date("2026-09-15T18:00:00Z"),
    heureDebut: "18:00",
    heureFin: "20:00",
    nombreHeures: 2.0,
    description: "Séance du mardi 15/09/2026 — 3 appels retenus (18:30, 18:31, 19:56)",
  },
  {
    col: 10,
    dateStr: "2026-09-19T08:00:00Z",
    date: new Date("2026-09-19T08:00:00Z"),
    heureDebut: "08:00",
    heureFin: "12:00",
    nombreHeures: 4.0,
    description: "Séance du samedi 19/09/2026 — 2 appels retenus (08:32, 12:03)",
  },
];

async function seedRealData() {
  console.log("Rapatriement des auditeurs LPRIGL et des présences réelles...");
  const classe = await prisma.classe.findFirst({ where: { code: "LPRIGL-A" } });
  if (!classe) {
    console.error("Classe LPRIGL-A introuvable.");
    return;
  }

  // 1. Insertion / mise à jour des étudiants
  const insertedStudents = [];
  for (const s of studentsData) {
    const etudiant = await prisma.etudiant.upsert({
      where: { matricule: s.matricule },
      update: {
        nom: s.nom,
        prenom: s.prenom,
        contact: s.contact,
        email: s.email,
        classeId: classe.id,
      },
      create: {
        matricule: s.matricule,
        nom: s.nom,
        prenom: s.prenom,
        contact: s.contact,
        email: s.email,
        classeId: classe.id,
      },
    });
    insertedStudents.push(etudiant);
  }
  console.log(`${insertedStudents.length} auditeurs enregistrés dans la classe ${classe.code}.`);

  // 2. Matière Génie Logiciel
  const matieres = await prisma.matiere.findMany({ where: { classeId: classe.id } });
  const gl = matieres.find(m => m.code === "GL") || matieres[0];
  const prof = await prisma.user.findUnique({ where: { username: "prof" } });

  // 3. Suppression des anciennes séances et présences
  await prisma.presence.deleteMany({});
  await prisma.seance.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.evaluation.deleteMany({});

  // 4. Lecture Excel
  const wb = xlsx.readFile(excelPath);
  const presSheet = wb.Sheets["Présences"];

  for (const s of SESSIONS_CONFIG) {
    const seance = await prisma.seance.create({
      data: {
        date: s.date,
        heureDebut: s.heureDebut,
        heureFin: s.heureFin,
        nombreHeures: s.nombreHeures,
        description: s.description,
        matiereId: gl.id,
        creeParId: prof?.id,
      },
    });

    for (let r = 6; r <= 21; r++) {
      const cellMat = presSheet[xlsx.utils.encode_cell({ r, c: 0 })];
      if (!cellMat) continue;
      const matricule = String(cellMat.v).trim();
      const etudiant = insertedStudents.find(e => e.matricule === matricule);
      if (!etudiant) continue;

      const cellVal = presSheet[xlsx.utils.encode_cell({ r, c: s.col })];
      const rawStatut = cellVal ? String(cellVal.v).trim() : "NV";

      let statut = "ABSENT";
      let remarque = null;

      if (rawStatut === "P") {
        statut = "PRESENT";
      } else if (rawStatut === "P*") {
        statut = "PRESENT";
        remarque = "Présent (P* - rapprochement Teams nom court)";
      } else if (rawStatut === "?") {
        statut = "ABSENT";
        remarque = "À confirmer (pseudo Teams 'Besdaaaaa')";
      } else {
        statut = "ABSENT";
        remarque = "Non visible lors des appels Teams";
      }

      await prisma.presence.create({
        data: {
          seanceId: seance.id,
          etudiantId: etudiant.id,
          statut,
          remarque,
        },
      });
    }
  }

  console.log("7 séances réelles (18h) et 112 présences réelles créées avec succès !");
}

seedRealData()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
