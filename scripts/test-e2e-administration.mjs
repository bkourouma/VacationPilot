import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3600";

let adminCookie = null;
let createdChefId = null;
let createdClasseId = null;
let createdStudentId = null;

const results = [];

function recordResult(code, title, success, details, error = null) {
  results.push({ code, title, success, details, error });
  const icon = success ? "✅ PASS" : "❌ FAIL";
  console.log(`\n[${icon}] ${code} — ${title}`);
  if (details) console.log(`   Détails : ${details}`);
  if (error) console.error(`   Erreur :`, error);
}

async function runE2EAdminSuite() {
  console.log("=====================================================================");
  console.log("🏛️  SUITE DE TESTS E2E AUTOMATISÉE — ADMINISTRATION & DIRECTION");
  console.log(`   Cible : ${BASE_URL} | Date : ${new Date().toISOString()}`);
  console.log("=====================================================================");

  // -------------------------------------------------------------------------
  // TC-ADM-01 : Authentification Admin & Console de Supervision
  // -------------------------------------------------------------------------
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login échoué avec statut ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    adminCookie = loginRes.headers.get("set-cookie");

    if (!adminCookie) {
      throw new Error("Cookie de session auth_token non reçu dans les en-têtes");
    }

    // Vérifier l'API /api/auth/me avec ce cookie
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { cookie: adminCookie },
    });
    const meData = await meRes.json();

    const ok =
      loginData.user?.role === "ADMINISTRATION" &&
      meData.user?.role === "ADMINISTRATION" &&
      meData.user?.username === "admin";

    recordResult(
      "TC-ADM-01",
      "Authentification Admin & Console de Supervision",
      ok,
      `Connecté en tant que "${meData.user?.nom}" (Rôle: ${meData.user?.role}). Cookie de session validé.`
    );
  } catch (err) {
    recordResult("TC-ADM-01", "Authentification Admin & Console de Supervision", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-02 : Pilotage Global & Détection Automatique des Retards
  // -------------------------------------------------------------------------
  try {
    const progRes = await fetch(`${BASE_URL}/api/admin/progression`, {
      headers: { cookie: adminCookie },
    });

    if (!progRes.ok) throw new Error(`Status HTTP ${progRes.status}`);
    const data = await progRes.json();

    const hasStats =
      data.globalStats &&
      typeof data.globalStats.totalVolumePrevu === "number" &&
      typeof data.globalStats.totalHeuresEffectuees === "number" &&
      typeof data.globalStats.tauxRealisationGlobal === "number";

    const hasAlerts = Array.isArray(data.alertesGlobales);
    const hasClasses = Array.isArray(data.classes) && data.classes.length > 0;

    const ok = hasStats && hasAlerts && hasClasses;

    recordResult(
      "TC-ADM-02",
      "Pilotage Global & Détection Automatique des Retards",
      ok,
      `Volume global : ${data.globalStats?.totalHeuresEffectuees}h/${data.globalStats?.totalVolumePrevu}h (${data.globalStats?.tauxRealisationGlobal}%). ` +
        `${data.classes?.length} classes, ${data.alertesGlobales?.length} alertes actives détectées.`
    );
  } catch (err) {
    recordResult("TC-ADM-02", "Pilotage Global & Détection Automatique des Retards", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-03 : Paramétrage Global & Moteur IA
  // -------------------------------------------------------------------------
  try {
    const configRes = await fetch(`${BASE_URL}/api/config/ai`, {
      headers: { cookie: adminCookie },
    });
    if (!configRes.ok) throw new Error(`Status config ${configRes.status}`);
    const configData = await configRes.json();

    const testRes = await fetch(`${BASE_URL}/api/config/ai/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ model: configData.model || "deepseek/deepseek-chat" }),
    });
    const testData = await testRes.json();

    const ok = testRes.ok && testData.success === true;
    recordResult(
      "TC-ADM-03",
      "Paramétrage Global & Intelligence Artificielle",
      ok,
      `Moteur actif: "${configData.model}". Test connectivité: ${testData.message}`
    );
  } catch (err) {
    recordResult("TC-ADM-03", "Paramétrage Global & Intelligence Artificielle", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-04 : Gestion des Accès & Délégués de Classe
  // -------------------------------------------------------------------------
  try {
    // Récupérer une classe cible
    const classesRes = await fetch(`${BASE_URL}/api/classes`, {
      headers: { cookie: adminCookie },
    });
    const classes = await classesRes.json();
    const targetClass = classes[0];

    // Nettoyer si existant
    await prisma.user.deleteMany({ where: { username: "chef_test_adm" } });

    const createChefRes = await fetch(`${BASE_URL}/api/chefs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        username: "chef_test_adm",
        nom: "KONE Moussa Test",
        password: "password123",
        classeId: targetClass.id,
      }),
    });

    if (!createChefRes.ok) {
      const err = await createChefRes.json();
      throw new Error(err.error || `Status HTTP ${createChefRes.status}`);
    }

    const createdChef = await createChefRes.json();
    createdChefId = createdChef.id;

    // Tester la connexion immédiate avec le compte chef créé
    const chefLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "chef_test_adm", password: "password123" }),
    });
    const chefLoginData = await chefLoginRes.json();

    const ok =
      createdChef.username === "chef_test_adm" &&
      chefLoginData.user?.role === "CHEF_CLASSE" &&
      chefLoginData.user?.classeId === targetClass.id;

    recordResult(
      "TC-ADM-04",
      "Gestion des Accès & Chefs de Classe",
      ok,
      `Compte chef "${createdChef.nom}" créé avec succès et authentifié avec rôle CHEF_CLASSE sur ${targetClass.code}.`
    );
  } catch (err) {
    recordResult("TC-ADM-04", "Gestion des Accès & Chefs de Classe", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-05 : Structure Pédagogique & Création de Classe
  // -------------------------------------------------------------------------
  try {
    // Nettoyer ancienne classe de test si existante
    const oldClasse = await prisma.classe.findUnique({ where: { code: "M1-DATA" } });
    if (oldClasse) {
      await prisma.classe.delete({ where: { id: oldClasse.id } });
    }

    const newClassRes = await fetch(`${BASE_URL}/api/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        code: "M1-DATA",
        nom: "Master 1 Data Science & IA",
        anneeScolaire: "2025-2026",
      }),
    });

    if (!newClassRes.ok) {
      const err = await newClassRes.json();
      throw new Error(err.error || `Erreur création classe status ${newClassRes.status}`);
    }

    const createdClasse = await newClassRes.json();
    createdClasseId = createdClasse.id;

    // Récupérer un enseignant
    const ens = await prisma.user.findFirst({ where: { role: "ENSEIGNANT" } });

    // Programmer un cours dans cette classe
    const programCourseRes = await fetch(`${BASE_URL}/api/classes/${createdClasseId}/cours`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        code: "BDD",
        nom: "Bases de Données Avancées",
        volumeHoraire: 30,
        coefficient: 2.0,
        enseignantId: ens?.id,
      }),
    });

    if (!programCourseRes.ok) {
      const err = await programCourseRes.json();
      throw new Error(err.error || `Erreur programmation cours status ${programCourseRes.status}`);
    }

    const programmedCourse = await programCourseRes.json();

    const ok =
      createdClasse.code === "M1-DATA" &&
      programmedCourse.volumeHoraire === 30 &&
      programmedCourse.coefficient === 2;

    recordResult(
      "TC-ADM-05",
      "Structure Pédagogique & Création de Classe",
      ok,
      `Classe M1-DATA créée avec succès. Cours [BDD] programmé (30h, coeff 2.0, Enseignant: ${ens?.nom}).`
    );
  } catch (err) {
    recordResult("TC-ADM-05", "Structure Pédagogique & Création de Classe", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-06 : Annuaire Centralisé & Inscription d'Étudiants
  // -------------------------------------------------------------------------
  try {
    // Nettoyer si existant
    await prisma.etudiant.deleteMany({ where: { matricule: "35001" } });

    const addStudentRes = await fetch(`${BASE_URL}/api/etudiants`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: adminCookie },
      body: JSON.stringify({
        matricule: "35001",
        nom: "TRAORE",
        prenom: "Aïssatou",
        contact: "0701020304",
        email: "aissatou.traore@edupresence.com",
        classeId: createdClasseId,
      }),
    });

    if (!addStudentRes.ok) {
      const err = await addStudentRes.json();
      throw new Error(err.error || `Erreur inscription status ${addStudentRes.status}`);
    }

    // Vérifier consultation de l'étudiant
    const getStudentRes = await fetch(`${BASE_URL}/api/etudiants/35001`, {
      headers: { cookie: adminCookie },
    });
    const studentData = await getStudentRes.json();

    const ok =
      studentData.etudiant?.matricule === "35001" &&
      studentData.etudiant?.nom === "TRAORE" &&
      studentData.etudiant?.classe?.code === "M1-DATA";

    recordResult(
      "TC-ADM-06",
      "Annuaire Centralisé & Inscription d'Étudiants",
      ok,
      `Étudiante 35001 (TRAORE Aïssatou) inscrite et rattachée à M1-DATA avec succès.`
    );
  } catch (err) {
    recordResult("TC-ADM-06", "Annuaire Centralisé & Inscription d'Étudiants", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-07 : Consultation Transversale des Évaluations & Notes
  // -------------------------------------------------------------------------
  try {
    const glClasse = await prisma.classe.findUnique({ where: { code: "LPRIGL-A" } });
    const glMatiere = await prisma.matiere.findUnique({ where: { code: "GL" } });

    const evalsRes = await fetch(
      `${BASE_URL}/api/notes/evaluations?matiereId=${glMatiere.id}&classeId=${glClasse.id}`,
      { headers: { cookie: adminCookie } }
    );

    if (!evalsRes.ok) throw new Error(`Status evaluations ${evalsRes.status}`);
    const evalsData = await evalsRes.json();

    const hasEvals = Array.isArray(evalsData) && evalsData.length > 0;
    const firstEval = evalsData[0];

    const ok = hasEvals && firstEval.notes?.length > 0;

    recordResult(
      "TC-ADM-07",
      "Consultation Transversale des Évaluations & Notes",
      ok,
      `Accès direction validé : ${evalsData.length} évaluation(s) consultée(s) pour LPRIGL-A / GL. ` +
        `"${firstEval?.titre}" — ${firstEval?.notes?.length} notes enregistrées.`
    );
  } catch (err) {
    recordResult("TC-ADM-07", "Consultation Transversale des Évaluations & Notes", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // TC-ADM-08 : Exports Consolidés de l'Établissement
  // -------------------------------------------------------------------------
  try {
    const glClasse = await prisma.classe.findUnique({ where: { code: "LPRIGL-A" } });

    // Export Présences Excel
    const expPresRes = await fetch(
      `${BASE_URL}/api/export/presences-excel?classeId=${glClasse.id}`,
      { headers: { cookie: adminCookie } }
    );
    const presBlob = await expPresRes.blob();

    // Export Notes Excel
    const expNotesRes = await fetch(
      `${BASE_URL}/api/export/notes-excel?classeId=${glClasse.id}`,
      { headers: { cookie: adminCookie } }
    );
    const notesBlob = await expNotesRes.blob();

    const presOk = expPresRes.ok && presBlob.size > 1000;
    const notesOk = expNotesRes.ok && notesBlob.size > 1000;

    const ok = presOk && notesOk;

    recordResult(
      "TC-ADM-08",
      "Exports Consolidés de l'Établissement (Excel)",
      ok,
      `Relevés Excel générés : Présences (${presBlob.size} octets), Notes (${notesBlob.size} octets). Format conforme.`
    );
  } catch (err) {
    recordResult("TC-ADM-08", "Exports Consolidés de l'Établissement (Excel)", false, null, err.message);
  }

  // -------------------------------------------------------------------------
  // Synthèse Finale
  // -------------------------------------------------------------------------
  console.log("\n=====================================================================");
  console.log("📊 BILAN DE LA SUITE DE TESTS E2E DIRECTION & ADMINISTRATION");
  console.log("=====================================================================");
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`Résultats : ${passed} PASS / ${results.length} total (${failed} FAIL)`);

  if (failed === 0) {
    console.log("🎉 TOUS LES TESTS E2E DIRECTION ONT ÉTÉ EXÉCUTÉS ET VALIDÉS AVEC SUCCÈS !");
  } else {
    console.log("⚠️ Certains cas de test ont échoué. Consultez le détail ci-dessus.");
  }

  return { passed, failed, total: results.length, results };
}

runE2EAdminSuite()
  .catch((e) => {
    console.error("Erreur critique suite de tests:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
