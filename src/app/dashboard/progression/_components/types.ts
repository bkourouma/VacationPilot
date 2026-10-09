export interface SousChapitreItem {
  id: string;
  chapitreId?: string;
  titre: string;
  ordre: number;
  valide?: boolean;
  dateValidation?: string | null;
  seanceId?: string | null;
  seance?: { id: string; date: string; nombreHeures: number; description?: string | null } | null;
}

export interface ChapitreItem {
  id: string;
  numero: number;
  titre: string;
  description: string | null;
  ordre: number;
  valide?: boolean;
  progressionPct?: number;
  totalSous?: number;
  validesSous?: number;
  dateValidation?: string | null;
  seanceId?: string | null;
  seance?: { id: string; date: string; nombreHeures: number; description?: string | null } | null;
  remarque?: string | null;
  sousChapitres?: SousChapitreItem[];
}

export interface SeanceItem {
  id: string;
  date: string;
  nombreHeures: number;
  description?: string | null;
}

export interface CoursDetail {
  id: string;
  classe: { id: string; code: string; nom: string; anneeScolaire: string };
  matiere: { id: string; code: string; nom: string; description?: string | null };
  enseignant?: { id: string; nom: string; email: string | null } | null;
  volumeHoraire: number;
  coefficient: number;
  heuresEffectuees: number;
  heuresRestantes: number;
  progressionHeuresPct: number;
}

export interface ClasseOption {
  id: string;
  code: string;
  nom: string;
  matieres: {
    id: string; // coursId
    matiereId: string;
    code: string;
    nom: string;
    volumeHoraire?: number;
    coefficient?: number;
  }[];
}

export interface DraftChapitre {
  numero: number;
  titre: string;
  description: string;
  sousChapitres: string[];
}

export interface ProgressionStats {
  totalChapitres: number;
  chapitresValidesCount: number;
  chapitresRestantsCount: number;
  progressionChapitresPct: number;
  totalSeances: number;
}

export const labelClass = "text-xs font-bold text-slate-700";
