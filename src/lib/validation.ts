// Contrôles de saisie partagés par les routes API.

export const MESSAGE_ANNEE_ACADEMIQUE =
  "L'année académique doit avoir le format AAAA-AAAA avec deux années consécutives (ex: 2026-2027).";

/** Année académique valide : deux années consécutives, par exemple « 2026-2027 ». */
export function isAnneeAcademiqueValide(value: unknown): boolean {
  const m = /^(\d{4})-(\d{4})$/.exec(String(value ?? "").trim());
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}

/**
 * Vérifie qu'une valeur est un nombre fini compris entre min et max (inclus).
 * Retourne un message d'erreur, ou null si la valeur est valide.
 */
export function validateNumber(
  value: unknown,
  label: string,
  min: number,
  max: number
): string | null {
  const n = typeof value === "number" ? value : Number(value);
  if (value === "" || value === null || !Number.isFinite(n) || n < min || n > max) {
    return `${label} : valeur invalide (un nombre entre ${min} et ${max} est attendu).`;
  }
  return null;
}

/** Vérifie qu'un texte ne dépasse pas une longueur maximale. */
export function validateMaxLength(
  value: unknown,
  label: string,
  max: number
): string | null {
  if (typeof value === "string" && value.trim().length > max) {
    return `${label} : ${max} caractères maximum.`;
  }
  return null;
}
