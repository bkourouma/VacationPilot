export interface ClasseItem {
  id: string;
  code: string;
  nom: string;
  matieres: { id: string; code: string; nom: string; coefficient: number }[];
}

export interface EtudiantItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
}

export interface EvaluationItem {
  id: string;
  titre: string;
  date: string;
  coefficient: number;
  noteMax: number;
  notes: {
    id: string;
    valeur: number;
    commentaire: string | null;
    etudiant: { id: string; matricule: string; nom: string; prenom: string };
  }[];
}

export interface NoteEntry {
  valeur: number | null;
  commentaire: string;
}

export const labelClass = "text-xs font-bold text-slate-700";

/** Statistiques d'une série de notes sur un barème donné. */
export function computeStats(values: number[], noteMax: number) {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  const moyenne = Math.round((sum / values.length) * 100) / 100;
  const reussite = Math.round((values.filter((v) => v >= noteMax / 2).length / values.length) * 100);
  return { moyenne, min: Math.min(...values), max: Math.max(...values), reussite, count: values.length };
}
