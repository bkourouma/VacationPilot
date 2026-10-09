"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { App, Button, Input, Pagination, Segmented, Select } from "antd";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Search,
  ArrowRight,
  ShieldAlert,
  Building,
  CalendarCheck,
  RefreshCw,
  School,
  User,
  ArrowDownUp,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

const PAGE_SIZE = 15;

interface MatiereStat {
  id: string;
  code: string;
  nom: string;
  coefficient: number;
  volumeHoraire: number;
  heuresEffectuees: number;
  heuresRestantes: number;
  progressionPct: number;
  statut: "NON_DEMARRE" | "EN_COURS" | "TERMINE";
  totalSeances: number;
  derniereSeanceDate: string | null;
  joursDepuisDerniereSeance: number | null;
  presencesCount: number;
  presentsCount: number;
  absentsCount: number;
  retardsCount: number;
  justifiesCount: number;
  tauxAssiduite: number;
  evaluationsCount: number;
  moyenneGenerale: number | null;
  alertes: string[];
  enseignant: { id: string; nom: string; email: string | null; username: string } | null;
}

interface ClasseStat {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  effectif: number;
  heuresPrevues: number;
  heuresFaites: number;
  heuresRestantes: number;
  progressionPct: number;
  matieres: MatiereStat[];
}

interface EnseignantStat {
  id: string;
  nom: string;
  email: string | null;
  username: string;
  _count: { matieres: number; seances: number };
}

interface GlobalStats {
  totalClasses: number;
  totalEnseignants: number;
  totalEtudiants: number;
  totalVolumePrevu: number;
  totalHeuresEffectuees: number;
  totalHeuresRestantes: number;
  tauxRealisationGlobal: number;
  matieresTermineesCount: number;
  matieresEnCoursCount: number;
  matieresEnRetardCount: number;
  matieresNonDemarreesCount: number;
  totalRetardsAll: number;
  tauxAssiduiteGlobal: number;
}

interface AlerteGlobale {
  type: "URGENT" | "ATTENTION" | "INFO";
  matiereNom: string;
  matiereCode: string;
  classeCode: string;
  classeId?: string;
  enseignantNom: string;
  message: string;
}

type StatusFilter = "ALL" | "RETARD" | "EN_COURS" | "NON_DEMARRE" | "TERMINE";
type SortKey = "DEFAULT" | "PROG_ASC" | "PROG_DESC" | "ASSIDUITE_ASC" | "INACTIVITE";

interface Row {
  matiere: MatiereStat;
  classe: { id: string; code: string; nom: string };
  hasDelay: boolean;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "DEFAULT", label: "Ordre par défaut" },
  { value: "PROG_ASC", label: "Progression croissante" },
  { value: "PROG_DESC", label: "Progression décroissante" },
  { value: "ASSIDUITE_ASC", label: "Assiduité la plus faible" },
  { value: "INACTIVITE", label: "Inactivité la plus longue" },
];

function progressTone(pct: number) {
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 50) return "bg-blue-600";
  if (pct > 0) return "bg-amber-500";
  return "bg-slate-300";
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${progressTone(value)}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function StatutBadge({ row }: { row: Row }) {
  const { matiere, hasDelay } = row;
  const cls =
    matiere.statut === "TERMINE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : hasDelay
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : matiere.statut === "EN_COURS"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-600 border-slate-200";
  const label =
    matiere.statut === "TERMINE"
      ? "Terminé"
      : hasDelay
      ? "En retard"
      : matiere.statut === "EN_COURS"
      ? "En cours"
      : "Non démarré";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

export default function AdminProgressionPage() {
  const { message } = App.useApp();
  const [classes, setClasses] = useState<ClasseStat[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantStat[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [alertes, setAlertes] = useState<AlerteGlobale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [showAllAlertes, setShowAllAlertes] = useState(false);

  // Filtres
  const [selectedClasseId, setSelectedClasseId] = useState<string>("ALL");
  const [selectedEnseignantId, setSelectedEnseignantId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("DEFAULT");
  const [page, setPage] = useState(1);

  const loadData = useCallback(
    async (manual = false) => {
      try {
        if (manual) setRefreshing(true);
        const res = await fetch("/api/admin/progression");
        if (!res.ok) throw new Error("Erreur de chargement");
        const data = await res.json();
        setClasses(data.classes || []);
        setEnseignants(data.enseignants || []);
        setGlobalStats(data.globalStats || null);
        setAlertes(data.alertesGlobales || []);
        setError(false);
        if (manual) message.success("Données actualisées.");
      } catch (err) {
        console.error(err);
        setError(true);
        if (manual) message.error("Impossible d'actualiser les données.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [message]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [selectedClasseId, selectedEnseignantId, statusFilter, searchQuery, sortKey]);

  // Toutes les matières à plat
  const allRows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    classes.forEach((c) =>
      c.matieres.forEach((m) =>
        list.push({
          matiere: m,
          classe: { id: c.id, code: c.code, nom: c.nom },
          hasDelay: m.alertes.some((a) => a.includes("Retard")),
        })
      )
    );
    return list;
  }, [classes]);

  // Lignes filtrées (hors filtre de statut) pour calculer les compteurs du sélecteur de statut
  const scopedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter(({ matiere, classe }) => {
      if (selectedClasseId !== "ALL" && classe.id !== selectedClasseId) return false;
      if (selectedEnseignantId !== "ALL" && matiere.enseignant?.id !== selectedEnseignantId) return false;
      if (!q) return true;
      return (
        matiere.nom.toLowerCase().includes(q) ||
        matiere.code.toLowerCase().includes(q) ||
        classe.code.toLowerCase().includes(q) ||
        classe.nom.toLowerCase().includes(q) ||
        !!matiere.enseignant?.nom.toLowerCase().includes(q) ||
        !!matiere.enseignant?.email?.toLowerCase().includes(q)
      );
    });
  }, [allRows, selectedClasseId, selectedEnseignantId, searchQuery]);

  const statusCounts = useMemo(
    () => ({
      ALL: scopedRows.length,
      RETARD: scopedRows.filter((r) => r.hasDelay).length,
      EN_COURS: scopedRows.filter((r) => r.matiere.statut === "EN_COURS").length,
      NON_DEMARRE: scopedRows.filter((r) => r.matiere.statut === "NON_DEMARRE").length,
      TERMINE: scopedRows.filter((r) => r.matiere.statut === "TERMINE").length,
    }),
    [scopedRows]
  );

  const rows = useMemo(() => {
    const filtered = scopedRows.filter((r) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "RETARD") return r.hasDelay;
      return r.matiere.statut === statusFilter;
    });
    const sorted = [...filtered];
    switch (sortKey) {
      case "PROG_ASC":
        sorted.sort((a, b) => a.matiere.progressionPct - b.matiere.progressionPct);
        break;
      case "PROG_DESC":
        sorted.sort((a, b) => b.matiere.progressionPct - a.matiere.progressionPct);
        break;
      case "ASSIDUITE_ASC":
        sorted.sort((a, b) => a.matiere.tauxAssiduite - b.matiere.tauxAssiduite);
        break;
      case "INACTIVITE":
        sorted.sort(
          (a, b) =>
            (b.matiere.joursDepuisDerniereSeance ?? Infinity) - (a.matiere.joursDepuisDerniereSeance ?? Infinity)
        );
        break;
    }
    return sorted;
  }, [scopedRows, statusFilter, sortKey]);

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilter =
    selectedClasseId !== "ALL" || selectedEnseignantId !== "ALL" || statusFilter !== "ALL" || !!searchQuery.trim();

  const classOptions = [
    { value: "ALL", label: "Toutes les classes" },
    ...classes.map((c) => ({ value: c.id, label: `${c.code} (${c.nom})` })),
  ];
  const teacherOptions = [
    { value: "ALL", label: "Tous les enseignants" },
    ...enseignants.map((p) => ({ value: p.id, label: `${p.nom} (${p.email || p.username})` })),
  ];

  const resetFilters = () => {
    setSelectedClasseId("ALL");
    setSelectedEnseignantId("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setSortKey("DEFAULT");
  };

  // --- Fragments partagés tableau / cartes ---

  const renderLastSession = (m: MatiereStat) =>
    m.derniereSeanceDate ? (
      <div className="whitespace-nowrap">
        <div className="text-slate-700 font-medium">
          {new Date(m.derniereSeanceDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
        </div>
        <div
          className={`text-[10px] ${
            (m.joursDepuisDerniereSeance || 0) > 14 ? "text-rose-600 font-bold" : "text-slate-400"
          }`}
        >
          il y a {m.joursDepuisDerniereSeance} j
        </div>
      </div>
    ) : (
      <span className="text-slate-400 text-[11px]">Aucune séance</span>
    );

  const renderAssiduite = (m: MatiereStat) => (
    <div className="whitespace-nowrap">
      <span
        className={`font-semibold ${
          m.tauxAssiduite >= 85 ? "text-emerald-700" : m.tauxAssiduite >= 70 ? "text-amber-700" : "text-rose-700"
        }`}
      >
        {m.tauxAssiduite}%
      </span>
      {m.retardsCount > 0 && (
        <span className="block text-[10px] text-amber-600">{m.retardsCount} retard(s)</span>
      )}
    </div>
  );

  const renderActions = ({ matiere, classe }: Row) => (
    <div className="flex items-center gap-1.5">
      <Link
        href={`/dashboard/presences?classeId=${classe.id}&matiereId=${matiere.id}`}
        title="Voir les présences de ce cours"
        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold transition"
      >
        Présences
      </Link>
      <Link
        href={`/dashboard/notes?classeId=${classe.id}&matiereId=${matiere.id}`}
        title="Voir les notes"
        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[11px] font-semibold transition"
      >
        Notes
      </Link>
      <Link
        href={`/dashboard/progression?classeId=${classe.id}&coursId=${matiere.id}`}
        title="Voir la progression pédagogique"
        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-semibold transition"
      >
        Programme
      </Link>
    </div>
  );

  const renderEnseignant = (m: MatiereStat) =>
    m.enseignant ? (
      <div className="whitespace-nowrap">
        <div className="font-semibold text-slate-800">{m.enseignant.nom}</div>
        <div className="text-[10px] text-slate-400">{m.enseignant.email || `@${m.enseignant.username}`}</div>
      </div>
    ) : (
      <span className="text-amber-700 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
        Non assigné
      </span>
    );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white border border-slate-200" />
      </div>
    );
  }

  if (error && !globalStats) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm space-y-3">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Chargement impossible</h2>
        <p className="text-sm text-slate-600">
          Les données de progression n&apos;ont pas pu être récupérées. Vérifiez votre connexion puis réessayez.
        </p>
        <Button
          type="primary"
          icon={<RefreshCw className="w-4 h-4" />}
          loading={refreshing}
          onClick={() => loadData(true)}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const visibleAlertes = showAllAlertes ? alertes : alertes.slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
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
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                <Building className="w-3.5 h-3.5" />
                Supervision &amp; direction pédagogique
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Suivi de la progression &amp; des retards
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Contrôle des volumes horaires, avancement par enseignant et détection des retards.
              </p>
            </div>
          </div>

          <Button
            size="large"
            ghost
            loading={refreshing}
            icon={!refreshing ? <RefreshCw className="w-4 h-4" /> : undefined}
            onClick={() => loadData(true)}
            className="!text-xs !font-semibold !text-white !border-white/40 hover:!border-white shrink-0"
          >
            Actualiser les données
          </Button>
        </div>
      </div>

      {/* Indicateurs */}
      {globalStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Volume horaire</span>
              <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {globalStats.totalHeuresEffectuees}h
              </span>
              <span className="text-xs font-medium text-slate-500">/ {globalStats.totalVolumePrevu}h</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={globalStats.tauxRealisationGlobal} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Avancement global</span>
              <span className="font-bold text-blue-700">{globalStats.tauxRealisationGlobal}%</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Matières en retard</span>
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  globalStats.matieresEnRetardCount > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {globalStats.matieresEnRetardCount > 0 ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold tabular-nums ${
                  globalStats.matieresEnRetardCount > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {globalStats.matieresEnRetardCount}
              </span>
              <span className="text-xs font-medium text-slate-500">sur {allRows.length} matières</span>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-snug">
              {globalStats.matieresEnRetardCount > 0
                ? "Inactivité prolongée ou retard sur le calendrier."
                : "Aucun retard critique détecté."}
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assiduité</span>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                {globalStats.tauxAssiduiteGlobal}%
              </span>
              <span className="text-xs font-medium text-slate-500">taux moyen</span>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {globalStats.totalRetardsAll} retards étudiants signalés
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Corps enseignant</span>
              <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-700 tabular-nums">
                {globalStats.totalEnseignants}
              </span>
              <span className="text-xs font-medium text-slate-500">enseignants actifs</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {globalStats.totalClasses} classes &bull; {globalStats.totalEtudiants} auditeurs
            </p>
          </div>
        </div>
      )}

      {/* Alertes */}
      {alertes.length > 0 && (
        <section className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Alertes &amp; retards constatés ({alertes.length})
            </h2>
            <span className="text-xs font-medium text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
              Action administrative requise
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleAlertes.map((alt, idx) => (
              <div
                key={`${alt.classeCode}-${alt.matiereCode}-${idx}`}
                className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                    <span className="text-blue-700 font-bold">{alt.classeCode}</span>
                    <span
                      className={`px-1.5 rounded text-[10px] font-bold ${
                        alt.type === "URGENT"
                          ? "bg-red-100 text-red-700"
                          : alt.type === "ATTENTION"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {alt.type}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {alt.matiereNom} ({alt.matiereCode})
                  </h3>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">{alt.message}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate">
                    Prof : <strong>{alt.enseignantNom}</strong>
                  </span>
                  <Link
                    href={`/dashboard/presences?classeId=${alt.classeId ?? ""}`}
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 shrink-0"
                  >
                    Vérifier <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {alertes.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllAlertes((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllAlertes ? "rotate-180" : ""}`} />
              {showAllAlertes ? "Voir moins" : `Voir les ${alertes.length - 6} autres alertes`}
            </button>
          )}
        </section>
      )}

      {/* Filtres + liste */}
      <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Progression par matière
                <span className="ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold tabular-nums">
                  {rows.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Heures dispensées par rapport au volume horaire prévu.
              </p>
            </div>
            {hasActiveFilter && (
              <Button size="small" onClick={resetFilters} className="!text-xs !font-semibold self-start sm:self-auto">
                Réinitialiser les filtres
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <Select
              aria-label="Filtrer par classe"
              showSearch
              value={selectedClasseId}
              onChange={setSelectedClasseId}
              options={classOptions}
              optionFilterProp="label"
              suffixIcon={<School className="w-4 h-4 text-slate-400" />}
            />
            <Select
              aria-label="Filtrer par enseignant"
              showSearch
              value={selectedEnseignantId}
              onChange={setSelectedEnseignantId}
              options={teacherOptions}
              optionFilterProp="label"
              suffixIcon={<User className="w-4 h-4 text-slate-400" />}
            />
            <Select
              aria-label="Trier les matières"
              value={sortKey}
              onChange={setSortKey}
              options={SORT_OPTIONS}
              suffixIcon={<ArrowDownUp className="w-4 h-4 text-slate-400" />}
            />
            <Input
              aria-label="Rechercher une matière ou un enseignant"
              allowClear
              prefix={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Rechercher matière, enseignant…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Segmented<StatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "ALL", label: `Tous (${statusCounts.ALL})` },
                { value: "RETARD", label: `En retard (${statusCounts.RETARD})` },
                { value: "EN_COURS", label: `En cours (${statusCounts.EN_COURS})` },
                { value: "NON_DEMARRE", label: `Non démarrés (${statusCounts.NON_DEMARRE})` },
                { value: "TERMINE", label: `Terminés (${statusCounts.TERMINE})` },
              ]}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">Aucune matière trouvée</p>
            <p className="text-xs text-slate-500 mt-1">
              {hasActiveFilter
                ? "Aucune matière ne correspond aux critères sélectionnés."
                : "Aucun cours n'est encore programmé."}
            </p>
          </div>
        ) : (
          <>
            {/* Grand écran : tableau */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-max table-auto text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-5 whitespace-nowrap">Classe</th>
                    <th className="py-3 px-4 whitespace-nowrap">Matière</th>
                    <th className="py-3 px-4 whitespace-nowrap">Enseignant</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Prévu</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Effectué</th>
                    <th className="py-3 px-4 whitespace-nowrap">Progression</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Dernière séance</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Assiduité</th>
                    <th className="py-3 px-4 whitespace-nowrap">Statut</th>
                    <th className="py-3 px-5 whitespace-nowrap sticky right-0 bg-slate-50 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((row) => {
                    const { matiere, classe, hasDelay } = row;
                    return (
                      <tr
                        key={`${classe.id}-${matiere.id}`}
                        className={`hover:bg-slate-50/80 transition ${hasDelay ? "bg-rose-50/20" : ""}`}
                      >
                        <td className="py-3 px-5 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-mono font-bold">
                            {classe.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">{matiere.nom}</div>
                          <div className="text-[10px] text-slate-500">
                            {matiere.code} &bull; coef. {matiere.coefficient}
                          </div>
                        </td>
                        <td className="py-3 px-4">{renderEnseignant(matiere)}</td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold">
                            {matiere.volumeHoraire}h
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`font-mono font-bold ${
                              matiere.heuresEffectuees >= matiere.volumeHoraire
                                ? "text-emerald-600"
                                : matiere.heuresEffectuees === 0
                                ? "text-slate-400"
                                : "text-blue-600"
                            }`}
                          >
                            {matiere.heuresEffectuees}h
                          </span>
                          <span className="text-[10px] text-slate-400 block">reste {matiere.heuresRestantes}h</span>
                        </td>
                        <td className="py-3 px-4 min-w-40">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                            <span className="text-slate-700">{matiere.progressionPct}%</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {matiere.totalSeances} séance(s)
                            </span>
                          </div>
                          <ProgressBar value={matiere.progressionPct} />
                        </td>
                        <td className="py-3 px-4 text-center">{renderLastSession(matiere)}</td>
                        <td className="py-3 px-4 text-center">{renderAssiduite(matiere)}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <StatutBadge row={row} />
                            {matiere.alertes[0] && (
                              <div className="text-[10px] text-rose-700 font-medium leading-tight max-w-44">
                                {matiere.alertes[0]}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap sticky right-0 bg-white shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)]">
                          {renderActions(row)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile & tablette : cartes */}
            <ul className="lg:hidden divide-y divide-slate-100">
              {pagedRows.map((row) => {
                const { matiere, classe } = row;
                return (
                  <li key={`${classe.id}-${matiere.id}`} className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-mono font-bold text-xs">
                        {classe.code}
                      </span>
                      <StatutBadge row={row} />
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{matiere.nom}</h3>
                      <p className="text-[11px] text-slate-500">
                        {matiere.code} &bull; coef. {matiere.coefficient}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                        <span className="text-slate-700">
                          {matiere.heuresEffectuees}h / {matiere.volumeHoraire}h &bull; {matiere.progressionPct}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {matiere.totalSeances} séance(s)
                        </span>
                      </div>
                      <ProgressBar value={matiere.progressionPct} />
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Enseignant
                        </dt>
                        <dd>{renderEnseignant(matiere)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Dernière séance
                        </dt>
                        <dd>{renderLastSession(matiere)}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                          Assiduité
                        </dt>
                        <dd>{renderAssiduite(matiere)}</dd>
                      </div>
                      {matiere.alertes[0] && (
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Alerte
                          </dt>
                          <dd className="text-[11px] text-rose-700 font-medium leading-tight">
                            {matiere.alertes[0]}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {renderActions(row)}
                  </li>
                );
              })}
            </ul>

            <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs text-slate-500 tabular-nums">
                {rows.length} résultat{rows.length > 1 ? "s" : ""}
                {rows.length !== allRows.length ? ` sur ${allRows.length}` : ""}
              </span>
              <Pagination
                size="small"
                current={page}
                pageSize={PAGE_SIZE}
                total={rows.length}
                onChange={setPage}
                showSizeChanger={false}
                hideOnSinglePage
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
