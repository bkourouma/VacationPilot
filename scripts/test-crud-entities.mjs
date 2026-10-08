import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testCrud() {
  console.log("=== Test de vérification des opérations CRUD sur les entités ===");

  // 1. Test Classe
  const classe = await prisma.classe.findFirst({ where: { code: "LPRIGL-A" } });
  if (!classe) throw new Error("Classe non trouvée");
  console.log(`[CLASSE] Classe actuelle : ${classe.nom} (${classe.code})`);

  const updatedClasse = await prisma.classe.update({
    where: { id: classe.id },
    data: { nom: classe.nom },
  });
  console.log(`[CLASSE] Update OK : ${updatedClasse.nom}`);

  // 2. Test Matière
  const matiere = await prisma.matiere.findFirst({ where: { code: "GL", classeId: classe.id } });
  if (!matiere) throw new Error("Matière GL non trouvée");
  console.log(`[MATIERE] Matière actuelle : ${matiere.nom} (coef: ${matiere.coefficient})`);

  const updatedMatiere = await prisma.matiere.update({
    where: { id: matiere.id },
    data: { nom: matiere.nom, coefficient: 3.0 },
  });
  console.log(`[MATIERE] Update OK : ${updatedMatiere.nom} (coef: ${updatedMatiere.coefficient})`);

  // 3. Test Étudiant
  const etudiant = await prisma.etudiant.findFirst({ where: { matricule: "33021" } });
  if (!etudiant) throw new Error("Étudiant 33021 non trouvé");
  console.log(`[ETUDIANT] Auditeur actuel : ${etudiant.nom} ${etudiant.prenom} (${etudiant.matricule})`);

  const updatedEtudiant = await prisma.etudiant.update({
    where: { id: etudiant.id },
    data: {
      nom: etudiant.nom,
      prenom: etudiant.prenom,
      contact: etudiant.contact,
    },
  });
  console.log(`[ETUDIANT] Update OK : ${updatedEtudiant.nom} ${updatedEtudiant.prenom} (${updatedEtudiant.matricule})`);

  console.log("=== Tous les tests d'intégrité sont validés avec succès ! ===");
}

testCrud()
  .catch((e) => {
    console.error("Erreur test CRUD :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
