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

  // Création de matières initiales avec volume horaire et enseignant
  const matieres = [
    { code: "GL", nom: "Génie Logiciel", coefficient: 3.0, volumeHoraire: 30.0 },
    { code: "RESEAUX", nom: "Architecture Réseaux", coefficient: 2.0, volumeHoraire: 20.0 },
    { code: "BDD", nom: "Bases de Données Avancées", coefficient: 2.0, volumeHoraire: 20.0 },
    { code: "WEB", nom: "Développement Web & Mobile", coefficient: 3.0, volumeHoraire: 40.0 },
  ];

  for (const m of matieres) {
    const existing = await prisma.matiere.findFirst({
      where: { code: m.code, classeId: classe.id },
    });
    if (!existing) {
      await prisma.matiere.create({
        data: {
          code: m.code,
          nom: m.nom,
          coefficient: m.coefficient,
          volumeHoraire: m.volumeHoraire,
          classeId: classe.id,
          enseignantId: enseignant.id,
        },
      });
    } else {
      await prisma.matiere.update({
        where: { id: existing.id },
        data: {
          volumeHoraire: m.volumeHoraire,
          enseignantId: existing.enseignantId || enseignant.id,
        },
      });
    }
  }

  // Associer aussi les matières existantes sans enseignant à l'enseignant principal
  await prisma.matiere.updateMany({
    where: { enseignantId: null },
    data: { enseignantId: enseignant.id, volumeHoraire: 20.0 },
  });

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
