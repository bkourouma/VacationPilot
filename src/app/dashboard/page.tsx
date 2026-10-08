"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  BookOpen,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  AlertTriangle,
  Building,
  Shield,
  Sparkles,
  Sliders,
  ListChecks,
  Library,
} from "lucide-react";

interface DashboardData {
  classes: {
    id: string;
    code: string;
    nom: string;
    anneeScolaire: string;
    matieres?: { id: string; nom: string; code: string; volumeHoraire: number; heuresEffectuees?: number }[];
    _count: { etudiants: number; matieres: number };
  }[];
  recentSeances: {
    id: string;
    date: string;
    nombreHeures: number;
    description: string | null;
    matiere: { nom: string; code: string; classe: { code: string } };
    presences: { statut: string }[];
  }[];
  totalSeancesCount: number;
  userRole: string;
  userName?: string;
  userEmail?: string;
  adminStats?: {
    totalVolumePrevu: number;
    totalHeuresEffectuees: number;
    tauxRealisationGlobal: number;
    matieresEnRetardCount: number;
    totalEnseignants: number;
  };
  adminAlertes?: {
    type: string;
    classeCode: string;
    matiereNom: string;
    message: string;
  }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [resAuth, resClasses, resSeances] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/classes"),
          fetch("/api/seances"),
        ]);

        const auth = await resAuth.json();
        const classes = await resClasses.json();
        const seances = await resSeances.json();
        const role = auth.user?.role || "ENSEIGNANT";

        let adminStats = undefined;
        let adminAlertes = undefined;

        if (role === "ADMINISTRATION") {
          try {
            const resProg = await fetch("/api/admin/progression");
            if (resProg.ok) {
              const progData = await resProg.json();
              adminStats = progData.globalStats;
              adminAlertes = progData.alertesGlobales?.slice(0, 3);
            }
          } catch (e) {
            console.error("Erreur chargement admin stats:", e);
          }
        }

        setData({
          classes: Array.isArray(classes) ? classes : [],
          recentSeances: Array.isArray(seances) ? seances.slice(0, 5) : [],
          totalSeancesCount: Array.isArray(seances) ? seances.length : 0,
          userRole: role,
          userName: auth.user?.nom,
          userEmail: auth.user?.email,
          adminStats,
          adminAlertes,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-white rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const isAdmin = data?.userRole === "ADMINISTRATION";
  const isTeacher = data?.userRole === "ENSEIGNANT";
  const totalStudents = data?.classes.reduce((acc, c) => acc + c._count.etudiants, 0) || 0;
  const totalClasses = data?.classes.length || 0;
  const totalSeances = data?.totalSeancesCount ?? (data?.recentSeances.length || 0);

  return (
    <div className="space-y-8">
      {/* Bannière de Bienvenue */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden ${
          isAdmin
            ? "bg-linear-to-r from-amber-700 via-amber-800 to-orange-950"
            : "bg-linear-to-r from-blue-700 via-blue-800 to-indigo-900"
        }`}
      >
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-xs text-white mb-3">
            {isAdmin ? (
              <>
                <Building className="w-3.5 h-3.5" /> Direction Pédagogique &bull; Console Consolidée
              </>
            ) : isTeacher ? (
              <>
                <Shield className="w-3.5 h-3.5" /> Espace Enseignant {data?.userEmail ? `(${data.userEmail})` : ""}
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5" /> Session Chef de classe
              </>
            )}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAdmin
              ? "Console de Supervision Administrative"
              : `Bienvenue, ${data?.userName || "Cher Enseignant"}`}
          </h1>
          <p className="mt-2 text-sm text-white/90 leading-relaxed">
            {isAdmin
              ? "Consolidation globale des volumes horaires, suivi de l'avancement des cours par classe et détection automatique des retards d'enseignement."
              : isTeacher
              ? "Gérez vos classes partagées, vos matières avec volume horaire dédié (10h, 20h, 30h, 40h...), effectuez les émargements et saisissez vos notes."
              : "Vous êtes habilité à saisir et vérifier les émargements et présences pour votre classe."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {isAdmin ? (
              <>
                <Link
                  href="/dashboard/classes"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-amber-950 font-bold text-xs rounded-xl shadow-xs hover:bg-amber-50 transition"
                >
                  <Building className="w-4 h-4 text-amber-700" />
                  Superviser les classes & matières
                </Link>
                <Link
                  href="/dashboard/presences"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600/60 hover:bg-amber-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Émargements & présences
                </Link>
                <Link
                  href="/dashboard/admin/progression"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600/60 hover:bg-amber-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                >
                  <TrendingUp className="w-4 h-4" />
                  Suivi progression & retards
                </Link>
                <Link
                  href="/dashboard/exports"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600/60 hover:bg-amber-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exports consolidés
                </Link>
              </>
            ) : (
              <>
                {isTeacher && totalClasses === 0 ? (
                  <Link
                    href="/dashboard/classes?action=add-matiere"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 transition"
                  >
                    <PlusCircle className="w-4 h-4 text-blue-700" />
                    Choisir ma classe & ajouter matière
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/presences"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 transition"
                  >
                    <CalendarCheck className="w-4 h-4 text-blue-700" />
                    Faire l&apos;appel maintenant
                  </Link>
                )}

                {isTeacher && (
                  <>
                    <Link
                      href="/dashboard/progression"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                    >
                      <ListChecks className="w-4 h-4" />
                      Valider les chapitres
                    </Link>
                    <Link
                      href="/dashboard/notes"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                    >
                      <Award className="w-4 h-4" />
                      Saisir des notes
                    </Link>
                    <Link
                      href="/dashboard/admin/progression"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Voir ma progression
                    </Link>
                  </>
                )}

                <Link
                  href="/dashboard/exports"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 border border-white/20 text-white font-semibold text-xs rounded-xl transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Exports Excel & fiches
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Classes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Classes Partagées
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{totalClasses}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Promotions enregistrées</p>
        </div>

        {/* KPI 2 : Total Étudiants */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Étudiants
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{totalStudents}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Inscrits avec matricule</p>
        </div>

        {/* KPI 3 : Progression ou Séances */}
        {isAdmin && data?.adminStats ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Volume Réalisé
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">
                  {data.adminStats.totalHeuresEffectuees}h
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {data.adminStats.totalVolumePrevu}h
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] text-amber-700 font-semibold">
              {data.adminStats.tauxRealisationGlobal}% accompli
            </p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Séances émargées
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-900">{totalSeances}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Cours avec feuille d&apos;appel</p>
          </div>
        )}

        {/* KPI 4 : Alertes Retard ou Accès Libre */}
        {isAdmin && data?.adminStats ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Retards Constatés
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-rose-600">
                {data.adminStats.matieresEnRetardCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              <Link href="/dashboard/admin/progression" className="text-blue-600 hover:underline font-medium">
                Voir les alertes détaillées &rarr;
              </Link>
            </p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Accès Étudiants
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                Actif &bull; Direct
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Par simple saisie du matricule</p>
          </div>
        )}
      </div>

      {/* Parcours & Ordre d'Exécution Pédagogique */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Cycle d&apos;Exécution Pédagogique
            </h3>
            <p className="text-xs text-slate-500">
              Processus chronologique structuré : du paramétrage initial jusqu&apos;à la clôture et aux exports officiels
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 w-fit">
            Workflow en 4 étapes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Étape 1 : Paramétrage & Accès */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                  ÉTAPE 1
                </span>
                <Sliders className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 mt-2">Paramétrage & Accès</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Configuration des modèles IA et habilitation des comptes délégués.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
              <Link
                href="/dashboard/config"
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Configuration IA &rarr;
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link
                href="/dashboard/chefs"
                className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Accès & Chefs &rarr;
              </Link>
            </div>
          </div>

          {/* Étape 2 : Structure Pédagogique */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                  ÉTAPE 2
                </span>
                <Building className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 mt-2">Structure & Inscriptions</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Catalogue des matières, promotions, cours et listes d&apos;étudiants.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
              <Link
                href="/dashboard/matieres"
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Matières &rarr;
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link
                href="/dashboard/classes"
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Classes &rarr;
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link
                href="/dashboard/etudiants"
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Étudiants &rarr;
              </Link>
            </div>
          </div>

          {/* Étape 3 : Déroulement des Cours */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  ÉTAPE 3
                </span>
                <CalendarCheck className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 mt-2">Déroulement des Cours</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Émargement séance par séance, avancement des chapitres et notes.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
              <Link
                href="/dashboard/presences"
                className="font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
              >
                Présences &rarr;
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link
                href="/dashboard/progression"
                className="font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
              >
                Progression &rarr;
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link
                href="/dashboard/notes"
                className="font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
              >
                Notes &rarr;
              </Link>
            </div>
          </div>

          {/* Étape 4 : Pilotage & Clôture */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                  ÉTAPE 4
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 mt-2">Pilotage & Clôture</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Suivi des retards horaires, consolidations et exports officiels.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
              <Link
                href="/dashboard/admin/progression"
                className="font-semibold text-amber-700 hover:text-amber-900 hover:underline"
              >
                Suivi Retards &rarr;
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link
                href="/dashboard/exports"
                className="font-semibold text-amber-700 hover:text-amber-900 hover:underline"
              >
                Exports Excel &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Deux sections : Classes et Dernières séances */}
      <div className="grid lg:grid-cols-12 gap-8">
        {/* Liste des classes */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isAdmin ? "Supervision des Classes" : "Vos Classes & Matières"}
              </h3>
              <p className="text-xs text-slate-500">Effectifs et gestion des cours</p>
            </div>
            {(isTeacher || isAdmin) && (
              <Link
                href="/dashboard/classes"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Gérer / Importer Excel
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {data?.classes.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Aucune classe ou matière assignée</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Les classes de l&apos;école sont partagées. Choisissez votre classe et enregistrez votre matière pour commencer à émarger.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    href="/dashboard/classes?action=add-matiere"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Choisir ma classe & Ajouter ma matière
                  </Link>
                </div>
              </div>
            ) : (
              data?.classes.map((classe) => (
                <div
                  key={classe.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/60 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-xs font-bold">
                        {classe.code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{classe.nom}</h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {classe.anneeScolaire} &bull; {classe._count.etudiants} étudiants inscrits &bull; {classe._count.matieres} matières
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/presences?classeId=${classe.id}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                    >
                      Faire l&apos;appel
                    </Link>
                    <Link
                      href="/dashboard/admin/progression"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                      title="Voir la progression horaire"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dernières séances */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Dernières Séances</h3>
              <p className="text-xs text-slate-500">Historique des émargements</p>
            </div>
            <Link
              href="/dashboard/presences"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recentSeances.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Aucune séance enregistrée pour l&apos;instant.
              </p>
            ) : (
              data?.recentSeances.map((s) => {
                const total = s.presences.length;
                const presents = s.presences.filter(
                  (p) => p.statut === "PRESENT" || p.statut === "RETARD" || p.statut === "JUSTIFIE"
                ).length;
                const rate = total > 0 ? Math.round((presents / total) * 100) : 100;

                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-blue-600">
                        {s.matiere.classe.code} &bull; {s.matiere.code}
                      </span>
                      <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">
                        {s.description || s.matiere.nom}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(s.date).toLocaleDateString("fr-FR")} &bull; {s.nombreHeures}h
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          rate >= 80
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {rate}% assiduité
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {presents}/{total} auditeurs
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
