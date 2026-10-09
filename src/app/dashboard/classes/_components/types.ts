export type UserRole = "ADMINISTRATION" | "ENSEIGNANT" | "CHEF_CLASSE";

export interface Enseignant {
  id: string;
  nom: string;
  username: string;
  email?: string | null;
}

export interface MatiereItem {
  id: string;
  matiereId?: string;
  coursId?: string;
  code: string;
  nom: string;
  coefficient: number;
  volumeHoraire?: number;
  heuresEffectuees?: number;
  heuresRestantes?: number;
  progression?: number;
  enseignantId?: string | null;
  enseignant?: { id: string; nom: string; email: string | null } | null;
}

export type { EtudiantItem } from "../../_shared/types";
import type { EtudiantItem } from "../../_shared/types";

export interface ClasseFull {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  matieres: MatiereItem[];
  etudiants: EtudiantItem[];
}

/** Année académique en cours, ex. « 2026-2027 » (la rentrée est comptée à partir d'août). */
export function currentAcademicYear(now = new Date()) {
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export { labelClass } from "../../_shared/types";
