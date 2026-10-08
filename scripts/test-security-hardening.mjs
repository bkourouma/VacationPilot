import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3600";
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_jwt_secret_dev_32_chars_minimum_here!"
);

async function makeToken(payload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET_KEY);
}

const results = [];
function recordResult(code, title, success, details, error = null) {
  results.push({ code, title, success, details, error });
  const icon = success ? "✅ PASS" : "❌ FAIL";
  console.log(`[${icon}] ${code} — ${title}`);
  if (details) console.log(`   Détails : ${details}`);
  if (error) console.error(`   Erreur :`, error);
}

async function runTests() {
  console.log("=====================================================================");
  console.log("🔒 TEST SUITE: DURCISSEMENT DES ACCÈS & SÉCURITÉ (EDUPRESENCE)");
  console.log("=====================================================================\n");

  // Fetch some real DB records for testing
  const classes = await prisma.classe.findMany();
  if (classes.length < 2) {
    console.warn("Attention: Moins de 2 classes trouvées en base.");
  }
  const targetClasse = classes[0];
  const otherClasse = classes[1] || classes[0];

  const seances = await prisma.seance.findMany();
  const targetSeance = seances[0];

  const evaluations = await prisma.evaluation.findMany();
  const targetEvaluation = evaluations[0];

  // Tokens
  const adminToken = await makeToken({
    userId: "admin-id",
    username: "admin",
    nom: "Admin Test",
    role: "ADMINISTRATION",
  });

  const teacherToken = await makeToken({
    userId: "ens-id",
    username: "enseignant",
    nom: "Enseignant Test",
    role: "ENSEIGNANT",
  });

  const chefTokenTargetClasse = await makeToken({
    userId: "chef-1",
    username: "chef1",
    nom: "Chef Classe Target",
    role: "CHEF_CLASSE",
    classeId: targetClasse?.id,
  });

  const chefTokenOtherClasse = await makeToken({
    userId: "chef-2",
    username: "chef2",
    nom: "Chef Classe Other",
    role: "CHEF_CLASSE",
    classeId: otherClasse?.id,
  });

  // ---------------------------------------------------------------------------
  // 1. Export Notes Excel
  // ---------------------------------------------------------------------------
  console.log("--- 1. /api/export/notes-excel ---");
  try {
    // 1.1 Sans session -> 403
    const resNoAuth = await fetch(`${BASE_URL}/api/export/notes-excel?classeId=${targetClasse.id}`);
    const okNoAuth = resNoAuth.status === 403;
    recordResult("SEC-01A", "Export notes sans session -> 403", okNoAuth, `Status HTTP: ${resNoAuth.status}`);

    // 1.2 CHEF_CLASSE -> 403
    const resChef = await fetch(`${BASE_URL}/api/export/notes-excel?classeId=${targetClasse.id}`, {
      headers: { cookie: `auth_token=${chefTokenTargetClasse}` },
    });
    const okChef = resChef.status === 403;
    recordResult("SEC-01B", "Export notes avec CHEF_CLASSE -> 403 (Strictement bloqué)", okChef, `Status HTTP: ${resChef.status}`);

    // 1.3 ENSEIGNANT -> 200
    const resEns = await fetch(`${BASE_URL}/api/export/notes-excel?classeId=${targetClasse.id}`, {
      headers: { cookie: `auth_token=${teacherToken}` },
    });
    const okEns = resEns.status === 200;
    recordResult("SEC-01C", "Export notes avec ENSEIGNANT -> 200", okEns, `Status HTTP: ${resEns.status}`);

    // 1.4 ADMINISTRATION -> 200
    const resAdmin = await fetch(`${BASE_URL}/api/export/notes-excel?classeId=${targetClasse.id}`, {
      headers: { cookie: `auth_token=${adminToken}` },
    });
    const okAdmin = resAdmin.status === 200;
    recordResult("SEC-01D", "Export notes avec ADMINISTRATION -> 200", okAdmin, `Status HTTP: ${resAdmin.status}`);
  } catch (err) {
    recordResult("SEC-01", "Export notes Excel", false, null, err.message);
  }

  // ---------------------------------------------------------------------------
  // 2. Export Présences Excel
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. /api/export/presences-excel ---");
  try {
    // 2.1 Sans session -> 401
    const resNoAuth = await fetch(`${BASE_URL}/api/export/presences-excel?classeId=${targetClasse.id}`);
    const okNoAuth = resNoAuth.status === 401;
    recordResult("SEC-02A", "Export présences sans session -> 401", okNoAuth, `Status HTTP: ${resNoAuth.status}`);

    // 2.2 CHEF_CLASSE classe différente -> 403
    if (classes.length >= 2) {
      const resChefDiff = await fetch(`${BASE_URL}/api/export/presences-excel?classeId=${targetClasse.id}`, {
        headers: { cookie: `auth_token=${chefTokenOtherClasse}` },
      });
      const okChefDiff = resChefDiff.status === 403;
      recordResult("SEC-02B", "Export présences CHEF_CLASSE mauvaise classe -> 403", okChefDiff, `Status HTTP: ${resChefDiff.status}`);
    }

    // 2.3 CHEF_CLASSE sa classe -> 200
    const resChefSame = await fetch(`${BASE_URL}/api/export/presences-excel?classeId=${targetClasse.id}`, {
      headers: { cookie: `auth_token=${chefTokenTargetClasse}` },
    });
    const okChefSame = resChefSame.status === 200;
    recordResult("SEC-02C", "Export présences CHEF_CLASSE sa propre classe -> 200", okChefSame, `Status HTTP: ${resChefSame.status}`);

    // 2.4 ADMINISTRATION -> 200
    const resAdmin = await fetch(`${BASE_URL}/api/export/presences-excel?classeId=${targetClasse.id}`, {
      headers: { cookie: `auth_token=${adminToken}` },
    });
    const okAdmin = resAdmin.status === 200;
    recordResult("SEC-02D", "Export présences ADMINISTRATION -> 200", okAdmin, `Status HTTP: ${resAdmin.status}`);
  } catch (err) {
    recordResult("SEC-02", "Export présences Excel", false, null, err.message);
  }

  // ---------------------------------------------------------------------------
  // 3. /api/notes/evaluations & /api/notes/evaluations/[id]
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. /api/notes/evaluations & [id] ---");
  try {
    // 3.1 Evaluations list sans session -> 401
    const resEvalNoAuth = await fetch(`${BASE_URL}/api/notes/evaluations`);
    const okEvalNoAuth = resEvalNoAuth.status === 401;
    recordResult("SEC-03A", "GET evaluations sans session -> 401", okEvalNoAuth, `Status HTTP: ${resEvalNoAuth.status}`);

    // 3.2 Evaluations list CHEF_CLASSE -> 403
    const resEvalChef = await fetch(`${BASE_URL}/api/notes/evaluations`, {
      headers: { cookie: `auth_token=${chefTokenTargetClasse}` },
    });
    const okEvalChef = resEvalChef.status === 403;
    recordResult("SEC-03B", "GET evaluations avec CHEF_CLASSE -> 403", okEvalChef, `Status HTTP: ${resEvalChef.status}`);

    // 3.3 Evaluations list ADMINISTRATION -> 200
    const resEvalAdmin = await fetch(`${BASE_URL}/api/notes/evaluations`, {
      headers: { cookie: `auth_token=${adminToken}` },
    });
    const okEvalAdmin = resEvalAdmin.status === 200;
    recordResult("SEC-03C", "GET evaluations avec ADMINISTRATION -> 200", okEvalAdmin, `Status HTTP: ${resEvalAdmin.status}`);

    if (targetEvaluation) {
      // 3.4 Evaluation [id] sans session -> 401
      const resIdNoAuth = await fetch(`${BASE_URL}/api/notes/evaluations/${targetEvaluation.id}`);
      const okIdNoAuth = resIdNoAuth.status === 401;
      recordResult("SEC-03D", "GET evaluation/[id] sans session -> 401", okIdNoAuth, `Status HTTP: ${resIdNoAuth.status}`);

      // 3.5 Evaluation [id] CHEF_CLASSE -> 403
      const resIdChef = await fetch(`${BASE_URL}/api/notes/evaluations/${targetEvaluation.id}`, {
        headers: { cookie: `auth_token=${chefTokenTargetClasse}` },
      });
      const okIdChef = resIdChef.status === 403;
      recordResult("SEC-03E", "GET evaluation/[id] avec CHEF_CLASSE -> 403", okIdChef, `Status HTTP: ${resIdChef.status}`);

      // 3.6 Evaluation [id] ADMINISTRATION -> 200
      const resIdAdmin = await fetch(`${BASE_URL}/api/notes/evaluations/${targetEvaluation.id}`, {
        headers: { cookie: `auth_token=${adminToken}` },
      });
      const okIdAdmin = resIdAdmin.status === 200;
      recordResult("SEC-03F", "GET evaluation/[id] avec ADMINISTRATION -> 200", okIdAdmin, `Status HTTP: ${resIdAdmin.status}`);
    }
  } catch (err) {
    recordResult("SEC-03", "Notes evaluations security", false, null, err.message);
  }

  // ---------------------------------------------------------------------------
  // 4. /api/seances/[id] & /api/classes/[id]
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. /api/seances/[id] & /api/classes/[id] ---");
  try {
    if (targetSeance) {
      // 4.1 Seance [id] sans session -> 401
      const resSeanceNoAuth = await fetch(`${BASE_URL}/api/seances/${targetSeance.id}`);
      const okSeanceNoAuth = resSeanceNoAuth.status === 401;
      recordResult("SEC-04A", "GET seances/[id] sans session -> 401", okSeanceNoAuth, `Status HTTP: ${resSeanceNoAuth.status}`);

      // 4.2 Seance [id] avec session -> 200
      const resSeanceAuth = await fetch(`${BASE_URL}/api/seances/${targetSeance.id}`, {
        headers: { cookie: `auth_token=${adminToken}` },
      });
      const okSeanceAuth = resSeanceAuth.status === 200;
      recordResult("SEC-04B", "GET seances/[id] avec session -> 200", okSeanceAuth, `Status HTTP: ${resSeanceAuth.status}`);
    }

    // 4.3 Classe [id] sans session -> 401
    const resClasseNoAuth = await fetch(`${BASE_URL}/api/classes/${targetClasse.id}`);
    const okClasseNoAuth = resClasseNoAuth.status === 401;
    recordResult("SEC-04C", "GET classes/[id] sans session -> 401", okClasseNoAuth, `Status HTTP: ${resClasseNoAuth.status}`);

    if (classes.length >= 2) {
      // 4.4 Classe [id] CHEF_CLASSE mauvaise classe -> 403
      const resClasseChefDiff = await fetch(`${BASE_URL}/api/classes/${targetClasse.id}`, {
        headers: { cookie: `auth_token=${chefTokenOtherClasse}` },
      });
      const okClasseChefDiff = resClasseChefDiff.status === 403;
      recordResult("SEC-04D", "GET classes/[id] CHEF_CLASSE autre classe -> 403", okClasseChefDiff, `Status HTTP: ${resClasseChefDiff.status}`);
    }

    // 4.5 Classe [id] CHEF_CLASSE sa propre classe -> 200
    const resClasseChefSame = await fetch(`${BASE_URL}/api/classes/${targetClasse.id}`, {
      headers: { cookie: `auth_token=${chefTokenTargetClasse}` },
    });
    const okClasseChefSame = resClasseChefSame.status === 200;
    recordResult("SEC-04E", "GET classes/[id] CHEF_CLASSE sa classe -> 200", okClasseChefSame, `Status HTTP: ${resClasseChefSame.status}`);

    // 4.6 Classe [id] ADMINISTRATION -> 200
    const resClasseAdmin = await fetch(`${BASE_URL}/api/classes/${targetClasse.id}`, {
      headers: { cookie: `auth_token=${adminToken}` },
    });
    const okClasseAdmin = resClasseAdmin.status === 200;
    recordResult("SEC-04F", "GET classes/[id] ADMINISTRATION -> 200", okClasseAdmin, `Status HTTP: ${resClasseAdmin.status}`);
  } catch (err) {
    recordResult("SEC-04", "Seances / Classes [id]", false, null, err.message);
  }

  // ---------------------------------------------------------------------------
  // 6. Middleware Next.js
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Middleware Protection /dashboard ---");
  try {
    // 6.1 Sans token sur /dashboard -> redirection vers /
    const resDashNoAuth = await fetch(`${BASE_URL}/dashboard`, {
      redirect: "manual",
    });
    const isRedirectNoAuth =
      (resDashNoAuth.status === 307 || resDashNoAuth.status === 302 || resDashNoAuth.status === 308) &&
      (resDashNoAuth.headers.get("location") === "/" || resDashNoAuth.headers.get("location") === `${BASE_URL}/`);
    recordResult(
      "SEC-06A",
      "Accès /dashboard sans token -> Redirection vers /",
      isRedirectNoAuth,
      `Status HTTP: ${resDashNoAuth.status}, Location: ${resDashNoAuth.headers.get("location")}`
    );

    // 6.2 Token invalide sur /dashboard/notes -> redirection vers /
    const resDashInvalidToken = await fetch(`${BASE_URL}/dashboard/notes`, {
      headers: { cookie: "auth_token=invalid_token_xyz" },
      redirect: "manual",
    });
    const isRedirectInvalid =
      (resDashInvalidToken.status === 307 || resDashInvalidToken.status === 302 || resDashInvalidToken.status === 308) &&
      (resDashInvalidToken.headers.get("location") === "/" || resDashInvalidToken.headers.get("location") === `${BASE_URL}/`);
    recordResult(
      "SEC-06B",
      "Accès /dashboard/notes avec token invalide -> Redirection vers /",
      isRedirectInvalid,
      `Status HTTP: ${resDashInvalidToken.status}, Location: ${resDashInvalidToken.headers.get("location")}`
    );

    // 6.3 Token valide sur /dashboard -> Passe le middleware (pas de redirection vers /)
    const resDashValid = await fetch(`${BASE_URL}/dashboard`, {
      headers: { cookie: `auth_token=${adminToken}` },
      redirect: "manual",
    });
    const okDashValid = resDashValid.status === 200 || (resDashValid.status !== 307 && resDashValid.status !== 302);
    recordResult(
      "SEC-06C",
      "Accès /dashboard avec token valide -> Autorisé (pas de redirection vers /)",
      okDashValid,
      `Status HTTP: ${resDashValid.status}`
    );
  } catch (err) {
    recordResult("SEC-06", "Middleware Next.js", false, null, err.message);
  }

  // ---------------------------------------------------------------------------
  // Bilan
  // ---------------------------------------------------------------------------
  console.log("\n=====================================================================");
  console.log("📊 BILAN DES TESTS DE SÉCURITÉ");
  console.log("=====================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;

  console.log(`Total: ${total} | Succès: ${passed} | Échecs: ${failed}`);
  if (failed === 0) {
    console.log("🎉 TOUTES LES RÈGLES DE SÉCURITÉ ET DE CONTRÔLE D'ACCÈS SONT VALIDÉES !");
  } else {
    console.log("⚠️ Certains contrôles de sécurité ont échoué.");
    process.exitCode = 1;
  }
}

runTests()
  .catch((e) => {
    console.error("Erreur critique:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
