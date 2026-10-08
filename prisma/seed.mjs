import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Création du compte Administration
  const hashedAdminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      role: "ADMINISTRATION",
      email: "direction@edupresence.com",
    },
    create: {
      username: "admin",
      nom: "Direction Pédagogique",
      email: "direction@edupresence.com",
      motDePasse: hashedAdminPassword,
      role: "ADMINISTRATION",
    },
  });
  console.log("Compte Administration créé : admin / admin123");

  // Création du compte Enseignant par défaut
  const hashedPassword = await bcrypt.hash("prof123", 10);
  
  const enseignant = await prisma.user.upsert({
    where: { username: "prof" },
    update: {
      email: "prof@gmail.com",
      role: "ENSEIGNANT",
    },
    create: {
      username: "prof",
      nom: "Enseignant Principal",
      email: "prof@gmail.com",
      motDePasse: hashedPassword,
      role: "ENSEIGNANT",
    },
  });

  console.log("Enseignant créé : prof (prof@gmail.com) / prof123");

  // Création d'une classe initiale
  const classe = await prisma.classe.upsert({
    where: { code: "LPRIGL-A" },
    update: {},
    create: {
      code: "LPRIGL-A",
      nom: "Licence Pro RGL - Groupe A",
      anneeScolaire: "2025-2026",
    },
  });

  console.log("Classe créée :", classe.nom);

  // Catalogue de matières, puis cours de la classe (coefficient et volume horaire)
  const matieres = [
    { code: "GL", nom: "Génie Logiciel", coefficient: 3.0, volumeHoraire: 30.0 },
    { code: "RESEAUX", nom: "Architecture Réseaux", coefficient: 2.0, volumeHoraire: 20.0 },
    { code: "BDD", nom: "Bases de Données Avancées", coefficient: 2.0, volumeHoraire: 20.0 },
    { code: "WEB", nom: "Développement Web & Mobile", coefficient: 3.0, volumeHoraire: 40.0 },
  ];

  for (const m of matieres) {
    const matiere = await prisma.matiere.upsert({
      where: { code: m.code },
      update: {
        nom: m.nom,
        enseignantId: enseignant.id,
      },
      create: {
        code: m.code,
        nom: m.nom,
        enseignantId: enseignant.id,
      },
    });

    await prisma.cours.upsert({
      where: {
        classeId_matiereId: {
          classeId: classe.id,
          matiereId: matiere.id,
        },
      },
      update: {
        coefficient: m.coefficient,
        volumeHoraire: m.volumeHoraire,
        enseignantId: enseignant.id,
      },
      create: {
        classeId: classe.id,
        matiereId: matiere.id,
        enseignantId: enseignant.id,
        coefficient: m.coefficient,
        volumeHoraire: m.volumeHoraire,
      },
    });
  }

  // Création d'un compte Chef de classe de test
  const chefPassword = await bcrypt.hash("chef123", 10);
  await prisma.user.upsert({
    where: { username: "chef" },
    update: { classeId: classe.id },
    create: {
      username: "chef",
      nom: "Chef de Classe (LPRIGL-A)",
      motDePasse: chefPassword,
      role: "CHEF_CLASSE",
      classeId: classe.id,
    },
  });

  console.log("Chef de classe créé : chef / chef123");
  console.log("Seeding terminé avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
