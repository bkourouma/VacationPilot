import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3600";

const results = [];

function recordResult(code, title, success, details, error = null) {
  results.push({ code, title, success, details, error });
  const icon = success ? "✅ PASS" : "❌ FAIL";
  console.log(`\n[${icon}] ${code} — ${title}`);
  if (details) console.log(`   Détails : ${details}`);
  if (error) console.error(`   Erreur :`, error);
}

async function runE2EStudentSuite() {
  console.log("=====================================================================");
  console.log("🎓  SUITE DE TESTS E2E AUTOMATISÉE — ESPACE ÉTUDIANT & AUDITEUR");
  console.log(`   Cible : ${BASE_URL} | Date : ${new Date().toISOString()}`);
  console.log("=====================================================================");

  // -------------------------------------------------------------------------
  // TC-ETU-01 : Accès Direct par Matricule & Récupération du Dossier
  // -------------------------------------------------------------------------
  try {
    // 1. Accès à la page HTML du portail
    const pageRes = await fetch(`${BASE_URL}/etudiant/33021`);
    if (!pageRes.ok) throw new Error(`Statut HTTP page: ${pageRes.status}`);

    // 2. Accès à l'API publique
    const apiRes = await fetch(`${BASE_URL}/api/etudiants/33021`);
    if (!apiRes.ok) throw new Error(`Statut HTTP API: ${apiRes.status}`);

    const data = await apiRes.json();
    const etudiant = data.etudiant;

    const ok =
      etudiant &&
      etudiant.matricule === "33021" &&
      etudiant.nom === "AGBATO" &&
      etudiant.prenom.includes("KARL") &&
      etudiant.classe?.code === "LPRIGL-A";

    recordResult(
      "TC-ETU-01",
      "Accès Direct par Matricule & Récupération du Dossier",
      ok,
      `Dossier chargé avec succès : ${etudiant?.nom} ${etudiant?.prenom} (Matricule: ${etudiant?.matricule}, Classe: ${etudiant?.classe?.code})`
    );
  } catch (err) {
    recordResult("TC-ETU-01", "Accès Direct par Matricule & Récupération du Dossier", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-02 : Gestion des Erreurs, Matricule Inexistant & Tolérance aux Espaces
  // -------------------------------------------------------------------------
  try {
    // 1. Test matricule inconnu 99999 -> doit retourner 404
    const notFoundRes = await fetch(`${BASE_URL}/api/etudiants/99999`);
    const notFoundData = await notFoundRes.json();
    const is404Ok =
      notFoundRes.status === 404 &&
      notFoundData.error &&
      notFoundData.error.includes("99999");

    // 2. Test tolérance aux espaces "  33021  "
    const spaceRes = await fetch(`${BASE_URL}/api/etudiants/%20%2033021%20%20`);
    const spaceData = await spaceRes.json();
    const isSpaceOk =
      spaceRes.ok &&
      spaceData.etudiant?.matricule === "33021";

    const ok = is404Ok && isSpaceOk;

    recordResult(
      "TC-ETU-02",
      "Gestion des Erreurs, Matricule Inexistant & Tolérance aux Espaces",
      ok,
      `Matricule 99999 rejeté avec 404 (${notFoundData.error}). Matricule avec espaces "  33021  " automatiquement nettoyé et reconnu.`
    );
  } catch (err) {
    recordResult("TC-ETU-02", "Gestion des Erreurs, Matricule Inexistant & Tolérance aux Espaces", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-03 : Synthèse & KPI d'Assiduité / Réconciliation des Heures
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/etudiants/33021`);
    const data = await res.json();
    const stats = data.statsAssiduite;

    // Réconciliation mathématique : Dispensées = Présent + Absent + Justifié + Retard + NonMarqué
    const somHeures =
      (stats.totalHeuresPrésent || 0) +
      (stats.totalHeuresAbsent || 0) +
      (stats.totalHeuresJustifie || 0) +
      (stats.totalHeuresRetard || 0) +
      (stats.totalHeuresNonMarque || 0);

    const isReconciliationExacte = somHeures === stats.totalHeuresDispensées;
    const isTauxCorrect = stats.tauxPresence === Math.round(((stats.totalHeuresPrésent + stats.totalHeuresJustifie + stats.totalHeuresRetard) / stats.totalHeuresDispensées) * 100);
    const hasMoyenne = typeof data.moyenneGenerale === "number" && data.moyenneGenerale > 0;

    const ok = isReconciliationExacte && isTauxCorrect && hasMoyenne;

    recordResult(
      "TC-ETU-03",
      "Synthèse & KPI d'Assiduité / Réconciliation des Heures",
      ok,
      `Heures : ${stats.totalHeuresDispensées}h dispensées = ${stats.totalHeuresPrésent}h prés. + ${stats.totalHeuresAbsent}h abs. + ${stats.totalHeuresNonMarque}h en attente. ` +
        `Taux assiduité : ${stats.tauxPresence}%. Moyenne générale : ${data.moyenneGenerale}/20.`
    );
  } catch (err) {
    recordResult("TC-ETU-03", "Synthèse & KPI d'Assiduité / Réconciliation des Heures", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-04 : Confidentialité & Protection des Données Personnelles (RGPD / OWASP)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/etudiants/33021`);
    const data = await res.json();
    const contact = data.etudiant?.contact;
    const email = data.etudiant?.email;

    // Vérifier que le contact et l'email sont masqués par des étoiles et ne fuient pas en clair
    const isContactMasked = contact && contact.includes("****") && !contact.match(/^[0-9+]{8,15}$/);
    const isEmailMasked = email && email.includes("***@") && !email.match(/^[a-zA-Z0-9._%+-]{4,}@/);

    const ok = isContactMasked && isEmailMasked;

    recordResult(
      "TC-ETU-04",
      "Confidentialité & Protection des Données Personnelles (RGPD / OWASP)",
      ok,
      `Téléphone masqué côté serveur : "${contact}". Email masqué : "${email}". Aucune PII en clair exposée sur l'API publique.`
    );
  } catch (err) {
    recordResult("TC-ETU-04", "Confidentialité & Protection des Données Personnelles (RGPD / OWASP)", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-05 : Notes & Évaluations Pédagogiques Détaillées
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/etudiants/33021`);
    const data = await res.json();

    const matieres = data.matieres || [];
    const gl = matieres.find((m) => m.code === "GL");

    const hasGl = !!gl;
    const hasEval = gl && gl.evaluations && gl.evaluations.length > 0;
    const evalItem = hasEval ? gl.evaluations[0] : null;

    const isEvalComplete =
      evalItem &&
      evalItem.titre === "Contrôle Continu 1 - Conception & Patterns" &&
      evalItem.valeur === 16.5 &&
      evalItem.coefficient === 2 &&
      evalItem.noteMax === 20 &&
      evalItem.commentaire === "Très bon travail" &&
      typeof evalItem.moyenneClasse === "number";

    const ok = hasGl && hasEval && isEvalComplete;

    recordResult(
      "TC-ETU-05",
      "Notes & Évaluations Pédagogiques Détaillées",
      ok,
      `Matière GL : Évaluation "${evalItem?.titre}", Note : ${evalItem?.valeur}/${evalItem?.noteMax} (Coef: ${evalItem?.coefficient}), ` +
        `Moyenne classe : ${evalItem?.moyenneClasse}/20, Commentaire : "${evalItem?.commentaire}".`
    );
  } catch (err) {
    recordResult("TC-ETU-05", "Notes & Évaluations Pédagogiques Détaillées", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-06 : Assiduité & Historique Détaillé des Séances
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/etudiants/33021`);
    const data = await res.json();
    const historique = data.historiquePresences || [];

    const hasEntries = historique.length > 0;
    const hasPresent = historique.some((p) => p.statut === "PRESENT");
    const hasAbsent = historique.some((p) => p.statut === "ABSENT");

    const firstEntry = historique[0];
    const hasDetails =
      firstEntry &&
      firstEntry.seance?.date &&
      firstEntry.seance?.nombreHeures > 0 &&
      firstEntry.seance?.matiereNom;

    const ok = hasEntries && hasPresent && hasAbsent && hasDetails;

    recordResult(
      "TC-ETU-06",
      "Assiduité & Historique Détaillé des Séances",
      ok,
      `${historique.length} séances émargées dans l'historique chronologique. Statuts constatés : Présent & Absent avec date, matière et volume horaire.`
    );
  } catch (err) {
    recordResult("TC-ETU-06", "Assiduité & Historique Détaillé des Séances", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-07 : Vue de Promotion & Anonymisation des Camarades (RGPD)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/etudiants/33021`);
    const data = await res.json();
    const camarades = data.classeCamarades || [];

    const hasCohort = camarades.length >= 2;
    const me = camarades.find((c) => c.isMe);
    const others = camarades.filter((c) => !c.isMe);

    // Vérifier que l'étudiant est identifié avec son vrai nom
    const isMeIdentified =
      me &&
      me.matricule === "33021" &&
      me.nom === "AGBATO";

    // Vérifier que TOUS les autres camarades sont anonymisés (nom = Auditeur, prenom = #X, matricule = AUD-XXX)
    const areOthersAnonymized =
      others.length > 0 &&
      others.every(
        (c) =>
          c.nom === "Auditeur" &&
          c.prenom.startsWith("#") &&
          c.matricule.startsWith("AUD-")
      );

    const ok = hasCohort && isMeIdentified && areOthersAnonymized;

    recordResult(
      "TC-ETU-07",
      "Vue de Promotion & Anonymisation des Camarades (RGPD)",
      ok,
      `Promotion de ${camarades.length} étudiants. Étudiant repéré avec badge "Moi" (${me?.nom}). ` +
        `Les ${others.length} autres camarades sont 100% anonymisés (ex: "${others[0]?.nom} ${others[0]?.prenom}", matricule "${others[0]?.matricule}").`
    );
  } catch (err) {
    recordResult("TC-ETU-07", "Vue de Promotion & Anonymisation des Camarades (RGPD)", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ETU-08 : Gestion Rigoureuse des Matières à 0 Heure Dispensée
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/etudiants/33021`);
    const data = await res.json();
    const matieres = data.matieres || [];

    const zeroHourMatieres = matieres.filter((m) => m.heuresDispensées === 0);
    const hasZeroHour = zeroHourMatieres.length > 0;

    // Toutes les matières à 0h dispensée doivent avoir tauxPresence === null (aucun faux 100% ou 0%)
    const allNullTaux = zeroHourMatieres.every((m) => m.tauxPresence === null);

    const ok = hasZeroHour && allNullTaux;

    recordResult(
      "TC-ETU-08",
      "Gestion Rigoureuse des Matières à 0 Heure Dispensée",
      ok,
      `${zeroHourMatieres.length} matière(s) sans séance (ex: ${zeroHourMatieres.map((m) => m.code).join(", ")}). ` +
        `Taux de présence strictement null (aucun faux 100% artificiel affiché).`
    );
  } catch (err) {
    recordResult("TC-ETU-08", "Gestion Rigoureuse des Matières à 0 Heure Dispensée", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // Synthèse Finale
  // -------------------------------------------------------------------------
  console.log("\n=====================================================================");
  console.log("📊 BILAN DE LA SUITE DE TESTS E2E ÉTUDIANT");
  console.log("=====================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;

  console.log(`Total tests : ${total}`);
  console.log(`✅ Réussis   : ${passed}`);
  console.log(`❌ Échoués   : ${failed}`);
  console.log(`Taux succès : ${Math.round((passed / total) * 100)}%`);

  await prisma.$disconnect();

  if (failed > 0) {
    console.error("\n❌ Certains tests ont échoué.");
    process.exit(1);
  } else {
    console.log("\n🎉 TOUS LES TESTS DU PARCOURS ÉTUDIANT SONT VALIDÉS AVEC SUCCÈS !");
    process.exit(0);
  }
}

runE2EStudentSuite().catch(async (e) => {
  console.error("Erreur critique d'exécution:", e);
  await prisma.$disconnect();
  process.exit(1);
});
