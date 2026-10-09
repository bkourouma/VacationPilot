export interface EtudiantItem {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  contact: string | null;
  email: string | null;
}

/** Représentation minimale d'une classe, suffisante pour les fenêtres d'inscription. */
export interface ClasseLite {
  id: string;
  code: string;
  nom: string;
  anneeScolaire: string;
  etudiants?: unknown[];
  _count?: { etudiants: number };
}

export function countEtudiants(c: ClasseLite): number {
  return c.etudiants?.length ?? c._count?.etudiants ?? 0;
}

export const labelClass = "text-xs font-bold text-slate-700";
