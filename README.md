# VacationPro - Gestion des Présences, Notes & Progression Pédagogique

Application web complète dédiée à la direction pédagogique, aux enseignants, aux chefs de classe et aux étudiants pour la gestion de l'assiduité, le suivi des volumes horaires et les évaluations.

---

## 🚀 Démarrage Rapide

### 1. Démarrer le serveur de développement
```bash
npm run dev
```
L'application est immédiatement accessible à l'adresse : **[http://localhost:3600](http://localhost:3600)**

---

## 🔑 Identifiants & Accès

### 1. Espace Administration / Direction Pédagogique (Supervision Consolidée)
- **Identifiant :** `admin`
- **Mot de passe :** `admin123`
- **Fonctionnalités clés :**
  - **Tableau de bord consolidé :** Vue d'ensemble de tous les cours, enseignants et classes.
  - **Suivi de la progression horaire :** Comparaison en direct du volume horaire réalisé vs prévu (10h, 20h, 30h, 40h...).
  - **Centre d'alertes & détection des retards :**
    - Retards d'avancement (cours inactifs > 14 jours non terminés).
    - Retards d'évaluation (matières avancées > 50% sans notes).
    - Retards d'assiduité des étudiants et taux d'absentéisme critique.
  - **Supervision des classes & enseignants :** Création des classes partagées, affectation des matières.
  - **Exports consolidés :** Relevés complets de l'établissement.

### 2. Espace Enseignants (Multi-Comptes & Authentification Gmail)
- **Authentification en 1 clic via Gmail :**
  - Bouton officiel **"Continuer avec Google / Gmail"** sur la page d'accueil.
  - Tout nouvel enseignant peut renseigner son adresse Gmail (`@gmail.com`) et son nom pour créer son espace immédiatement.
- **Compte de démonstration pré-configuré :**
  - **Identifiant :** `prof` (ou `prof@gmail.com`)
  - **Mot de passe :** `prof123`
- **Fonctionnalités Enseignant :**
  - **Classes partagées :** Les enseignants partagent les mêmes classes (ex: `LPRIGL-A`).
  - **Matières propres avec Volume Horaire :** Chaque enseignant enregistre ses propres matières et définit le volume horaire prévu (10h, 20h, 30h, 40h, etc.).
  - **Émargement heure par heure :** Appel rapide avec détection des retards, présences et absences.
  - **Saisie des Notes & Moyennes pondérées :** Coefficients personnalisables.
  - **Chefs de classe :** Désignation d'un chef par promotion.
  - **Exports Excel & Impression :** Feuilles d'émargement et relevés de notes conformes.

### 3. Espace Chef de classe
- **Identifiant :** `chef`
- **Mot de passe :** `chef123`
- **Permissions :**
  - Émargement / Saisie des présences pour sa classe uniquement
  - Consultation de la liste de sa classe
  - **Restriction stricte :** Aucun droit de consultation ou de modification des notes

### 4. Espace Étudiant / Élève
- **Accès direct sans mot de passe :** il suffit d'entrer le **numéro de matricule** sur la page d'accueil !
- **Exemples de matricules réels pour tester :**
  - `33021` (AGBATO Karl Vianney Emmanuel)
  - `32260` (AKA Ahou Gervaise Naomi)
  - `33055` (BAKARE Mariam)
  - `33592` (BAMBA Mohamed)
  - `32197` (BEKLOU Hieouya Aude Samirah)
  - `32688` (BESDALI Yohan Armstrong)
- **Ce qu'il consulte :**
  - Ses présences et taux d'assiduité réels calculés séance par séance
  - Son historique avec statut officiel (Présent, Absent, Retard, Justifié)
  - Ses notes et moyennes pondérées par matière

---

## 📊 Données Réelles de Présences (Septembre 2026)
Les présences officielles sont issues de l'émargement Teams analysé dans [`docs/Presences_auditeurs_septembre_2026.xlsx`](./docs/Presences_auditeurs_septembre_2026.xlsx) :
- **Classe :** Licence Pro RGL - Groupe A (`LPRIGL-A`) — 16 auditeurs
- **Matière :** Génie Logiciel (`GL`) — Enseignant Principal
- **Volume horaire :** 18 heures réalisées sur 30 heures prévues (60% d'avancement)
- **Script d'import / réinitialisation :**
  ```bash
  node scripts/import-real-presences.mjs
  ```

---

## 📁 Architecture des Données

```prisma
model User {
  id         String    @id @default(cuid())
  username   String    @unique
  email      String?   @unique      // Adresse Gmail
  googleId   String?   @unique
  nom        String
  role       String    @default("ENSEIGNANT") // "ADMINISTRATION", "ENSEIGNANT", "CHEF_CLASSE"
  matieres   Matiere[] // Matières prises en charge
}

model Classe {
  id            String     @id @default(cuid())
  code          String     @unique // ex: LPRIGL-A (partagée par tous les enseignants)
  nom           String
  anneeScolaire String
  matieres      Matiere[]
  etudiants     Etudiant[]
}

model Matiere {
  id            String       @id @default(cuid())
  code          String
  nom           String
  coefficient   Float        @default(1.0)
  volumeHoraire Float        @default(20.0) // 10h, 20h, 30h, 40h...
  classeId      String
  enseignantId  String?      // Enseignant responsable
  seances       Seance[]
  evaluations   Evaluation[]
}
```

---

## 🛠️ Stack Technique
- **Framework :** Next.js 16 (App Router, Turbopack, TypeScript, React 19)
- **Style :** Tailwind CSS 4
- **Base de données :** SQLite (via Prisma ORM 5.22)
- **Authentification :** JWT HTTP-only (`jose`), support OAuth Google & Gmail
- **Traitement Excel :** SheetJS (`xlsx`)
