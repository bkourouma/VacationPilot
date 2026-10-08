# 📋 Cahier de Recette E2E — Parcours Enseignant (EduPresence)

Ce document fournit un **scénario de test de bout en bout (End-to-End)** complet à destination d'un testeur ou utilisateur final souhaitant valider l'ensemble des fonctionnalités de l'espace **Enseignant** sur son navigateur web.

---

## 🎯 Objectifs du Test
1. Valider l'authentification et l'accès sécurisé à l'espace Enseignant.
2. Vérifier la gestion de la structure pédagogique (classes assignées, matières et volumes horaires).
3. Réaliser un émargement complet de séance (gestion des présences, absences, retards et motifs).
4. Suivre et valider l'avancement pédagogique du programme (syllabus, chapitres, jauge d'heures).
5. Créer une évaluation notée, saisir les notes et vérifier les calculs automatiques de moyennes.
6. Tester les fonctionnalités d'export (Excel) et d'impression (fiche d'émargement officielle).
7. Réaliser la vérification croisée en accédant au portail Étudiant pour constater la mise à jour des données en temps réel.

---

## ⚙️ Prérequis & Informations de Connexion

| Élément | Valeur / Instruction |
| :--- | :--- |
| **URL de l'application** | [http://localhost:3600](http://localhost:3600) |
| **Profil Enseignant Test** | **Identifiant :** `prof` &bull; **Mot de passe :** `prof123` |
| **Alternative Connexion Directe** | Email Gmail : `prof@gmail.com` |
| **Classe de test recommandée** | `LPRIGL-A` (Licence Pro RGL - Groupe A &bull; 16 étudiants) |
| **Matière de test recommandée** | `GL` (Génie Logiciel &bull; Volume prévu : 30h) |
| **Matricule étudiant pour vérification** | `33021` (AGBATO Karl Vianney Emmanuel) |
| **Navigateurs recommandés** | Google Chrome, Mozilla Firefox, Microsoft Edge, Safari |

---

## 🗺️ Matrice Récapitulative des Étapes de Test

| N° | Étape / Module | Action Principale | Résultat Attendu | Statut |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Authentification** | Connexion avec `prof` / `prof123` | Redirection immédiate vers le dashboard enseignant | 🔲 À tester |
| **2** | **Tableau de Bord** | Consultation des KPI et raccourcis | Affichage du rôle Enseignant, des cours et séances récentes | 🔲 À tester |
| **3** | **Classes & Étudiants** | Consultation de la classe `LPRIGL-A` | Liste des 16 étudiants avec matricules et contacts | 🔲 À tester |
| **4** | **Émargement** | Création d'une séance de 2h + pointage | Statuts enregistrés (Présent, Absent, Retard) avec succès | 🔲 À tester |
| **5** | **Progression & Syllabus** | Cocher un chapitre / sous-chapitre | Jauge d'avancement et pourcentage actualisés | 🔲 À tester |
| **6** | **Saisie des Notes** | Nouvelle évaluation + saisie des notes | Notes sauvegardées, moyennes pondérées recalculées | 🔲 À tester |
| **7** | **Exports & Impression** | Téléchargement Excel & aperçu impression | Fichiers `.xlsx` valides et fiche d'émargement imprimable | 🔲 À tester |
| **8** | **Contrôle Étudiant** | Consultation du portail avec le matricule `33021` | Présence du jour et note d'évaluation visibles en direct | 🔲 À tester |

---

## 📝 Déroulement Détaillé Pas-à-Pas

### Étape 1 : Connexion à l'Espace Enseignant
1. Ouvrez votre navigateur et accédez à **`http://localhost:3600`**.
2. Dans la colonne de droite (**Espace Enseignant / Administration**), renseignez :
   - **Nom d'utilisateur :** `prof`
   - **Mot de passe :** `prof123`
3. Cliquez sur le bouton bleu **"Se connecter à l'espace gestion"**.
   > *Alternative possible : Vous pouvez également cliquer sur "Continuer avec Google / Gmail" et renseigner `prof@gmail.com`.*
4. **Validation attendue :** 
   - Vous êtes redirigé vers l'URL `/dashboard`.
   - La barre latérale foncée affiche votre nom : **"Enseignant Principal"** avec le badge **"Espace Gestion"**.

---

### Étape 2 : Découverte du Tableau de Bord (`/dashboard`)
1. Observez la bannière d'accueil supérieure bleue indiquant : **"Bienvenue, Enseignant Principal"**.
2. Vérifiez la présence des compteurs récapitulatifs :
   - Nombre de classes prises en charge (ex: `LPRIGL-A`).
   - Nombre d'étudiants totaux.
   - Dernières séances enregistrées.
3. Repérez les boutons d'actions rapides :
   - *Faire l'appel maintenant*
   - *Valider les chapitres*
   - *Saisir des notes*
   - *Voir ma progression*
4. **Validation attendue :** L'interface est fluide, personnalisée pour le profil enseignant, et sans erreurs console.

---

### Étape 3 : Consultation de la Structure Pédagogique
#### 3.1. Catalogue Matières (`/dashboard/matieres`)
1. Dans le menu de gauche, cliquez sur **"Catalogue Matières"** (section *2. Structure Pédagogique*).
2. Vérifiez la liste des matières disponibles, notamment **Génie Logiciel** (`GL`), **Développement Web & Mobile** (`WEB`), etc.
3. Constatez l'affichage du volume horaire par défaut et des enseignants associés.

#### 3.2. Classes & Étudiants (`/dashboard/classes`)
1. Dans le menu de gauche, cliquez sur **"Classes & Cours"**.
2. Dans le volet supérieur ou le sélecteur, choisissez la classe **`LPRIGL-A` (Licence Pro RGL - Groupe A)**.
3. Vérifiez les informations affichées :
   - Année scolaire : `2025-2026`.
   - Les matières programmées pour cette classe avec leur volume horaire prévu (ex: `GL` avec 30h prévues).
   - Le tableau des **16 étudiants inscrits**, avec leurs matricules officiels (`33021`, `32260`, `33055`, etc.).
4. Testez la barre de recherche rapide d'étudiant en tapant `AGBATO` ou `33021`.
5. **Validation attendue :** L'étudiant est immédiatement filtré et trouvé dans la liste.

---

### Étape 4 : Émargement & Gestion des Présences (`/dashboard/presences`)
1. Dans le menu de gauche, cliquez sur **"Émargement & Présences"**.
2. **Configuration de la séance :**
   - **Classe :** Sélectionnez `LPRIGL-A`.
   - **Matière :** Sélectionnez `GL - Génie Logiciel`.
   - **Date :** Laissez la date du jour (ou modifiez-la).
   - **Heure début / fin :** `08:00` - `10:00` (soit `2.0` heures).
   - **Description / Objectifs :** Saisissez par exemple : `Atelier pratique Conception UML et Architecture MVC`.
3. *(Optionnel)* Si des chapitres s'affichent sous la description, cochez le chapitre en cours d'étude pour le relier à cette séance.
4. **Pointage des étudiants :**
   - Cliquez d'abord sur le bouton vert **"TOUT PRÉSENT"** pour pointer tous les étudiants présents en 1 clic.
   - Modifiez le statut de 2 ou 3 étudiants pour tester les cas particuliers :
     - Pour **AGBATO Karl Vianney** (`33021`) : Laissez **Présent** (vert).
     - Pour **AKA Ahou Gervaise Naomi** (`32260`) : Cliquez sur **Absent** (rouge) et tapez dans la remarque : `Absence non signalée`.
     - Pour **BAKARE Mariam** (`33055`) : Cliquez sur **Retard** (jaune) et tapez : `Arrivée à 08h30 (30 min)`.
5. *(Test avancé optionnel)* : Activez le commutateur **"Mode heure par heure"** pour observer la décomposition en colonnes `H1 (08:00 - 09:00)` et `H2 (09:00 - 10:00)`.
6. Cliquez sur le bouton bleu en bas à droite : **"Enregistrer la séance et les présences"**.
7. **Validation attendue :**
   - Un message de succès vert confirme l'enregistrement.
   - En faisant défiler vers le bas jusqu'à la section **"Historique des séances"**, la nouvelle séance de 2h apparaît immédiatement avec le récapitulatif des présents/absents.

---

### Étape 5 : Suivi de la Progression & Syllabus (`/dashboard/progression`)
1. Dans le menu latéral, cliquez sur **"Progression des Cours"**.
2. En haut de page, sélectionnez :
   - **Classe :** `LPRIGL-A`
   - **Matière :** `Génie Logiciel`
3. Observez la jauge d'avancement des heures :
   - Volume prévu (30h).
   - Heures effectuées (les 2 heures saisies à l'étape précédente s'ajoutent au total).
   - Heures restantes et pourcentage d'avancement horaire.
4. Dans la liste du syllabus (chapitres et sous-chapitres) :
   - Cochez un sous-chapitre ou un chapitre non encore validé pour le marquer comme **"Fait"**.
5. **Validation attendue :**
   - La jauge de progression des chapitres s'incrémente instantanément.
   - La pastille de statut passe en vert avec la date du jour.

---

### Étape 6 : Saisie d'une Évaluation & Attribution des Notes (`/dashboard/notes`)
1. Dans le menu de gauche, cliquez sur **"Saisie des Notes"**.
2. Vérifiez que la classe `LPRIGL-A` et la matière `GL - Génie Logiciel` sont bien sélectionnées.
3. Renseignez les paramètres de l'évaluation :
   - **Titre :** `Contrôle Continu 1 - Conception & Patterns`
   - **Date :** Date du jour
   - **Coefficient :** `2.0`
   - **Note Maximale :** `20.0`
4. Saisissez quelques notes dans la grille des étudiants :
   - Pour **AGBATO Karl Vianney** (`33021`) : Note = `16.5`, Commentaire = `Très bon travail`.
   - Pour **AKA Ahou Gervaise Naomi** (`32260`) : Note = `13.5`.
   - Pour **BAKARE Mariam** (`33055`) : Note = `11.0`.
5. Cliquez sur le bouton bleu **"Enregistrer l'évaluation"**.
6. **Validation attendue :**
   - Notification verte de confirmation d'enregistrement.
7. Cliquez sur l'onglet **"Récapitulatif & Moyennes"** :
   - Vérifiez que l'évaluation apparaît dans le tableau récapitulatif.
   - Constatez le calcul automatique des moyennes pondérées par étudiant et de la moyenne globale de la classe.

---

### Étape 7 : Exports Excel & Documents Imprimables (`/dashboard/exports`)
1. Dans le menu latéral, cliquez sur **"Exports & Rapports"**.
2. Sélectionnez la classe `LPRIGL-A` et la matière `GL - Génie Logiciel`.
3. **Test des téléchargements Excel :**
   - Cliquez sur le bouton **"Télécharger Relevé Présences (.xlsx)"** &rarr; Vérifiez que le fichier Excel se télécharge bien dans votre dossier Téléchargements.
   - Cliquez sur le bouton **"Télécharger Relevé Notes (.xlsx)"** &rarr; Vérifiez le téléchargement du classeur de notes.
4. **Test de la prévisualisation d'impression :**
   - Cliquez sur **"Imprimer la feuille d'émargement"**.
   - Une fenêtre d'impression native du navigateur s'ouvre, formatée proprement pour le papier A4 avec la liste des étudiants et la colonne réservée pour leur signature physique.
   - Fermez la boîte d'impression.
5. **Validation attendue :** Les fichiers générés sont exploitables, sans troncature, et aux normes administratives.

---

### Étape 8 : Contrôle Croisé E2E Côté Portail Étudiant (`/`)
1. Dans la barre latérale en bas à gauche, cliquez sur le bouton rouge **"Déconnexion"**.
2. Vous êtes redirigé sur la page d'accueil (`http://localhost:3600`).
3. Dans la boîte de gauche **"Espace Étudiant & Auditeur"** :
   - Saisissez le matricule de l'étudiant testé précédemment : **`33021`**.
   - Cliquez sur **"Consulter mes présences & notes"**.
4. **Constat & Validation finale :**
   - La fiche de **AGBATO Karl Vianney Emmanuel** s'affiche.
   - **Taux d'assiduité :** Calculé en temps réel avec la dernière séance de 2h où il a été pointé présent.
   - **Historique des séances :** La séance `Atelier pratique Conception UML et Architecture MVC` apparaît bien dans son tableau avec le statut "Présent".
   - **Relevé de notes :** La note de `16.5 / 20` attribuée à l'étape 6 apparaît avec le commentaire `Très bon travail` et le calcul de sa moyenne !

---

## ✅ Résultat Final du Test
- [ ] **Toutes les étapes ont été exécutées avec succès sans blocage.**
- [ ] **L'application garantit une cohérence totale entre l'action de l'enseignant et la restitution côté étudiant.**
- [ ] **Recette déclarée CONFORME pour le profil Enseignant.**
