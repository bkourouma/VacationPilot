// Crée (ou met à jour) les deux comptes enseignants utilisés par docs/GUIDE_TEST_UTILISATEUR_COMPLET.md
// Usage : node scripts/create-test-teachers.mjs
// Les comptes reçoivent un mot de passe de TEST pour permettre la connexion par identifiant,
// sans passer par Google.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const teachers = [
  {
    username: "ibrahimkoneprof",
    email: "ibrahim.kone.prof@gmail.com",
    nom: "Dr. Ibrahim KONÉ",
    password: "Kone@2026",
  },
  {
    username: "awacoulibalyprof",
    email: "awa.coulibaly.prof@gmail.com",
    nom: "Mme Awa COULIBALY",
    password: "Coulibaly@2026",
  },
];

async function main() {
  for (const t of teachers) {
    const motDePasse = await bcrypt.hash(t.password, 10);
    const user = await prisma.user.upsert({
      where: { username: t.username },
      update: { email: t.email, nom: t.nom, role: "ENSEIGNANT", motDePasse },
      create: {
        username: t.username,
        email: t.email,
        nom: t.nom,
        role: "ENSEIGNANT",
        motDePasse,
      },
    });
    console.log(`OK ${user.nom} — identifiant: ${user.username} — email: ${user.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
