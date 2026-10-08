import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== Lancement des vérifications automatisées ===");

  // 1. Vérification des utilisateurs dans la base
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, nom: true, role: true },
  });
  console.log("\nUtilisateurs enregistrés :");
  console.table(users);

  const adminUser = users.find((u) => u.role === "ADMINISTRATION");
  if (!adminUser) throw new Error("Compte ADMINISTRATION non trouvé !");
  console.log("✓ Compte Administration vérifié :", adminUser.username);

  const profUser = users.find((u) => u.username === "prof");
  if (!profUser) throw new Error("Compte Enseignant 'prof' non trouvé !");
  console.log("✓ Compte Enseignant 'prof' vérifié :", profUser.email || profUser.username);

  // 2. Vérification des classes
  const classes = await prisma.classe.findMany({
    include: {
      matieres: {
        include: {
          enseignant: true,
          seances: true,
        },
      },
      _count: { select: { etudiants: true } },
    },
  });

  console.log("\nClasses enregistrées :");
  classes.forEach((c) => {
    console.log(`- Classe ${c.code} (${c.nom}) : ${c._count.etudiants} étudiants, ${c.matieres.length} matières`);
    c.matieres.forEach((m) => {
      const heures = m.seances.reduce((acc, s) => acc + s.nombreHeures, 0);
      console.log(`  * [${m.code}] ${m.nom} — Vol: ${m.volumeHoraire}h | Faites: ${heures}h | Prof: ${m.enseignant?.nom || "Non assigné"}`);
    });
  });

  // 3. Test de création d'un nouvel enseignant Gmail
  const testGmail = "dr.koffi.enseignant@gmail.com";
  let testTeacher = await prisma.user.findUnique({ where: { email: testGmail } });
  if (!testTeacher) {
    testTeacher = await prisma.user.create({
      data: {
        username: "dr_koffi",
        email: testGmail,
        nom: "Dr. Koffi Kouadio",
        role: "ENSEIGNANT",
      },
    });
    console.log("\n✓ Nouvel enseignant créé via Gmail :", testTeacher.nom, `(${testTeacher.email})`);
  } else {
    console.log("\n✓ Enseignant Gmail déjà existant :", testTeacher.nom);
  }

  // 4. Test d'attribution d'une matière avec volume horaire dédié
  const classeLPRIGL = classes.find((c) => c.code === "LPRIGL-A") || classes[0];
  let matiereAlgo = await prisma.matiere.findFirst({
    where: { code: "ALGO_AV", classeId: classeLPRIGL.id },
  });

  if (!matiereAlgo) {
    matiereAlgo = await prisma.matiere.create({
      data: {
        code: "ALGO_AV",
        nom: "Algorithmique Avancée & Complexité",
        coefficient: 3.0,
        volumeHoraire: 40.0, // 40h prévues
        classeId: classeLPRIGL.id,
        enseignantId: testTeacher.id,
      },
    });
    console.log("✓ Matière créée pour le Dr. Koffi :", matiereAlgo.nom, `(Volume prévu: ${matiereAlgo.volumeHoraire}h)`);
  } else {
    console.log("✓ Matière déjà existante :", matiereAlgo.nom);
  }

  // 5. Test d'ajout d'une séance pour vérifier le décompte horaire
  const existingSeancesAlgo = await prisma.seance.findMany({
    where: { matiereId: matiereAlgo.id },
  });

  if (existingSeancesAlgo.length === 0) {
    const seance = await prisma.seance.create({
      data: {
        matiereId: matiereAlgo.id,
        date: new Date(),
        nombreHeures: 4.0,
        heureDebut: "08:00",
        heureFin: "12:00",
        description: "Séance inaugurale : Graphes & Complexité",
        creeParId: testTeacher.id,
      },
    });
    console.log("✓ Première séance de 4h créée avec succès :", seance.description);
  }

  const heuresFaites = (await prisma.seance.findMany({ where: { matiereId: matiereAlgo.id } }))
    .reduce((acc, s) => acc + s.nombreHeures, 0);

  const progression = Math.round((heuresFaites / matiereAlgo.volumeHoraire) * 100);
  console.log(`✓ Progression Dr. Koffi : ${heuresFaites}h / ${matiereAlgo.volumeHoraire}h réalisées (${progression}%)`);

  console.log("\n=== Tous les tests automatisés ont réussi avec succès ! ===");
}

runTests()
  .catch((e) => {
    console.error("Erreur test:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
