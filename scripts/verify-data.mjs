import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  const coursALP = await prisma.cours.findFirst({
    where: { matiere: { code: "ALP" } },
    include: {
      matiere: true,
      enseignant: true,
      classe: true,
      seances: {
        orderBy: { date: "asc" },
        include: { presences: true },
      },
    },
  });

  if (!coursALP) {
    console.log("Cours ALP non trouvé !");
    return;
  }

  console.log(`=== Bilan Cours : ${coursALP.matiere.nom} (${coursALP.matiere.code}) ===`);
  console.log(`Enseignant : ${coursALP.enseignant?.nom || "N/A"}`);
  console.log(`Classe : ${coursALP.classe.nom} (${coursALP.classe.code})`);
  console.log(`Volume horaire prévu : ${coursALP.volumeHoraire}h`);
  
  const seances = coursALP.seances;
  console.log(`Nombre de séances : ${seances.length}`);
  const totalHeures = seances.reduce((acc, s) => acc + s.nombreHeures, 0);
  console.log(`Total heures dispensées : ${totalHeures}h / ${coursALP.volumeHoraire}h (${Math.round((totalHeures / coursALP.volumeHoraire) * 100)}%)\n`);

  seances.forEach((s, idx) => {
    const presents = s.presences.filter(p => p.statut === "PRESENT").length;
    const absents = s.presences.filter(p => p.statut === "ABSENT").length;
    console.log(`Séance ${idx + 1}: ${s.date.toISOString().split("T")[0]} (${s.heureDebut}-${s.heureFin}, ${s.nombreHeures}h) -> ${presents} Présents, ${absents} Absents | ${s.description}`);
  });

  console.log("\n--- Bilan par auditeur (16 auditeurs réels) ---");
  const etudiants = await prisma.etudiant.findMany({
    where: { classeId: coursALP.classeId },
    orderBy: { nom: "asc" },
    include: {
      presences: {
        where: { seance: { coursId: coursALP.id } },
        include: { seance: true },
      },
    },
  });

  for (const et of etudiants) {
    let hPresent = 0;
    let nbP = 0;
    let nbPStar = 0;
    let nbNV = 0;

    for (const p of et.presences) {
      if (p.statut === "PRESENT") {
        hPresent += p.seance.nombreHeures;
        if (p.remarque && p.remarque.includes("P*")) nbPStar++;
        else nbP++;
      } else {
        nbNV++;
      }
    }

    const taux = totalHeures > 0 ? Math.round((hPresent / totalHeures) * 100) : 0;
    console.log(`${et.matricule} | ${et.nom} ${et.prenom}`.padEnd(50) + `| ${hPresent}h/${totalHeures}h (${taux}%) | P: ${nbP}, P*: ${nbPStar}, Abs/NV: ${nbNV}`);
  }
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
