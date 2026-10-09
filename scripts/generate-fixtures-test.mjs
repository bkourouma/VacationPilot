// Génère les fichiers de test utilisés par docs/GUIDE_TEST_UTILISATEUR_COMPLET.md
// Usage : node scripts/generate-fixtures-test.mjs
// Sortie : docs/jeux-de-donnees/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../docs/jeux-de-donnees");
fs.mkdirSync(outDir, { recursive: true });

function writeXlsx(fileName, rows, sheetName = "Auditeurs") {
  const ws = xlsx.utils.aoa_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  xlsx.writeFile(wb, path.join(outDir, fileName));
  console.log("OK", fileName);
}

// 1. Liste avec en-têtes, ligne vide et ligne TOTAL (doit être ignorée) -> 5 auditeurs L3-INFO-B
writeXlsx("etudiants_L3-INFO-B_avec_entetes.xlsx", [
  ["MATRICULE", "NOM", "PRENOM", "CONTACT", "EMAIL"],
  ["35006", "SANGARE", "Mamadou", "07 47 90 12 54", "mamadou.sangare@gmail.com"],
  ["35007", "BAMBA", "Aïcha", "01 40 28 73 95", "aicha.bamba@gmail.com"],
  [],
  ["35008", "N'DRI", "Jean-Baptiste", "05 06 49 81 37", "jb.ndri@gmail.com"],
  ["35009", "OUATTARA", "Salimata", "07 11 52 04 68", "salimata.ouattara@gmail.com"],
  ["35010", "GOHI", "Ange Raphaël", "01 52 36 87 49", "ange.gohi@gmail.com"],
  ["", "TOTAL", "", "", ""],
]);

// 2. Liste brute sans en-tête, une seule colonne "NOM Prénoms" -> 3 auditeurs M1-GL (matricule auto)
writeXlsx("etudiants_M1-GL_liste_brute.xlsx", [
  ["SORO Lassina"],
  ["ADJOUA Prisca Sandrine"],
  ["KEITA Mohamed Lamine"],
]);

// 3. Fichier sans aucun nom exploitable -> doit être refusé ("Format non reconnu")
writeXlsx(
  "etudiants_format_invalide.xlsx",
  [
    ["REFERENCE", "MONTANT", "DATE"],
    [1001, 25000, "2026-10-05"],
    [1002, 18000, "2026-10-06"],
    [1003, 42000, "2026-10-07"],
  ],
  "Factures"
);

// 4. Fichier texte déguisé pour tester le refus d'un format non Word
fs.writeFileSync(
  path.join(outDir, "syllabus_DEVWEB_non_word.txt"),
  "Ceci n'est pas un document Word (.docx). Il doit être refusé par l'import IA.\n",
  "utf8"
);
console.log("OK syllabus_DEVWEB_non_word.txt");

// 5. Plan de cours Word (.docx) pour l'import par IA
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const p = (text, bold = false) =>
  `<w:p><w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;

const paragraphs = [
  p("PLAN DE COURS — DÉVELOPPEMENT WEB & APPLICATIONS CLOUD", true),
  p("Licence 3 Informatique — Année académique 2026-2027 — Volume horaire : 30 heures"),
  p("Enseignant responsable : Dr. Ibrahim KONÉ"),
  p("1. Présentation et objectifs", true),
  p(
    "Ce module vise à rendre l'étudiant capable de concevoir, développer et déployer une application web moderne reliée à une API."
  ),
  p("2. Découpage du cours", true),
  p("Chapitre 1 : Fondamentaux du Web — HTML5 et CSS3", true),
  p("1.1 Structure d'une page HTML5 sémantique"),
  p("1.2 Mise en forme CSS3 et Flexbox"),
  p("1.3 Design responsive (media queries)"),
  p("Chapitre 2 : JavaScript moderne (ES6+)", true),
  p("2.1 Variables, fonctions fléchées et modules"),
  p("2.2 Manipulation du DOM"),
  p("2.3 Appels asynchrones (fetch, async/await)"),
  p("Chapitre 3 : Développement d'APIs REST avec Node.js", true),
  p("3.1 Routes et contrôleurs"),
  p("3.2 Validation des données entrantes"),
  p("3.3 Authentification par jeton JWT"),
  p("Chapitre 4 : Bases de données et persistance", true),
  p("4.1 Modélisation relationnelle"),
  p("4.2 Utilisation d'un ORM (Prisma)"),
  p("Chapitre 5 : Déploiement cloud et DevOps", true),
  p("5.1 Conteneurisation avec Docker"),
  p("5.2 Intégration et déploiement continus (CI/CD)"),
  p("3. Modalités d'évaluation", true),
  p("Un devoir sur table (coefficient 1) et un projet de fin de module (coefficient 2)."),
  p("4. Bibliographie", true),
  p("Mozilla Developer Network (MDN Web Docs) ; documentation officielle Node.js ; documentation Prisma."),
];

const documentXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>` +
  paragraphs.join("") +
  `</w:body></w:document>`;

const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `</Types>`
);
zip.file(
  "_rels/.rels",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
    `</Relationships>`
);
zip.file("word/document.xml", documentXml);

const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
fs.writeFileSync(path.join(outDir, "plan_de_cours_DEVWEB.docx"), buf);
console.log("OK plan_de_cours_DEVWEB.docx");
