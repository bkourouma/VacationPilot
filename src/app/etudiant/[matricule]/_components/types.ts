export interface EvaluationData {
  id: string;
  titre: string;
  date: string;
  coefficient: number;
  noteMax: number;
  valeur: number | null;
  commentaire: string | null;
  moyenneClasse: number | null;
}

export interface MatiereData {
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

export type StatutPresence = "PRESENT" | "ABSENT" | "RETARD" | "JUSTIFIE";

export interface SeancePresence {
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

export interface CamaradeData {
  matricule: string;
  nom: string;
  prenom: string;
  isMe?: boolean;
  heuresPresentes: number;
  taux: number | null;
}

export interface StatsAssiduite {
  totalHeuresDispensées: number;
  totalHeuresPrésent: number;
  totalHeuresAbsent: number;
  totalHeuresRetard: number;
  totalHeuresJustifie: number;
  totalHeuresNonMarque?: number;
  tauxPresence: number | null;
}

export interface EtudiantInfo {
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
}

export interface StudentResponse {
  etudiant: EtudiantInfo;
  statsAssiduite: StatsAssiduite;
  moyenneGenerale: number | null;
  matieres: MatiereData[];
  historiquePresences: SeancePresence[];
  classeCamarades: CamaradeData[];
}

export const STATUT_META: Record<
  StatutPresence,
  { label: string; badge: string; dot: string; bar: string }
> = {
  PRESENT: {
    label: "Présent",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  RETARD: {
    label: "Retard",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-400",
  },
  JUSTIFIE: {
    label: "Justifié",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    bar: "bg-blue-400",
  },
  ABSENT: {
    label: "Absent",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};

export function getMention(moyenne: number | null) {
  if (moyenne === null)
    return { text: "Non calculée", color: "bg-white/10 text-slate-200 border-white/20" };
  if (moyenne >= 16) return { text: "Très bien", color: "bg-emerald-400/20 text-emerald-200 border-emerald-300/40" };
  if (moyenne >= 14) return { text: "Bien", color: "bg-sky-400/20 text-sky-200 border-sky-300/40" };
  if (moyenne >= 12) return { text: "Assez bien", color: "bg-indigo-400/20 text-indigo-200 border-indigo-300/40" };
  if (moyenne >= 10) return { text: "Passable", color: "bg-amber-400/20 text-amber-200 border-amber-300/40" };
  return { text: "Insuffisant", color: "bg-rose-400/20 text-rose-200 border-rose-300/40" };
}

/** Couleur sémantique d'une moyenne sur 20. */
export function tauxColor(taux: number | null) {
  if (taux === null) return "#94a3b8";
  if (taux >= 80) return "#10b981";
  if (taux >= 60) return "#f59e0b";
  return "#f43f5e";
}

export function moyenneColor(moyenne: number | null) {
  if (moyenne === null) return "#94a3b8";
  if (moyenne >= 14) return "#10b981";
  if (moyenne >= 10) return "#2563eb";
  return "#f43f5e";
}

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export function initials(nom: string, prenom: string) {
  return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase() || "?";
}
