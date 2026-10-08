# 🏛️ Cahier de Recette E2E — Direction Pédagogique & Administration (EduPresence)

Ce document fournit le protocole officiel de test de bout en bout (**End-to-End**) pour valider l'ensemble des parcours de l'espace **Administration / Direction Pédagogique** sur l'application **EduPresence**.

---

## 🎯 Objectif du Test
Valider que la direction pédagogique dispose des outils de gouvernance, de supervision consolidée et d'administration de l'établissement :
1. Connexion sécurisée avec le profil Direction / Administration.
2. Vue d'ensemble consolidée de tous les volumes horaires, taux de réalisation et effectifs.
3. Détection automatique des retards (inactivité > 14 jours, absence d'évaluations > 50% de volume réalisé, absentéisme critique).
4. Pilotage de la configuration globale et test de l'IA (analyse de programmes).
5. Gestion des comptes et délégation (création/révocation des chefs de classe).
6. Supervision de la structure pédagogique : création de promotion, affectation d'enseignants aux cours avec volume horaire dédié.
7. Gestion centralisée des effectifs étudiants (annuaire global, inscription unitaire ou par import).
8. Contrôle transversal des évaluations et export des rapports consolidés de l'établissement.

---

## ⚙️ Prérequis & Informations de Connexion

| Paramètre | Valeur / Instruction |
| :--- | :--- |
| **URL Locale** | [http://localhost:3600](http://localhost:3600) *(Port 3600 obligatoire)* |
| **Compte Administrateur** | **Identifiant :** `admin` &bull; **Mot de passe :** `admin123` |
| **Nom affiché** | Direction Pédagogique (`direction@edupresence.com`) |
| **Périmètre supervisé** | Toutes les classes de l'établissement (ex: `LPRIGL-A`, `M2RIGLA`), tous les enseignants et tous les étudiants |
| **Navigateurs recommandés** | Google Chrome, Mozilla Firefox, Microsoft Edge, Safari |

---

## 📊 Matrice Récapitulative des Cas de Test (TC-ADM-01 à 08)

| Réf. | Module / Étape | Action Clé | Résultat Attendu | Statut |
| :---: | :--- | :--- | :--- | :---: |
| **TC-ADM-01** | Authentification Admin | Connexion `admin` / `admin123` | Accès au dashboard Direction ambre avec KPI consolidés | 🔲 À tester |
| **TC-ADM-02** | Suivi Global & Retards | Consultation du centre d'alertes | Détection des cours inactifs et retards d'évaluation | 🔲 À tester |
| **TC-ADM-03** | Configuration & IA | Test de connectivité IA | Modèle sélectionné et test de latence en direct validé | 🔲 À tester |
| **TC-ADM-04** | Gestion des Accès | Création d'un chef de classe | Compte créé avec rôle `CHEF_CLASSE` et rattaché à sa classe | 🔲 À tester |
| **TC-ADM-05** | Structure Pédagogique | Création d'une nouvelle classe | Classe enregistrée + attribution matière et enseignant | 🔲 À tester |
| **TC-ADM-06** | Annuaire des Étudiants | Inscription d'un nouvel étudiant | Étudiant ajouté dans l'annuaire et filtrable par classe | 🔲 À tester |
| **TC-ADM-07** | Contrôle des Notes | Consultation transversale des notes | Accès à la grille et moyennes pondérées sans restriction | 🔲 À tester |
| **TC-ADM-08** | Exports Consolidés | Téléchargements Excel & print A4 | Fichiers officiels téléchargés et impression A4 prête | 🔲 À tester |

---

## 📝 Déroulement Détaillé Pas-à-Pas

### Étape 1 : Authentification & Console de Supervision (TC-ADM-01)
1. Ouvrez votre navigateur et accédez à **`http://localhost:3600`**.
2. Dans la colonne de droite (**Espace Enseignant / Administration**) :
   - **Nom d'utilisateur :** `admin`
   - **Mot de passe :** `admin123`
3. Cliquez sur le bouton bleu **"Se connecter à l'espace gestion"**.
4. **Validation attendue :**
   - Redirection immédiate vers `/dashboard`.
   - La barre latérale foncée affiche l'icône bâtiment et le badge ambre **"Direction Pédagogique"**.
   - Le bandeau supérieur s'affiche en dégradé ambre/orange : **"Console de Supervision Administrative"**.
   - Les 4 cartes KPI consolidées affichent les statistiques globales de l'établissement :
     - **Classes Partagées** (ex: `2` promotions).
     - **Total Étudiants** (ex: `24` inscrits).
     - **Volume Réalisé** (ex: `52h / 240h` soit `22%` accompli).
     - **Alertes Retard** ou statut d'assiduité global.

---

### Étape 2 : Pilotage Global & Détection Automatique des Retards (TC-ADM-02)
1. Dans le menu de gauche, sous la section *4. Pilotage & Clôture*, cliquez sur **"Suivi Global & Retards"** (`/dashboard/admin/progression`).
2. Observez le **Centre d'Alertes Pédagogiques** en haut de page :
   - Constatez les alertes d'inactivité (cours sans séance depuis plus de 14 jours).
   - Constatez les alertes de retard d'évaluation (matières ayant dépassé 50% du volume horaire sans aucune évaluation notée).
3. Constatez la **Synthèse par Promotion** :
   - Barres de progression horaire distinctes pour chaque classe (`LPRIGL-A`, `M2RIGLA`).
4. **Test des filtres de gouvernance :**
   - Dans le filtre **Classe**, sélectionnez `LPRIGL-A` &rarr; Seuls les cours de cette promotion s'affichent.
   - Dans le filtre **Enseignant**, sélectionnez `Enseignant Principal` &rarr; Les cours pris en charge par ce professeur apparaissent avec leur volume réalisé vs prévu.
   - Dans le filtre **Statut**, basculez sur `En cours` puis sur `Tous`.
5. **Validation attendue :** La direction dispose d'une vision panoramique instantanée de l'avancement horaire et des anomalies de calendrier sans devoir interroger manuellement chaque enseignant.

---

### Étape 3 : Paramétrage Global & Intelligence Artificielle (TC-ADM-03)
1. Dans le menu latéral gauche, sous *1. Paramétrage & Accès*, cliquez sur **"Configuration & IA"** (`/dashboard/config`).
2. Observez le panneau de gestion du moteur IA utilisé pour l'extraction automatique des syllabus (fichiers Word) :
   - Modèle actif (ex: `deepseek/deepseek-chat` ou `google/gemini-2.5-flash`).
3. Cliquez sur le bouton **"Tester la connexion IA"** (ou saisissez/sélectionnez un modèle).
4. **Validation attendue :**
   - Le badge de test s'active et indique le résultat du test avec le temps de latence en millisecondes (ex: *Connexion réussie ! Latence : 420 ms*).

---

### Étape 4 : Gestion des Accès & Chefs de Classe (TC-ADM-04)
1. Dans le menu latéral, cliquez sur **"Gestion des Accès"** (`/dashboard/chefs`).
2. Constatez la liste des délégués / chefs de classe actuellement enregistrés dans l'établissement.
3. **Création d'un nouveau chef de classe :**
   - **Nom et Prénom :** `KONE Moussa`
   - **Identifiant :** `chef_l3`
   - **Mot de passe :** `chef123`
   - **Classe rattachée :** Sélectionnez `Licence Pro RGL - Groupe A`
4. Cliquez sur **"Créer le compte chef de classe"**.
5. **Validation attendue :**
   - Notification verte de confirmation : *Compte chef de classe créé avec succès*.
   - Le compte apparaît dans le tableau récapitulatif avec sa classe d'affectation et sa date de création.

---

### Étape 5 : Structure Pédagogique & Création de Classe (TC-ADM-05)
1. Dans le menu latéral, cliquez sur **"Classes & Cours"** (`/dashboard/classes`).
2. Cliquez sur le bouton bleu en haut à droite **"+ Nouvelle Classe"**.
3. Renseignez les informations de la nouvelle promotion :
   - **Code de la classe :** `M1-DATA`
   - **Nom de la filière :** `Master 1 Data Science & IA`
   - **Année académique :** `2025-2026`
4. Cliquez sur **"Créer la classe"**.
5. **Validation attendue :**
   - La classe `M1-DATA` apparaît immédiatement dans la liste des promotions de l'établissement.
6. Cliquez sur **"+ Programmer un cours"** :
   - Sélectionnez la classe `M1-DATA`.
   - Choisissez une matière (ex: `Bases de Données Avancées`).
   - Définissez le volume horaire prévu : `30` heures.
   - Coefficient : `2.0`.
   - Attribuez le cours à l'un des enseignants de la liste.
7. Validez la programmation.
   - [ ] Le cours est rattaché à la classe avec sa jauge à 0h / 30h.

---

### Étape 6 : Annuaire Centralisé & Inscription d'Étudiants (TC-ADM-06)
1. Dans le menu latéral, cliquez sur **"Étudiants"** (`/dashboard/etudiants`).
2. Observez l'annuaire global récapitulant tous les auditeurs de l'établissement (24 étudiants inscrits).
3. Utilisez le filtre par classe pour isoler `LPRIGL-A` (16 étudiants) puis `M2RIGLA` (8 étudiants).
4. Cliquez sur le bouton bleu **"+ Inscrire un étudiant"** :
   - **Promotion d'accueil :** Sélectionnez `M1-DATA` (ou `LPRIGL-A`).
   - **Matricule officiel :** `35001`
   - **Nom :** `TRAORE`
   - **Prénom :** `Aïssatou`
   - **Téléphone :** `0701020304`
   - **Email :** `aissatou.traore@edupresence.com`
5. Cliquez sur **"Enregistrer l'inscription"**.
6. Dans la barre de recherche rapide, tapez `35001` ou `TRAORE`.
7. **Validation attendue :**
   - L'étudiante est instantanément filtrée dans l'annuaire avec sa promotion, ses coordonnées et son statut d'assiduité vierge.

---

### Étape 7 : Consultation Transversale des Évaluations & Notes (TC-ADM-07)
1. Dans le menu latéral, cliquez sur **"Consultation des Notes"** (`/dashboard/notes`).
2. Sélectionnez la classe `LPRIGL-A` et la matière `GL - Génie Logiciel`.
3. Cliquez sur l'onglet **"Récapitulatif & Moyennes"**.
4. Constatez l'accès en lecture à l'évaluation enregistrée par l'enseignant (*Contrôle Continu 1 - Conception & Patterns*).
5. Vérifiez :
   - La moyenne de classe calculée.
   - Les notes individuelles des auditeurs (`33021` = 16.5, `32260` = 13.5, `33055` = 11.0).
6. Changez de classe dans le sélecteur pour inspecter une autre filière.
7. **Validation attendue :** La direction a une visibilité complète sur toutes les évaluations sans barrière d'affectation individuelle.

---

### Étape 8 : Exports Consolidés de l'Établissement (TC-ADM-08)
1. Dans le menu latéral, cliquez sur **"Exports & Rapports"** (`/dashboard/exports`).
2. Sélectionnez la classe `LPRIGL-A` et la matière `GL - Génie Logiciel`.
3. **Téléchargements Excel :**
   - Cliquez sur **"Télécharger Excel Présences"** &rarr; Téléchargement de la matrice complète des présences.
   - Cliquez sur **"Télécharger Excel Notes"** &rarr; Téléchargement du relevé officiel des notes et moyennes.
4. **Feuille officielle d'émargement :**
   - Cliquez sur **"Émargement papier"**.
   - Constatez que la prévisualisation A4 s'ouvre, sans coupure de tableau, avec l'en-tête officiel de l'établissement, la liste des auditeurs et les cases de visa / signature.
5. **Validation attendue :** Les documents générés sont intègres, prêts à être transmis aux instances académiques ou archivés.

---

## ✅ Critères de Succès de la Recette
- [ ] Les 8 cas de test (TC-ADM-01 à TC-ADM-08) ont été exécutés sans erreur bloquante.
- [ ] La direction dispose d'une vue consolidée transversale de toutes les classes, enseignants et étudiants.
- [ ] Les alertes de retard reflètent fidèlement l'état réel des cours.
- [ ] **Recette déclarée CONFORME pour le profil Administration / Direction.**
