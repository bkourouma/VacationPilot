// Secret de signature des sessions (JWT). Sans secret robuste, n'importe qui pourrait
// fabriquer un jeton valide et se faire passer pour l'administration : en production,
// l'application refuse donc de fonctionner tant qu'un vrai secret n'est pas défini.

const DEV_FALLBACK = "default_jwt_secret_dev_32_chars_minimum_here!";
const KNOWN_PLACEHOLDERS = new Set([DEV_FALLBACK, "votre_secret_jwt_a_remplacer"]);
const MIN_LENGTH = 32;

let cached: Uint8Array | null = null;
let warned = false;

function problemWith(secret: string | undefined): string | null {
  if (!secret || secret.trim() === "") return "JWT_SECRET n'est pas défini.";
  if (KNOWN_PLACEHOLDERS.has(secret)) return "JWT_SECRET utilise une valeur d'exemple publique.";
  if (secret.length < MIN_LENGTH) return `JWT_SECRET est trop court (${MIN_LENGTH} caractères minimum).`;
  return null;
}

/** Retourne la clé de signature ; lève une erreur en production si le secret est absent ou faible. */
export function getJwtSecret(): Uint8Array {
  if (cached) return cached;

  const secret = process.env.JWT_SECRET;
  const problem = problemWith(secret);

  if (problem) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `${problem} Définissez une valeur aléatoire d'au moins ${MIN_LENGTH} caractères ` +
          `(ex : node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))").`
      );
    }
    if (!warned) {
      warned = true;
      console.warn(`[sécurité] ${problem} Clé de développement utilisée : à ne jamais déployer ainsi.`);
    }
    cached = new TextEncoder().encode(secret && secret.trim() !== "" ? secret : DEV_FALLBACK);
    return cached;
  }

  cached = new TextEncoder().encode(secret);
  return cached;
}
