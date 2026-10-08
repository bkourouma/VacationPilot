"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Users,
  BookOpen,
  Filter,
  Search,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building,
  GraduationCap,
  CalendarCheck,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

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
  enseignantNom: string;
  message: string;
}

export default function AdminProgressionPage() {
  const [classes, setClasses] = useState<ClasseStat[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantStat[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [alertes, setAlertes] = useState<AlerteGlobale[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [selectedClasseId, setSelectedClasseId] = useState<string>("ALL");
  const [selectedEnseignantId, setSelectedEnseignantId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "RETARD" | "EN_COURS" | "TERMINE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/progression");
      if (!res.ok) throw new Error("Erreur de chargement");
      const data = await res.json();
      setClasses(data.classes || []);
      setEnseignants(data.enseignants || []);
      setGlobalStats(data.globalStats || null);
      setAlertes(data.alertesGlobales || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extraction aplatie de toutes les matières pour filtrage direct
  const flattenedMatieres = useMemo(() => {
    const list: {
      matiere: MatiereStat;
      classe: { id: string; code: string; nom: string };
    }[] = [];

    classes.forEach((c) => {
      c.matieres.forEach((m) => {
        list.push({
          matiere: m,
          classe: { id: c.id, code: c.code, nom: c.nom },
        });
      });
    });

    return list.filter(({ matiere, classe }) => {
      if (selectedClasseId !== "ALL" && classe.id !== selectedClasseId) return false;
      if (selectedEnseignantId !== "ALL" && matiere.enseignant?.id !== selectedEnseignantId) return false;

      if (statusFilter === "RETARD") {
        const hasDelay = matiere.alertes.some((a) => a.includes("Retard"));
        if (!hasDelay) return false;
      } else if (statusFilter === "TERMINE") {
        if (matiere.statut !== "TERMINE") return false;
      } else if (statusFilter === "EN_COURS") {
        if (matiere.statut !== "EN_COURS") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMatiere = matiere.nom.toLowerCase().includes(q) || matiere.code.toLowerCase().includes(q);
        const matchClasse = classe.code.toLowerCase().includes(q) || classe.nom.toLowerCase().includes(q);
        const matchProf = matiere.enseignant?.nom.toLowerCase().includes(q) || matiere.enseignant?.email?.toLowerCase().includes(q);
        return matchMatiere || matchClasse || matchProf;
      }

      return true;
    });
  }, [classes, selectedClasseId, selectedEnseignantId, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600 mb-1">
            <Building className="w-4 h-4" />
            Supervision & Direction Pédagogique
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Suivi de la Progression & Retards des Cours
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Contrôle en temps réel des volumes horaires (10h, 20h, 30h, 40h...), avancement par enseignant et détection des retards.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser les données
        </button>
      </div>

      {/* Cartes statistiques globales */}
      {globalStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Volume Réalisé vs Prévu */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Volume Horaire Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900">
                  {globalStats.totalHeuresEffectuees}h
                </span>
                <span className="text-xs font-medium text-slate-500">
                  / {globalStats.totalVolumePrevu}h prévues
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${globalStats.tauxRealisationGlobal}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                <span>Avancement global</span>
                <span className="font-bold text-blue-700">{globalStats.tauxRealisationGlobal}%</span>
              </div>
            </div>
          </div>

          {/* Alertes & Retards */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Matières en Retard
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-rose-600">
                  {globalStats.matieresEnRetardCount}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  sur {flattenedMatieres.length} matières
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-tight">
                {globalStats.matieresEnRetardCount > 0
                  ? "Inactivité prolongée ou retard sur le calendrier"
                  : "Aucun retard critique détecté"}
              </p>
            </div>
          </div>

          {/* Assiduité Moyenne */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Assiduité des Étudiants
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-700">
                  {globalStats.tauxAssiduiteGlobal}%
                </span>
                <span className="text-xs font-medium text-slate-500">
                  taux moyen
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                <span>{globalStats.totalRetardsAll} retards étudiants signalés</span>
              </div>
            </div>
          </div>

          {/* Enseignants & Classes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Corps Enseignant
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-700">
                  {globalStats.totalEnseignants}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  enseignants actifs
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Répartis sur {globalStats.totalClasses} classes ({globalStats.totalEtudiants} auditeurs)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Centre d'Alertes Retard Prioritaire */}
      {alertes.length > 0 && (
        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-bold text-rose-900">
                Alertes & Retards Constatés ({alertes.length})
              </h2>
            </div>
            <span className="text-xs font-medium text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
              Action Administrative Requise
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertes.map((alt, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-xl border border-rose-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                    <span className="text-blue-700 font-bold">{alt.classeCode}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
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
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {alt.matiereNom} ({alt.matiereCode})
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    {alt.message}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Prof : <strong>{alt.enseignantNom}</strong></span>
                  <Link
                    href={`/dashboard/presences?classeId=${alt.classeCode}`}
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5"
                  >
                    Vérifier <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barre de Filtres et Recherche */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Filtre Classe */}
          <div className="relative min-w-44">
            <select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            >
              <option value="ALL">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.nom})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Filtre Enseignant */}
          <div className="relative min-w-44">
            <select
              value={selectedEnseignantId}
              onChange={(e) => setSelectedEnseignantId(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
            >
              <option value="ALL">Tous les enseignants</option>
              {enseignants.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.nom} ({prof.email || prof.username})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Filtre Statut */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setStatusFilter("RETARD")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "RETARD"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-rose-600"
              }`}
            >
              En retard
            </button>
            <button
              onClick={() => setStatusFilter("EN_COURS")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "EN_COURS"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-blue-600"
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => setStatusFilter("TERMINE")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "TERMINE"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-slate-600 hover:text-emerald-600"
              }`}
            >
              Terminés
            </button>
          </div>
        </div>

        {/* Barre de Recherche */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher matière, enseignant..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tableau détaillé de progression par cours */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Progression par Matière ({flattenedMatieres.length})
            </h3>
            <p className="text-xs text-slate-500">
              Avancement des heures dispensées par rapport au volume horaire prévu (10h, 20h, 30h, 40h...)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Classe</th>
                <th className="py-3 px-4">Matière</th>
                <th className="py-3 px-4">Enseignant</th>
                <th className="py-3 px-4 text-center">Volume Prévu</th>
                <th className="py-3 px-4 text-center">Effectué</th>
                <th className="py-3 px-4">Progression</th>
                <th className="py-3 px-4 text-center">Dernière Séance</th>
                <th className="py-3 px-4 text-center">Assiduité</th>
                <th className="py-3 px-4 text-center">Statut / Alertes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flattenedMatieres.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Aucune matière ne correspond aux critères sélectionnés.
                  </td>
                </tr>
              ) : (
                flattenedMatieres.map(({ matiere, classe }) => {
                  const hasAlert = matiere.alertes.length > 0;
                  const hasDelay = matiere.alertes.some((a) => a.includes("Retard"));

                  return (
                    <tr
                      key={matiere.id}
                      className={`hover:bg-slate-50/80 transition ${
                        hasDelay ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {/* Classe */}
                      <td className="py-3.5 px-4 font-bold text-blue-700 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800">
                          {classe.code}
                        </span>
                      </td>

                      {/* Matière */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{matiere.nom}</div>
                        <div className="text-[10px] text-slate-500">
                          Code: {matiere.code} • Coef: {matiere.coefficient}
                        </div>
                      </td>

                      {/* Enseignant */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {matiere.enseignant ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              {matiere.enseignant.nom}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {matiere.enseignant.email || `@${matiere.enseignant.username}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Non assigné
                          </span>
                        )}
                      </td>

                      {/* Volume prévu */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono">
                          {matiere.volumeHoraire}h
                        </span>
                      </td>

                      {/* Effectué */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                        <span className="text-[10px] text-slate-400 block">
                          reste {matiere.heuresRestantes}h
                        </span>
                      </td>

                      {/* Progression Bar */}
                      <td className="py-3.5 px-4 min-w-36">
                        <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                          <span
                            className={
                              matiere.progressionPct >= 100
                                ? "text-emerald-700"
                                : matiere.progressionPct >= 50
                                ? "text-blue-700"
                                : "text-slate-700"
                            }
                          >
                            {matiere.progressionPct}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {matiere.totalSeances} séance(s)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              matiere.progressionPct >= 100
                                ? "bg-emerald-500"
                                : matiere.progressionPct >= 50
                                ? "bg-blue-600"
                                : matiere.progressionPct > 0
                                ? "bg-amber-500"
                                : "bg-slate-300"
                            }`}
                            style={{ width: `${matiere.progressionPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Dernière Séance */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {matiere.derniereSeanceDate ? (
                          <div>
                            <div className="text-slate-700 font-medium">
                              {new Date(matiere.derniereSeanceDate).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </div>
                            <div
                              className={`text-[10px] ${
                                (matiere.joursDepuisDerniereSeance || 0) > 14
                                  ? "text-rose-600 font-bold"
                                  : "text-slate-400"
                              }`}
                            >
                              il y a {matiere.joursDepuisDerniereSeance} j
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Assiduité */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            matiere.tauxAssiduite >= 85
                              ? "text-emerald-700"
                              : matiere.tauxAssiduite >= 70
                              ? "text-amber-700"
                              : "text-rose-700"
                          }`}
                        >
                          {matiere.tauxAssiduite}%
                        </span>
                        {matiere.retardsCount > 0 && (
                          <span className="block text-[10px] text-amber-600">
                            {matiere.retardsCount} retard(s)
                          </span>
                        )}
                      </td>

                      {/* Statut & Alertes */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              matiere.statut === "TERMINE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : hasDelay
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : matiere.statut === "EN_COURS"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {matiere.statut === "TERMINE"
                              ? "Terminé"
                              : hasDelay
                              ? "En Retard"
                              : matiere.statut === "EN_COURS"
                              ? "En Cours"
                              : "Non Démarré"}
                          </span>

                          {hasAlert && (
                            <div className="text-[10px] text-rose-700 font-medium leading-tight">
                              {matiere.alertes[0]}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/presences?classeId=${classe.id}&matiereId=${matiere.id}`}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-semibold transition"
                            title="Voir les présences de ce cours"
                          >
                            Présences
                          </Link>
                          <Link
                            href={`/dashboard/notes?classeId=${classe.id}&matiereId=${matiere.id}`}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[11px] font-semibold transition"
                            title="Voir les notes"
                          >
                            Notes
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
