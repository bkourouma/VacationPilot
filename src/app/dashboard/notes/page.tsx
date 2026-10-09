"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dayjs, { type Dayjs } from "dayjs";
import { App, Button, DatePicker, Form, Input, InputNumber, Select } from "antd";
import {
  Award,
  BookOpen,
  CalendarDays,
  Edit,
  History,
  Hash,
  Percent,
  Plus,
  Save,
  School,
  Search,
  Trophy,
  TrendingUp,
  Type,
  Users,
  AlertTriangle,
} from "lucide-react";
import EvaluationsRecap from "./_components/EvaluationsRecap";
import {
  ClasseItem,
  EtudiantItem,
  EvaluationItem,
  NoteEntry,
  computeStats,
  labelClass,
} from "./_components/types";

interface EvalFormValues {
  titre: string;
  date: Dayjs;
  coefficient: number;
  noteMax: number;
}

const EMPTY_NOTE: NoteEntry = { valeur: null, commentaire: "" };

function toDateString(iso: string) {
  return new Date(iso).toISOString().split("T")[0];
}

export default function NotesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<EvalFormValues>();

  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedMatiereId, setSelectedMatiereId] = useState<string>("");

  const [etudiants, setEtudiants] = useState<EtudiantItem[]>([]);
  const [notesState, setNotesState] = useState<Record<string, NoteEntry>>({});
  const [studentSearch, setStudentSearch] = useState("");

  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [currentTab, setCurrentTab] = useState<"nouveau" | "recap">("nouveau");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>("ENSEIGNANT");

  const noteMaxV = Form.useWatch("noteMax", form);
  const noteMax = noteMaxV ?? 20;
  const isEditing = !!editingEvalId;

  const reloadEvaluations = async (matiereId: string) => {
    const resEvals = await fetch(`/api/notes/evaluations?matiereId=${matiereId}`);
    const dataEvals = await resEvals.json();
    if (Array.isArray(dataEvals)) setEvaluations(dataEvals);
  };

  // 1. Vérification des droits et chargement des classes
  useEffect(() => {
    async function loadInitial() {
      try {
        const [resAuth, resClasses] = await Promise.all([fetch("/api/auth/me"), fetch("/api/classes")]);

        const auth = await resAuth.json();
        const role = auth.user?.role || "ENSEIGNANT";
        setUserRole(role);

        if (role !== "ENSEIGNANT" && role !== "ADMINISTRATION") return;

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
        message.error("Impossible de charger les classes.");
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const initialNotes: Record<string, NoteEntry> = {};
          dataEtudiants.forEach((et: EtudiantItem) => {
            initialNotes[et.id] = { ...EMPTY_NOTE };
          });
          setNotesState(initialNotes);
        }

        if (selectedMatiereId) {
          await reloadEvaluations(selectedMatiereId);
        } else {
          setEvaluations([]);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadData();
  }, [selectedClasseId, selectedMatiereId, userRole]);

  const currentClasse = classes.find((c) => c.id === selectedClasseId);

  const handleClasseChange = (clsId: string) => {
    setSelectedClasseId(clsId);
    setEditingEvalId(null);
    setStudentSearch("");
    const cls = classes.find((c) => c.id === clsId);
    setSelectedMatiereId(cls?.matieres[0]?.id || "");
  };

  const handleNoteChange = (etudiantId: string, valeur: number | null) => {
    setNotesState((prev) => ({
      ...prev,
      [etudiantId]: { commentaire: prev[etudiantId]?.commentaire ?? "", valeur },
    }));
  };

  const handleCommentaireChange = (etudiantId: string, commentaire: string) => {
    setNotesState((prev) => ({
      ...prev,
      [etudiantId]: { valeur: prev[etudiantId]?.valeur ?? null, commentaire },
    }));
  };

  const resetGrid = () => {
    const resetNotes: Record<string, NoteEntry> = {};
    etudiants.forEach((et) => {
      resetNotes[et.id] = { ...EMPTY_NOTE };
    });
    setNotesState(resetNotes);
  };

  const cancelEditing = () => {
    setEditingEvalId(null);
    form.setFieldValue("titre", "");
    resetGrid();
  };

  // Enregistrer ou modifier l'évaluation
  const handleSaveEvaluation = async (values: EvalFormValues) => {
    if (!selectedMatiereId) {
      message.error("Veuillez sélectionner une matière.");
      return;
    }

    const invalid = etudiants.filter((et) => {
      const v = notesState[et.id]?.valeur;
      return v !== null && v !== undefined && (v < 0 || v > values.noteMax);
    });
    if (invalid.length > 0) {
      message.error(
        `${invalid.length} note(s) hors barème (0 à ${values.noteMax}) : ${invalid
          .slice(0, 3)
          .map((e) => e.nom)
          .join(", ")}${invalid.length > 3 ? "…" : ""}`
      );
      return;
    }

    setSaving(true);

    const notesPayload = etudiants.map((et) => ({
      etudiantId: et.id,
      valeur: notesState[et.id]?.valeur ?? null,
      commentaire: notesState[et.id]?.commentaire || null,
    }));

    try {
      const res = await fetch(
        isEditing ? `/api/notes/evaluations/${editingEvalId}` : "/api/notes/evaluations",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matiereId: selectedMatiereId,
            titre: values.titre.trim(),
            date: values.date.format("YYYY-MM-DD"),
            coefficient: values.coefficient,
            noteMax: values.noteMax,
            notes: notesPayload,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        message.error(data.error || "Erreur enregistrement.");
        return;
      }

      message.success(
        isEditing
          ? "Notes de l'évaluation mises à jour avec succès."
          : "Évaluation et notes enregistrées avec succès."
      );

      await reloadEvaluations(selectedMatiereId);

      if (!isEditing) {
        form.setFieldValue("titre", "");
        resetGrid();
      }
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  // Édition d'une évaluation passée
  const handleEditEval = (ev: EvaluationItem) => {
    setEditingEvalId(ev.id);
    form.setFieldsValue({
      titre: ev.titre,
      date: dayjs(toDateString(ev.date)),
      coefficient: ev.coefficient,
      noteMax: ev.noteMax,
    });

    const newNotesState: Record<string, NoteEntry> = {};
    etudiants.forEach((et) => {
      const n = ev.notes.find((note) => note.etudiant.id === et.id);
      newNotesState[et.id] = {
        valeur: n && n.valeur !== null ? n.valeur : null,
        commentaire: n?.commentaire || "",
      };
    });
    setNotesState(newNotesState);
    setCurrentTab("nouveau");
  };

  const handleDeleteEval = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/evaluations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvaluations((prev) => prev.filter((e) => e.id !== id));
        if (editingEvalId === id) setEditingEvalId(null);
        message.success("Évaluation supprimée.");
      } else {
        const data = await res.json().catch(() => ({}));
        message.error(data.error || "La suppression a échoué.");
      }
    } catch (err) {
      console.error(err);
      message.error("Erreur réseau.");
    }
  };

  // Statistiques en direct sur les notes saisies
  const liveStats = useMemo(
    () =>
      computeStats(
        Object.values(notesState)
          .map((n) => n.valeur)
          .filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v)),
        noteMax
      ),
    [notesState, noteMax]
  );

  const visibleEtudiants = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return etudiants;
    return etudiants.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        e.prenom.toLowerCase().includes(q) ||
        e.matricule.toLowerCase().includes(q)
    );
  }, [etudiants, studentSearch]);

  const focusNext = (index: number, layout: string) => {
    const next = visibleEtudiants[index + 1];
    if (next) document.getElementById(`note-${layout}-${next.id}`)?.focus();
  };

  // Blocage strict pour les chefs de classe
  if (!loading && userRole !== "ENSEIGNANT" && userRole !== "ADMINISTRATION") {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Espace notes restreint</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          En tant que chef de classe, vous n&apos;avez pas l&apos;autorisation de saisir ou de modifier les
          notes des étudiants. Cette fonction est exclusivement réservée à l&apos;enseignant.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-white border border-slate-200" />
        <div className="h-64 rounded-2xl bg-white border border-slate-200" />
      </div>
    );
  }

  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.nom}` }));
  const matiereOptions = (currentClasse?.matieres ?? []).map((m) => ({
    value: m.id,
    label: `${m.code} (coef. ${m.coefficient})`,
  }));

  const passThreshold = noteMax / 2;

  const noteInput = (et: EtudiantItem, index: number, layout: "table" | "card") => {
    const v = notesState[et.id]?.valeur;
    const out = v !== null && v !== undefined && (v < 0 || v > noteMax);
    const tone =
      v === null || v === undefined || out
        ? ""
        : v >= passThreshold
        ? "[&_input]:!text-emerald-700 !bg-emerald-50/70 !border-emerald-300"
        : "[&_input]:!text-rose-700 !bg-rose-50/70 !border-rose-300";

    return (
      <InputNumber
        id={`note-${layout}-${et.id}`}
        aria-label={`Note de ${et.nom} ${et.prenom}`}
        value={v ?? null}
        min={0}
        max={noteMax}
        step={0.25}
        placeholder="—"
        status={out ? "error" : undefined}
        controls={false}
        onChange={(val) => handleNoteChange(et.id, typeof val === "number" ? val : null)}
        onPressEnter={(e) => {
          e.preventDefault();
          focusNext(index, layout);
        }}
        className={`!w-24 [&_input]:!text-center [&_input]:!font-bold ${tone}`}
      />
    );
  };

  const commentInput = (et: EtudiantItem) => (
    <Input
      aria-label={`Commentaire pour ${et.nom} ${et.prenom}`}
      size="small"
      allowClear
      placeholder="Ex : excellent, travail soigné, à revoir…"
      value={notesState[et.id]?.commentaire || ""}
      onChange={(e) => handleCommentaireChange(et.id, e.target.value)}
    />
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
            <Award className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Gestion &amp; saisie des notes</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Création d&apos;évaluations, barèmes, coefficients et calcul des moyennes.
            </p>
          </div>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200/80 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <School className="w-7 h-7" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Aucune classe disponible</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Programmez d&apos;abord votre matière dans une classe pour pouvoir saisir des notes.
          </p>
          <Link
            href="/dashboard/classes?action=add-matiere"
            className="inline-flex items-center gap-2 px-4 h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
          >
            <Plus className="w-4 h-4" /> Choisir ma classe &amp; ajouter une matière
          </Link>
        </div>
      ) : (
        <>
          {/* Contexte : classe & matière */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className={`${labelClass} block mb-1.5`}>Classe</span>
                <Select
                  aria-label="Classe"
                  className="w-full"
                  size="large"
                  showSearch
                  value={selectedClasseId || undefined}
                  onChange={handleClasseChange}
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
                  value={selectedMatiereId || undefined}
                  onChange={(v) => {
                    setSelectedMatiereId(v);
                    setEditingEvalId(null);
                  }}
                  options={matiereOptions}
                  optionFilterProp="label"
                  placeholder="Aucune matière dans cette classe"
                  suffixIcon={<BookOpen className="w-4 h-4 text-slate-400" />}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {etudiants.length} auditeur{etudiants.length > 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-semibold">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                {evaluations.length} évaluation{evaluations.length > 1 ? "s" : ""}
              </span>
            </div>
          </section>

          {/* Onglets */}
          <div className="flex items-center gap-1 border-b border-slate-200" role="tablist">
            {(
              [
                {
                  key: "nouveau" as const,
                  label: isEditing ? "Modification d'évaluation" : "Nouvelle évaluation",
                  icon: isEditing ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />,
                },
                {
                  key: "recap" as const,
                  label: `Récapitulatif & évaluations (${evaluations.length})`,
                  icon: <History className="w-4 h-4" />,
                },
              ] as const
            ).map((t) => {
              const active = currentTab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCurrentTab(t.key)}
                  className={`-mb-px pb-3 pt-1 px-4 text-xs font-bold border-b-2 inline-flex items-center gap-2 transition cursor-pointer ${
                    active
                      ? t.key === "nouveau" && isEditing
                        ? "border-amber-500 text-amber-700"
                        : "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Formulaire de saisie (toujours monté pour conserver les valeurs) */}
          <Form<EvalFormValues>
            form={form}
            name="evaluation_form"
            layout="vertical"
            requiredMark={false}
            autoComplete="off"
            onFinish={handleSaveEvaluation}
            initialValues={{ titre: "", date: dayjs(), coefficient: 1, noteMax: 20 }}
            className={currentTab === "nouveau" ? "space-y-6" : "hidden"}
          >
            {isEditing && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">Modification d&apos;une évaluation existante</h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Les notes enregistrées sont chargées ci-dessous. Ajustez-les puis enregistrez.
                    </p>
                  </div>
                </div>
                <Button onClick={cancelEditing} className="!text-xs !font-bold self-end sm:self-center">
                  Annuler la modification
                </Button>
              </div>
            )}

            {/* Paramètres de l'évaluation */}
            <section className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4">
                <Form.Item
                  className="sm:col-span-2"
                  label={<span className={labelClass}>Titre de l&apos;évaluation</span>}
                  name="titre"
                  rules={[
                    { required: true, whitespace: true, message: "Renseignez le titre du devoir ou de l'examen." },
                  ]}
                >
                  <Input
                    allowClear
                    maxLength={120}
                    prefix={<Type className="w-4 h-4 text-slate-400" />}
                    placeholder="Ex : devoir sur table 1, examen partiel, TP Python…"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className={labelClass}>Date de l&apos;épreuve</span>}
                  name="date"
                  rules={[{ required: true, message: "Indiquez la date." }]}
                >
                  <DatePicker
                    className="!w-full"
                    format="DD/MM/YYYY"
                    allowClear={false}
                    suffixIcon={<CalendarDays className="w-4 h-4 text-slate-400" />}
                  />
                </Form.Item>

                <div className="grid grid-cols-2 gap-3">
                  <Form.Item
                    label={<span className={labelClass}>Coefficient</span>}
                    name="coefficient"
                    rules={[
                      { required: true, message: "Requis." },
                      { type: "number", min: 0.5, max: 10, message: "0,5 à 10." },
                    ]}
                  >
                    <InputNumber
                      className="!w-full"
                      min={0.5}
                      max={10}
                      step={0.5}
                      prefix={<Percent className="w-3.5 h-3.5 text-slate-400" />}
                    />
                  </Form.Item>
                  <Form.Item
                    label={<span className={labelClass}>Barème (max)</span>}
                    name="noteMax"
                    rules={[
                      { required: true, message: "Requis." },
                      { type: "number", min: 5, max: 100, message: "5 à 100." },
                    ]}
                  >
                    <InputNumber
                      className="!w-full"
                      min={5}
                      max={100}
                      step={1}
                      precision={0}
                      prefix={<Hash className="w-3.5 h-3.5 text-slate-400" />}
                    />
                  </Form.Item>
                </div>
              </div>
            </section>

            {/* Statistiques en direct */}
            {liveStats && (
              <section className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-blue-900">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>
                    Statistiques en direct ({liveStats.count}/{etudiants.length} notes saisies)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span>
                    Moyenne :{" "}
                    <strong>
                      {liveStats.moyenne} / {noteMax}
                    </strong>
                  </span>
                  <span>
                    Min : <strong>{liveStats.min}</strong>
                  </span>
                  <span>
                    Max : <strong>{liveStats.max}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Réussite :{" "}
                    <strong className={liveStats.reussite >= 50 ? "text-emerald-700" : "text-rose-700"}>
                      {liveStats.reussite}%
                    </strong>
                  </span>
                </div>
              </section>
            )}

            {/* Grille de saisie */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              {etudiants.length > 8 && (
                <div className="p-4 border-b border-slate-100">
                  <Input
                    aria-label="Rechercher un auditeur"
                    allowClear
                    prefix={<Search className="w-4 h-4 text-slate-400" />}
                    placeholder="Rechercher un auditeur…"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="sm:max-w-sm"
                  />
                </div>
              )}

              {etudiants.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">Aucun auditeur dans cette classe</p>
                  <Link
                    href="/dashboard/classes?action=add-etudiant"
                    className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Inscrire des auditeurs &rarr;
                  </Link>
                </div>
              ) : visibleEtudiants.length === 0 ? (
                <div className="px-6 py-10 text-center text-xs text-slate-500">
                  Aucun auditeur ne correspond à votre recherche.
                </div>
              ) : (
                <>
                  {/* Grand écran : tableau */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-max text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-5 py-3">N°</th>
                          <th className="px-4 py-3">Matricule</th>
                          <th className="px-4 py-3 whitespace-nowrap">Nom et prénom</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Note (/ {noteMax})</th>
                          <th className="px-4 py-3 min-w-[280px]">Appréciation / commentaire</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleEtudiants.map((et, index) => (
                          <tr key={et.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-5 py-2.5 text-slate-400 font-mono">
                              {etudiants.findIndex((e) => e.id === et.id) + 1}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-700">
                                {et.matricule}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 text-sm whitespace-nowrap">
                              {et.nom} {et.prenom}
                            </td>
                            <td className="px-4 py-2.5 text-center">{noteInput(et, index, "table")}</td>
                            <td className="px-4 py-2.5">{commentInput(et)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile & tablette : cartes */}
                  <ul className="lg:hidden divide-y divide-slate-100">
                    {visibleEtudiants.map((et, index) => (
                      <li key={et.id} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-900 truncate">
                              {et.nom} {et.prenom}
                            </p>
                            <p className="font-mono text-[11px] font-bold text-slate-500">{et.matricule}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {noteInput(et, index, "card")}
                            <span className="text-xs text-slate-400">/ {noteMax}</span>
                          </div>
                        </div>
                        {commentInput(et)}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {/* Pied de page : reste visible pendant le défilement */}
              <div className="sticky bottom-0 z-20 p-4 bg-white/95 backdrop-blur border-t border-slate-200 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  Total : <strong>{etudiants.length}</strong> auditeur{etudiants.length > 1 ? "s" : ""} à évaluer
                  {liveStats ? ` — ${etudiants.length - liveStats.count} sans note` : ""}.
                </span>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isEditing && (
                    <Button onClick={cancelEditing} className="!text-xs !font-semibold">
                      Annuler la modification
                    </Button>
                  )}
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={saving}
                    disabled={!selectedMatiereId || etudiants.length === 0}
                    icon={!saving ? <Save className="w-4 h-4" /> : undefined}
                    className="!text-xs !font-bold"
                  >
                    {saving ? "Enregistrement..." : isEditing ? "Mettre à jour les notes" : "Enregistrer l'évaluation"}
                  </Button>
                </div>
              </div>
            </section>
          </Form>

          {/* Récapitulatif */}
          {currentTab === "recap" && (
            <EvaluationsRecap
              evaluations={evaluations}
              totalEtudiants={etudiants.length}
              exportHref={`/api/export/notes-excel?classeId=${selectedClasseId}&matiereId=${selectedMatiereId}`}
              onEdit={handleEditEval}
              onDelete={handleDeleteEval}
            />
          )}
        </>
      )}
    </div>
  );
}
