"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Award,
  ArrowLeft,
  Printer,
  Users,
  BookOpen,
  Mail,
  Phone,
  HelpCircle,
} from "lucide-react";

interface EvaluationData {
  id: string;
  titre: string;
  date: string;
  coefficient: number;
  noteMax: number;
  valeur: number | null;
  commentaire: string | null;
  moyenneClasse: number | null;
}

interface MatiereData {
  id: string;
  code: string;
  nom: string;
  coefficient: number;
  evaluations: EvaluationData[];
  moyenne: number | null;
  heuresDispensées: number;
  heuresPrésent: number;
  heuresAbsent: number;
  tauxPresence: number | null;
}

interface SeancePresence {
  id: string;
  statut: string;
  remarque: string | null;
  seance: {
    id: string;
    date: string;
    nombreHeures: number;
    heureDebut: string | null;
    heureFin: string | null;
    description: string | null;
    matiereNom: string;
    matiereCode: string;
  };
}

interface CamaradeData {
  matricule: string;
  nom: string;
  prenom: string;
  isMe?: boolean;
  heuresPresentes: number;
  taux: number | null;
}

interface StudentResponse {
  etudiant: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    contact: string | null;
    email: string | null;
    classe: {
      id: string;
      code: string;
      nom: string;
      anneeScolaire: string;
      totalEtudiants: number;
    };
  };
  statsAssiduite: {
    totalHeuresDispensées: number;
    totalHeuresPrésent: number;
    totalHeuresAbsent: number;
    totalHeuresRetard: number;
    totalHeuresJustifie: number;
    totalHeuresNonMarque?: number;
    tauxPresence: number | null;
  };
  moyenneGenerale: number | null;
  matieres: MatiereData[];
  historiquePresences: SeancePresence[];
  classeCamarades: CamaradeData[];
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
  const [activeTab, setActiveTab] = useState<"notes" | "presences" | "classe">("notes");

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/etudiants/${matricule}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Étudiant non trouvé.");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Impossible de charger les données de l'étudiant.");
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [matricule]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">
            Chargement de votre dossier académique...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 text-center shadow-lg space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Matricule Introuvable</h2>
          <p className="text-sm text-slate-600">
            {error || "Aucun dossier associé à ce numéro de matricule."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const { etudiant, statsAssiduite, moyenneGenerale, matieres, historiquePresences, classeCamarades } = data;

  const getMention = (moyenne: number | null) => {
    if (moyenne === null) return { text: "Non calculée", color: "bg-slate-100 text-slate-600 border-slate-200" };
    if (moyenne >= 16) return { text: "Très Bien", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
    if (moyenne >= 14) return { text: "Bien", color: "bg-blue-100 text-blue-800 border-blue-300" };
    if (moyenne >= 12) return { text: "Assez Bien", color: "bg-indigo-100 text-indigo-800 border-indigo-300" };
    if (moyenne >= 10) return { text: "Passable", color: "bg-amber-100 text-amber-800 border-amber-300" };
    return { text: "Ajourné", color: "bg-rose-100 text-rose-800 border-rose-300" };
  };

  const mention = getMention(moyenneGenerale);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Barre de navigation supérieure */}
      <nav className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Changer de matricule
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Imprimer mon relevé
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Fiche d'identité Étudiant */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-500/30 shrink-0">
                {etudiant.nom.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {etudiant.nom} {etudiant.prenom}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    N° {etudiant.matricule}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Classe : <span className="text-slate-800 font-semibold">{etudiant.classe.nom}</span> ({etudiant.classe.code}) &bull; {etudiant.classe.anneeScolaire}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                  {etudiant.contact && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {etudiant.contact}
                    </span>
                  )}
                  {etudiant.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {etudiant.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Statut Annuel
                </p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold border ${mention.color}`}>
                  {mention.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes KPI Synthèse */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Moyenne Générale */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Moyenne Générale
              </span>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {moyenneGenerale !== null ? moyenneGenerale.toFixed(2) : "-"}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 20</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Pondérée selon les coefficients des matières
            </p>
          </div>

          {/* Taux d'Assiduité */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Taux d&apos;Assiduité
              </span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {statsAssiduite.tauxPresence !== null ? `${statsAssiduite.tauxPresence}%` : "—"}
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  statsAssiduite.tauxPresence !== null && statsAssiduite.tauxPresence >= 80
                    ? "bg-emerald-500"
                    : statsAssiduite.tauxPresence !== null && statsAssiduite.tauxPresence >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${statsAssiduite.tauxPresence ?? 0}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {statsAssiduite.tauxPresence !== null
                ? "Calculé sur les séances émargées"
                : "Non calculable — aucune heure dispensée"}
            </p>
          </div>

          {/* Heures Suivies */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Heures de Présence
              </span>
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {statsAssiduite.totalHeuresPrésent + statsAssiduite.totalHeuresRetard}h
              </span>
              <span className="text-xs font-medium text-slate-400">
                / {statsAssiduite.totalHeuresDispensées}h
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Sur l&apos;ensemble des cours dispensés
            </p>
            {statsAssiduite.totalHeuresNonMarque !== undefined && statsAssiduite.totalHeuresNonMarque > 0 && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                {statsAssiduite.totalHeuresNonMarque}h en attente de pointage
              </span>
            )}
          </div>

          {/* Heures d'Absence */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Heures Manquées
              </span>
              <AlertTriangle
                className={`w-4 h-4 ${
                  statsAssiduite.totalHeuresAbsent > 0 ? "text-rose-500" : "text-slate-400"
                }`}
              />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold ${
                  statsAssiduite.totalHeuresAbsent > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {statsAssiduite.totalHeuresAbsent}h
              </span>
              {statsAssiduite.totalHeuresJustifie > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  (+{statsAssiduite.totalHeuresJustifie}h justifiées)
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Absences non régularisées
            </p>
          </div>
        </div>

        {/* Navigation par Onglets */}
        <div className="no-print border-b border-slate-200 flex gap-2">
          <button
            onClick={() => setActiveTab("notes")}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === "notes"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Mes Matières & Notes ({matieres.length})
          </button>
          <button
            onClick={() => setActiveTab("presences")}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === "presences"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Mon Assiduité & Séances ({historiquePresences.length})
          </button>
          <button
            onClick={() => setActiveTab("classe")}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === "classe"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Vue d&apos;ensemble de la Classe ({classeCamarades.length})
          </button>
        </div>

        {/* CONTENU ONGLET 1 : NOTES */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            {matieres.length === 0 ? (
              <div className="bg-white p-8 rounded-xl text-center text-slate-500 border border-slate-200">
                Aucune matière enregistrée pour cette classe.
              </div>
            ) : (
              matieres.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {m.code}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{m.nom}</h3>
                        <p className="text-xs text-slate-500">
                          Coefficient : <span className="font-semibold">{m.coefficient}</span> &bull; {m.evaluations.length} évaluation(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Moyenne de l&apos;étudiant</span>
                        <span className="text-lg font-extrabold text-slate-900">
                          {m.moyenne !== null ? `${m.moyenne.toFixed(2)} / 20` : "Non noté"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {m.evaluations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Aucune évaluation programmée ou notée pour cette matière.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
                              <th className="pb-3">Évaluation</th>
                              <th className="pb-3">Date</th>
                              <th className="pb-3 text-center">Coefficient</th>
                              <th className="pb-3 text-center">Note Obtenue</th>
                              <th className="pb-3 text-center">Moyenne Classe</th>
                              <th className="pb-3">Observation</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {m.evaluations.map((ev) => (
                              <tr key={ev.id} className="hover:bg-slate-50/50">
                                <td className="py-3 font-semibold text-slate-800">
                                  {ev.titre}
                                </td>
                                <td className="py-3 text-xs text-slate-500">
                                  {new Date(ev.date).toLocaleDateString("fr-FR")}
                                </td>
                                <td className="py-3 text-center text-xs font-medium text-slate-600">
                                  {ev.coefficient}
                                </td>
                                <td className="py-3 text-center">
                                  {ev.valeur !== null ? (
                                    <span
                                      className={`inline-block px-3 py-1 rounded-md font-bold text-sm ${
                                        ev.valeur >= 10
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-rose-50 text-rose-700 border border-rose-200"
                                      }`}
                                    >
                                      {ev.valeur} / {ev.noteMax}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">
                                      En attente
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 text-center text-xs text-slate-500 font-medium">
                                  {ev.moyenneClasse !== null ? `${ev.moyenneClasse} / 20` : "-"}
                                </td>
                                <td className="py-3 text-xs text-slate-500">
                                  {ev.commentaire || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTENU ONGLET 2 : ASSIDUITÉ & PRÉSENCES */}
        {activeTab === "presences" && (
          <div className="space-y-6">
            {/* Synthèse par matière */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Assiduité par matière
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matieres.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-900">{m.code}</span>
                      {m.tauxPresence !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            m.tauxPresence >= 80
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {m.tauxPresence}%
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                          0h dispensée
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{m.nom}</p>
                    <div className="text-xs text-slate-600 flex justify-between pt-1 border-t border-slate-200">
                      <span>Suivies : {m.heuresPrésent}h</span>
                      <span>Manquées : {m.heuresAbsent}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Historique chronologique des séances */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">
                  Historique détaillé des séances d&apos;émargement
                </h3>
              </div>

              {historiquePresences.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  Aucune séance émargée pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Matière</th>
                        <th className="px-6 py-3 text-center">Durée</th>
                        <th className="px-6 py-3 text-center">Statut</th>
                        <th className="px-6 py-3">Remarque / Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historiquePresences.map((hp) => {
                        const dateStr = new Date(hp.seance.date).toLocaleDateString("fr-FR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        });

                        return (
                          <tr key={hp.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3.5 font-medium text-slate-800">
                              {dateStr}
                              {hp.seance.heureDebut && (
                                <span className="block text-[11px] text-slate-400">
                                  {hp.seance.heureDebut} - {hp.seance.heureFin || ""}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="font-semibold text-slate-800">
                                {hp.seance.matiereNom}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {hp.seance.description || hp.seance.matiereCode}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-center font-semibold text-slate-700 text-xs">
                              {hp.seance.nombreHeures}h
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              {hp.statut === "PRESENT" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Présent
                                </span>
                              )}
                              {hp.statut === "ABSENT" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Absent
                                </span>
                              )}
                              {hp.statut === "RETARD" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" /> Retard
                                </span>
                              )}
                              {hp.statut === "JUSTIFIE" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  <HelpCircle className="w-3.5 h-3.5" /> Justifié
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3.5 text-xs text-slate-500">
                              {hp.remarque || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENU ONGLET 3 : VUE D'ENSEMBLE DE LA CLASSE */}
        {activeTab === "classe" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-4 p-6">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Liste & Assiduité des auditeurs de la classe ({etudiant.classe.code})
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Visualisation transparente de l&apos;ensemble de la promotion ({classeCamarades.length} auditeurs inscrits)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-y border-slate-200">
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Nom & Prénom</th>
                    <th className="px-4 py-3 text-center">Heures Présentes</th>
                    <th className="px-4 py-3 text-center">Taux Assiduité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classeCamarades.map((camarade) => {
                    const isMe = camarade.isMe || camarade.matricule === etudiant.matricule;
                    return (
                      <tr
                        key={camarade.matricule}
                        className={isMe ? "bg-blue-50/70 font-semibold" : "hover:bg-slate-50/50"}
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {camarade.matricule}
                          {isMe && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-sans">
                              Moi
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {camarade.nom} {camarade.prenom}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-600 font-medium">
                          {camarade.heuresPresentes}h
                        </td>
                        <td className="px-4 py-3 text-center">
                          {camarade.taux !== null ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                camarade.taux >= 80
                                  ? "bg-emerald-100 text-emerald-800"
                                  : camarade.taux >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {camarade.taux}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
