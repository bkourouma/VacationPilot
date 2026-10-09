# 🧭 Guide de test — VacationPro

Parcours complet, étape par étape. Chaque étape indique **qui se connecte, quel menu ouvrir, quoi faire et quelles données saisir**.

- Application : <http://localhost:3600>
- Date de référence : **J = jeudi 8 octobre 2026** (si vous testez un autre jour, gardez les mêmes écarts de dates, surtout pour la séance du 10 septembre qui doit rester à plus de 14 jours de J).
- Suivez les étapes **dans l'ordre** : chaque étape utilise les données de la précédente, et les chiffres attendus n'ont de sens que dans cet ordre.

---

## Avant de commencer

### 1. Préparer la base

> ⚠️ Efface toutes les données. Sauvegardez `prisma/dev.db` si besoin.

```bash
cp prisma/dev.db prisma/dev.db.sauvegarde
```

```bash
npx prisma db push --force-reset
```

```bash
node prisma/seed.mjs
```

Créer les deux comptes enseignants et les fichiers de test :

```bash
node scripts/create-test-teachers.mjs
```

```bash
node scripts/generate-fixtures-test.mjs
```

Démarrer l'application :

```bash
npm run dev
```

### 2. Deux fenêtres de navigateur

| Fenêtre | Usage |
| :--- | :--- |
| **A** — normale | Toujours connectée en **admin** |
| **B** — navigation privée | Tous les autres comptes (on change de compte avec « Déconnexion » en bas à gauche) |

### 3. Comptes

| Rôle | Identifiant | Mot de passe | Nom affiché |
| :--- | :--- | :--- | :--- |
| Direction | `admin` | `admin123` | Direction Pédagogique |
| Enseignant 1 | `ibrahimkoneprof` | `Kone@2026` | Dr. Ibrahim KONÉ |
| Enseignant 2 | `awacoulibalyprof` | `Coulibaly@2026` | Mme Awa COULIBALY |
| Chef de classe | `chef-l3infob` | `Chef@2026` | Kouamé Emmanuel *(créé à l'étape 6)* |
| Étudiant | aucun compte : un **matricule** suffit | | |

Connexion : page d'accueil `/` → carte « Espace Pédagogique & Direction » → champs **Identifiant ou Email** et **Mot de passe** → « Se connecter par mot de passe ».

### 4. Fichiers fournis (`docs/jeux-de-donnees/`)

| Fichier | Utilisé à l'étape |
| :--- | :--- |
| `etudiants_L3-INFO-B_avec_entetes.xlsx` | 5 |
| `etudiants_M1-GL_liste_brute.xlsx` | 9 |
| `plan_de_cours_DEVWEB.docx` | 10 |

---

## Phase 1 — La Direction construit la structure

### Étape 1 — Connexion de la Direction
👤 **admin** · fenêtre **A**

1. Ouvrir `http://localhost:3600`, se connecter avec `admin` / `admin123`.

✅ Vous arrivez sur « Console de Supervision Administrative » : **Classes 1 · Étudiants 0 · Volume 0h / 110h · Retards 0**.

☐ OK ☐ KO

---

### Étape 2 — Créer les matières
👤 **admin** · fenêtre **A** · 📂 Menu **Catalogue Matières**

Attendu au départ : Total Matières 4, Avec Enseignant 4, Non assignées 0.

Cliquer **« Nouvelle Matière »**, saisir, puis **« Créer la matière »** (deux fois) :

| | Matière 1 | Matière 2 |
| :--- | :--- | :--- |
| Code | `devweb` *(passe en majuscules)* | `UML` |
| Intitulé | `Développement Web & Applications Cloud` | `Modélisation Orientée Objet avec UML` |
| Enseignant Responsable | `Dr. Ibrahim KONÉ (ibrahimkoneprof) - …` | `-- Aucun enseignant (Non assigné) --` |
| Description | `Front-end moderne, API REST, bases de données et déploiement cloud` | `Cas d'utilisation, diagrammes de classes et de séquence` |

✅ Bandeau vert « Matière créée et enregistrée dans le catalogue ! » · Total **6** · Non assignées **1** (UML porte le badge « Non affecté »).

⚠️ *Test d'erreur* : recréer le code `DEVWEB` → message « Une matière avec le code "DEVWEB" existe déjà… ».

☐ OK ☐ KO

---

### Étape 3 — Créer la classe L3-INFO-B
👤 **admin** · fenêtre **A** · 📂 Menu **Classes & Cours**

1. Cliquer **« Nouvelle Classe »**.
2. Saisir :

| Champ | Valeur |
| :--- | :--- |
| Code de la classe | `l3-info-b` |
| Nom complet / Filière | `Licence 3 Informatique - Groupe B` |
| Année Académique | `2026-2027` *(remplacer la valeur proposée)* |

3. Cliquer **« Créer la classe »**.

✅ Bandeau « Classe "L3-INFO-B" créée avec succès ! » · code en majuscules · la fenêtre « Inscrire des auditeurs » s'ouvre : **la fermer** (croix), on y revient à l'étape 5.

⚠️ *Test d'erreur* : créer une classe `LPRIGL-A` → « Une classe avec ce code existe déjà. »

☐ OK ☐ KO

---

### Étape 4 — Programmer le cours DEVWEB dans la classe
👤 **admin** · fenêtre **A** · 📂 **Classes & Cours** → onglet `L3-INFO-B`

1. Cliquer **« + Programmer un cours »**.
2. Saisir :

| Champ | Valeur |
| :--- | :--- |
| 1. Classe cible | `L3-INFO-B - Licence 3 Informatique - Groupe B …` |
| 2. Matière (onglet « Catalogue ») | `[DEVWEB] Développement Web & Applications Cloud` |
| Enseignant en charge | `Dr. Ibrahim KONÉ (ibrahimkoneprof)` *(présélectionné)* |
| Volume Horaire prévu | `30` (bouton « 30h ») |

3. Cliquer **« Programmer ce cours »**.

✅ « Cours programmé avec succès dans la classe ! » · « Matières enseignées (1) » : `DEVWEB — 30h prévues — Enseignant : Dr. Ibrahim KONÉ`.

⚠️ *Test d'erreur* : reprogrammer DEVWEB dans la même classe → « Cette matière est déjà programmée dans cette classe. »

☐ OK ☐ KO

---

### Étape 5 — Inscrire les 10 étudiants (3 méthodes)
👤 **admin** · fenêtre **A** · 📂 **Classes & Cours** → onglet `L3-INFO-B` → bouton **« Inscrire des auditeurs »**

> ⚠️ **Avant chaque inscription, vérifiez la ligne « Classe de destination » en haut de la fenêtre : elle doit afficher `L3-INFO-B – Licence 3 Informatique - Groupe B`.** Si elle affiche `LPRIGL-A`, changez-la dans la liste déroulante, sinon les étudiants vont dans la mauvaise classe.

**5a. Onglet « Saisie Rapide (1 par 1) »**

| Champ | Étudiant 1 | Étudiant 2 |
| :--- | :--- | :--- |
| Nom de famille | `Kouadio` | `TRAORE` |
| Prénom(s) | `Marie-Laure` | `Seydou` |
| Matricule | `35001` | `35002` |
| Contact | `07 08 15 22 31` | `05 44 12 98 76` |
| Email | `marie.kouadio@gmail.com` | `seydou.traore@gmail.com` |
| Bouton | « Enregistrer et Suivant » | « Enregistrer et Fermer » |

✅ Après le 1ᵉʳ : « ✓ KOUADIO Marie-Laure enregistré(e) avec succès (Matricule : 35001) ! », le nom passe en majuscules et le champ Matricule se pré-remplit avec `35002`. Après le 2ᵉ : la fenêtre se ferme, `L3-INFO-B (2 auditeurs)`.

⚠️ *Test d'erreur* : saisir un nom et le matricule `35001` → « Un étudiant avec le matricule 35001 existe déjà (KOUADIO Marie-Laure). »

**5b. Onglet « Coller une liste (en masse) »** — coller exactement :

```
35003 YAO Kouassi Franck 0103774510
35004 DIALLO Fatoumata fatou.diallo@yahoo.fr
35005;KONAN;Akissi Estelle;0585316602;estelle.konan@gmail.com
```

✅ Aperçu « 3 auditeur(s) détecté(s) » (nom, prénoms, contact et email bien répartis) → cliquer **« Valider et inscrire ces 3 auditeurs »** → « 3 auditeur(s) inscrit(s) avec succès. » · `L3-INFO-B (5 auditeurs)`.

**5c. Onglet « Fichier Excel (.xlsx) »** — choisir `etudiants_L3-INFO-B_avec_entetes.xlsx` → **« Lancer l'importation vers cette classe »**.

✅ « Importation réussie : 5 nouvel(s) auditeur(s) inscrit(s), 0 mis à jour dans la classe L3-INFO-B. » · `L3-INFO-B (10 auditeurs)` (SANGARE, BAMBA, N'DRI, OUATTARA, GOHI = 35006 à 35010). La ligne « TOTAL » du fichier est ignorée.

*Facultatif* : réimporter le même fichier → « 0 nouvel(s) … 5 mis à jour » (pas de doublon).

☐ OK ☐ KO

---

### Étape 6 — Créer le compte du chef de classe
👤 **admin** · fenêtre **A** · 📂 Menu **Gestion des Accès**

Remplir « Créer un compte Chef de classe » :

| Champ | Valeur |
| :--- | :--- |
| Classe rattachée | `L3-INFO-B - Licence 3 Informatique - Groupe B` |
| Nom complet | `Kouamé Emmanuel` |
| Identifiant de connexion | `chef-l3infob` |
| Mot de passe | `Chef@2026` |

Cliquer **« Créer le compte Chef de classe »**.

✅ « Compte chef de classe "Kouamé Emmanuel" créé avec succès ! » · « Comptes Chefs de classe actifs (2) » (avec le chef `chef` de démonstration).

⚠️ *Test d'erreur* : même identifiant → « Cet identifiant est déjà utilisé. »

☐ OK ☐ KO

---

## Phase 2 — Dr. KONÉ prépare son cours

### Étape 7 — Connexion de Dr. KONÉ
👤 **ibrahimkoneprof** · fenêtre **B** (privée)

1. Ouvrir `http://localhost:3600`, se connecter avec `ibrahimkoneprof` / `Kone@2026`.

✅ « Bienvenue, Dr. Ibrahim KONÉ » · badge « Enseignant » · « Vos Classes & Matières » : `L3-INFO-B`, 10 étudiants inscrits. Le menu contient « Saisie des Notes » et « Chefs de classe ».

☐ OK ☐ KO

---

### Étape 8 — Créer la classe M1-GL et y programmer UML
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Classes & Cours**

> ⚠️ `M1-GL` est une **classe**, pas une matière. On la crée dans la **liste déroulante « 1. Sélectionner la classe cible »** (option « + Créer une nouvelle classe... »). Ne touchez pas à l'onglet « + Créer nouvelle » de la matière : la matière à utiliser est `UML`, **dans l'onglet « Catalogue »**.

1. Cliquer **« Programmer un cours »** (en haut) et saisir :

| Champ | Valeur |
| :--- | :--- |
| 1. Classe cible | `+ Créer une nouvelle classe...` |
| Code de la classe | `m1-gl` |
| Nom complet / Filière | `Master 1 Génie Logiciel` |
| Année Académique | `2026-2027` |
| 2. Matière (onglet « Catalogue ») | `[UML] Modélisation Orientée Objet avec UML` |
| Enseignant | « Vous-même » *(automatique)* |
| Volume Horaire prévu | `20` (bouton « 20h ») |

2. Cliquer **« Programmer ce cours »**.

✅ « Cours programmé avec succès dans la classe ! » · nouvel onglet `M1-GL (0 auditeurs)` · `UML — 20h prévues`.

3. Dans l'onglet `M1-GL`, bloc « Importer une liste d'étudiants via Excel », choisir `etudiants_M1-GL_liste_brute.xlsx` → **« Lancer l'importation vers cette classe »**.

✅ « 3 nouvel(s) auditeur(s) inscrit(s) … dans la classe M1-GL » · matricules automatiques **35011 SORO, 35012 ADJOUA, 35013 KEITA**.

☐ OK ☐ KO

---

### Étape 9 — Modifier et supprimer un étudiant
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Classes & Cours** → onglet `M1-GL`

1. Crayon sur `ADJOUA Prisca Sandrine` et saisir :

| Champ | Valeur |
| :--- | :--- |
| Contact téléphonique | `07 22 33 44 55` |
| Adresse Email | `prisca.adjoua@gmail.com` |

   Enregistrer → ✅ « Auditeur mis à jour avec succès ! ».

2. ⚠️ Crayon sur `SORO` → matricule `35001` → enregistrer → « Le matricule "35001" est déjà attribué à un autre étudiant. » (annuler).

3. **Étudiant jetable** : « Inscrire des auditeurs » → Saisie rapide → Nom `AUTO`, Prénom `Matricule`, **matricule vide** → « Enregistrer et Fermer ».
   ✅ Il reçoit le matricule **35014**. Cliquer sa corbeille, confirmer → « Auditeur supprimé avec succès. » · `M1-GL (3 auditeurs)`.

☐ OK ☐ KO

---

### Étape 10 — Définir le programme de DEVWEB
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Progression des Cours**

1. Choisir « 1. Classe ciblée » = `L3-INFO-B`, « 2. Cours / Matière » = `[DEVWEB]`.
2. Attendu : « Aucun chapitre défini », Avancement Pédagogique 0 %, 0h / 30h. Cliquer **« Ajouter le programme maintenant »**.
3. Onglet **« 2. Importer Document Word (.docx) avec IA »** → choisir `plan_de_cours_DEVWEB.docx` → **« Analyser le document et extraire les chapitres »**.
4. **Vérifier la liste avant d'enregistrer** : elle doit correspondre exactement à ce tableau (**5 chapitres, 13 sous-chapitres**). L'import ajoute souvent des chapitres parasites (« Présentation et objectifs », « Découpage du cours », « Modalités d'évaluation », « Bibliographie ») : **supprimez-les avec leur corbeille**. Il ne doit rester que 5 chapitres.

| N° | Chapitre | Sous-chapitres |
| :-: | :--- | :--- |
| 1 | Fondamentaux du Web : HTML5 et CSS3 | 1.1 Structure d'une page HTML5 sémantique · 1.2 Mise en forme CSS3 et Flexbox · 1.3 Design responsive (media queries) |
| 2 | JavaScript moderne (ES6+) | 2.1 Variables, fonctions fléchées et modules · 2.2 Manipulation du DOM · 2.3 Appels asynchrones (fetch, async/await) |
| 3 | Développement d'APIs REST avec Node.js | 3.1 Routes et contrôleurs · 3.2 Validation des données entrantes · 3.3 Authentification par jeton JWT |
| 4 | Bases de données et persistance | 4.1 Modélisation relationnelle · 4.2 Utilisation d'un ORM (Prisma) |
| 5 | Déploiement cloud et DevOps | 5.1 Conteneurisation avec Docker · 5.2 Intégration et déploiement continus (CI/CD) |

5. Cliquer **« Valider et enregistrer le programme »**.

✅ « Programme et sous-chapitres enregistrés avec succès pour cette matière ! » · « Programme des Chapitres (5) » · Avancement 0 %.

> Sans clé OpenRouter, l'application utilise un analyseur local : la qualité d'extraction peut être moindre, d'où l'étape 4. Si l'import échoue, saisissez le tableau à la main dans l'onglet « 1. Saisie manuelle » (bouton « Ajouter un chapitre » / « Ajouter un sous-chapitre »).

☐ OK ☐ KO

---

## Phase 3 — Les appels (émargement)

### Étape 11 — Séance S1 (appel standard)
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Émargement & Présences**

Sélecteurs : Classe `L3-INFO-B`, Matière `DEVWEB`. Onglet « Nouvelle Séance » :

| Champ | Valeur |
| :--- | :--- |
| Date de la séance | `2026-10-05` |
| Horaires | début `08:00` (fin `10:00` automatique) |
| Nombre d'heures | `2 heures (standard)` |
| Intitulé / Thème | `Introduction au développement web — HTML5/CSS3` |
| Chapitres | cocher les sous-chapitres **1.1** et **1.2** du chapitre 1 |

Statuts à modifier (les 7 autres restent « Présent ») :

| Étudiant | Statut | Remarque |
| :--- | :--- | :--- |
| 35003 YAO Kouassi Franck | **Absent** | `Absent sans motif` |
| 35006 SANGARE Mamadou | **Retard** | `Arrivé à 08:20` |
| 35009 OUATTARA Salimata | **Justifié** | `Certificat médical` |

✅ Avant validation : **7 Présents · 1 Retard · 1 Absent · 1 Justifié · 90 %**. Cliquer **« Valider l'émargement »** → « Feuille de présence enregistrée avec succès ! » · onglet « Historique (1) ».

Dans « Historique » : carte « lundi 5 octobre 2026 · 2h · 90 % présence », « Émargé par : Dr. Ibrahim KONÉ (Enseignant) ».

☐ OK ☐ KO

---

### Étape 12 — Séance S2 (appel heure par heure)
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Émargement & Présences**

1. **Rafraîchir la page (F5)** pour repartir d'une feuille vierge.
2. Activer l'interrupteur **« Émargement heure par heure »**.
3. Saisir :

| Champ | Valeur |
| :--- | :--- |
| Date | `2026-10-06` |
| Début | `14:00` |
| Nombre d'heures | `3 heures` |
| Intitulé | `TP Git et GitHub` |
| Chapitres | sous-chapitre **1.3** |

4. Dans le tableau (colonnes « Heure 1 », « Heure 2 », « Heure 3 ») :
   - **Heure 2** : bouton **A** sur la ligne `35002 TRAORE Seydou`.
   - **Heure 3** : bouton **« = H2 »** dans l'en-tête de la colonne (copie H2 → H3), puis bouton **R** sur la ligne `35007 BAMBA Aïcha`.
5. Cliquer **« Valider les 3 heures d'appel »**.

✅ Compteurs avant validation : H1 10P/0A · H2 9P/1A · H3 8P/1A · **93 % assiduité globale**. Message « 3 feuilles d'appel horaires enregistrées avec succès ! » · « Historique (4) » avec « TP Git et GitHub (H1) », « (H2) », « (H3) » de 1 h chacune.

☐ OK ☐ KO

---

### Étape 13 — Séance S3 (appel standard)
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Émargement & Présences**

1. **F5** pour une feuille vierge, puis onglet « Nouvelle Séance » :

| Champ | Valeur |
| :--- | :--- |
| Date | `2026-10-08` |
| Début / durée | `14:00` / `2 heures` |
| Intitulé | `Révision API REST` |
| Chapitres | sous-chapitre **2.1** uniquement |
| 35002 TRAORE Seydou | **Absent** — `Pas de nouvelles` |
| 35004 DIALLO Fatoumata | **Absent** — `Malade, justificatif attendu` |

✅ **8 Présents · 2 Absents · 80 %** → « Feuille de présence enregistrée avec succès ! » · « Historique (5) ».

☐ OK ☐ KO

---

### Étape 14 — Corriger la séance S1
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Émargement & Présences** → onglet **Historique**

1. Crayon sur la séance du **5 octobre** → bandeau « Mode Modification : Feuille d'appel du lundi 5 octobre 2026 (08:00 - 10:00) », données préchargées.
2. Changer :

| Étudiant | Nouveau statut | Remarque |
| :--- | :--- | :--- |
| 35003 YAO Kouassi Franck | **Justifié** | `Convocation administrative (justificatif reçu le 07/10)` |

3. Cliquer **« Mettre à jour la feuille »**.

✅ « Feuille de présence modifiée avec succès ! » · S1 passe à **100 % présence** (7 Présent, 1 Retard, 2 Justifié, 0 Absent).

*Facultatif* : « Exporter feuille Excel (.xlsx) » → fichier `Presences_L3-INFO-B.xlsx` (5 colonnes de séances, codes P/A/R/J).

☐ OK ☐ KO

---

### Étape 15 — Vérifier la progression du cours
👤 **ibrahimkoneprof** · fenêtre **B** · 📂 **Progression des Cours** → `L3-INFO-B` / `[DEVWEB]`

✅ **Valeurs attendues**

| Élément | Valeur |
| :--- | :--- |
| Avancement Pédagogique | **27 %** |
| Volume Horaire Effectué | **23 %** (7h / 30h) |
| Séances Réalisées | **5** · « 23h restantes » |
| Synchronisation | « Rythme équilibré » |
| Chapitre 1 | « Traité (100%) » (ses 3 sous-chapitres validés) |
| Chapitre 2 | « En cours (1/3 sous-chapitres — 33%) » |
| Chapitres 3 à 5 | « À aborder » |

Essais (puis annuler pour revenir à 27 %) :
- Cocher le sous-chapitre **2.2** → « Sous-chapitre validé ! » → 33 %. Le décocher → « marqué comme non traité » → 27 %.
- Cocher le **chapitre 3** → « Chapitre validé… » (ses 3 sous-chapitres se cochent) → 47 %. Le décocher → 27 %.

☐ OK ☐ KO

---

## Phase 4 — Mme COULIBALY et le cours d'anglais

### Étape 16 — Connexion et création de son cours ANG
👤 **awacoulibalyprof** · fenêtre **B** *(« Déconnexion » de Dr. KONÉ, puis connexion)*

1. Se connecter avec `awacoulibalyprof` / `Coulibaly@2026`.
   ✅ « Aucune classe ou matière assignée » (carte « Bienvenue ! Vous n'avez pas encore de classe ou de matière »).
2. 📂 **Émargement & Présences** : aucune classe proposée. Cliquer « Valider l'émargement » → ⚠️ « Veuillez sélectionner une matière. »
3. 📂 **Classes & Cours** → bouton **« Choisir une classe & ajouter ma matière »** :

| Champ | Valeur |
| :--- | :--- |
| 1. Classe cible | `L3-INFO-B - Licence 3 Informatique - Groupe B …` |
| 2. Matière | onglet **« + Créer nouvelle »** |
| Code Matière | `ang` |
| Intitulé complet | `Anglais Technique` |
| Enseignant | « Vous-même » *(automatique)* |
| Volume Horaire prévu | `20` |

4. Cliquer **« Programmer ce cours »**.

✅ « Cours programmé avec succès dans la classe ! » · `ANG — 20h prévues — Enseignant : Mme Awa COULIBALY`.

⚠️ *Test de droits* : dans l'onglet `L3-INFO-B`, crayon sur le cours **DEVWEB** (celui de Dr. KONÉ) → enregistrer → « Vous n'avez pas l'autorisation de modifier ce cours. »

☐ OK ☐ KO

---

### Étape 17 — Séance A1 du cours d'anglais
👤 **awacoulibalyprof** · fenêtre **B** · 📂 **Émargement & Présences**

Sélecteurs : Classe `L3-INFO-B`, Matière `ANG`. Onglet « Nouvelle Séance » :

| Champ | Valeur |
| :--- | :--- |
| Date | `2026-09-10` *(plus de 14 jours avant J)* |
| Début / durée | `18:00` / `2 heures` |
| Intitulé | `Introduction — vocabulaire technique` |
| 35005 KONAN Akissi Estelle | **Absent** |

✅ **9 Présents · 1 Absent · 90 %** → « Feuille de présence enregistrée avec succès ! » · le bloc de progression indique qu'aucun programme n'est défini pour ce cours. Mme COULIBALY ne voit pas les séances de DEVWEB.

☐ OK ☐ KO

---

## Phase 5 — Contrôle de la Direction

### Étape 18 — Alertes de retard
👤 **admin** · fenêtre **A** · 📂 **Suivi Global & Retards** (cliquer « Actualiser les données »)

✅ **Valeurs attendues à ce stade**

| Élément | Valeur |
| :--- | :--- |
| Volume Horaire Total | **9h / 180h** (5 %) |
| Matières en Retard | **1** sur 7 matières |
| Assiduité des Étudiants | **88 %** · « 2 retards étudiants signalés » |
| Corps Enseignant | **3** · « 3 classes (13 auditeurs) » |
| Alertes (6) | 1 × **URGENT** ANG : « Retard : Inactif depuis 28 jours (2h/20h faites). » + 5 × **INFO** « Le cours n'a pas encore démarré » (GL, RESEAUX, BDD, WEB, UML) |

Filtres à essayer : Classe `L3-INFO-B` (2 lignes) · Enseignant `Dr. Ibrahim KONÉ` (DEVWEB et UML) · statut « En retard » (ANG) · « En cours » (DEVWEB, ANG) · recherche `angl`.

**Alerte de retard d'évaluation (essai)** :
1. 📂 **Classes & Cours** → onglet `L3-INFO-B` → crayon sur `DEVWEB` → volume **10h** → enregistrer.
2. Revenir sur **Suivi Global & Retards** → DEVWEB passe à **70 %**, une alerte **ATTENTION** apparaît : « Retard évaluation : Déjà 50% du cours effectué sans aucun devoir ou note. » (7 alertes) et **Matières en Retard passe à 2** (ANG + DEVWEB).
3. **Remettre le volume à 30h** → l'alerte disparaît.

☐ OK ☐ KO

---

## Phase 6 — Le chef de classe

### Étape 19 — Appel par le chef de classe
👤 **chef-l3infob** · fenêtre **B** *(« Déconnexion » de Mme COULIBALY, puis connexion avec `chef-l3infob` / `Chef@2026`)* · 📂 **Émargement & Présences**

✅ À la connexion : bannière « Session Chef de classe », badge « Chef de classe », « Classe : L3-INFO-B », **menu réduit** : Tableau de bord · Classes & Cours · Étudiants · Émargement & Présences · Exports & Rapports.

Sélecteurs : Classe `L3-INFO-B`, Matière `ANG`. Nouvelle séance :

| Champ | Valeur |
| :--- | :--- |
| Date | `2026-10-07` |
| Début / durée | `18:00` / `2 heures` |
| Intitulé | `Révision du vocabulaire technique` |
| 35008 N'DRI Jean-Baptiste | **Absent** — `Absent sans prévenir` |
| 35010 GOHI Ange Raphaël | **Retard** — `Bus bloqué dans les embouteillages` |

✅ **8 Présents · 1 Retard · 1 Absent · 90 %** → « Feuille de présence enregistrée avec succès ! ». Dans l'historique : « Émargé par : Kouamé Emmanuel (Chef de classe) » ; le chef voit le crayon mais **pas la corbeille**.

**Accès interdits au chef** (taper l'adresse) :
- `/dashboard/notes` → « Espace Notes Restreint ».
- `/dashboard/chefs` → « Accès Restreint ».
- 📂 **Classes & Cours** → « Programmer un cours » ou « Inscrire des auditeurs » → valider → « Action réservée aux enseignants ou à l'administration. »

☐ OK ☐ KO

---

## Phase 7 — Les notes

### Étape 20 — Saisir les deux évaluations
👤 **ibrahimkoneprof** · fenêtre **B** *(« Déconnexion » du chef, puis connexion)* · 📂 **Saisie des Notes** → Classe `L3-INFO-B`, Matière `DEVWEB (Coef 1)`

**Évaluation 1** — onglet « Nouvelle Évaluation » :

| Champ | Valeur |
| :--- | :--- |
| Titre | `Devoir sur table 1` |
| Date | `2026-10-07` |
| Coefficient / Barème | `1` / `20` |

**Évaluation 2** :

| Champ | Valeur |
| :--- | :--- |
| Titre | `Projet de fin de module` |
| Date | `2026-10-08` |
| Coefficient / Barème | `2` / `40` |

Notes à saisir (**35008 laissé vide** au devoir 1) :

| Matricule | Devoir 1 (/20) | Appréciation | Projet (/40) |
| :--- | :-: | :--- | :-: |
| 35001 | 14.5 | `Très bon travail` | 30 |
| 35002 | 9.75 | `Revoir les sélecteurs CSS` | 18 |
| 35003 | 12 | | 26 |
| 35004 | 16 | | 36 |
| 35005 | 7.5 | `Insuffisant — à revoir` | 15 |
| 35006 | 11 | | 22 |
| 35007 | 13.25 | | 28 |
| 35008 | *(vide)* | | 24 |
| 35009 | 18 | `Excellent` | 38 |
| 35010 | 10 | | 20 |

✅ Pendant la saisie : devoir 1 → « 9 notes saisies · **Moyenne 12.44 / 20** · Min 7.5 · Max 18 » ; projet → « 10 notes · **Moyenne 25.7 / 40** · Min 15 · Max 38 ». Cliquer **« Enregistrer l'évaluation »** → « Évaluation et notes enregistrées avec succès ! » (deux fois).

Onglet **« Récapitulatif & Évaluations (2) »** : Projet (Coef 2, sur 40, 10 copies, 25.7 / 40) et Devoir (Coef 1, sur 20, 9 copies, 12.44 / 20).

⚠️ *Contrôles de saisie* : une note de 25 sur 20, une note négative, une note de 9.8 (pas de 0,25) ou un titre vide sont bloqués par le navigateur.

*Facultatif* : crayon sur « Devoir sur table 1 » → changer l'appréciation de 35005 en `Insuffisant — rattrapage conseillé` → « Mettre à jour les notes » → moyenne toujours 12.44.

☐ OK ☐ KO

---

## Phase 8 — Les étudiants

### Étape 21 — Portail étudiant
👤 **Aucun compte** · fenêtre **B** *(« Déconnexion » de Dr. KONÉ)* · page d'accueil, carte « Espace Étudiant / Élève »

Saisir le matricule, cliquer **« Accéder à mon espace étudiant »**, comparer :

| Matricule | Moyenne DEVWEB · mention | Taux d'assiduité | À remarquer |
| :--- | :--- | :-: | :--- |
| `35001` | **14.83** · Bien | 100 % | Heures de Présence 11h / 11h · Heures Manquées 0h |
| `35002` | **9.25** · Ajourné | **64 %** | Manquées **4h** · DEVWEB 43 % |
| `35003` | **12.67** · Assez Bien | 100 % | « (+2h justifiées) » · statut « Justifié » le 05/10 |
| `35004` | **17.33** · Très Bien | 82 % | Manquées 2h |
| `35005` | **7.5** · Ajourné | 82 % | Absent au cours ANG du 10/09 |
| `35006` | **11.00** · Passable | 100 % | « Retard » le 05/10 |
| `35007` | **13.75** · Assez Bien | 100 % | |
| `35008` | **12.00** · Assez Bien | 82 % | Devoir 1 : « En attente » |
| `35009` | **18.67** · Très Bien | 100 % | « (+2h justifiées) » |
| `35010` | **10.00** · Passable | 100 % | « Retard » ANG le 07/10 |
| `35011` | — · « Non calculée » | « — » | Aucune heure dispensée |

Pour `35001` vérifier en plus :
- Téléphone et email **masqués** (`07****31`, `ma***@gmail.com`).
- Onglet « Mes Matières & Notes (2) » : devoir 14.5 / 20 (moyenne classe 12.44), projet 30 / 40.
- Onglet « Mon Assiduité & Séances (7) ».
- Onglet « Vue d'ensemble de la Classe (10) » : autres étudiants anonymisés (« Auditeur #… »), seule la ligne « Moi » est lisible.
- Bouton « Imprimer mon relevé ».

⚠️ *Cas d'erreur* : matricule vide → « Veuillez saisir votre numéro de matricule. » · `99999` → « Aucun étudiant trouvé avec le matricule "99999". »

☐ OK ☐ KO

---

## Phase 9 — Bilan et exports

### Étape 22 — Tableau de bord final de la Direction
👤 **admin** · fenêtre **A** · 📂 **Console Administration**, puis **Suivi Global & Retards**

✅ **Valeurs attendues**

| Élément | Valeur |
| :--- | :--- |
| Classes / Étudiants | **3** / **13** |
| Volume Réalisé | **11h / 180h — 6 %** |
| Retards Constatés | **0** *(l'alerte URGENT sur ANG a disparu)* |
| Assiduité des Étudiants (Suivi Global) | **89 %** · « 3 retards » |
| Alertes | **5**, toutes « INFO » (cours non démarrés) |
| Dernières Séances | « Révision API REST » (80 %), « Révision du vocabulaire technique » (90 %), puis les séances « TP Git et GitHub » |

📂 **Consultation des Notes** (`L3-INFO-B` / `DEVWEB`) : les 2 évaluations et leurs moyennes sont visibles.

☐ OK ☐ KO

---

### Étape 23 — Exports et impressions
👤 **admin** · fenêtre **A** · 📂 **Exports & Rapports** → Classe `L3-INFO-B`, Matière `DEVWEB`

| Bouton | Attendu |
| :--- | :--- |
| « Télécharger Excel Présences » | `Presences_L3-INFO-B.xlsx` (5 séances, totaux, taux) |
| « Télécharger Excel Notes » | `Notes_L3-INFO-B.xlsx` avec la colonne « Moyenne (/20) » : 35001 → **14.83**, 35009 → **18.67**, 35005 → **7.5** |
| « Émargement papier » | Aperçu d'impression « FEUILLE D'ÉMARGEMENT ET DE PRÉSENCE EN CLASSE », 10 lignes, zones de signature |
| « Relevé imprimable » | Aperçu « RELEVÉ OFFICIEL DES ÉVALUATIONS ET NOTES » (colonnes vides à remplir à la main) |

Aussi : 📂 **Étudiants** → « Exporter (.xlsx) » et recherche `sangare` (1 résultat).

☐ OK ☐ KO

---

### Étape 24 — Nettoyage (facultatif)
👤 **ibrahimkoneprof** (fenêtre **B**) puis **admin** (fenêtre **A**)

| Qui | Menu | Action | Attendu |
| :--- | :--- | :--- | :--- |
| Dr. KONÉ | Émargement & Présences → `M1-GL` / `UML` | Créer une séance `2026-10-01`, 1 heure, `Séance de test à supprimer`, tous présents → Historique → corbeille → confirmer | « Séance supprimée. » |
| Dr. KONÉ | Saisie des Notes | Supprimer l'évaluation « Devoir sur table 1 » | La moyenne de `35001` devient **15.00** |
| Dr. KONÉ | Classes & Cours → `M1-GL` | Bouton « **Supprimer** » (classe) | « Classe supprimée avec succès. » · étudiants 35011–35013 supprimés · Direction : 2 classes, 10 étudiants |
| admin | Gestion des Accès | Corbeille de `Kouamé Emmanuel` | « Compte chef de classe révoqué. » · connexion `chef-l3infob` → « Identifiants invalides. » |

Pour restaurer vos données d'origine :

```bash
cp prisma/dev.db.sauvegarde prisma/dev.db
```

☐ OK ☐ KO

---

## Points à surveiller

Corrigés après une première passe de test automatique (à reconfirmer au passage) :
- Les API `/api/seances` et `/api/classes` exigent maintenant une connexion ; un chef de classe ne voit que sa classe.
- Notes, volumes horaires, coefficients, années scolaires, longueurs de saisie et mots de passe de chef sont validés (erreur 400 explicite).
- Le portail affiche la moyenne de classe « / barème ».
- Réenregistrer un programme conserve la progression des chapitres dont le titre ne change pas.
- Supprimer une séance retire les validations de chapitres qu'elle avait apportées.
- Modifier une séance ne valide plus un chapitre dont tous les sous-chapitres ne sont pas cochés.
- Une séance identique (même cours, date et horaires) est refusée (« Une séance identique existe déjà… »).
- Le taux d'assiduité du Suivi Global compte les absences justifiées comme présences, comme le portail.
- « Matières en retard » compte aussi les retards d'évaluation ; le lien « Vérifier » ouvre la bonne classe ; un filtre « Non démarrés » existe.

Encore ouverts :
1. La Direction voit le crayon de modification d'un étudiant mais reçoit « Action réservée à l'enseignant ».
2. Après un enregistrement, la feuille d'émargement conserve statuts et remarques (penser à rafraîchir avant la séance suivante).

---

## Bilan

| Phase | Étapes | OK | KO |
| :--- | :-: | :-: | :-: |
| 1 — Structure (Direction) | 1 à 6 | | |
| 2 — Dr. KONÉ | 7 à 10 | | |
| 3 — Appels | 11 à 15 | | |
| 4 — Mme COULIBALY | 16 à 17 | | |
| 5 — Contrôle Direction | 18 | | |
| 6 — Chef de classe | 19 | | |
| 7 — Notes | 20 | | |
| 8 — Étudiants | 21 | | |
| 9 — Bilan et exports | 22 à 24 | | |

Anomalie constatée : indiquer l'étape, le compte, les données saisies, le message obtenu et une capture d'écran.
