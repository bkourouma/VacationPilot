"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  CalendarCheck,
  Award,
  FileText,
} from "lucide-react";

interface ClasseItem {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  matieres: { id: string; code: string; nom: string }[];
  etudiants: { id: string; matricule: string; nom: string; prenom: string }[];
}

export default function ExportsPage() {
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // État pour la prévisualisation d'impression
  const [printMode, setPrintMode] = useState<"none" | "fiche_signature" | "releve_notes">("none");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/classes");
        const list = await res.json();
        if (Array.isArray(list)) {
          const fullClasses = await Promise.all(
            list.map(async (c: { id: string }) => {
              const r = await fetch(`/api/classes/${c.id}`);
              return await r.json();
            })
          );
          setClasses(fullClasses);
          if (fullClasses.length > 0) {
            setSelectedClasseId(fullClasses[0].id);
            setSelectedMatiereId(fullClasses[0].matieres[0]?.id || "");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);
  const currentMatiere = currentClasse?.matieres.find((m) => m.id === selectedMatiereId);

  const triggerPrint = (mode: "fiche_signature" | "releve_notes") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête (masqué lors de l'impression) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-blue-600" />
            Exports Excel & Documents à Imprimer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Téléchargez les rapports officiels pour la scolarité ou imprimez les feuilles d&apos;émargement papier
          </p>
        </div>

        {/* Sélecteurs Classe & Matière */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">
              Classe
            </label>
            <select
              value={selectedClasseId}
              onChange={(e) => {
                setSelectedClasseId(e.target.value);
                const c = classes.find((cl) => cl.id === e.target.value);
                setSelectedMatiereId(c?.matieres[0]?.id || "");
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <label className="text-[10px] font-bold text-slate-400 uppercase block">
              Matière
            </label>
            <select
              value={selectedMatiereId}
              onChange={(e) => setSelectedMatiereId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Toutes les matières</option>
              {currentClasse?.matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cartes d'export (masquées à l'impression) */}
      <div className="no-print grid md:grid-cols-2 gap-6">
        {/* Export 1 : Présences Excel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Feuille de Présences & Assiduité (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exporte le tableau récapitulatif complet avec toutes les séances dispensées en colonnes,
              le volume horaire, et les statuts détaillés (Présent, Absent, Retard, Justifié) ainsi que le taux d&apos;assiduité final.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <a
              href={`/api/export/presences-excel?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              Télécharger Excel Présences
            </a>

            <button
              onClick={() => triggerPrint("fiche_signature")}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              title="Imprimer feuille d'émargement papier avec cases de signature"
            >
              <Printer className="w-4 h-4" />
              Émargement papier
            </button>
          </div>
        </div>

        {/* Export 2 : Notes Excel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">
              Relevé de Notes & Moyennes (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exporte la grille des devoirs, examens et interrogations avec leurs coefficients,
              la note maximale et le calcul automatique de la moyenne pondérée pour chaque auditeur.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <a
              href={`/api/export/notes-excel?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              Télécharger Excel Notes
            </a>

            <button
              onClick={() => triggerPrint("releve_notes")}
              className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5"
              title="Imprimer relevé de notes officiel"
            >
              <Printer className="w-4 h-4" />
              Relevé imprimable
            </button>
          </div>
        </div>
      </div>

      {/* Aperçu / Fiche imprimable (affichée lors de l'impression) */}
      {currentClasse && (
        <div className={printMode === "none" ? "hidden" : "print-only block bg-white p-8 text-black"}>
          <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider">
                {printMode === "fiche_signature"
                  ? "FEUILLE D'ÉMARGEMENT ET DE PRÉSENCE EN CLASSE"
                  : "RELEVÉ OFFICIEL DES ÉVALUATIONS ET NOTES"}
              </h1>
              <p className="text-sm font-semibold mt-1">
                Promotion : {currentClasse.nom} ({currentClasse.code}) &bull; Année : {currentClasse.anneeScolaire}
              </p>
              {currentMatiere && (
                <p className="text-xs mt-0.5">
                  Matière : <strong>{currentMatiere.nom}</strong> ({currentMatiere.code})
                </p>
              )}
            </div>
            <div className="text-right text-xs">
              <p>Date : {new Date().toLocaleDateString("fr-FR")}</p>
              <p>Effectif : {currentClasse.etudiants.length} auditeurs</p>
            </div>
          </div>

          {printMode === "fiche_signature" && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-3 border p-2 bg-slate-50">
                <span>Séance N° : .................................</span>
                <span>Horaire : .................... à ....................</span>
                <span>Enseignant / Surveillant : .............................................</span>
              </div>
              <table className="w-full text-left text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold">
                    <th className="border border-black p-2 w-10 text-center">N°</th>
                    <th className="border border-black p-2 w-28">Matricule</th>
                    <th className="border border-black p-2">Nom et Prénom</th>
                    <th className="border border-black p-2 w-36 text-center">Émargement / Signature</th>
                    <th className="border border-black p-2 w-32">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClasse.etudiants.map((et, idx) => (
                    <tr key={et.id} className="border-b border-black">
                      <td className="border border-black p-2 text-center">{idx + 1}</td>
                      <td className="border border-black p-2 font-mono font-bold">{et.matricule}</td>
                      <td className="border border-black p-2 font-semibold">
                        {et.nom} {et.prenom}
                      </td>
                      <td className="border border-black p-2 text-center h-10"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 flex justify-between text-xs">
                <div>
                  <p>Visa du Chef de classe :</p>
                  <div className="h-16 w-48 border border-dashed border-black mt-2"></div>
                </div>
                <div>
                  <p>Signature de l&apos;Enseignant :</p>
                  <div className="h-16 w-48 border border-dashed border-black mt-2"></div>
                </div>
              </div>
            </div>
          )}

          {printMode === "releve_notes" && (
            <div>
              <table className="w-full text-left text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold">
                    <th className="border border-black p-2 w-10 text-center">N°</th>
                    <th className="border border-black p-2 w-28">Matricule</th>
                    <th className="border border-black p-2">Nom et Prénom</th>
                    <th className="border border-black p-2 w-24 text-center">Contrôle 1</th>
                    <th className="border border-black p-2 w-24 text-center">Examen</th>
                    <th className="border border-black p-2 w-24 text-center">Moyenne (/20)</th>
                    <th className="border border-black p-2 w-28 text-center">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClasse.etudiants.map((et, idx) => (
                    <tr key={et.id} className="border-b border-black">
                      <td className="border border-black p-2 text-center">{idx + 1}</td>
                      <td className="border border-black p-2 font-mono font-bold">{et.matricule}</td>
                      <td className="border border-black p-2 font-semibold">
                        {et.nom} {et.prenom}
                      </td>
                      <td className="border border-black p-2 text-center"></td>
                      <td className="border border-black p-2 text-center"></td>
                      <td className="border border-black p-2 text-center font-bold"></td>
                      <td className="border border-black p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-8 flex justify-end text-xs">
                <div>
                  <p>Signature et Cachet de l&apos;Enseignant :</p>
                  <div className="h-20 w-56 border border-black mt-2"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Guide et explications pour l'enseignant */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Formats d&apos;export conformes
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          Les fichiers Excel générés s&apos;ouvrent directement avec Microsoft Excel, LibreOffice Calc et Google Sheets.
          Ils intègrent les mêmes dénominations que vos fichiers de travail :
          <span className="font-mono text-slate-800 ml-1">P</span> pour Présent,
          <span className="font-mono text-slate-800 ml-1">A</span> pour Absent,
          <span className="font-mono text-slate-800 ml-1">R</span> pour Retard, et
          <span className="font-mono text-slate-800 ml-1">J</span> pour Justifié.
        </p>
      </div>
    </div>
  );
}
