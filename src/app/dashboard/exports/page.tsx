"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Select } from "antd";
import {
  FileSpreadsheet,
  Download,
  Printer,
  CalendarCheck,
  Award,
  FileText,
  School,
  BookOpen,
  Users,
  ClipboardList,
  ScrollText,
  Info,
  Plus,
} from "lucide-react";

interface ClasseItem {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  matieres: { id: string; code: string; nom: string }[];
  etudiants: { id: string; matricule: string; nom: string; prenom: string }[];
}

type PrintMode = "none" | "fiche_signature" | "releve_notes";

interface EvaluationReleve {
  id: string;
  titre: string;
  date: string;
  coefficient: number;
  noteMax: number;
  notes: { valeur: number; etudiant: { id: string } }[];
}

// Moyenne sur 20 d'un étudiant : mêmes règles que le portail étudiant
// (note ÷ barème × 20, pondérée par le coefficient, sur les évaluations notées).
function moyenneEtudiant(evaluations: EvaluationReleve[], etudiantId: string): number | null {
  let total = 0;
  let coefs = 0;
  for (const ev of evaluations) {
    const note = ev.notes.find((n) => n.etudiant.id === etudiantId);
    if (!note || !(ev.noteMax > 0)) continue;
    total += (note.valeur / ev.noteMax) * 20 * ev.coefficient;
    coefs += ev.coefficient;
  }
  return coefs > 0 ? Math.round((total / coefs) * 100) / 100 : null;
}

function mention(moyenne: number | null): string {
  if (moyenne === null) return "";
  if (moyenne >= 16) return "Très Bien";
  if (moyenne >= 14) return "Bien";
  if (moyenne >= 12) return "Assez Bien";
  if (moyenne >= 10) return "Passable";
  return "Insuffisant";
}

const labelClass = "text-xs font-bold text-slate-700";

export default function ExportsPage() {
  const { message } = App.useApp();
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // État pour la prévisualisation d'impression
  const [printMode, setPrintMode] = useState<PrintMode>("none");
  const [evaluationsReleve, setEvaluationsReleve] = useState<EvaluationReleve[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
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
        message.error("Impossible de charger les classes.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);
  const currentMatiere = currentClasse?.matieres.find((m) => m.id === selectedMatiereId);

  const triggerPrint = async (mode: Exclude<PrintMode, "none">) => {
    // Relevé de notes : charger les évaluations de la matière choisie pour les imprimer
    if (mode === "releve_notes") {
      let evaluations: EvaluationReleve[] = [];
      if (selectedMatiereId) {
        try {
          const res = await fetch(
            `/api/notes/evaluations?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`
          );
          if (!res.ok) {
            message.error("Impossible de charger les notes de cette matière.");
            return;
          }
          const data = await res.json();
          if (Array.isArray(data)) evaluations = data;
        } catch {
          message.error("Erreur réseau lors du chargement des notes.");
          return;
        }
      }
      setEvaluationsReleve(evaluations);
    }
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-white border border-slate-200" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-56 rounded-2xl bg-white border border-slate-200" />
          <div className="h-56 rounded-2xl bg-white border border-slate-200" />
        </div>
      </div>
    );
  }

  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.nom}` }));
  const matiereOptions = [
    { value: "", label: "Toutes les matières" },
    ...(currentClasse?.matieres ?? []).map((m) => ({ value: m.id, label: `${m.code} — ${m.nom}` })),
  ];
  const exportQuery = `classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`;
  const noClass = !selectedClasseId;

  const exportCards = [
    {
      key: "presences",
      title: "Feuille de présences & assiduité",
      format: ".xlsx",
      icon: <CalendarCheck className="w-6 h-6" />,
      iconTone: "bg-emerald-50 text-emerald-600",
      text: "Tableau récapitulatif complet : toutes les séances en colonnes, le volume horaire, les statuts détaillés (présent, absent, retard, justifié) et le taux d'assiduité final.",
      href: `/api/export/presences-excel?${exportQuery}`,
      label: "Télécharger l'Excel des présences",
      btnClass: "!bg-emerald-600 hover:!bg-emerald-700",
    },
    {
      key: "notes",
      title: "Relevé de notes & moyennes",
      format: ".xlsx",
      icon: <Award className="w-6 h-6" />,
      iconTone: "bg-blue-50 text-blue-600",
      text: "Grille des devoirs, examens et interrogations avec leurs coefficients, la note maximale et le calcul automatique de la moyenne pondérée de chaque auditeur.",
      href: `/api/export/notes-excel?${exportQuery}`,
      label: "Télécharger l'Excel des notes",
      btnClass: "",
    },
  ];

  const printCards = [
    {
      mode: "fiche_signature" as const,
      title: "Feuille d'émargement papier",
      icon: <ClipboardList className="w-6 h-6" />,
      iconTone: "bg-amber-50 text-amber-600",
      text: "Liste de la classe avec cases de signature et observations, prête à être signée à chaque séance, avec visas du chef de classe et de l'enseignant.",
    },
    {
      mode: "releve_notes" as const,
      title: "Relevé de notes imprimable",
      icon: <ScrollText className="w-6 h-6" />,
      iconTone: "bg-indigo-50 text-indigo-600",
      text: "Relevé officiel de la classe avec colonnes de contrôle, d'examen, de moyenne et d'appréciation, avec zone de signature et de cachet.",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* En-tête (masqué lors de l'impression) */}
      <div className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
            <FileSpreadsheet className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Exports Excel &amp; documents à imprimer
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Téléchargez les rapports officiels pour la scolarité ou imprimez les feuilles d&apos;émargement
              papier.
            </p>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="no-print bg-white rounded-2xl p-10 border border-slate-200/80 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Aucune classe disponible</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Créez ou rejoignez une classe pour pouvoir générer des exports et des documents.
          </p>
          <Link
            href="/dashboard/classes"
            className="inline-flex items-center gap-2 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Aller aux classes
          </Link>
        </div>
      ) : (
        <>
          {/* Sélection : classe & matière */}
          <section className="no-print bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className={`${labelClass} block mb-1.5`}>Classe</span>
                <Select
                  aria-label="Classe"
                  className="w-full"
                  size="large"
                  showSearch
                  value={selectedClasseId || undefined}
                  onChange={(id: string) => {
                    setSelectedClasseId(id);
                    const c = classes.find((cl) => cl.id === id);
                    setSelectedMatiereId(c?.matieres[0]?.id || "");
                  }}
                  options={classOptions}
                  optionFilterProp="label"
                  suffixIcon={<School className="w-4 h-4 text-slate-400" />}
                />
              </div>
              <div>
                <span className={`${labelClass} block mb-1.5`}>Matière</span>
                <Select
                  aria-label="Matière"
                  className="w-full"
                  size="large"
                  showSearch
                  value={selectedMatiereId}
                  onChange={setSelectedMatiereId}
                  options={matiereOptions}
                  optionFilterProp="label"
                  suffixIcon={<BookOpen className="w-4 h-4 text-slate-400" />}
                />
              </div>
            </div>

            {currentClasse && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                  <School className="w-3.5 h-3.5 text-blue-600" />
                  {currentClasse.anneeScolaire}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  {currentClasse.etudiants.length} auditeur{currentClasse.etudiants.length > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  {currentMatiere ? currentMatiere.nom : "Toutes les matières"}
                </span>
              </div>
            )}
          </section>

          {/* Exports Excel */}
          <section className="no-print space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Exports Excel
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {exportCards.map((c) => (
                <article
                  key={c.key}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.iconTone}`}>
                        {c.icon}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {c.format}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{c.text}</p>
                  </div>
                  <Button
                    type="primary"
                    size="large"
                    block
                    href={c.href}
                    disabled={noClass}
                    icon={<Download className="w-4 h-4" />}
                    onClick={() => message.info("Téléchargement en cours…")}
                    className={`!text-xs !font-bold ${c.btnClass}`}
                  >
                    {c.label}
                  </Button>
                </article>
              ))}
            </div>
          </section>

          {/* Documents à imprimer */}
          <section className="no-print space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Printer className="w-4 h-4" /> Documents à imprimer
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {printCards.map((c) => (
                <article
                  key={c.mode}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.iconTone}`}>
                      {c.icon}
                    </div>
                    <h3 className="font-bold text-base text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{c.text}</p>
                  </div>
                  <Button
                    size="large"
                    block
                    disabled={noClass}
                    icon={<Printer className="w-4 h-4" />}
                    onClick={() => triggerPrint(c.mode)}
                    className="!text-xs !font-bold"
                  >
                    Imprimer le document
                  </Button>
                </article>
              ))}
            </div>
          </section>

          {/* Guide */}
          <section className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Formats d&apos;export conformes
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Les fichiers Excel s&apos;ouvrent directement avec Microsoft Excel, LibreOffice Calc et Google
              Sheets, avec les mêmes codes que vos fichiers de travail :
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="font-mono font-bold">P</span> Présent
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                <span className="font-mono font-bold">A</span> Absent
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                <span className="font-mono font-bold">R</span> Retard
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                <span className="font-mono font-bold">J</span> Justifié
              </span>
            </div>
            <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Pour limiter l&apos;export à une matière, choisissez-la ci-dessus ; sinon toutes les matières de la
              classe sont incluses.
            </p>
          </section>
        </>
      )}

      {/* Aperçu / fiche imprimable (affichée uniquement lors de l'impression) */}
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
                    {evaluationsReleve.length > 0 ? (
                      evaluationsReleve.map((ev) => (
                        <th key={ev.id} className="border border-black p-2 w-24 text-center">
                          {ev.titre}
                          <span className="block font-normal text-[10px]">
                            coef {ev.coefficient} · /{ev.noteMax}
                          </span>
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="border border-black p-2 w-24 text-center">Contrôle 1</th>
                        <th className="border border-black p-2 w-24 text-center">Examen</th>
                      </>
                    )}
                    <th className="border border-black p-2 w-24 text-center">Moyenne (/20)</th>
                    <th className="border border-black p-2 w-28 text-center">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClasse.etudiants.map((et, idx) => {
                    const moyenne =
                      evaluationsReleve.length > 0 ? moyenneEtudiant(evaluationsReleve, et.id) : null;
                    return (
                      <tr key={et.id} className="border-b border-black">
                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                        <td className="border border-black p-2 font-mono font-bold">{et.matricule}</td>
                        <td className="border border-black p-2 font-semibold">
                          {et.nom} {et.prenom}
                        </td>
                        {evaluationsReleve.length > 0 ? (
                          evaluationsReleve.map((ev) => {
                            const note = ev.notes.find((n) => n.etudiant.id === et.id);
                            return (
                              <td key={ev.id} className="border border-black p-2 text-center">
                                {note ? note.valeur : "—"}
                              </td>
                            );
                          })
                        ) : (
                          <>
                            <td className="border border-black p-2 text-center"></td>
                            <td className="border border-black p-2 text-center"></td>
                          </>
                        )}
                        <td className="border border-black p-2 text-center font-bold">
                          {moyenne !== null ? moyenne.toFixed(2) : ""}
                        </td>
                        <td className="border border-black p-2 text-center">{mention(moyenne)}</td>
                      </tr>
                    );
                  })}
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
    </div>
  );
}
