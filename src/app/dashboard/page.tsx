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
  GraduationCap,
  Clock,
  Award,
  TrendingUp,
  AlertTriangle,
  Building,
  Shield,
  Sliders,
  ListChecks,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

interface DashboardData {
  classes: {
    id: string;
    code: string;
    nom: string;
    anneeScolaire: string;
    matieres?: { id: string; nom: string; code: string; volumeHoraire: number; seances?: { nombreHeures: number }[] }[];
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

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Bonsoir";
  if (h < 18) return "Bonjour";
  return "Bonsoir";
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

function KpiCard({
  label,
  icon,
  iconClass,
  children,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300/80 transition-all">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">{children}</div>
      {hint && <div className="mt-2 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs ${className}`}>
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <div className="min-w-0">
          <h2 className="font-bold text-slate-900 text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
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
      <div className="space-y-6 animate-pulse">
        <div className="h-52 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 bg-white rounded-2xl border border-slate-200" />
          <div className="lg:col-span-5 h-72 bg-white rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  const isAdmin = data?.userRole === "ADMINISTRATION";
  const isTeacher = data?.userRole === "ENSEIGNANT";
  const isStaff = isAdmin || isTeacher;
  const totalStudents = data?.classes.reduce((acc, c) => acc + c._count.etudiants, 0) || 0;
  const totalClasses = data?.classes.length || 0;
  const totalSeances = data?.totalSeancesCount ?? (data?.recentSeances.length || 0);
  const alertes = data?.adminAlertes ?? [];

  const todayRaw = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const theme = isAdmin
    ? {
        hero: "from-amber-600 via-amber-700 to-orange-900",
        glow: "bg-orange-300/25",
        primaryText: "text-amber-950",
        primaryIcon: "text-amber-700",
        primaryHover: "hover:bg-amber-50",
        link: "text-amber-700 hover:text-amber-900",
        bar: "bg-amber-500",
      }
    : {
        hero: "from-blue-600 via-blue-700 to-indigo-900",
        glow: "bg-sky-300/25",
        primaryText: "text-blue-900",
        primaryIcon: "text-blue-700",
        primaryHover: "hover:bg-blue-50",
        link: "text-blue-600 hover:text-blue-800",
        bar: "bg-blue-500",
      };

  const secondaryBtn =
    "inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white font-semibold text-xs rounded-xl transition";

  // Parcours pédagogique : on ne présente que les liens accessibles au profil connecté
  const workflow = [
    {
      step: 1,
      title: "Paramétrage & Accès",
      text: "Configuration des modèles IA et habilitation des comptes délégués.",
      icon: Sliders,
      accent: "text-blue-700 bg-blue-50 border-blue-100",
      links: isStaff
        ? [
            { label: "Configuration IA", href: "/dashboard/config" },
            { label: "Accès & Chefs", href: "/dashboard/chefs" },
          ]
        : [],
    },
    {
      step: 2,
      title: "Structure & Inscriptions",
      text: "Catalogue des matières, promotions, cours et listes d'étudiants.",
      icon: Building,
      accent: "text-indigo-700 bg-indigo-50 border-indigo-100",
      links: [
        ...(isStaff ? [{ label: "Matières", href: "/dashboard/matieres" }] : []),
        { label: "Classes", href: "/dashboard/classes" },
        { label: "Étudiants", href: "/dashboard/etudiants" },
      ],
    },
    {
      step: 3,
      title: "Déroulement des Cours",
      text: "Émargement séance par séance, avancement des chapitres et notes.",
      icon: CalendarCheck,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-100",
      links: [
        { label: "Présences", href: "/dashboard/presences" },
        ...(isStaff
          ? [
              { label: "Progression", href: "/dashboard/progression" },
              { label: "Notes", href: "/dashboard/notes" },
            ]
          : []),
      ],
    },
    {
      step: 4,
      title: "Pilotage & Clôture",
      text: "Suivi des retards horaires, consolidations et exports officiels.",
      icon: FileSpreadsheet,
      accent: "text-amber-700 bg-amber-50 border-amber-100",
      links: [
        ...(isStaff ? [{ label: "Suivi des retards", href: "/dashboard/admin/progression" }] : []),
        { label: "Exports Excel", href: "/dashboard/exports" },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Bannière de bienvenue */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden bg-linear-to-br ${theme.hero}`}
      >
        <div className={`absolute -right-20 -top-24 w-80 h-80 rounded-full blur-3xl ${theme.glow}`} />
        <div className="absolute -left-16 -bottom-28 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <GraduationCap className="absolute right-6 bottom-4 w-40 h-40 text-white/5 hidden md:block" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 border border-white/20 backdrop-blur-sm">
              {isAdmin ? (
                <>
                  <Building className="w-3.5 h-3.5" /> Direction Pédagogique
                </>
              ) : isTeacher ? (
                <>
                  <Shield className="w-3.5 h-3.5" /> Espace Enseignant
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5" /> Chef de classe
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/80">
              <CalendarDays className="w-3.5 h-3.5" />
              {today}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isAdmin
              ? "Console de supervision administrative"
              : `${greeting()}, ${data?.userName || "cher enseignant"}`}
          </h1>
          <p className="mt-2 text-sm text-white/85 leading-relaxed max-w-2xl">
            {isAdmin
              ? "Consolidation globale des volumes horaires, suivi de l'avancement des cours par classe et détection automatique des retards d'enseignement."
              : isTeacher
              ? "Gérez vos classes, vos matières et leur volume horaire, effectuez les émargements et saisissez vos notes."
              : "Vous êtes habilité à saisir et vérifier les émargements et présences de votre classe."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {isAdmin ? (
              <>
                <Link
                  href="/dashboard/classes"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white ${theme.primaryText} font-bold text-xs rounded-xl shadow-sm ${theme.primaryHover} transition`}
                >
                  <Building className={`w-4 h-4 ${theme.primaryIcon}`} />
                  Superviser les classes &amp; matières
                </Link>
                <Link href="/dashboard/presences" className={secondaryBtn}>
                  <CalendarCheck className="w-4 h-4" />
                  Émargements &amp; présences
                </Link>
                <Link href="/dashboard/admin/progression" className={secondaryBtn}>
                  <TrendingUp className="w-4 h-4" />
                  Suivi progression &amp; retards
                </Link>
                <Link href="/dashboard/exports" className={secondaryBtn}>
                  <FileSpreadsheet className="w-4 h-4" />
                  Exports consolidés
                </Link>
              </>
            ) : (
              <>
                {isTeacher && totalClasses === 0 ? (
                  <Link
                    href="/dashboard/classes?action=add-matiere"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white ${theme.primaryText} font-bold text-xs rounded-xl shadow-sm ${theme.primaryHover} transition`}
                  >
                    <PlusCircle className={`w-4 h-4 ${theme.primaryIcon}`} />
                    Choisir ma classe &amp; ajouter une matière
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/presences"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white ${theme.primaryText} font-bold text-xs rounded-xl shadow-sm ${theme.primaryHover} transition`}
                  >
                    <CalendarCheck className={`w-4 h-4 ${theme.primaryIcon}`} />
                    Faire l&apos;appel maintenant
                  </Link>
                )}

                {isTeacher && (
                  <>
                    <Link href="/dashboard/progression" className={secondaryBtn}>
                      <ListChecks className="w-4 h-4" />
                      Valider les chapitres
                    </Link>
                    <Link href="/dashboard/notes" className={secondaryBtn}>
                      <Award className="w-4 h-4" />
                      Saisir des notes
                    </Link>
                    <Link href="/dashboard/admin/progression" className={secondaryBtn}>
                      <TrendingUp className="w-4 h-4" />
                      Voir ma progression
                    </Link>
                  </>
                )}

                <Link href="/dashboard/exports" className={secondaryBtn}>
                  <FileSpreadsheet className="w-4 h-4" />
                  Exports Excel &amp; fiches
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Classes"
          icon={<Building className="w-4 h-4" />}
          iconClass="bg-blue-50 text-blue-600"
          hint="Promotions enregistrées"
        >
          <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalClasses}</span>
        </KpiCard>

        <KpiCard
          label="Étudiants"
          icon={<Users className="w-4 h-4" />}
          iconClass="bg-emerald-50 text-emerald-600"
          hint="Inscrits avec matricule"
        >
          <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalStudents}</span>
        </KpiCard>

        {isAdmin && data?.adminStats ? (
          <KpiCard
            label="Volume réalisé"
            icon={<Clock className="w-4 h-4" />}
            iconClass="bg-amber-50 text-amber-600"
            hint={
              <div className="space-y-1.5">
                <ProgressBar value={data.adminStats.tauxRealisationGlobal} tone="bg-amber-500" />
                <span className="font-semibold text-amber-700">
                  {data.adminStats.tauxRealisationGlobal}% accompli
                </span>
              </div>
            }
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {data.adminStats.totalHeuresEffectuees}h
              </span>
              <span className="text-xs text-slate-500 font-medium">
                / {data.adminStats.totalVolumePrevu}h
              </span>
            </div>
          </KpiCard>
        ) : (
          <KpiCard
            label="Séances émargées"
            icon={<Clock className="w-4 h-4" />}
            iconClass="bg-indigo-50 text-indigo-600"
            hint="Cours avec feuille d'appel"
          >
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalSeances}</span>
          </KpiCard>
        )}

        {isAdmin && data?.adminStats ? (
          <KpiCard
            label="Retards constatés"
            icon={<AlertTriangle className="w-4 h-4" />}
            iconClass={
              data.adminStats.matieresEnRetardCount > 0
                ? "bg-rose-50 text-rose-600"
                : "bg-emerald-50 text-emerald-600"
            }
            hint={
              <Link
                href="/dashboard/admin/progression"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
              >
                Voir les alertes détaillées <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <span
              className={`text-3xl font-extrabold tabular-nums ${
                data.adminStats.matieresEnRetardCount > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {data.adminStats.matieresEnRetardCount}
            </span>
          </KpiCard>
        ) : (
          <KpiCard
            label="Accès étudiants"
            icon={<BookOpen className="w-4 h-4" />}
            iconClass="bg-amber-50 text-amber-600"
            hint="Par simple saisie du matricule"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Actif &bull; Direct
            </span>
          </KpiCard>
        )}
      </div>

      {/* Alertes de retard (administration) */}
      {isAdmin && alertes.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Alertes prioritaires
            </h2>
            <Link
              href="/dashboard/admin/progression"
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900"
            >
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="grid gap-2 md:grid-cols-3">
            {alertes.map((a, i) => (
              <li
                key={`${a.classeCode}-${a.matiereNom}-${i}`}
                className="bg-white border border-rose-100 rounded-xl p-3.5"
              >
                <span className="text-[11px] font-bold text-rose-600">
                  {a.classeCode} &bull; {a.matiereNom}
                </span>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">{a.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Classes et dernières séances */}
      <div className="grid lg:grid-cols-12 gap-6">
        <SectionCard
          className="lg:col-span-7"
          title={isAdmin ? "Supervision des classes" : "Vos classes & matières"}
          subtitle="Effectifs et avancement des cours"
          action={
            isStaff && (
              <Link
                href="/dashboard/classes"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 ${theme.link}`}
              >
                <PlusCircle className="w-3.5 h-3.5" /> Gérer / Importer Excel
              </Link>
            )
          }
        >
          {data?.classes.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Aucune classe ou matière assignée</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  Les classes de l&apos;école sont partagées. Choisissez votre classe et enregistrez votre
                  matière pour commencer à émarger.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  href="/dashboard/classes?action=add-matiere"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Choisir ma classe &amp; ajouter ma matière
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.classes.map((classe) => {
                const volume = classe.matieres?.reduce((s, m) => s + (m.volumeHoraire || 0), 0) ?? 0;
                const done =
                  classe.matieres?.reduce(
                    (s, m) => s + (m.seances?.reduce((h, se) => h + (se.nombreHeures || 0), 0) ?? 0),
                    0
                  ) ?? 0;
                const pct = volume > 0 ? Math.round((done / volume) * 100) : null;

                return (
                  <div
                    key={classe.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/70 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[11px] font-bold">
                            {classe.code}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 truncate">{classe.nom}</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>{classe.anneeScolaire}</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {classe._count.etudiants} étudiant{classe._count.etudiants > 1 ? "s" : ""}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {classe._count.matieres} matière{classe._count.matieres > 1 ? "s" : ""}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/dashboard/presences?classeId=${classe.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          Faire l&apos;appel
                        </Link>
                        {isStaff && (
                          <Link
                            href="/dashboard/admin/progression"
                            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                            title="Voir la progression horaire"
                            aria-label="Voir la progression horaire"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {pct !== null && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Avancement horaire</span>
                          <span className="font-semibold text-slate-700 tabular-nums">
                            {done}h / {volume}h &bull; {pct}%
                          </span>
                        </div>
                        <ProgressBar value={pct} tone={theme.bar} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-5"
          title="Dernières séances"
          subtitle="Historique des émargements"
          action={
            <Link
              href="/dashboard/presences"
              className={`text-xs font-semibold inline-flex items-center gap-1 shrink-0 ${theme.link}`}
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          {data?.recentSeances.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-500">Aucune séance enregistrée pour l&apos;instant.</p>
            </div>
          ) : (
            <ol className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {data?.recentSeances.map((s) => {
                const total = s.presences.length;
                const presents = s.presences.filter(
                  (p) => p.statut === "PRESENT" || p.statut === "RETARD" || p.statut === "JUSTIFIE"
                ).length;
                const rate = total > 0 ? Math.round((presents / total) * 100) : 100;
                const good = rate >= 80;

                return (
                  <li key={s.id} className="relative pl-7">
                    <span
                      className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-white ring-1 ${
                        good ? "bg-emerald-500 ring-emerald-200" : "bg-amber-500 ring-amber-200"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-blue-600">
                          {s.matiere.classe.code} &bull; {s.matiere.code}
                        </span>
                        <h3 className="font-semibold text-xs text-slate-900 line-clamp-1">
                          {s.description || s.matiere.nom}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(s.date).toLocaleDateString("fr-FR")} &bull; {s.nombreHeures}h
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {good && <CheckCircle2 className="w-3 h-3" />}
                          {rate}%
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-1 tabular-nums">
                          {presents}/{total} auditeurs
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* Parcours pédagogique */}
      <SectionCard
        title="Cycle d'exécution pédagogique"
        subtitle="Du paramétrage initial jusqu'à la clôture et aux exports officiels"
        action={
          <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Workflow en 4 étapes
          </span>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {workflow.map((w) => (
            <div
              key={w.step}
              className="relative p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${w.accent}`}>
                  <w.icon className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                  ÉTAPE {w.step}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-slate-900">{w.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{w.text}</p>
              </div>
              <div className="flex flex-col gap-0.5 pt-2 border-t border-slate-200/70">
                {w.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group flex items-center justify-between py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 transition"
                  >
                    {l.label}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
