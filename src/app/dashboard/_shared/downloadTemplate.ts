import * as XLSX from "xlsx";

/** Génère et télécharge un modèle Excel d'import d'étudiants. */
export function downloadStudentTemplate(classeCode?: string) {
  const sampleData = [
    {
      MATRICULE: "34001",
      NOM: "KOUAME",
      PRENOM: "Jean-Marc",
      CONTACT: "07 01 02 03 04",
      EMAIL: "jean.kouame@gmail.com",
    },
    {
      MATRICULE: "34002",
      NOM: "KONE",
      PRENOM: "Aminata",
      CONTACT: "05 11 22 33 44",
      EMAIL: "aminata.kone@gmail.com",
    },
    {
      MATRICULE: "34003",
      NOM: "TRAORE",
      PRENOM: "Bakary",
      CONTACT: "01 55 66 77 88",
      EMAIL: "bakary.traore@gmail.com",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Auditeurs");
  XLSX.writeFile(workbook, `Modele_Import_Etudiants_${classeCode || "Classe"}.xlsx`);
}
