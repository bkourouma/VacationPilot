export interface ClasseItem {
  id: string;
  code: string;
  nom: string;
  matieres: { id: string; code: string; nom: string }[];
}

export interface EtudiantItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
}

export interface SousChapitreSeance {
  id: string;
  chapitreId: string;
  titre: string;
  ordre: number;
  valide?: boolean;
  dateValidation?: string | null;
}

export interface ChapitreSeance {
  id: string;
  numero: number;
  titre: string;
  description: string | null;
  valide?: boolean;
  validesSous?: number;
  totalSous?: number;
  progressionPct?: number;
  dateValidation?: string | null;
  sousChapitres?: SousChapitreSeance[];
}

export interface SeanceHistorique {
  id: string;
  date: string;
  nombreHeures: number;
  heureDebut: string | null;
  heureFin: string | null;
  description: string | null;
  creePar: { nom: string; role: string } | null;
  chapitresCouverts?: { id: string; numero: number; titre: string }[];
  sousChapitresCouverts?: { id: string; chapitreId: string; titre: string }[];
  presences: {
    id: string;
    etudiantId?: string;
    statut: string;
    remarque: string | null;
    etudiant?: { id?: string; matricule: string; nom: string; prenom: string };
  }[];
}

export type StatutPresence = "PRESENT" | "ABSENT" | "RETARD" | "JUSTIFIE";

export interface PresenceEntry {
  statut: StatutPresence;
  remarque: string;
}

export interface TrancheHoraire {
  index: number;
  label: string;
  shortLabel: string;
  heureDebut: string;
  heureFin: string;
}

export function computeHeureFin(start: string, duration: number): string {
  const [h, m] = (start || "08:00").split(":").map(Number);
  if (isNaN(h)) return "10:00";
  const totalMin = h * 60 + (isNaN(m) ? 0 : m) + Math.round(duration * 60);
  const endH = Math.floor(totalMin / 60) % 24;
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export function getTranchesHoraires(startStr: string, totalHours: number): TrancheHoraire[] {
  const [startH, startM] = (startStr || "08:00").split(":").map(Number);
  const count = Math.max(1, Math.min(8, Math.floor(totalHours || 1)));
  const slots: TrancheHoraire[] = [];

  for (let i = 0; i < count; i++) {
    const totalStartMin = (isNaN(startH) ? 8 : startH) * 60 + (isNaN(startM) ? 0 : startM) + i * 60;
    const totalEndMin = totalStartMin + 60;

    const sH = Math.floor(totalStartMin / 60) % 24;
    const sM = totalStartMin % 60;
    const eH = Math.floor(totalEndMin / 60) % 24;
    const eM = totalEndMin % 60;

    const sStr = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`;
    const eStr = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;

    slots.push({
      index: i,
      label: `Heure ${i + 1} (${sStr} - ${eStr})`,
      shortLabel: `H${i + 1}`,
      heureDebut: sStr,
      heureFin: eStr,
    });
  }
  return slots;
}

export const labelClass = "text-xs font-bold text-slate-700";
