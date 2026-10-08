# 🎓 Cahier de Recette E2E — Espace Étudiant & Auditeur (EduPresence)

Ce document fournit le protocole officiel de test de bout en bout (**End-to-End**) pour valider l'ensemble du parcours **Étudiant / Auditeur** sur l'application **EduPresence**.

---

## 🎯 Objectif du Test
Valider que tout étudiant ou auditeur peut consulter en toute autonomie et de manière sécurisée son dossier académique en direct :
1. Accès direct en un clic depuis la page d'accueil via son numéro de matricule (sans mot de passe).
2. Contrôle de la gestion des erreurs (matricule inconnu, saisie invalide, espaces).
3. Exactitude des indicateurs de synthèse (moyenne générale pondérée, taux d'assiduité, ventilation des heures).
4. Respect strict de la confidentialité et du RGPD (masquage des coordonnées personnelles et anonymisation des tiers).
5. Détail des notes, coefficients, commentaires de l'enseignant et comparaison avec la moyenne de la classe.
6. Traçabilité détaillée séance par séance avec statuts d'émargement et motifs.
7. Cohérence des calculs sur les matières sans heure dispensée (absence de faux 100%).

---

## ⚙️ Prérequis & Données de Test

| Paramètre | Valeur / Instruction |
| :--- | :--- |
| **URL Locale** | [http://localhost:3600](http://localhost:3600) *(Port 3600 obligatoire)* |
| **Matricule Principal de Test** | **`33021`** &bull; *AGBATO Karl Vianney Emmanuel* (Classe `LPRIGL-A`) |
| **Matricules Secondaires de Contrôle** | **`32260`** (*AKA Naomi*), **`33055`** (*BAKARE Mariam*) |
| **Matricule Inexistant (Test Erreur)** | **`99999`** |
| **Navigateurs recommandés** | Google Chrome, Mozilla Firefox, Microsoft Edge, Safari |

---

## 📊 Matrice Récapitulative des Cas de Test (TC-ETU-01 à 08)

| Réf. | Module / Étape | Action Clé | Résultat Attendu | Statut |
| :---: | :--- | :--- | :--- | :---: |
| **TC-ETU-01** | Accès par Matricule | Saisie `33021` sur la page d'accueil | Redirection sur `/etudiant/33021` et ouverture du dossier | 🔲 À tester |
| **TC-ETU-02** | Gestion des Erreurs | Saisie `99999` ou matricule vide | Message d'erreur explicite sans blocage applicatif | 🔲 À tester |
| **TC-ETU-03** | Synthèse & KPI | Lecture des 4 cartes d'en-tête | Moyenne pondérée, taux d'assiduité et heures réconciliées | 🔲 À tester |
| **TC-ETU-04** | Protection des Données | Vérification des coordonnées | Téléphone et email masqués (`07****01`, `em***@gmail.com`) | 🔲 À tester |
| **TC-ETU-05** | Notes & Évaluations | Consultation de l'onglet Notes | Devoirs visibles avec notes, coefficients et commentaires | 🔲 À tester |
| **TC-ETU-06** | Assiduité & Séances | Consultation de l'historique | Séances détaillées avec statuts Présent/Absent et motifs | 🔲 À tester |
| **TC-ETU-07** | Vue de Classe & RGPD | Onglet Vue d'ensemble de la classe | Badge "Moi" sur sa ligne et anonymisation des camarades | 🔲 À tester |
| **TC-ETU-08** | Matières à 0 Heure | Vérification des cours sans séance | Affichage "0h dispensée" au lieu d'un faux 100% | 🔲 À tester |

---

## 📝 Déroulement Détaillé Pas-à-Pas

### Étape 1 : Accès Direct par Matricule (TC-ETU-01)
1. Ouvrez votre navigateur et accédez à **`http://localhost:3600`**.
2. Dans la colonne de gauche (**Espace Étudiant & Auditeur**) :
   - Champ **Numéro de matricule :** saisissez `33021`.
3. Cliquez sur le bouton bleu **"Consulter mes présences & notes"**.
4. **Validation attendue :**
   - Redirection immédiate vers l'URL `/etudiant/33021`.
   - L'en-tête affiche l'identité complète : **AGBATO Karl Vianney Emmanuel**.
   - La classe d'appartenance est indiquée : **Licence Pro RGL - Groupe A (LPRIGL-A)**.

---

### Étape 2 : Contrôle des Erreurs & Robustesse (TC-ETU-02)
1. Retournez sur la page d'accueil **`http://localhost:3600`**.
2. **Test matricule vide :** Cliquez sur "Consulter" sans rien saisir.
   - [ ] Message d'alerte : *Veuillez saisir votre numéro de matricule*.
3. **Test matricule inconnu :** Saisissez `99999` et validez.
   - [ ] Message d'erreur retourné : *Aucun étudiant trouvé avec le matricule "99999"*.
4. **Test tolérance aux espaces :** Saisissez `  33021  ` avec des espaces avant et après.
   - [ ] Le matricule est automatiquement nettoyé et la fiche de l'étudiant s'ouvre correctement.

---

### Étape 3 : Cartes de Synthèse & Réconciliation des Heures (TC-ETU-03)
1. Sur la fiche de l'étudiant `33021`, observez les 4 cartes KPI supérieures :
   - **Moyenne Générale :** affichée sur 20 avec la mention *Pondérée selon les coefficients*.
   - **Taux d'Assiduité :** pourcentage global (ex: `73%`) avec barre visuelle colorée (vert &ge; 80%, orange &ge; 60%, rouge < 60%).
   - **Heures de Présence :** total des heures suivies (ex: `38h / 52h dispensées`).
   - **Heures Manquées :** total des absences non justifiées (ex: `10h`).
   - **Réconciliation explicite :** présence du badge informatif *« 4h en attente de pointage »* permettant d'expliquer l'écart (38h + 10h + 4h = 52h).
2. **Validation attendue :** Tous les chiffres sont cohérents et mathématiquement vérifiables.

---

### Étape 4 : Confidentialité & Protection de la Vie Privée (TC-ETU-04)
1. Dans l'en-tête de la fiche de l'étudiant, examinez les lignes de contact :
   - Numéro de téléphone : `07****01` (caractères centraux masqués).
   - Adresse email : `em***@gmail.com` (identifiant masqué).
2. Ouvrez l'inspecteur réseau du navigateur (Touche F12 &rarr; onglet Réseau) et rechargez `/api/etudiants/33021`.
3. Vérifiez la charge utile JSON reçue.
4. **Validation attendue :** Les coordonnées privées sont masquées côté serveur avant même transmission au navigateur (aucun numéro complet exposé en clair dans le JSON public).

---

### Étape 5 : Consultation des Notes & Évaluations (TC-ETU-05)
1. Cliquez sur le premier onglet **"Mes Matières & Notes"**.
2. Examinez la grille des évaluations passées :
   - Titre du contrôle : *Contrôle Continu 1 - Conception & Patterns*.
   - Date de passage de l'épreuve.
   - Coefficient appliqué (ex: `2.0`).
   - Note obtenue : **`16.5 / 20`**.
   - Commentaire pédagogique personnalisé : *« Très bon travail »*.
   - Moyenne générale de la classe pour ce devoir (permettant à l'étudiant de se situer par rapport au groupe).
3. **Validation attendue :** La note est conforme à ce que l'enseignant a saisi et le coefficient pondérateur est visible.

---

### Étape 6 : Historique Détaillé des Séances d'Émargement (TC-ETU-06)
1. Cliquez sur le deuxième onglet **"Mon Assiduité & Séances"**.
2. Observez le tableau chronologique de toutes les séances dispensées :
   - Date de la séance et créneau horaire (ex: `08:00 - 10:00`).
   - Matière concernée et durée (ex: `2h`).
   - Statut de l'étudiant pour chaque cours :
     - Pastille verte avec icône coche : **Présent**.
     - Pastille rouge : **Absent**.
     - Pastille jaune : **Retard** avec précision du retard.
     - Pastille bleue : **Justifié**.
   - Colonne *Remarque / Justification* affichant les motifs saisis lors de l'appel.
3. **Validation attendue :** L'historique fournit une transparence complète sur l'assiduité séance par séance.

---

### Étape 7 : Vue d'Ensemble de la Classe & Anonymisation RGPD (TC-ETU-07)
1. Cliquez sur le troisième onglet **"Vue d'ensemble de la Classe"**.
2. Observez la liste des auditeurs de la promotion `LPRIGL-A` :
   - Repérez la ligne correspondant à l'étudiant connecté (`33021`) : elle est mise en surbrillance avec le badge bleu **"Moi"** et affiche son nom complet.
   - Observez toutes les autres lignes : les noms et matricules des camarades sont anonymisés (*Auditeur #2*, *AUD-002*, *Auditeur #3*...).
   - Le taux d'assiduité de chaque camarade reste visible pour permettre la comparaison de cohorte sans divulgation nominative.
3. **Validation attendue :** La cohésion de promotion est préservée tout en respectant l'interdiction de divulgation des données nominatives à des tiers.

---

### Étape 8 : Vérification des Matières à 0 Heure (TC-ETU-08)
1. Retournez sur l'onglet **"Mes Matières & Notes"**.
2. Dans la section *Assiduité par matière*, examinez les cartes des cours non encore démarrés (ex: *Bases de Données Avancées* ou *Architecture Réseaux* où 0h a été dispensée).
3. **Validation attendue :**
   - La pastille affiche la mention neutre **« 0h dispensée »** (ou « Non dispensé »).
   - L'application n'affiche **JAMAIS** un taux artificiel de 100% pour un cours qui n'a pas encore eu de séance.

---

## ✅ Critères de Succès de la Recette
- [ ] Les 8 cas de test (TC-ETU-01 à TC-ETU-08) sont validés avec succès.
- [ ] L'accès public par matricule est rapide, intuitif et sans friction.
- [ ] La confidentialité des données sensibles (PII) et des camarades de promotion est garantie.
- [ ] **Recette déclarée CONFORME pour l'Espace Étudiant.**
