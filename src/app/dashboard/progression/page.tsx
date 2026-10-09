"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { App, Button, Checkbox, Select, Segmented, Spin } from "antd";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  Plus,
  ChevronDown,
  School,
  Pencil,
  CircleDashed,
} from "lucide-react";
import ProgramEditorModal from "./_components/ProgramEditorModal";
import {
  ChapitreItem,
  ClasseOption,
  CoursDetail,
  DraftChapitre,
  ProgressionStats,
  SeanceItem,
  labelClass,
} from "./_components/types";

type ChapFilter = "ALL" | "TODO" | "DOING" | "DONE";

function chapStatus(ch: ChapitreItem): Exclude<ChapFilter, "ALL"> {
  if (ch.valide) return "DONE";
  if (ch.totalSous && ch.validesSous && ch.validesSous > 0) return "DOING";
  return "TODO";
}

function ProgressBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${tone}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ProgressionContent() {
  const { message } = App.useApp();
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
  const [stats, setStats] = useState<ProgressionStats>({
    totalChapitres: 0,
    chapitresValidesCount: 0,
    chapitresRestantsCount: 0,
    progressionChapitresPct: 0,
    totalSeances: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingProgression, setLoadingProgression] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<ChapFilter>("ALL");
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  // Éditeur de syllabus
  const [programOpen, setProgramOpen] = useState(false);
  const [draftChapitres, setDraftChapitres] = useState<DraftChapitre[]>([]);
  const [activeAiModel, setActiveAiModel] = useState<string>("deepseek/deepseek-chat");

  // 1. Charger les classes et leurs cours
  useEffect(() => {
    async function loadInitial() {
      try {
        // Modèle IA configuré
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
              const matchedClass = data.find((c) => c.matieres?.some((m) => m.id === urlCoursId));
              if (matchedClass) {
                targetClass = matchedClass;
                targetCoursId = urlCoursId;
              }
            } else if (urlMatiereId) {
              const matchedClass = data.find((c) =>
                c.matieres?.some((m) => m.matiereId === urlMatiereId || m.id === urlMatiereId)
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
        message.error("Impossible de charger les classes.");
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlClasseId, urlCoursId, urlMatiereId]);

  const currentClasse = useMemo(
    () => classes.find((c) => c.id === selectedClasseId),
    [classes, selectedClasseId]
  );

  const handleSelectClasse = (classeId: string) => {
    setSelectedClasseId(classeId);
    const cls = classes.find((c) => c.id === classeId);
    setSelectedCoursId(cls?.matieres?.[0]?.id || "");
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
      message.error("Impossible de charger la progression.");
    } finally {
      setLoadingProgression(false);
    }
  };

  useEffect(() => {
    if (selectedCoursId) {
      setOpenOverrides({});
      setFilter("ALL");
      loadProgression(selectedCoursId);
    } else {
      setCoursDetail(null);
      setChapitres([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoursId]);

  // Ouvrir l'éditeur du syllabus
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
    setProgramOpen(true);
  };

  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (urlAction === "edit-syllabus" && coursDetail && !openedOnceRef.current) {
      openedOnceRef.current = true;
      openProgramEditor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlAction, coursDetail]);

  // 3. Cocher / décocher un chapitre
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
                  seanceId: !currentValide ? seanceId || seances[0]?.id || null : null,
                }
              : c
          )
        );

        message.success(
          !currentValide
            ? "Chapitre validé et enregistré dans la progression."
            : "Chapitre marqué comme non traité."
        );

        await loadProgression(selectedCoursId);
      } else {
        const err = await res.json();
        message.error(err.error || "Erreur enregistrement");
      }
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setTogglingId(null);
    }
  };

  // 3b. Cocher / décocher un sous-chapitre
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
        message.success(!currentValide ? "Sous-chapitre validé." : "Sous-chapitre marqué comme non traité.");
        await loadProgression(selectedCoursId);
      } else {
        const err = await res.json();
        message.error(err.error || "Erreur enregistrement sous-chapitre");
      }
    } catch {
      message.error("Erreur réseau.");
    } finally {
      setTogglingId(null);
    }
  };

  const counts = useMemo(() => {
    const c = { ALL: chapitres.length, TODO: 0, DOING: 0, DONE: 0 };
    chapitres.forEach((ch) => {
      c[chapStatus(ch)]++;
    });
    return c;
  }, [chapitres]);

  const visibleChapitres = chapitres.filter((ch) => filter === "ALL" || chapStatus(ch) === filter);

  const classOptions = classes.map((c) => ({ value: c.id, label: `${c.code} — ${c.nom}` }));
  const coursOptions = (currentClasse?.matieres ?? []).map((m) => ({
    value: m.id,
    label: `[${m.code}] ${m.nom}`,
  }));

  const rythme = (() => {
    if (!coursDetail) return null;
    if (stats.totalChapitres === 0)
      return { label: "Programme non défini", tone: "bg-amber-50 text-amber-700 border-amber-200", icon: <CircleDashed className="w-3 h-3" /> };
    const diff = stats.progressionChapitresPct - coursDetail.progressionHeuresPct;
    if (Math.abs(diff) <= 20)
      return { label: "Rythme équilibré", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="w-3 h-3" /> };
    if (diff < 0)
      return { label: "Retard pédagogique", tone: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> };
    return { label: "Avance pédagogique", tone: "bg-blue-50 text-blue-700 border-blue-200", icon: <TrendingUp className="w-3 h-3" /> };
  })();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-24 rounded-2xl bg-white border border-slate-200" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-white border border-slate-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* En-tête */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 backdrop-blur">
              <TrendingUp className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Progression pédagogique des cours
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Cochez les chapitres traités au fil des séances, mesurez le taux d&apos;avancement et gérez
                le syllabus de chaque matière.
              </p>
            </div>
          </div>

          {coursDetail && (
            <Button
              type="primary"
              size="large"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={openProgramEditor}
              className="!text-xs !font-bold shrink-0"
            >
              Définir / modifier le programme
            </Button>
          )}
        </div>
      </div>

      {/* Sélection : classe & cours */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className={`${labelClass} block mb-1.5`}>1. Classe ciblée</span>
          <Select
            aria-label="Classe ciblée"
            className="w-full"
            size="large"
            showSearch
            value={selectedClasseId || undefined}
            onChange={handleSelectClasse}
            options={classOptions}
            optionFilterProp="label"
            placeholder="Aucune classe disponible"
            suffixIcon={<School className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <div>
          <span className={`${labelClass} block mb-1.5`}>2. Cours / matière</span>
          <Select
            aria-label="Cours / matière"
            className="w-full"
            size="large"
            showSearch
            value={selectedCoursId || undefined}
            onChange={setSelectedCoursId}
            options={coursOptions}
            optionFilterProp="label"
            disabled={coursOptions.length === 0}
            placeholder="Aucun cours programmé dans cette classe"
            suffixIcon={<BookOpen className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </section>

      {!coursDetail ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Aucun cours sélectionné</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Sélectionnez une classe et un cours ci-dessus pour suivre ou configurer sa progression.
          </p>
        </div>
      ) : (
        <Spin spinning={loadingProgression && !!coursDetail} size="small">
          <div className="space-y-6">
            {/* Indicateurs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Avancement pédagogique</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                    {stats.progressionChapitresPct}%
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({stats.chapitresValidesCount}/{stats.totalChapitres} chapitres)
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={stats.progressionChapitresPct} tone="bg-emerald-500" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Volume horaire effectué</span>
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-2xl font-extrabold text-blue-600 tabular-nums">
                    {coursDetail.progressionHeuresPct}%
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({coursDetail.heuresEffectuees}h / {coursDetail.volumeHoraire}h)
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={coursDetail.progressionHeuresPct} tone="bg-blue-600" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Séances réalisées</span>
                  <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">{stats.totalSeances}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {coursDetail.heuresRestantes}h restantes à dispenser
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Synchronisation
                  </span>
                  {rythme && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${rythme.tone}`}
                    >
                      {rythme.icon} {rythme.label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 truncate">
                  Matière : <strong className="text-slate-600">{coursDetail.matiere.nom}</strong>
                </p>
              </div>
            </div>

            {/* Programme des chapitres */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      Programme des chapitres
                      <span className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                        {chapitres.length}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cochez les chapitres au fur et à mesure de vos cours pour mettre à jour la progression de
                      la classe.
                    </p>
                  </div>
                  {chapitres.length > 0 && (
                    <Button
                      icon={<Pencil className="w-3.5 h-3.5" />}
                      onClick={openProgramEditor}
                      className="!text-xs !font-semibold"
                    >
                      Modifier le programme
                    </Button>
                  )}
                </div>

                {chapitres.length > 0 && (
                  <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <Segmented<ChapFilter>
                      value={filter}
                      onChange={setFilter}
                      options={[
                        { value: "ALL", label: `Tous (${counts.ALL})` },
                        { value: "TODO", label: `À aborder (${counts.TODO})` },
                        { value: "DOING", label: `En cours (${counts.DOING})` },
                        { value: "DONE", label: `Traités (${counts.DONE})` },
                      ]}
                    />
                  </div>
                )}
              </div>

              {chapitres.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Aucun chapitre défini pour la matière «&nbsp;{coursDetail.matiere.nom}&nbsp;»
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Définissez la liste des chapitres en les saisissant manuellement ou en important
                    directement votre plan de cours Word grâce à l&apos;IA.
                  </p>
                  <div className="pt-2">
                    <Button
                      type="primary"
                      size="large"
                      icon={<Plus className="w-4 h-4" />}
                      onClick={openProgramEditor}
                      className="!text-xs !font-bold"
                    >
                      Ajouter le programme maintenant
                    </Button>
                  </div>
                </div>
              ) : visibleChapitres.length === 0 ? (
                <div className="px-6 py-12 text-center text-xs text-slate-500">
                  Aucun chapitre dans cette catégorie.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleChapitres.map((ch) => {
                    const isToggling = togglingId === ch.id;
                    const status = chapStatus(ch);
                    const hasSous = !!ch.sousChapitres && ch.sousChapitres.length > 0;
                    const isOpen = openOverrides[ch.id] ?? status !== "DONE";

                    return (
                      <li
                        key={ch.id}
                        className={`p-4 sm:p-5 transition ${
                          ch.valide ? "bg-emerald-50/30 hover:bg-emerald-50/50" : "hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={!!ch.valide}
                            disabled={isToggling}
                            onChange={() => handleToggleChapitre(ch.id, !!ch.valide)}
                            aria-label={`Valider le chapitre ${ch.numero}`}
                            className="!mt-1"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                                  ch.valide ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                Chapitre {ch.numero}
                              </span>
                              <h3
                                className={`text-sm font-bold text-slate-900 ${
                                  ch.valide ? "line-through decoration-emerald-500/50" : ""
                                }`}
                              >
                                {ch.titre}
                              </h3>
                              {status === "DONE" ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Traité (100%)
                                </span>
                              ) : status === "DOING" ? (
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
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{ch.description}</p>
                            )}

                            {hasSous && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => setOpenOverrides((p) => ({ ...p, [ch.id]: !isOpen }))}
                                  aria-expanded={isOpen}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-800 transition cursor-pointer"
                                >
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                                  />
                                  Sous-chapitres ({ch.validesSous || 0}/{ch.totalSous})
                                  {ch.progressionPct !== undefined && ch.progressionPct > 0 && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-200 normal-case">
                                      {ch.progressionPct}%
                                    </span>
                                  )}
                                </button>

                                {isOpen && (
                                  <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-slate-200 space-y-1.5">
                                    {ch.sousChapitres!.map((sc, scIdx) => {
                                      const isScToggling = togglingId === sc.id;
                                      return (
                                        <div
                                          key={sc.id}
                                          className={`flex items-center gap-2.5 p-2 rounded-lg border transition ${
                                            sc.valide
                                              ? "bg-emerald-50/60 border-emerald-200"
                                              : "bg-white border-slate-200 hover:border-slate-300"
                                          }`}
                                        >
                                          <Checkbox
                                            checked={!!sc.valide}
                                            disabled={isScToggling}
                                            onChange={() => handleToggleSousChapitre(sc.id, !!sc.valide)}
                                            aria-label={`Valider le sous-chapitre ${ch.numero}.${sc.ordre || scIdx + 1}`}
                                          />
                                          <span className="font-mono text-[10px] font-bold text-slate-400">
                                            {ch.numero}.{sc.ordre || scIdx + 1}
                                          </span>
                                          <span
                                            className={`text-xs flex-1 ${
                                              sc.valide
                                                ? "line-through decoration-emerald-500/50 text-slate-600 font-medium"
                                                : "font-semibold text-slate-800"
                                            }`}
                                          >
                                            {sc.titre}
                                          </span>
                                          {sc.valide && (
                                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 rounded">
                                              Validé
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {ch.valide && (ch.dateValidation || ch.seance) && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[11px] text-slate-400">
                                {ch.dateValidation && (
                                  <span>
                                    Validé le{" "}
                                    <strong className="text-slate-600">
                                      {new Date(ch.dateValidation).toLocaleDateString("fr-FR")}
                                    </strong>
                                  </span>
                                )}
                                {ch.seance && (
                                  <span>
                                    Séance liée :{" "}
                                    <strong className="text-slate-600">
                                      {new Date(ch.seance.date).toLocaleDateString("fr-FR")} (
                                      {ch.seance.nombreHeures}h)
                                    </strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </Spin>
      )}

      <ProgramEditorModal
        open={programOpen}
        matiere={coursDetail?.matiere ?? null}
        initialChapitres={draftChapitres}
        activeAiModel={activeAiModel}
        onClose={() => setProgramOpen(false)}
        onSaved={async () => {
          setProgramOpen(false);
          if (selectedCoursId) await loadProgression(selectedCoursId);
        }}
      />
    </div>
  );
}

export default function ProgressionPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
          <div className="h-32 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-white border border-slate-200" />
        </div>
      }
    >
      <ProgressionContent />
    </Suspense>
  );
}
