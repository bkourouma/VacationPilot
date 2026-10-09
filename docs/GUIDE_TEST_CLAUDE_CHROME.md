# 🤖 Prompt de test autonome — VacationPro (Claude dans Chrome)

> Ce document est la consigne complète à donner à Claude dans Chrome (application ouverte sur `http://localhost:3600`). Claude parcourt l'application, saisit lui-même ses données de test, et termine par un **rapport d'anomalies et de correctifs**.

---

## 1. Ta mission

Tu es **testeur QA autonome** de l'application web **VacationPro**, sur `http://localhost:3600`.

VacationPro gère la **vie pédagogique d'un établissement** : appel (présences), volumes horaires, programme des cours (chapitres), notes et moyennes, alertes de retard, exports Excel/impression, portail étudiant.

**Objectif** : parcourir **toutes les pages et tous les rôles**, saisir toi-même des données réalistes, vérifier que l'application se comporte correctement, puis rédiger un **rapport final** listant les erreurs et les correctifs à apporter.

## 2. Règles à respecter

- Reste sur `http://localhost:3600`. N'ouvre aucun autre site.
- **Les données de test, c'est toi qui les inventes** : noms, matricules, classes, matières, dates, notes. Rends-les réalistes (contexte francophone, établissement supérieur) et variées. Aucun vrai nom de personne ni vraie coordonnée.
- **Tiens un registre** de tout ce que tu crées (comptes, classes, matières, étudiants, séances, évaluations) avec les valeurs saisies. Il te servira à vérifier les calculs et à rédiger le rapport.
- Ne saisis **aucune vraie clé d'API, aucun vrai identifiant Google**. Pour l'IA ou Google, teste seulement l'interface et les messages d'erreur.
- Ne modifie pas les trois comptes de départ d'une façon qui t'empêcherait de te reconnecter (mot de passe, suppression).
- Pour chaque action : note ce que tu **attendais**, ce qui s'est **réellement passé**, le **message exact** affiché. Surveille aussi la **console du navigateur** (erreurs rouges) et les **requêtes réseau** en erreur (codes 4xx/5xx).
- Si tu es bloqué sur une fonction après deux essais, note-le dans le rapport (« non testé : raison ») et passe à la suite. Ne boucle pas.
- Ne lance aucune commande système. Si le navigateur demande une confirmation de téléchargement, accepte-la : tu dois seulement vérifier que l'export démarre et que le fichier a le bon nom.

## 3. Comptes et connexion

Les comptes de test sont affichés **sur la page d'accueil `http://localhost:3600/`, dans la section « Comptes de test pré-configurés »**. Chaque bouton remplit l'identifiant et le mot de passe : clique dessus, puis sur **« Se connecter par mot de passe »**.

| Rôle | Identifiant | Mot de passe |
| :--- | :--- | :--- |
| **Direction** (administration) | `admin` | `admin123` |
| **Enseignant** (démo) | `prof` | `prof123` |
| **Enseignant** — Dr. KONÉ | `ibrahimkoneprof` | `Kone@2026` |
| **Enseignant** — Mme COULIBALY | `awacoulibalyprof` | `Coulibaly@2026` |
| **Chef de classe** (démo) | `chef` | `chef123` |
| **Étudiant** | aucun compte : saisir un **matricule** sur la page d'accueil | |

**Changer de compte** : bouton rouge **« Déconnexion »** en bas du menu de gauche, puis nouvelle connexion depuis `/`. (La connexion Google ne fonctionne pas : ne la teste pas, sauf les messages affichés à l'ouverture de la fenêtre.)

Base de départ : la classe `LPRIGL-A` (4 cours : GL, RESEAUX, BDD, WEB), **0 étudiant**, aucune séance ni note. Les enseignants Dr. KONÉ et Mme COULIBALY n'ont aucun cours : à toi de leur en donner.

## 4. Ce que chaque rôle doit pouvoir faire

Compare ce que tu constates à ce tableau. Tout écart est une anomalie à rapporter.

| Fonction | Direction | Enseignant | Chef de classe | Étudiant |
| :--- | :-: | :-: | :-: | :-: |
| Voir le tableau de bord | ✅ (console consolidée) | ✅ | ✅ (sa classe) | — |
| Configuration & IA | ✅ | ✅ | ❌ | — |
| Créer / révoquer des comptes chefs de classe | ✅ | ✅ | ❌ | — |
| Catalogue des matières (créer, modifier, supprimer) | ✅ | ✅ (modif. : ses matières ou non affectées) | ❌ | — |
| Créer / modifier / supprimer une classe | ✅ | ✅ | ❌ | — |
| Programmer un cours dans une classe | ✅ (choisit l'enseignant) | ✅ (**uniquement pour lui-même**) | ❌ | — |
| Modifier / retirer un cours d'un autre enseignant | ✅ | ❌ | ❌ | — |
| Inscrire des étudiants (saisie, liste collée, Excel) | ✅ | ✅ | ❌ | — |
| Modifier / supprimer un étudiant | à constater | ✅ | ❌ | — |
| Faire l'appel / modifier une séance | ✅ | ✅ (ses cours) | ✅ (sa classe) | — |
| Supprimer une séance | ✅ | ✅ | ❌ | — |
| Définir le programme, valider les chapitres | ✅ | ✅ | ❌ | — |
| Saisir / modifier / supprimer des notes | ✅ | ✅ (ses cours) | ❌ | — |
| Suivi global et alertes de retard | ✅ | ✅ | ❌ | — |
| Exports de présences | ✅ | ✅ | ✅ (sa classe) | — |
| Exports de notes | ✅ | ✅ | ❌ | — |
| Consulter son dossier (présences, notes, moyenne) | — | — | — | ✅ via le matricule |

Un **enseignant ne voit que ses propres cours** dans l'émargement, les notes et les exports. Un **chef de classe ne voit que sa classe** et n'a **aucun** accès aux notes.

## 5. Parcours à réaliser

Fais ces parcours **dans cet ordre** : chacun produit les données du suivant. À chaque page, applique la **checklist de la section 6**.

### A. Accueil et connexion (sans être connecté)
- Page `/` : affichage correct, aucune erreur console.
- Connexion avec un **mauvais mot de passe**, un **identifiant inconnu**, des **champs vides**.
- Connexion avec chaque compte du tableau (casse de l'identifiant, espaces, e-mail à la place de l'identifiant pour un compte qui en a un).
- Espace étudiant : matricule **vide**, **inexistant**.
- Accès direct à `/dashboard` et `/dashboard/notes` **sans être connecté** : doit rediriger vers `/`.
- Fenêtre « Continuer avec Google / Gmail » : ouvre-la, lis les onglets et teste seulement les messages d'erreur (champs vides). N'enregistre aucun identifiant Google.

### B. Direction (`admin`) : construire la structure
1. **Catalogue Matières** : crée au moins **3 matières** (dont une **sans enseignant**, une affectée à un enseignant). Teste : code en double, champs vides, recherche, filtres, modification, suppression d'une matière non programmée, tentative de suppression d'une matière programmée.
2. **Classes & Cours** : crée au moins **2 classes** (code en double, champs vides, modification, bornes du volume horaire). Programme des cours : un avec un enseignant choisi par toi, un depuis le catalogue, un en créant la matière à la volée ; teste la reprogrammation d'une matière déjà programmée dans la classe. Modifie le volume horaire et l'enseignant d'un cours.
3. **Inscription des étudiants**, dans **les trois modes**, pour avoir **au moins 8 étudiants** dans une classe et 3 dans une autre : saisie rapide (matricule fourni, matricule vide = auto), liste collée (formats mélangés : avec/sans matricule, séparateurs espace, point-virgule, tabulation, e-mail, téléphone), fichier Excel (si tu peux téléverser un fichier, sinon note « non testé »). Teste : matricule en double, nom vide, réimport du même fichier, fichier sans noms exploitables, déplacement d'un étudiant vers une autre classe.
4. **Étudiants** (répertoire) : filtres par classe, recherche, export, modèle Excel.
5. **Gestion des Accès** : crée un **compte chef de classe** pour une de tes classes (identifiant et mot de passe de ton choix, à noter dans le registre). Teste l'identifiant en double et la révocation.
6. **Configuration & IA** : lis la page, change de modèle, enregistre sans clé, lance « Tester la connexion » et note le message.

### C. Enseignants (`ibrahimkoneprof`, puis `awacoulibalyprof`)
- Premier écran sans cours (« aucune classe ou matière ») puis création de leur propre cours (nouvelle matière et nouvelle classe créées **depuis la fenêtre « Programmer un cours »**).
- **Isolation** : un enseignant tente de modifier ou retirer le cours de l'autre ; vérifie qu'il ne voit que ses cours dans Émargement, Notes, Exports.
- **Progression des Cours** : définis un programme de **4 à 6 chapitres avec sous-chapitres** (saisie manuelle). Si tu peux téléverser un fichier Word (.docx) contenant un plan de cours, essaie l'import et note la qualité de l'extraction (chapitres parasites ?). Teste la réorganisation, l'ajout/suppression, l'enregistrement d'une liste vide.
- **Émargement & Présences** : enregistre **au moins 4 séances** pour un cours, en couvrant : les **4 statuts** (Présent, Retard, Absent, Justifié) avec remarques ; une séance en **mode heure par heure** (plusieurs heures, copie d'une heure vers la suivante) ; la **sélection de sous-chapitres** ; une **modification** d'une séance existante ; l'**historique** (compteurs, détails, export). Prévois **une séance datée de plus de 15 jours** avant aujourd'hui sur un cours qui n'est pas terminé (pour l'alerte d'inactivité).
- **Progression** : coche/décoche sous-chapitres et chapitres ; vérifie que les pourcentages (pédagogique et horaire) suivent.
- **Saisie des Notes** : crée **au moins 2 évaluations** avec des **coefficients et des barèmes différents** (par exemple /20 et /40), en laissant au moins une note vide ; teste les valeurs interdites (hors barème, négatif, pas de 0,25, titre vide) ; modifie une évaluation ; supprime-en une.

### D. Direction : contrôle et alertes
- **Console Administration** et **Suivi Global & Retards** : compare tous les chiffres (heures, taux, nombre d'alertes, effectifs) à ton registre. Teste les filtres (classe, enseignant, statut) et la recherche.
- Provoque une alerte de **retard d'évaluation** (cours à plus de 50 % réalisé sans note : tu peux réduire temporairement le volume horaire d'un cours), observe-la, puis **restaure** la valeur.
- **Consultation des Notes** : même vue que l'enseignant pour toutes les classes.

### E. Chef de classe (compte créé en B.5, et `chef`)
- Menu réduit ; émargement limité à sa classe ; modification possible d'une séance, pas de suppression.
- Accès interdits : tape à la main `/dashboard/notes`, `/dashboard/chefs`, `/dashboard/config`, `/dashboard/matieres`, `/dashboard/progression`, `/dashboard/admin/progression`. Note ce qui s'affiche.
- Actions d'écriture refusées : programmer un cours, inscrire un étudiant, créer une classe.
- Exports : présences autorisées, notes refusées.

### F. Portail étudiant (sans compte)
- Pour **chaque type de cas** de ton registre (étudiant avec absences, avec retard, avec justifié, absent à une évaluation, sans aucune séance, avec la meilleure moyenne) : ouvre son dossier par matricule et **recalcule à la main** moyenne, mention, taux d'assiduité, heures de présence/manquées (voir section 7).
- Vérifie : coordonnées **masquées** pour un visiteur anonyme, noms des autres étudiants **anonymisés** dans l'onglet « Vue d'ensemble de la Classe ».
- Reconnecte-toi en tant qu'enseignant dans le même navigateur, rouvre le dossier : les coordonnées et les noms doivent apparaître en clair.
- Bouton « Imprimer mon relevé » ; matricule avec espaces ; matricule supprimé.

### G. Exports et impressions
Page **Exports & Rapports** (Direction puis enseignant) : export Excel des présences, export Excel des notes, aperçus « Émargement papier » et « Relevé imprimable ». Vérifie le nom du fichier, la présence des colonnes attendues, et **la cohérence des chiffres avec ton registre**.

### H. Sécurité et droits (dans la même session de test)
- **Sans être connecté**, ouvre dans le navigateur : `/api/seances`, `/api/classes`, `/api/etudiants`, `/api/matieres`, `/api/enseignants`, `/api/notes/evaluations`. Une API qui renvoie des **données** au lieu d'une erreur 401 est une anomalie de sécurité.
- Connecté comme **chef de classe**, ouvre `/api/seances` et `/api/etudiants` : si des données d'**autres classes** apparaissent, c'est une anomalie.
- Saisis du texte avec caractères spéciaux (`<script>alert(1)</script>`, apostrophes, `&`) dans un nom d'étudiant : aucun script ne doit s'exécuter.
- Contrôle le cookie `auth_token` (HttpOnly attendu) et la redirection après suppression du cookie.

### I. Nettoyage (en dernier)
Teste les suppressions en cascade : une séance, une évaluation, un étudiant, un cours retiré d'une classe, une classe entière (les étudiants et séances associés disparaissent), la révocation du chef. Vérifie les pages concernées après chaque suppression.

## 6. Checklist à appliquer à CHAQUE page

1. **Chargement** : la page s'affiche sans écran vide, sans erreur console, sans requête réseau en échec.
2. **Textes** : titres, libellés, accents, messages cohérents ; pas de texte tronqué ni de valeur « undefined », « NaN », « null ».
3. **Formulaires** : champ obligatoire vide ; valeurs hors limites ; doublons ; caractères spéciaux ; très longues valeurs. Le message d'erreur est-il clair et en français ? Le formulaire garde-t-il les données saisies après une erreur ?
4. **Boutons et liens** : chaque bouton fait ce que son libellé annonce ; les liens mènent à la bonne page ; les boutons se désactivent pendant l'envoi.
5. **Retour d'information** : message de succès/erreur affiché ; les listes et compteurs se mettent à jour sans recharger.
6. **Confirmations** : toute suppression demande une confirmation avec un texte clair.
7. **Droits** : l'action est-elle proposée / refusée conformément au tableau de la section 4 ? Un bouton visible mais refusé au clic est à signaler.
8. **Cohérence** : le même chiffre affiché à deux endroits est identique (ou la différence est expliquée).
9. **Affichage** : mise en page lisible à la taille actuelle ; teste aussi une largeur étroite (environ 400 px) sur l'accueil, le tableau de bord, l'émargement.
10. **Persistance** : recharge la page (F5) : les données saisies sont toujours là et correctes.

## 7. Règles de calcul à vérifier à la main

| Indicateur | Règle attendue |
| :--- | :--- |
| Moyenne d'une matière (étudiant) | Σ [(note ÷ barème) × 20 × coefficient de l'évaluation] ÷ Σ coefficients, sur les seules évaluations où l'étudiant a une note |
| Moyenne générale | Moyenne pondérée des moyennes de matières par le coefficient du cours |
| Mention | ≥ 16 Très Bien · ≥ 14 Bien · ≥ 12 Assez Bien · ≥ 10 Passable · < 10 Ajourné · sans note : « Non calculée » |
| Taux d'assiduité (portail étudiant) | (heures Présent + Retard + Justifié) ÷ heures dispensées |
| Heures de présence / manquées | Présent + Retard / Absent (les justifiés sont comptés à part) |
| Avancement horaire d'un cours | Σ durées des séances ÷ volume prévu, plafonné à 100 % |
| Avancement pédagogique | Σ (sous-chapitres validés ÷ sous-chapitres) par chapitre ÷ nombre de chapitres |
| Alerte « Retard » | cours non terminé dont la dernière séance date de **plus de 14 jours** |
| Alerte « Retard d'évaluation » | cours non terminé, **≥ 50 %** réalisé, **aucune** évaluation |
| Alerte décalage pédagogique | programme défini, ≥ 60 % d'heures réalisées et < 30 % des chapitres validés |
| Alerte « Non démarré » | cours sans aucune séance |
| Matricule automatique | plus grand matricule numérique existant + 1 (minimum 34001) |
| Couleurs d'assiduité | ≥ 80 % vert · ≥ 60 % ambre · < 60 % rouge |

Si deux écrans donnent deux valeurs différentes pour le même indicateur, **signale-le** et indique laquelle est juste d'après la règle ci-dessus.

## 8. Points déjà soupçonnés (à confirmer ou infirmer)

Une première passe de test a déjà été faite et des correctifs ont été appliqués. Vérifie que les points **corrigés** le sont bien (pas de régression), et confirme ou infirme les points **encore ouverts**. Pour chacun, indique : **confirmé**, **non reproduit** ou **non testé**.

**Déjà corrigés (à vérifier rapidement)**
1. `/api/seances` et `/api/classes` renvoient 401 sans connexion ; un chef de classe ne voit que sa classe ; `/api/matieres`, `/api/enseignants` et `/api/config/ai` lui répondent 403.
2. Notes hors barème, négatives ou non numériques → 400 avec message ; volume horaire hors 1–200, coefficient hors 0,5–20, années scolaires non consécutives, textes trop longs, mot de passe de chef de moins de 6 caractères → erreur claire.
3. Le portail affiche « moyenne / barème de l'évaluation ».
4. Réenregistrer un programme conserve la progression des chapitres et sous-chapitres dont le titre n'a pas changé.
5. Supprimer une séance retire les chapitres et sous-chapitres qu'elle avait validés.
6. Modifier une séance ne valide pas un chapitre dont tous les sous-chapitres ne sont pas cochés.
7. Envoyer deux fois la même séance (même cours, date, horaires) est refusé.
8. Le taux d'assiduité est identique au portail et dans le Suivi Global (absences justifiées comptées comme présences) ; « Matières en retard » et « Retards constatés » incluent les retards d'évaluation ; le lien « Vérifier » d'une alerte ouvre la bonne classe.

**Encore ouverts**
9. La Direction voit le crayon de modification d'un étudiant, mais l'enregistrement répond « Action réservée à l'enseignant ».
10. Après un enregistrement, la feuille d'émargement conserve les statuts et remarques saisis.
11. Un enseignant voit tous les étudiants de l'établissement (probablement voulu : il choisit sa classe). Dis si des coordonnées sensibles sont exposées sans nécessité.
12. Les notes sont acceptées sans contrôle du pas de 0,25 (0,1 passe).

## 9. Rapport final (obligatoire)

Quand tous les parcours sont terminés (ou bloqués), **écris un rapport en Markdown**, directement dans ta réponse, avec exactement cette structure :

```
# Rapport de test VacationPro — <date>

## 1. Synthèse
- Verdict global : ✅ Prêt / ⚠️ Prêt avec réserves / ❌ Non prêt
- Nombre de pages testées / total, nombre d'anomalies par gravité (Bloquante, Majeure, Mineure, Cosmétique)
- 3 à 5 problèmes les plus importants, en une phrase chacun

## 2. Couverture
Tableau : Page ou fonction | Rôles testés | Résultat (OK / Anomalie / Non testé) | Remarque

## 3. Anomalies
Pour chacune :
- ID (ANO-01…), titre court, gravité
- Page / URL, rôle utilisé
- Étapes pour reproduire (avec les données saisies)
- Résultat attendu / Résultat obtenu (message exact)
- Preuve : erreur console, requête réseau (méthode, URL, code HTTP), capture
- Correctif proposé (précis : écran concerné, comportement à changer, fichier ou route probable)

## 4. Points de la section 8
Tableau : n° | corrigé et vérifié / régression / confirmé / non reproduit / non testé | preuve

## 5. Écarts de calcul
Tableau : indicateur | valeur affichée | valeur recalculée à la main | écart | écran concerné

## 6. Fonctions non testées
Liste, avec la raison (blocage technique, fichier non téléversable, clé API absente…)

## 7. Améliorations suggérées (ergonomie, messages, cohérence)

## 8. Annexe — registre des données créées
Comptes, classes, matières, étudiants, séances, évaluations (valeurs saisies)
```

**Gravité** : *Bloquante* = fonction centrale inutilisable ou perte/fuite de données · *Majeure* = résultat faux ou droit non respecté · *Mineure* = gêne sans conséquence sur les données · *Cosmétique* = présentation, libellé.

Commence maintenant par le **parcours A**.
