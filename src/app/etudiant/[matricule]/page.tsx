"use client";

import { useEffect, useState, use } from "react";
import { Button, Progress, Skeleton, Tabs } from "antd";
import {
  GraduationCap,
  Calendar,
  Clock,
  AlertTriangle,
  UserCheck,
  Award,
  ArrowLeft,
  Printer,
  Users,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import NotesTab from "./_components/NotesTab";
import PresencesTab from "./_components/PresencesTab";
import ClasseTab from "./_components/ClasseTab";
import {
  StudentResponse,
  formatDate,
  getMention,
  initials,
  moyenneColor,
  tauxColor,
} from "./_components/types";

type TabKey = "notes" | "presences" | "classe";

function Kpi({
  label,
  icon,
  children,
  footer,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 flex-wrap">{children}</div>
      {footer}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="h-14 bg-white border-b border-slate-200" />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" aria-busy="true">
        <Skeleton.Button active block style={{ height: 160, borderRadius: 16 }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton.Button key={i} active block style={{ height: 120, borderRadius: 16 }} />
          ))}
        </div>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    </div>
  );
}

export default function StudentPortalPage({
  params,
}: {
  params: Promise<{ matricule: string }>;
}) {
  const { matricule } = use(params);
  const [data, setData] = useState<StudentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("notes");

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/etudiants/${encodeURIComponent(matricule)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Étudiant non trouvé.");
          return;
        }
        setData(await res.json());
      } catch {
        setError("Impossible de charger les données de l'étudiant.");
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [matricule]);

  if (loading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Dossier introuvable</h2>
          <p className="text-sm text-slate-600">
            {error || "Aucun dossier associé à ce numéro de matricule."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              type="primary"
              size="large"
              href="/"
              icon={<ArrowLeft className="w-4 h-4" />}
              className="!font-semibold"
            >
              Retour à l&apos;accueil
            </Button>
            <Button
              size="large"
              onClick={() => window.location.reload()}
              icon={<RefreshCw className="w-4 h-4" />}
              className="!font-semibold"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { etudiant, statsAssiduite, moyenneGenerale, matieres, historiquePresences, classeCamarades } = data;
  const mention = getMention(moyenneGenerale);
  const taux = statsAssiduite.tauxPresence;
  const nonMarque = statsAssiduite.totalHeuresNonMarque ?? 0;

  const tabLabel = (icon: React.ReactNode, long: string, short: string, count: number) => (
    <span className="inline-flex items-center gap-2">
      {icon}
      <span className="hidden sm:inline">{long}</span>
      <span className="sm:hidden">{short}</span>
      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold tabular-nums">
        {count}
      </span>
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Barre supérieure */}
      <nav className="no-print bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-sm font-extrabold text-slate-900 truncate">VacationPro</p>
              <p className="text-[11px] text-slate-500 truncate">Espace étudiant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button href="/" icon={<ArrowLeft className="w-3.5 h-3.5" />} className="!text-xs !font-semibold">
              <span className="hidden sm:inline">Changer de matricule</span>
              <span className="sm:hidden">Retour</span>
            </Button>
            <Button
              type="primary"
              onClick={() => window.print()}
              icon={<Printer className="w-3.5 h-3.5" />}
              className="!text-xs !font-semibold"
            >
              <span className="hidden sm:inline">Imprimer mon relevé</span>
              <span className="sm:hidden">Imprimer</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="no-print max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Fiche d'identité */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 sm:p-8 text-white shadow-sm">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-20 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center font-extrabold text-2xl shrink-0">
                {initials(etudiant.nom, etudiant.prenom)}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Dossier académique
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight break-words">
                    {etudiant.nom} {etudiant.prenom}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/10 border border-white/20">
                    N° {etudiant.matricule}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  <span className="font-semibold text-white">{etudiant.classe.nom}</span> (
                  {etudiant.classe.code}) &bull; {etudiant.classe.anneeScolaire} &bull;{" "}
                  {etudiant.classe.totalEtudiants} auditeur(s)
                </p>
                {(etudiant.contact || etudiant.email) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-300">
                    {etudiant.contact && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {etudiant.contact}
                      </span>
                    )}
                    {etudiant.email && (
                      <span className="inline-flex items-center gap-1.5 break-all">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {etudiant.email}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="self-start md:self-center md:text-right">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Appréciation générale
              </p>
              <span
                className={`inline-block mt-1.5 px-3.5 py-1 rounded-full text-sm font-bold border ${mention.color}`}
              >
                {mention.text}
              </span>
            </div>
          </div>
        </section>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Kpi
            label="Moyenne générale"
            icon={<Award className="w-4 h-4 text-blue-600" />}
            footer={
              <>
                <Progress
                  percent={moyenneGenerale !== null ? Math.round((moyenneGenerale / 20) * 100) : 0}
                  showInfo={false}
                  size="small"
                  strokeColor={moyenneColor(moyenneGenerale)}
                  className="!mb-0 !mt-2"
                />
                <p className="mt-1 text-[11px] text-slate-500">Pondérée par les coefficients</p>
              </>
            }
          >
            <span className="text-3xl font-extrabold tabular-nums">
              {moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : "—"}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 20</span>
          </Kpi>

          <Kpi
            label="Taux d'assiduité"
            icon={<UserCheck className="w-4 h-4 text-emerald-600" />}
            footer={
              <>
                <Progress
                  percent={taux ?? 0}
                  showInfo={false}
                  size="small"
                  strokeColor={tauxColor(taux)}
                  className="!mb-0 !mt-2"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {taux !== null ? "Calculé sur les séances émargées" : "Aucune heure dispensée"}
                </p>
              </>
            }
          >
            <span className="text-3xl font-extrabold tabular-nums">{taux !== null ? `${taux}%` : "—"}</span>
          </Kpi>

          <Kpi
            label="Heures de présence"
            icon={<Clock className="w-4 h-4 text-indigo-600" />}
            footer={
              <p className="mt-2 text-[11px] text-slate-500">
                {nonMarque > 0 ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-semibold">
                    {nonMarque}h en attente de pointage
                  </span>
                ) : (
                  "Sur l'ensemble des cours dispensés"
                )}
              </p>
            }
          >
            <span className="text-3xl font-extrabold tabular-nums">
              {statsAssiduite.totalHeuresPrésent + statsAssiduite.totalHeuresRetard}h
            </span>
            <span className="text-xs font-medium text-slate-400">/ {statsAssiduite.totalHeuresDispensées}h</span>
          </Kpi>

          <Kpi
            label="Heures manquées"
            icon={
              <AlertTriangle
                className={`w-4 h-4 ${statsAssiduite.totalHeuresAbsent > 0 ? "text-rose-500" : "text-slate-400"}`}
              />
            }
            footer={
              <p className="mt-2 text-[11px] text-slate-500">
                {statsAssiduite.totalHeuresJustifie > 0
                  ? `+${statsAssiduite.totalHeuresJustifie}h justifiées`
                  : "Absences non régularisées"}
              </p>
            }
          >
            <span
              className={`text-3xl font-extrabold tabular-nums ${
                statsAssiduite.totalHeuresAbsent > 0 ? "text-rose-600" : ""
              }`}
            >
              {statsAssiduite.totalHeuresAbsent}h
            </span>
          </Kpi>
        </div>

        {/* Onglets */}
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as TabKey)}
          size="large"
          items={[
            {
              key: "notes",
              label: tabLabel(<GraduationCap className="w-4 h-4" />, "Mes matières & notes", "Notes", matieres.length),
              children: <NotesTab matieres={matieres} />,
            },
            {
              key: "presences",
              label: tabLabel(
                <Calendar className="w-4 h-4" />,
                "Mon assiduité & séances",
                "Assiduité",
                historiquePresences.length
              ),
              children: (
                <PresencesTab
                  matieres={matieres}
                  historique={historiquePresences}
                  stats={statsAssiduite}
                />
              ),
            },
            {
              key: "classe",
              label: tabLabel(<Users className="w-4 h-4" />, "Vue d'ensemble de la classe", "Classe", classeCamarades.length),
              children: (
                <ClasseTab
                  camarades={classeCamarades}
                  classeCode={etudiant.classe.code}
                  monMatricule={etudiant.matricule}
                />
              ),
            },
          ]}
        />
      </main>

      {/* Relevé imprimable (affiché uniquement à l'impression) */}
      <section className="print-only hidden p-8 text-black">
        <div className="border-b-2 border-black pb-3 mb-4">
          <h1 className="text-xl font-bold">Relevé académique — VacationPro</h1>
          <p className="text-sm mt-1">
            {etudiant.nom} {etudiant.prenom} &bull; N° {etudiant.matricule} &bull; {etudiant.classe.nom} (
            {etudiant.classe.code}) &bull; {etudiant.classe.anneeScolaire}
          </p>
          <p className="text-sm mt-1">
            Moyenne générale :{" "}
            <strong>{moyenneGenerale !== null ? `${moyenneGenerale.toFixed(2)} / 20` : "non calculée"}</strong>{" "}
            &bull; Assiduité : <strong>{taux !== null ? `${taux}%` : "—"}</strong> &bull; Heures manquées :{" "}
            <strong>{statsAssiduite.totalHeuresAbsent}h</strong>
          </p>
        </div>

        <table className="w-full text-xs border-collapse mb-6">
          <thead>
            <tr className="bg-slate-100">
              {["Matière", "Coef.", "Moyenne /20", "Heures suivies", "Heures manquées", "Assiduité"].map((h) => (
                <th key={h} className="border border-slate-400 px-2 py-1 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matieres.map((m) => (
              <tr key={m.id}>
                <td className="border border-slate-400 px-2 py-1">
                  {m.code} — {m.nom}
                </td>
                <td className="border border-slate-400 px-2 py-1">{m.coefficient}</td>
                <td className="border border-slate-400 px-2 py-1">
                  {m.moyenne !== null ? m.moyenne.toFixed(2) : "—"}
                </td>
                <td className="border border-slate-400 px-2 py-1">{m.heuresPrésent}h</td>
                <td className="border border-slate-400 px-2 py-1">{m.heuresAbsent}h</td>
                <td className="border border-slate-400 px-2 py-1">
                  {m.tauxPresence !== null ? `${m.tauxPresence}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {matieres
          .filter((m) => m.evaluations.length > 0)
          .map((m) => (
            <div key={m.id} className="mb-4">
              <h2 className="text-sm font-bold mb-1">
                {m.code} — {m.nom}
              </h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    {["Évaluation", "Date", "Coef.", "Note", "Moy. classe"].map((h) => (
                      <th key={h} className="border border-slate-400 px-2 py-1 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.evaluations.map((ev) => (
                    <tr key={ev.id}>
                      <td className="border border-slate-400 px-2 py-1">{ev.titre}</td>
                      <td className="border border-slate-400 px-2 py-1">{formatDate(ev.date)}</td>
                      <td className="border border-slate-400 px-2 py-1">{ev.coefficient}</td>
                      <td className="border border-slate-400 px-2 py-1">
                        {ev.valeur !== null ? `${ev.valeur} / ${ev.noteMax}` : "En attente"}
                      </td>
                      <td className="border border-slate-400 px-2 py-1">
                        {ev.moyenneClasse !== null ? `${ev.moyenneClasse} / ${ev.noteMax}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        <p className="text-[10px] mt-6">Document édité le {new Date().toLocaleDateString("fr-FR")}.</p>
      </section>
    </div>
  );
}
