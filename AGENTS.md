<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instructions et Directives Projet VacationPro

## 1. Port d'exécution obligatoire (Port 3600)
- **Port d'exécution obligatoire :** L'application doit impérativement tourner sur le port **3600** (`http://localhost:3600`).
- **Commande de démarrage :** Toujours démarrer le serveur de développement via `npm run dev` (qui contient déjà `-p 3600`) ou directement `next dev -p 3600`.
- **Interdiction du port 3000 :** Ne JAMAIS utiliser le port 3000 ni lancer `next dev` sans le port 3600.
- **Variables et URLs :** L'URL de base locale de l'application est `http://localhost:3600` (`APP_URL="http://localhost:3600"` dans `.env`). Les redirections (OAuth Google, callbacks, tests de connectivité) doivent pointer vers le port 3600.
