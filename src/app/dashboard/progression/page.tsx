"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Check,
  Building,
  RefreshCw,
} from "lucide-react";

interface SousChapitreItem {
  id: string;
  chapitreId?: string;
  titre: string;
  ordre: number;
  valide?: boolean;
  dateValidation?: string | null;
  seanceId?: string | null;
  seance?: { id: string; date: string; nombreHeures: number; description?: string | null } | null;
}

interface ChapitreItem {
  id: string;
  numero: number;
  titre: string;
  description: string | null;
  ordre: number;
  valide?: boolean;
  progressionPct?: number;
  totalSous?: number;
  validesSous?: number;
  dateValidation?: string | null;
  seanceId?: string | null;
  seance?: { id: string; date: string; nombreHeures: number; description?: string | null } | null;
  remarque?: string | null;
  sousChapitres?: SousChapitreItem[];
}

interface SeanceItem {
  id: string;
  date: string;
  nombreHeures: number;
  description?: string | null;
}

interface CoursDetail {
  id: string;
  classe: { id: string; code: string; nom: string; anneeScolaire: string };
  matiere: { id: string; code: string; nom: string; description?: string | null };
  enseignant?: { id: string; nom: string; email: string | null } | null;
  volumeHoraire: number;
  coefficient: number;
  heuresEffectuees: number;
  heuresRestantes: number;
  progressionHeuresPct: number;
}

interface ClasseOption {
  id: string;
  code: string;
  nom: string;
  matieres: {
    id: string; // coursId
    matiereId: string;
    code: string;
    nom: string;
    volumeHoraire?: number;
    coefficient?: number;
  }[];
}

interface DraftChapitre {
  numero: number;
  titre: string;
  description: string;
  sousChapitres: string[];
}

function ProgressionContent() {
  const searchParams = useSearchParams();
  const urlClasseId = searchParams.get("classeId");
  const urlCoursId = searchParams.get("coursId");
  const urlMatiereId = searchParams.get("matiereId");
  const urlAction = searchParams.get("action");

  const [classes, setClasses] = useState<ClasseOption[]>([]);
  const [selectedClasseId, setSelectedClasseId] = useState<string>("");
  const [selectedCoursId, setSelectedCoursId] = useState<string>("");

  const [coursDetail, setCoursDetail] = useState<CoursDetail | null>(null);
  const [chapitres, setChapitres] = useState<ChapitreItem[]>([]);
  const [seances, setSeances] = useState<SeanceItem[]>([]);
  const [stats, setStats] = useState<{
    totalChapitres: number;
    chapitresValidesCount: number;
    chapitresRestantsCount: number;
    progressionChapitresPct: number;
    totalSeances: number;
  }>({
    totalChapitres: 0,
    chapitresValidesCount: 0,
    chapitresRestantsCount: 0,
    progressionChapitresPct: 0,
    totalSeances: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingProgression, setLoadingProgression] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Notification
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal Syllabus / Programme
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programTab, setProgramTab] = useState<"MANUAL" | "WORD_AI">("MANUAL");

  // Édition manuelle avec sous-chapitres
  const [draftChapitres, setDraftChapitres] = useState<DraftChapitre[]>([]);
  const [savingProgram, setSavingProgram] = useState(false);

  // Import Word & IA (OpenRouter)
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [showAiValidation, setShowAiValidation] = useState(false);
  const [activeAiModel, setActiveAiModel] = useState<string>("deepseek/deepseek-chat");

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 1. Charger les classes et leurs cours
  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);

        // Charger le modèle IA configuré
        fetch("/api/config/ai")
          .then((r) => r.json())
          .then((d) => {
            if (d.model) setActiveAiModel(d.model);
          })
          .catch(() => {});

        const res = await fetch("/api/classes?all=true");
        if (res.ok) {
          const data: ClasseOption[] = await res.json();
          setClasses(data);
          if (data.length > 0) {
            let targetClass = data[0];
            let targetCoursId = data[0].matieres?.[0]?.id || "";

            if (urlCoursId) {
              const matchedClass = data.find((c) =>
                c.matieres?.some((m) => m.id === urlCoursId)
              );
              if (matchedClass) {
                targetClass = matchedClass;
                targetCoursId = urlCoursId;
              }
            } else if (urlMatiereId) {
              const matchedClass = data.find((c) =>
                c.matieres?.some(
                  (m) => m.matiereId === urlMatiereId || m.id === urlMatiereId
                )
              );
              if (matchedClass) {
                targetClass = matchedClass;
                const foundMat = matchedClass.matieres.find(
                  (m) => m.matiereId === urlMatiereId || m.id === urlMatiereId
                );
                if (foundMat) targetCoursId = foundMat.id;
              }
            } else if (urlClasseId) {
              const matchedClass = data.find((c) => c.id === urlClasseId);
              if (matchedClass) {
                targetClass = matchedClass;
                targetCoursId = matchedClass.matieres?.[0]?.id || "";
              }
            }

            setSelectedClasseId(targetClass.id);
            setSelectedCoursId(targetCoursId);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [urlClasseId, urlCoursId, urlMatiereId]);

  // Quand la classe change, pré-sélectionner son premier cours
  const currentClasse = useMemo(() => {
    return classes.find((c) => c.id === selectedClasseId);
  }, [classes, selectedClasseId]);

  const handleSelectClasse = (classeId: string) => {
    setSelectedClasseId(classeId);
    const cls = classes.find((c) => c.id === classeId);
    if (cls && cls.matieres && cls.matieres.length > 0) {
      setSelectedCoursId(cls.matieres[0].id);
    } else {
      setSelectedCoursId("");
    }
  };

  // 2. Charger la progression du cours sélectionné
  const loadProgression = async (coursId: string) => {
    if (!coursId) {
      setCoursDetail(null);
      setChapitres([]);
      return;
    }

    try {
      setLoadingProgression(true);
      const res = await fetch(`/api/cours/${coursId}/progression`);
      if (res.ok) {
        const data = await res.json();
        setCoursDetail(data.cours);
        setChapitres(data.chapitres);
        setSeances(data.seances);
        setStats(data.stats);
      } else {
        setChapitres([]);
      }
    } catch (err) {
      console.error("Erreur chargement progression:", err);
    } finally {
      setLoadingProgression(false);
    }
  };

  useEffect(() => {
    if (selectedCoursId) {
      loadProgression(selectedCoursId);
    }
  }, [selectedCoursId]);

  // Ouvrir le modal d'édition du syllabus
  const openProgramEditor = () => {
    if (chapitres.length > 0) {
      setDraftChapitres(
        chapitres.map((c, idx) => ({
          numero: c.numero || idx + 1,
          titre: c.titre,
          description: c.description || "",
          sousChapitres: (c.sousChapitres || []).map((s) => s.titre),
        }))
      );
    } else {
      setDraftChapitres([
        {
          numero: 1,
          titre: "Chapitre 1 : Introduction et objectifs du cours",
          description: "Présentation générale, prérequis et compétences visées.",
          sousChapitres: ["Introduction générale", "Concepts fondamentaux"],
        },
      ]);
    }
    setWordFile(null);
    setShowAiValidation(false);
    setAiMessage(null);
    setShowProgramModal(true);
  };

  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (urlAction === "edit-syllabus" && coursDetail && !openedOnceRef.current) {
      openedOnceRef.current = true;
      openProgramEditor();
    }
  }, [urlAction, coursDetail]);

  // 3. Cocher / Décocher un chapitre
  const handleToggleChapitre = async (chapitreId: string, currentValide: boolean, seanceId?: string) => {
    if (!selectedCoursId) return;

    try {
      setTogglingId(chapitreId);
      const res = await fetch(`/api/cours/${selectedCoursId}/progression`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapitreId,
          valide: !currentValide,
          seanceId: seanceId || (seances.length > 0 ? seances[0].id : null),
        }),
      });

      if (res.ok) {
        // Mise à jour optimiste locale
        setChapitres((prev) =>
          prev.map((c) =>
            c.id === chapitreId
              ? {
                  ...c,
                  valide: !currentValide,
                  dateValidation: !currentValide ? new Date().toISOString() : null,
                  seanceId: !currentValide ? (seanceId || (seances[0]?.id || null)) : null,
                }
              : c
          )
        );

        setNotification({
          type: "success",
          message: !currentValide
            ? "Chapitre validé et enregistré dans la progression !"
            : "Chapitre marqué comme non traité.",
        });

        // Recharger les stats exactes
        await loadProgression(selectedCoursId);
      } else {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur enregistrement" });
      }
    } catch {
      setNotification({ type: "error", message: "Erreur réseau." });
    } finally {
      setTogglingId(null);
    }
  };

  // 3b. Cocher / Décocher un sous-chapitre individuel
  const handleToggleSousChapitre = async (sousChapitreId: string, currentValide: boolean) => {
    if (!selectedCoursId) return;

    try {
      setTogglingId(sousChapitreId);
      const res = await fetch(`/api/cours/${selectedCoursId}/progression`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sousChapitreId,
          valide: !currentValide,
          seanceId: seances.length > 0 ? seances[0].id : null,
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: !currentValide
            ? "Sous-chapitre validé !"
            : "Sous-chapitre marqué comme non traité.",
        });
        await loadProgression(selectedCoursId);
      } else {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur enregistrement sous-chapitre" });
      }
    } catch {
      setNotification({ type: "error", message: "Erreur réseau." });
    } finally {
      setTogglingId(null);
    }
  };

  // Actions sur le draft manuel des chapitres
  const handleAddDraftRow = () => {
    const nextNum = draftChapitres.length + 1;
    setDraftChapitres((prev) => [
      ...prev,
      {
        numero: nextNum,
        titre: `Chapitre ${nextNum} : `,
        description: "",
        sousChapitres: [],
      },
    ]);
  };

  const handleRemoveDraftRow = (index: number) => {
    if (draftChapitres.length <= 1) return;
    setDraftChapitres((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((c, i) => ({ ...c, numero: i + 1 }));
    });
  };

  const handleMoveDraftRow = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= draftChapitres.length) return;

    setDraftChapitres((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((c, i) => ({ ...c, numero: i + 1 }));
    });
  };

  // Actions sur les sous-chapitres du draft
  const handleAddSubChapter = (chapIdx: number) => {
    setDraftChapitres((prev) =>
      prev.map((c, i) =>
        i === chapIdx
          ? { ...c, sousChapitres: [...c.sousChapitres, ""] }
          : c
      )
    );
  };

  const handleEditSubChapter = (chapIdx: number, subIdx: number, val: string) => {
    setDraftChapitres((prev) =>
      prev.map((c, i) =>
        i === chapIdx
          ? {
              ...c,
              sousChapitres: c.sousChapitres.map((s, si) => (si === subIdx ? val : s)),
            }
          : c
      )
    );
  };

  const handleRemoveSubChapter = (chapIdx: number, subIdx: number) => {
    setDraftChapitres((prev) =>
      prev.map((c, i) =>
        i === chapIdx
          ? {
              ...c,
              sousChapitres: c.sousChapitres.filter((_, si) => si !== subIdx),
            }
          : c
      )
    );
  };

  const handleSaveProgram = async (chapitresToSave: DraftChapitre[]) => {
    if (!coursDetail?.matiere.id) {
      setNotification({ type: "error", message: "Matière introuvable." });
      return;
    }

    const validList = chapitresToSave.filter((c) => c.titre.trim().length > 0);
    if (validList.length === 0) {
      setNotification({ type: "error", message: "Veuillez saisir au moins un chapitre valide." });
      return;
    }

    try {
      setSavingProgram(true);
      const res = await fetch(`/api/matieres/${coursDetail.matiere.id}/chapitres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapitres: validList.map((c, idx) => ({
            numero: c.numero,
            titre: c.titre.trim(),
            description: c.description.trim() || null,
            ordre: idx + 1,
            sousChapitres: (c.sousChapitres || [])
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .map((titre, scIdx) => ({ titre, ordre: scIdx + 1 })),
          })),
          replaceAll: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setNotification({ type: "error", message: err.error || "Erreur enregistrement programme" });
        return;
      }

      setNotification({
        type: "success",
        message: "Programme et sous-chapitres enregistrés avec succès pour cette matière !",
      });
      setShowProgramModal(false);
      if (selectedCoursId) {
        await loadProgression(selectedCoursId);
      }
    } catch {
      setNotification({ type: "error", message: "Erreur réseau." });
    } finally {
      setSavingProgram(false);
    }
  };

  // 5. Analyser le document Word avec IA OpenRouter
  const handleAnalyzeWordFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordFile) {
      setNotification({ type: "error", message: "Veuillez sélectionner un fichier Word .docx." });
      return;
    }

    try {
      setAnalyzingAi(true);
      setAiMessage(null);

      const formData = new FormData();
      formData.append("file", wordFile);
      if (activeAiModel) {
        formData.append("model", activeAiModel);
      }

      const res = await fetch("/api/ai/extract-chapitres", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setNotification({ type: "error", message: data.error || "Échec de l'analyse du document." });
        return;
      }

      if (Array.isArray(data.chapitres) && data.chapitres.length > 0) {
        setDraftChapitres(
          data.chapitres.map(
            (
              c: {
                numero: number;
                titre: string;
                description: string | null;
                sousChapitres?: string[];
              },
              idx: number
            ) => ({
              numero: c.numero || idx + 1,
              titre: c.titre,
              description: c.description || "",
              sousChapitres: Array.isArray(c.sousChapitres) ? c.sousChapitres : [],
            })
          )
        );
        setShowAiValidation(true);
        setAiMessage(data.message);
      } else {
        setNotification({
          type: "error",
          message: "Aucun chapitre n'a pu être identifié dans le document.",
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Erreur réseau lors de l'appel IA." });
    } finally {
      setAnalyzingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl shadow-sm border text-xs font-semibold transition-all ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : notification.type === "info"
              ? "bg-blue-50 text-blue-800 border-blue-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-blue-600" />
            Progression Pédagogique des Cours
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cochez les chapitres traités au fil des séances, mesurez le taux d&apos;avancement et gérez le syllabus de chaque matière.
          </p>
        </div>

        {coursDetail && (
          <button
            onClick={openProgramEditor}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            Définir / Modifier le Programme
          </button>
        )}
      </div>

      {/* Barre de sélection : Classe et Cours */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            1. Classe ciblée
          </label>
          <select
            value={selectedClasseId}
            onChange={(e) => handleSelectClasse(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {classes.length === 0 ? (
              <option value="">Chargement des classes...</option>
            ) : (
              classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.nom}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex-1 w-full">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            2. Cours / Matière
          </label>
          <select
            value={selectedCoursId}
            onChange={(e) => setSelectedCoursId(e.target.value)}
            disabled={!currentClasse || !currentClasse.matieres || currentClasse.matieres.length === 0}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {!currentClasse || currentClasse.matieres.length === 0 ? (
              <option value="">Aucun cours programmé dans cette classe</option>
            ) : (
              currentClasse.matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.nom}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Section Principale */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Chargement de la progression...</p>
        </div>
      ) : !coursDetail ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Aucun cours sélectionné</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Veuillez sélectionner une classe et un cours ci-dessus pour suivre ou configurer sa progression.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cartes KPI : Avancement Pédagogique vs Avancement Horaire */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Taux Pédagogique */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Avancement Pédagogique</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-emerald-600">
                  {stats.progressionChapitresPct}%
                </p>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({stats.chapitresValidesCount}/{stats.totalChapitres} chapitres)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${stats.progressionChapitresPct}%` }}
                />
              </div>
            </div>

            {/* Taux Horaire */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Volume Horaire Effectué</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-extrabold text-blue-600">
                  {coursDetail.progressionHeuresPct}%
                </p>
                <span className="text-[11px] text-slate-500 font-medium">
                  ({coursDetail.heuresEffectuees}h / {coursDetail.volumeHoraire}h)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${coursDetail.progressionHeuresPct}%` }}
                />
              </div>
            </div>

            {/* Séance(s) enregistrée(s) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold">Séances Réalisées</span>
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{stats.totalSeances}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {coursDetail.heuresRestantes}h restantes à dispenser
              </p>
            </div>

            {/* Statut & Synchronisation */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Synchronisation
                </span>
                {stats.totalChapitres === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Programme non défini
                  </span>
                ) : Math.abs(stats.progressionChapitresPct - coursDetail.progressionHeuresPct) <= 20 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Rythme équilibré
                  </span>
                ) : stats.progressionChapitresPct < coursDetail.progressionHeuresPct ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Clock className="w-3 h-3" /> Retard pédagogique
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Avance pédagogique
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Matière : <strong>{coursDetail.matiere.nom}</strong>
              </p>
            </div>
          </div>

          {/* Liste des Chapitres & Émargement Pédagogique */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Programme des Chapitres ({chapitres.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cochez les chapitres au fur et à mesure de vos cours pour mettre à jour la progression de la classe.
                </p>
              </div>

              {chapitres.length > 0 && (
                <button
                  onClick={openProgramEditor}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Modifier le programme
                </button>
              )}
            </div>

            {chapitres.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">
                  Aucun chapitre défini pour la matière &quot;{coursDetail.matiere.nom}&quot;
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Définissez la liste des chapitres de cette matière en les saisissant manuellement ou en important directement votre plan de cours Word grâce à l&apos;IA DeepSeek.
                </p>
                <div className="pt-2">
                  <button
                    onClick={openProgramEditor}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter le programme maintenant
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {chapitres.map((ch) => {
                  const isToggling = togglingId === ch.id;

                  return (
                    <div
                      key={ch.id}
                      className={`p-4 transition flex items-start gap-4 ${
                        ch.valide ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Checkbox géant */}
                      <button
                        type="button"
                        onClick={() => handleToggleChapitre(ch.id, !!ch.valide)}
                        disabled={isToggling}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition ${
                          ch.valide
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : "border-slate-300 bg-white hover:border-blue-500 text-transparent"
                        }`}
                        title={ch.valide ? "Cliquer pour décocher" : "Cliquer pour valider ce chapitre"}
                      >
                        {isToggling ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                      </button>

                      {/* Contenu du Chapitre */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                              ch.valide
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            Chapitre {ch.numero}
                          </span>
                          <h4
                            className={`text-sm font-bold truncate ${
                              ch.valide ? "text-slate-900 line-through decoration-emerald-500/50" : "text-slate-900"
                            }`}
                          >
                            {ch.titre}
                          </h4>
                          {ch.valide ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Traité (100%)
                            </span>
                          ) : ch.totalSous && ch.validesSous && ch.validesSous > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                              En cours ({ch.validesSous}/{ch.totalSous} sous-chapitres — {ch.progressionPct}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              À aborder
                            </span>
                          )}
                        </div>

                        {ch.description && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {ch.description}
                          </p>
                        )}

                        {/* Arbre interactif des Sous-chapitres */}
                        {ch.sousChapitres && ch.sousChapitres.length > 0 && (
                          <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-slate-200 space-y-2">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                              <span>Sous-chapitres ({ch.validesSous || 0}/{ch.totalSous})</span>
                              {ch.progressionPct !== undefined && ch.progressionPct > 0 && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  {ch.progressionPct}%
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5">
                              {ch.sousChapitres.map((sc, scIdx) => {
                                const isScToggling = togglingId === sc.id;
                                return (
                                  <div
                                    key={sc.id}
                                    className={`flex items-center gap-2.5 p-2 rounded-lg border transition ${
                                      sc.valide
                                        ? "bg-emerald-50/60 border-emerald-200 text-slate-900"
                                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSousChapitre(sc.id, !!sc.valide)}
                                      disabled={isScToggling}
                                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                                        sc.valide
                                          ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                          : "border-slate-300 bg-white hover:border-blue-500 text-transparent"
                                      }`}
                                      title={sc.valide ? "Cliquer pour marquer comme non traité" : "Cliquer pour valider ce sous-chapitre"}
                                    >
                                      {isScToggling ? (
                                        <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      )}
                                    </button>

                                    <span className="font-mono text-[10px] font-bold text-slate-400">
                                      {ch.numero}.{sc.ordre || scIdx + 1}
                                    </span>

                                    <span
                                      className={`text-xs flex-1 ${
                                        sc.valide ? "line-through decoration-emerald-500/50 text-slate-600 font-medium" : "font-semibold text-slate-800"
                                      }`}
                                    >
                                      {sc.titre}
                                    </span>

                                    {sc.valide && (
                                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                        Validé
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Métadonnées de validation */}
                        {ch.valide && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                            {ch.dateValidation && (
                              <span>
                                Validé le :{" "}
                                <strong className="text-slate-600">
                                  {new Date(ch.dateValidation).toLocaleDateString("fr-FR")}
                                </strong>
                              </span>
                            )}
                            {ch.seance && (
                              <span>
                                Séance liée :{" "}
                                <strong className="text-slate-600">
                                  {new Date(ch.seance.date).toLocaleDateString("fr-FR")} ({ch.seance.nombreHeures}h)
                                </strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Définir / Modifier le Programme de la Matière */}
      {showProgramModal && coursDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  Programme & Syllabus : {coursDetail.matiere.nom}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Matière : <span className="font-mono font-bold text-blue-700">[{coursDetail.matiere.code}]</span> — Ce programme sera partagé pour toutes les classes où cette matière est enseignée.
                </p>
              </div>
              <button
                onClick={() => setShowProgramModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setProgramTab("MANUAL");
                  setShowAiValidation(false);
                }}
                className={`pb-3 text-xs font-bold border-b-2 transition ${
                  programTab === "MANUAL"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Saisie manuelle des chapitres ({draftChapitres.length})
              </button>

              <button
                type="button"
                onClick={() => setProgramTab("WORD_AI")}
                className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                  programTab === "WORD_AI"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                2. Importer Document Word (.docx) avec IA
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {programTab === "MANUAL" || showAiValidation ? (
                /* Liste éditable des chapitres */
                <div className="space-y-3">
                  {showAiValidation && aiMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Extraction IA réussie !</strong>
                        <p className="mt-0.5">{aiMessage}</p>
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Vérifiez les chapitres ci-dessous, ajustez si nécessaire, puis cliquez sur &quot;Valider et enregistrer&quot;.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700">
                      Liste ordonnée des chapitres (jusqu&apos;à 20+ chapitres) :
                    </p>
                    <button
                      type="button"
                      onClick={handleAddDraftRow}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter un chapitre
                    </button>
                  </div>

                    <div className="space-y-3">
                    {draftChapitres.map((ch, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-800 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            required
                            placeholder={`Chapitre ${idx + 1} : Titre complet`}
                            value={ch.titre}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftChapitres((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, titre: val } : item))
                              );
                            }}
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />

                          {/* Boutons monter / descendre / supprimer */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveDraftRow(idx, "UP")}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === draftChapitres.length - 1}
                            onClick={() => handleMoveDraftRow(idx, "DOWN")}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={draftChapitres.length <= 1}
                            onClick={() => handleRemoveDraftRow(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30"
                            title="Supprimer ce chapitre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Description / Objectifs globaux du chapitre (Optionnel)"
                            value={ch.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftChapitres((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, description: val } : item
                                )
                              );
                            }}
                            className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Section Sous-chapitres */}
                        <div className="bg-white/90 rounded-lg p-2.5 border border-slate-200/90 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Sous-chapitres ({ch.sousChapitres.length}) :
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddSubChapter(idx)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Ajouter un sous-chapitre
                            </button>
                          </div>

                          {ch.sousChapitres.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              Aucun sous-chapitre défini (ex: &quot;Découvrir NumPy&quot;, &quot;Les bases de l&apos;algèbre linéaire&quot;).
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {ch.sousChapitres.map((sub, subIdx) => (
                                <div key={subIdx} className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono font-bold text-slate-400 pl-1">
                                    {idx + 1}.{subIdx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={`Sous-chapitre ${subIdx + 1} (ex: Découvrir NumPy)`}
                                    value={sub}
                                    onChange={(e) => handleEditSubChapter(idx, subIdx, e.target.value)}
                                    className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSubChapter(idx, subIdx)}
                                    className="p-1 text-slate-300 hover:text-rose-500 rounded transition cursor-pointer"
                                    title="Supprimer ce sous-chapitre"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAddDraftRow}
                      className="w-full py-2 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un chapitre supplémentaire
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab Import Word avec OpenRouter IA */
                <form onSubmit={handleAnalyzeWordFile} className="space-y-4">
                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-blue-900">
                          Extraction automatique par IA (OpenRouter)
                        </span>
                      </div>
                      <Link
                        href="/dashboard/config"
                        target="_blank"
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 shrink-0"
                        title="Ouvrir le menu de configuration pour choisir un autre modèle"
                      >
                        Changer de modèle &rarr;
                      </Link>
                    </div>
                    <p className="text-xs text-blue-800/80 leading-relaxed">
                      Téléversez votre document Word (syllabus, plan de cours .docx). L&apos;IA OpenRouter va repérer automatiquement la section contenant le découpage des chapitres et les extraire pour que vous puissiez les valider.
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-600">
                      <span className="font-semibold">Modèle actif :</span>
                      <code className="px-2 py-0.5 bg-blue-100/70 text-blue-900 font-mono rounded-md font-bold text-[10px]">
                        {activeAiModel}
                      </code>
                    </div>
                  </div>

                  {/* Fichier Word .docx */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Fichier Word du cours (.docx) *
                    </label>
                    <input
                      type="file"
                      accept=".docx"
                      required
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setWordFile(e.target.files[0]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={analyzingAi || !wordFile}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {analyzingAi ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          L&apos;IA analyse votre document Word ({activeAiModel})...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyser le document et extraire les chapitres
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowProgramModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Annuler
              </button>

              {(programTab === "MANUAL" || showAiValidation) && (
                <button
                  type="button"
                  disabled={savingProgram || draftChapitres.length === 0}
                  onClick={() => handleSaveProgram(draftChapitres)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
                >
                  {savingProgram ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Valider et enregistrer le programme
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProgressionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProgressionContent />
    </Suspense>
  );
}
