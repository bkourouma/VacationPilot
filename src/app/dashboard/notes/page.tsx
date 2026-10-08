"use client";

import { useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Plus,
  Save,
  Trash2,
  Edit,
  Download,
  AlertTriangle,
  History,
  TrendingUp,
} from "lucide-react";

interface ClasseItem {
  id: string;
  code: string;
  nom: string;
  matieres: { id: string; code: string; nom: string; coefficient: number }[];
}

interface EtudiantItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
}

interface EvaluationItem {
  id: string;
  titre: string;
  date: string;
  coefficient: number;
  noteMax: number;
  notes: {
    id: string;
    valeur: number;
    commentaire: string | null;
    etudiant: { id: string; matricule: string; nom: string; prenom: string };
  }[];
}

export default function NotesPage() {
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("");

  const [etudiants, setEtudiants] = useState<EtudiantItem[]>([]);
  const [notesState, setNotesState] = useState<
    Record<string, { valeur: string; commentaire: string }>
  >({});

  // Champs de l'évaluation
  const [titreEval, setTitreEval] = useState("");
  const [dateEval, setDateEval] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [coefficient, setCoefficient] = useState<number>(1.0);
  const [noteMax, setNoteMax] = useState<number>(20.0);

  // Mode édition vs nouvelle
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);

  // Historique et onglets
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [currentTab, setCurrentTab] = useState<"nouveau" | "recap">("nouveau");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Vérification des droits et chargement des classes
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const [resAuth, resClasses] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/classes"),
        ]);

        const auth = await resAuth.json();
        const role = auth.user?.role || "ENSEIGNANT";
        setUserRole(role);

        if (role !== "ENSEIGNANT" && role !== "ADMINISTRATION") {
          setLoading(false);
          return;
        }

        const cls = await resClasses.json();
        if (Array.isArray(cls)) {
          setClasses(cls);
          if (cls.length > 0) {
            setSelectedClasseId(cls[0].id);
            setSelectedMatiereId(cls[0].matieres[0]?.id || "");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, []);

  // 2. Charger étudiants et évaluations quand classe ou matière change
  useEffect(() => {
    if (!selectedClasseId || (userRole !== "ENSEIGNANT" && userRole !== "ADMINISTRATION")) return;

    async function loadData() {
      try {
        const resEtudiants = await fetch(`/api/etudiants?classeId=${selectedClasseId}`);
        const dataEtudiants = await resEtudiants.json();
        if (Array.isArray(dataEtudiants)) {
          setEtudiants(dataEtudiants);

          // Initialiser l'état des notes
          const initialNotes: Record<string, { valeur: string; commentaire: string }> = {};
          dataEtudiants.forEach((et) => {
            initialNotes[et.id] = { valeur: "", commentaire: "" };
          });
          setNotesState(initialNotes);
        }

        if (selectedMatiereId) {
          const resEvals = await fetch(`/api/notes/evaluations?matiereId=${selectedMatiereId}`);
          const dataEvals = await resEvals.json();
          if (Array.isArray(dataEvals)) {
            setEvaluations(dataEvals);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadData();
  }, [selectedClasseId, selectedMatiereId, userRole]);

  // Changement de classe
  const handleClasseChange = (clsId: string) => {
    setSelectedClasseId(clsId);
    setEditingEvalId(null);
    const cls = classes.find((c) => c.id === clsId);
    setSelectedMatiereId(cls?.matieres[0]?.id || "");
  };

  const handleNoteChange = (etudiantId: string, valeur: string) => {
    setNotesState((prev) => ({
      ...prev,
      [etudiantId]: { ...prev[etudiantId], valeur },
    }));
  };

  const handleCommentaireChange = (etudiantId: string, commentaire: string) => {
    setNotesState((prev) => ({
      ...prev,
      [etudiantId]: { ...prev[etudiantId], commentaire },
    }));
  };

  // Enregistrer ou modifier l'évaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatiereId) {
      setNotification({ type: "error", message: "Veuillez sélectionner une matière." });
      return;
    }
    if (!titreEval.trim()) {
      setNotification({ type: "error", message: "Veuillez renseigner le titre du devoir ou examen." });
      return;
    }

    setSaving(true);
    setNotification(null);

    const notesPayload = etudiants.map((et) => ({
      etudiantId: et.id,
      valeur: notesState[et.id]?.valeur !== "" ? parseFloat(notesState[et.id]?.valeur) : null,
      commentaire: notesState[et.id]?.commentaire || null,
    }));

    try {
      const url = editingEvalId ? `/api/notes/evaluations/${editingEvalId}` : "/api/notes/evaluations";
      const method = editingEvalId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matiereId: selectedMatiereId,
          titre: titreEval,
          date: dateEval,
          coefficient,
          noteMax,
          notes: notesPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setNotification({ type: "error", message: data.error || "Erreur enregistrement." });
        setSaving(false);
        return;
      }

      setNotification({
        type: "success",
        message: editingEvalId
          ? "Notes de l'évaluation mises à jour avec succès !"
          : "Évaluation et notes enregistrées avec succès !",
      });

      // Recharger évaluations
      const resEvals = await fetch(`/api/notes/evaluations?matiereId=${selectedMatiereId}`);
      const dataEvals = await resEvals.json();
      if (Array.isArray(dataEvals)) {
        setEvaluations(dataEvals);
      }

      if (!editingEvalId) {
        setTitreEval("");
        const resetNotes: Record<string, { valeur: string; commentaire: string }> = {};
        etudiants.forEach((et) => {
          resetNotes[et.id] = { valeur: "", commentaire: "" };
        });
        setNotesState(resetNotes);
      }
    } catch {
      setNotification({ type: "error", message: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  };

  // Édition d'une évaluation passée
  const handleEditEval = (ev: EvaluationItem) => {
    setEditingEvalId(ev.id);
    setTitreEval(ev.titre);
    setDateEval(new Date(ev.date).toISOString().split("T")[0]);
    setCoefficient(ev.coefficient);
    setNoteMax(ev.noteMax);

    const newNotesState: Record<string, { valeur: string; commentaire: string }> = {};
    etudiants.forEach((et) => {
      const n = ev.notes.find((note) => note.etudiant.id === et.id);
      newNotesState[et.id] = {
        valeur: n && n.valeur !== null ? String(n.valeur) : "",
        commentaire: n?.commentaire || "",
      };
    });
    setNotesState(newNotesState);
    setCurrentTab("nouveau");
  };

  // Suppression d'une évaluation
  const handleDeleteEval = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette évaluation et toutes ses notes ?")) return;

    try {
      const res = await fetch(`/api/notes/evaluations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvaluations((prev) => prev.filter((e) => e.id !== id));
        if (editingEvalId === id) setEditingEvalId(null);
        setNotification({ type: "success", message: "Évaluation supprimée." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Statistiques en direct sur les notes saisies
  const validNotes = Object.values(notesState)
    .map((n) => parseFloat(n.valeur))
    .filter((v) => !isNaN(v));

  const moyenneSaisie =
    validNotes.length > 0
      ? Math.round((validNotes.reduce((a, b) => a + b, 0) / validNotes.length) * 100) / 100
      : null;
  const noteMinSaisie = validNotes.length > 0 ? Math.min(...validNotes) : null;
  const noteMaxSaisie = validNotes.length > 0 ? Math.max(...validNotes) : null;

  const currentClasse = classes.find((c) => c.id === selectedClasseId);

  // Blocage strict pour les chefs de classe
  if (userRole !== "ENSEIGNANT" && userRole !== "ADMINISTRATION") {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Espace Notes Restreint</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          En tant que Chef de classe, vous n&apos;avez pas l&apos;autorisation de saisir ou de modifier les notes des étudiants.
          Cette fonction est exclusivement réservée à l&apos;enseignant.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-blue-600" />
            Gestion & Saisie des Notes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Création d&apos;évaluations, barèmes, coefficients et calcul des moyennes
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
              onChange={(e) => handleClasseChange(e.target.value)}
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
              {currentClasse?.matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} (Coef {m.coefficient})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* Onglets Saisie vs Récapitulatif */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => {
            setCurrentTab("nouveau");
            setEditingEvalId(null);
          }}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            currentTab === "nouveau" && !editingEvalId
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plus className="w-4 h-4" /> Nouvelle Évaluation
        </button>
        {editingEvalId && (
          <button
            onClick={() => setCurrentTab("nouveau")}
            className="pb-3 px-4 text-xs font-bold border-b-2 border-amber-600 text-amber-700 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" /> Modification d&apos;Évaluation
          </button>
        )}
        <button
          onClick={() => setCurrentTab("recap")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
            currentTab === "recap"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" /> Récapitulatif & Évaluations ({evaluations.length})
        </button>
      </div>

      {/* ONGLET 1 : NOUVELLE ÉVALUATION */}
      {currentTab === "nouveau" && (
        <form onSubmit={handleSaveEvaluation} className="space-y-6">
          {/* Paramètres de l'évaluation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Titre de l&apos;évaluation
              </label>
              <input
                type="text"
                placeholder="Ex: Devoir sur table 1, Examen Partiel, TP Python..."
                value={titreEval}
                onChange={(e) => setTitreEval(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Date de l&apos;épreuve
              </label>
              <input
                type="date"
                value={dateEval}
                onChange={(e) => setDateEval(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Coefficient
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={coefficient}
                  onChange={(e) => setCoefficient(parseFloat(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="w-1/2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Barème (Note Max)
                </label>
                <input
                  type="number"
                  step="1"
                  min="5"
                  max="100"
                  value={noteMax}
                  onChange={(e) => setNoteMax(parseFloat(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Statistiques en temps réel sur les notes saisies */}
          {validNotes.length > 0 && (
            <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-blue-900">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Statistiques en direct ({validNotes.length} notes saisies) :</span>
              </div>
              <div className="flex items-center gap-6">
                <span>
                  Moyenne : <strong>{moyenneSaisie} / {noteMax}</strong>
                </span>
                <span>
                  Note Min : <strong>{noteMinSaisie}</strong>
                </span>
                <span>
                  Note Max : <strong>{noteMaxSaisie}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Grille de saisie des notes */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-6 py-3 w-12">N°</th>
                    <th className="px-6 py-3 w-28">Matricule</th>
                    <th className="px-6 py-3">Nom et Prénom</th>
                    <th className="px-6 py-3 w-40 text-center">
                      Note (/ {noteMax})
                    </th>
                    <th className="px-6 py-3">Appréciation / Commentaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {etudiants.map((et, idx) => {
                    const noteVal = notesState[et.id]?.valeur || "";
                    const noteCommentaire = notesState[et.id]?.commentaire || "";
                    const num = parseFloat(noteVal);

                    return (
                      <tr key={et.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-3 text-xs text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs font-bold text-slate-700">
                          {et.matricule}
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-900">
                          {et.nom} {et.prenom}
                        </td>

                        {/* Champ Note */}
                        <td className="px-6 py-3 text-center">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max={noteMax}
                            placeholder="-"
                            value={noteVal}
                            onChange={(e) => handleNoteChange(et.id, e.target.value)}
                            className={`w-24 text-center py-1.5 px-2 rounded-lg border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              !isNaN(num) && num >= 10
                                ? "bg-emerald-50/70 border-emerald-300 text-emerald-800"
                                : !isNaN(num) && num < 10
                                ? "bg-rose-50/70 border-rose-300 text-rose-800"
                                : "bg-slate-50 border-slate-300 text-slate-800"
                            }`}
                          />
                        </td>

                        {/* Champ Commentaire */}
                        <td className="px-6 py-3">
                          <input
                            type="text"
                            placeholder="Ex: Excellent, Travail soigné, À revoir..."
                            value={noteCommentaire}
                            onChange={(e) => handleCommentaireChange(et.id, e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pied de page du formulaire */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total : <strong>{etudiants.length}</strong> auditeurs à évaluer.
              </span>

              <div className="flex items-center gap-3">
                {editingEvalId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvalId(null);
                      setTitreEval("");
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition"
                  >
                    Annuler modification
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving
                    ? "Enregistrement..."
                    : editingEvalId
                    ? "Mettre à jour les notes"
                    : "Enregistrer l'évaluation"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ONGLET 2 : RÉCAPITULATIF & ÉVALUATIONS EXISTANTES */}
      {currentTab === "recap" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Évaluations de la matière
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Liste des devoirs et examens enregistrés avec moyennes de classe
                </p>
              </div>
              <a
                href={`/api/export/notes-excel?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Exporter relevé Excel (.xlsx)
              </a>
            </div>

            {evaluations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                Aucune évaluation enregistrée pour cette matière.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {evaluations.map((ev) => {
                  const values = ev.notes.map((n) => n.valeur);
                  const moyenne =
                    values.length > 0
                      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
                      : null;

                  return (
                    <div
                      key={ev.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{ev.titre}</h4>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                            Coef {ev.coefficient}
                          </span>
                          <span className="text-xs text-slate-400">
                            (sur {ev.noteMax})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Date : {new Date(ev.date).toLocaleDateString("fr-FR")} &bull; {ev.notes.length} copie(s) notée(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Moyenne de classe</span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {moyenne !== null ? `${moyenne} / ${ev.noteMax}` : "Non calculée"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditEval(ev)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Modifier les notes"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEval(ev.id)}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                            title="Supprimer l'évaluation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
