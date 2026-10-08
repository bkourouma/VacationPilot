# 📋 Protocole de Recette & Scénario de Test E2E — Enseignant (EduPresence)

Ce document fournit le protocole officiel de test de bout en bout (**End-to-End**) pour valider l'ensemble des parcours de l'espace **Enseignant** sur l'application **EduPresence**.

---

## 🎯 Objectif du Test
Valider que tout enseignant peut se connecter, consulter ses cours et ses classes, réaliser l'appel (émargement numérique), suivre la progression horaire et pédagogique (syllabus), attribuer des notes avec calculs automatiques de moyennes, exporter les pièces officielles (Excel / PDF / Impression), et vérifier que les étudiants visualisent instantanément leurs données à jour.

---

## ⚙️ Prérequis & Environnement de Test

| Paramètre | Valeur / Recommandation |
| :--- | :--- |
| **URL Locale** | [http://localhost:3600](http://localhost:3600) *(Port 3600 obligatoire)* |
| **Identifiants Enseignant** | **Utilisateur :** `prof` &bull; **Mot de passe :** `prof123` |
| **Accès alternatif Gmail** | `prof@gmail.com` *(via connexion directe ou Google OAuth)* |
| **Classe de test** | `LPRIGL-A` *(Licence Pro RGL - Groupe A &bull; 16 étudiants)* |
| **Matière de test** | `GL` *(Génie Logiciel &bull; Volume prévu : 30h)* |
| **Matricule pour contre-test Étudiant** | `33021` *(AGBATO Karl Vianney Emmanuel)* |

---

## 📊 Matrice d'Exécution & Suivi des Résultats

| Réf. | Étape du Parcours | Action Clé | Résultat Attendu | Statut |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Authentification Enseignant | Saisie `prof` / `prof123` | Connexion réussie, accès au tableau de bord | 🔲 À tester |
| **TC-02** | Navigation & Dashboard | Vue d'ensemble des KPI | Affichage des compteurs et des séances récentes | 🔲 À tester |
| **TC-03** | Structure & Effectifs | Consultation de `LPRIGL-A` | 16 étudiants affichés, recherche réactive | 🔲 À tester |
| **TC-04** | Émargement & Présences | Création séance 2h + pointage | Statuts (Présent, Absent, Retard) enregistrés | 🔲 À tester |
| **TC-05** | Progression Pédagogique | Validation d'un sous-chapitre | Jauge d'heures et % syllabus incrémentés | 🔲 À tester |
| **TC-06** | Évaluations & Notes | Création devoir + saisie notes | Notes enregistrées, moyennes recalculées | 🔲 À tester |
| **TC-07** | Exports & Impression | Génération Excel & feuille d'appel | Fichiers `.xlsx` téléchargés et A4 imprimable | 🔲 À tester |
| **TC-08** | Contrôle Portail Étudiant | Recherche matricule `33021` | Présence du jour et note visibles en direct | 🔲 À tester |

---

## 📝 Déroulement Pas-à-Pas Détaillé

### 1. Authentification Enseignant (TC-01)
1. Ouvrez votre navigateur sur **[http://localhost:3600](http://localhost:3600)**.
2. Dans le bloc droit **"Espace Enseignant / Administration"** :
   - Identifiant : `prof`
   - Mot de passe : `prof123`
3. Cliquez sur **"Se connecter à l'espace gestion"**.
   - [ ] Redirection immédiate vers `/dashboard`.
   - [ ] La barre latérale indique le profil *"Enseignant Principal"*.

---

### 2. Vue d'Ensemble & Dashboard (TC-02)
1. Constatez le bandeau supérieur bleu de bienvenue.
2. Vérifiez la présence des compteurs :
   - Classes actives.
   - Total d'étudiants sous votre responsabilité.
   - Dernières séances enregistrées.
3. Vérifiez la présence des 4 raccourcis opérationnels (*Faire l'appel*, *Valider les chapitres*, *Saisir des notes*, *Voir ma progression*).
   - [ ] Dashboard opérationnel et sans erreur.

---

### 3. Consultation des Classes & Étudiants (TC-03)
1. Dans le menu latéral, cliquez sur **"Classes & Cours"** (`/dashboard/classes`).
2. Sélectionnez la classe **`LPRIGL-A`**.
3. Observez :
   - Le volume horaire prévu pour la matière **Génie Logiciel** (30h).
   - La liste complète des 16 étudiants inscrits.
4. Dans le champ de recherche rapide, tapez `33021` ou `AGBATO`.
   - [ ] L'étudiant est immédiatement filtré.

---

### 4. Émargement de Séance & Pointage (TC-04)
1. Dans le menu latéral, cliquez sur **"Émargement & Présences"** (`/dashboard/presences`).
2. Renseignez la séance :
   - **Classe :** `LPRIGL-A`
   - **Matière :** `GL - Génie Logiciel`
   - **Date :** Date du jour
   - **Horaires :** `08:00` - `10:00` (2 heures)
   - **Description :** `Atelier pratique Conception UML et Architecture MVC`
3. **Pointage des étudiants :**
   - Cliquez sur **"TOUT PRÉSENT"** pour cocher tous les étudiants en un clic.
   - Passez l'étudiant **AKA Ahou Gervaise** (`32260`) à **Absent** (rouge) &bull; Remarque : `Absence non signalée`.
   - Passez l'étudiant **BAKARE Mariam** (`33055`) à **Retard** (jaune) &bull; Remarque : `Retard de 20 minutes`.
   - Maintenez **AGBATO Karl Vianney** (`33021`) en **Présent** (vert).
4. Cliquez sur le bouton bleu **"Enregistrer la séance et les présences"**.
   - [ ] Message vert de succès affiché.
   - [ ] La séance de 2h apparaît en bas dans l'Historique avec la ventilation exacte des statuts.

---

### 5. Progression Pédagogique & Syllabus (TC-05)
1. Dans le menu latéral, cliquez sur **"Progression des Cours"** (`/dashboard/progression`).
2. Sélectionnez la classe `LPRIGL-A` et le cours `Génie Logiciel`.
3. Constatez la jauge horaire :
   - Heures réalisées incrémentées de **2h**.
   - Calcul automatique du pourcentage d'avancement horaire.
4. Dans la liste des chapitres et sous-chapitres du programme :
   - Cochez un sous-chapitre pour le marquer comme **Validé / Terminé**.
   - [ ] La jauge de progression du programme s'actualise en direct avec la date de validation.

---

### 6. Évaluation & Attribution des Notes (TC-06)
1. Dans le menu latéral, cliquez sur **"Saisie des Notes"** (`/dashboard/notes`).
2. Sélectionnez `LPRIGL-A` et la matière `GL - Génie Logiciel`.
3. Configurez une nouvelle évaluation :
   - **Titre :** `Contrôle Continu 1 - Conception & Patterns`
   - **Date :** Date du jour
   - **Coefficient :** `2.0`
   - **Barème :** `20.0`
4. Saisissez quelques notes :
   - **AGBATO Karl Vianney** (`33021`) : `16.5 / 20` &bull; Commentaire : *Très bon travail*.
   - **AKA Ahou Gervaise** (`32260`) : `13.5 / 20`.
   - **BAKARE Mariam** (`33055`) : `11.0 / 20`.
5. Cliquez sur **"Enregistrer l'évaluation"**.
6. Rendez-vous sur l'onglet **"Récapitulatif & Moyennes"**.
   - [ ] L'évaluation est enregistrée.
   - [ ] Les moyennes pondérées individuelles et la moyenne de classe sont calculées automatiquement.

---

### 7. Exports Excel & Documents Imprimables (TC-07)
1. Dans le menu latéral, cliquez sur **"Exports & Rapports"** (`/dashboard/exports`).
2. Choisissez la classe `LPRIGL-A` et la matière `GL - Génie Logiciel`.
3. Cliquez sur **"Télécharger Relevé Présences (.xlsx)"** &rarr; vérifiez la validité du fichier téléchargé.
4. Cliquez sur **"Télécharger Relevé Notes (.xlsx)"** &rarr; vérifiez le classeur de notes.
5. Cliquez sur **"Imprimer la feuille d'émargement"**.
   - [ ] Boîte d'impression navigateur ouverte avec mise en page A4 officielle et zone de signature manuscrite.

---

### 8. Déconnexion & Contrôle Croisé Portail Étudiant (TC-08)
1. Cliquez sur le bouton rouge **"Déconnexion"** en bas du menu de gauche.
2. Sur la page d'accueil, dans la boîte de gauche **"Espace Étudiant & Auditeur"** :
   - Saisissez le matricule : **`33021`**.
   - Cliquez sur **"Consulter mes présences & notes"**.
3. **Validation finale de bout en bout :**
   - [ ] La séance de 2h créée à l'étape 4 apparaît avec le statut **Présent**.
   - [ ] Le taux d'assiduité global de l'étudiant est recalculé en temps réel.
   - [ ] La note de **`16.5 / 20`** attribuée à l'étape 6 apparaît avec le commentaire *"Très bon travail"* et impacte sa moyenne générale.

---

## 🎯 Conclusion de Recette
- **Critère de succès :** Les 8 cas de test (TC-01 à TC-08) sont validés sans incohérence de données ni anomalie bloquante.
