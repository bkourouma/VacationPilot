// Exécuté une seule fois au démarrage du serveur : en production, un JWT_SECRET absent
// ou faible empêche le démarrage au lieu de laisser des sessions falsifiables.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") {
    const { getJwtSecret } = await import("./lib/jwt-secret");
    getJwtSecret();
  }
}
