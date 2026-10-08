# Rapport de recette EduPresence — parcours enseignant et portail étudiant

**Date :** 27 septembre 2026  
**Environnement :** application locale `http://localhost:3600`, navigateur intégré Codex  
**Référence de recette :** `TEST_SCENARIO_ENSEIGNANT.md` (TC-01 à TC-08)  
**Périmètre :** compte enseignant de test, classe `LPRIGL-A`, matière `GL – Génie Logiciel`, étudiant `33021`  
**Verdict :** **recette globale non validée**. Les flux de création et de restitution fonctionnent, mais plusieurs critères restent partiels et l'accès public aux données étudiantes demande une correction prioritaire avant toute utilisation avec des données réelles accessibles sur un réseau.

## 1. Résumé des résultats

| Cas | Statut | Constat vérifié | Limite |
| --- | --- | --- | --- |
| TC-01 — Connexion | **Validé** | Le compte enseignant de test ouvre `/dashboard`, avec le profil « Enseignant Principal ». | Connexion Google non testée. |
| TC-02 — Tableau de bord | **Partiel** | Classe, effectif, raccourcis et séances récentes visibles. | Le KPI « Séances émargées » affiche 5 alors que la liste est limitée aux cinq dernières séances ; ce n'est pas un total. Contrôle console complet non effectué. |
| TC-03 — Structure pédagogique | **Validé** | `LPRIGL-A` contient 16 étudiants ; `GL` prévoit 30 h. La recherche `33021` filtre immédiatement la liste. | Les autres classes et matières n'ont pas été contrôlées. |
| TC-04 — Émargement | **Partiel** | Une séance GL de 2 h, le 27/09/2026 de 08:00 à 10:00, a été enregistrée avec succès et apparaît dans l'historique. | La séance créée porte le thème « Conception & Patterns » et les 16 étudiants étaient « Présent ». Les cas « Absent », « Retard » et leurs remarques prévus par le protocole n'ont pas été exécutés. |
| TC-05 — Progression | **Partiel / bloqué sur le syllabus** | La jauge horaire GL est passée de **18/30 h (60 %)** à **20/30 h (67 %)** ; le nombre de séances est passé de 7 à 8. | Aucun chapitre GL n'est défini. Impossible de valider un sous-chapitre et de constater sa date ou l'évolution de la jauge pédagogique. |
| TC-06 — Notes | **Partiel** | Évaluation du 27/09/2026 enregistrée, coefficient 2, sur 20. Notes conservées : `33021` = 16,5 ; `32260` = 13,5 ; `33055` = 11. Commentaire de `33021` : « Très bon travail ». Moyenne de classe : **13,67/20**. | Une seule évaluation ne démontre pas le calcul d'une moyenne pondérée entre plusieurs coefficients. |
| TC-07 — Exports et impression | **Partiel** | Les deux téléchargements `.xlsx` sont lisibles et leur archive ZIP interne est intacte. La séance du 27/09 figure dans les présences ; les notes et le coefficient figurent dans le relevé. | Le navigateur intégré n'a pas montré de boîte d'impression après le clic. Le format A4 et la pagination réelle n'ont pas été validés. |
| TC-08 — Portail étudiant | **Validé** | Après déconnexion, `33021` voit la séance du 27/09 « Présent », son assiduité globale **38/52 h (73 %)**, sa note **16,5/20** et le commentaire attendu. | Le portail expose aussi des données personnelles et l'assiduité des camarades via un simple matricule. |

**Bilan :** 3 cas validés, 5 cas partiels. Aucun échec d'enregistrement constaté ; les critères incomplets empêchent de déclarer les huit cas conformes.

## 2. Anomalies et améliorations proposées, par priorité

### P0 — Restreindre l'accès aux données étudiantes avant déploiement

**Constat.** Depuis la page publique, un matricule suffit à ouvrir une fiche comportant notes, historique de présence et coordonnées de l'étudiant. L'onglet « Vue d'ensemble de la Classe » affiche les matricules, noms et taux d'assiduité des 16 camarades. L'API `GET /api/etudiants/[matricule]` renvoie ces données sans contrôle de session ; la page d'accueil affiche aussi des matricules et identifiants de démonstration.

**Risque.** Si cette configuration est accessible hors de l'environnement local de recette, une personne connaissant ou devinant un matricule peut consulter des informations qui ne lui appartiennent pas. Ce rapport constate le comportement de l'application locale ; il ne conclut pas à une exposition publique actuelle.

**Proposition.** Exiger une authentification de l'étudiant ou un accès individuel à durée limitée, puis autoriser côté serveur uniquement son propre dossier. Retirer les coordonnées personnelles et l'assiduité nominative des camarades de la réponse publique. Masquer les comptes et matricules de démonstration hors environnement de test, et limiter les tentatives de consultation. L'autorisation doit être vérifiée sur chaque requête et chaque objet, conformément aux recommandations [OWASP sur le contrôle d'accès](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) et [OWASP sur l'autorisation par objet dans les API](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/).

**Critère de fermeture.** Une session étudiante ne peut consulter que son propre dossier ; modifier le matricule dans l'URL ou l'appel API ne révèle aucun autre dossier ni information nominative de classe.

### P1 — Rendre le test de progression pédagogique exécutable

**Constat.** Le cours GL n'a aucun programme enregistré. À l'ouverture de l'éditeur, les champs proposés contiennent un exemple NumPy sans rapport avec Génie Logiciel, codé dans `src/app/dashboard/progression/page.tsx`.

**Proposition.** Initialiser l'éditeur vide, ou présenter l'exemple comme un modèle explicite à importer volontairement. Préparer un vrai syllabus GL de test, puis vérifier la validation d'un sous-chapitre, la date affichée et le recalcul de la jauge. Empêcher l'enregistrement involontaire d'un exemple d'une autre matière.

**Critère de fermeture.** Un sous-chapitre GL validé passe à l'état terminé avec la bonne date, et le numérateur ainsi que le pourcentage de progression changent immédiatement puis restent corrects après rechargement.

### P1 — Corriger le KPI « Séances émargées »

**Constat.** Le tableau de bord affiche 5. Dans `src/app/dashboard/page.tsx`, les séances sont d'abord limitées à cinq pour la liste récente, puis ce sous-ensemble sert au KPI « Séances émargées ». GL seul compte déjà huit séances.

**Proposition.** Calculer le total de séances indépendamment de la liste récente, ou renommer le KPI « Dernières séances affichées » si c'est sa signification voulue.

**Critère de fermeture.** Une nouvelle séance augmente le compteur total de 1, même après la cinquième séance.

### P1 — Clarifier les heures sans statut et les taux à 0 h

**Constat.** Le portail affiche pour `33021` 52 h dispensées, 38 h de présence et 10 h manquées : **4 h ne sont pas expliquées dans ces deux compteurs**. Le calcul de l'API distingue un état `NON_MARQUE`, sans total dédié dans l'interface. Plusieurs matières affichent également **100 % d'assiduité avec 0 h dispensée**.

**Proposition.** Montrer un compteur « Heures non pointées » et expliciter le traitement des retards et absences justifiées. Pour une matière sans séance, afficher « Non calculable — aucune heure dispensée » plutôt que 100 %.

**Critère de fermeture.** Les heures dispensées se réconcilient visiblement avec toutes les catégories de statut ; aucun pourcentage numérique n'est présenté pour un dénominateur nul.

### P2 — Fiabiliser l'impression A4

**Constat.** Le bouton prépare une feuille comportant une colonne de signature et les visas du chef de classe et de l'enseignant, puis appelle `window.print()`. Aucune boîte d'impression n'a été observable dans le navigateur intégré. Aucune règle CSS `@page` ou `size: A4` explicite n'a été trouvée dans `src`.

**Proposition.** Définir la taille A4 et les marges d'impression, puis tester l'aperçu réel dans Chrome et Edge : pagination, en-tête, 16 lignes, colonne de signature et visas sans découpe. Fournir si nécessaire un PDF A4 généré par l'application pour une vérification reproductible.

**Critère de fermeture.** L'aperçu et le PDF imprimé sont lisibles, sans éléments coupés ni page blanche superflue.

### P2 — Clarifier les libellés et consolider le protocole

**Constat.** L'onglet étudiant « Mes Notes & Évaluations (8) » utilise en fait le nombre de matières ; une seule évaluation est enregistrée pour GL. Deux documents de recette coexistent : `TEST_SCENARIO_ENSEIGNANT.md` et `docs/SCENARIO_TEST_ENSEIGNANT_E2E.md` prescrivent des thèmes, notes et commentaires différents.

**Proposition.** Renommer l'onglet « Mes matières (8) » ou compter réellement les évaluations. Garder un scénario de recette de référence et synchroniser les jeux de données attendus ; préciser les prérequis du syllabus et les données à remettre à zéro entre deux campagnes.

**Critère de fermeture.** Les libellés correspondent aux nombres affichés et une seule matrice de recette détermine les valeurs attendues.

## 3. Vérifications restantes pour clore la recette

1. Sur une **nouvelle séance de test distincte**, contrôler les statuts Présent, Absent, Retard et Justifié, les remarques et leur effet sur les heures ; éviter de modifier la séance déjà utilisée comme preuve de bout en bout.
2. Charger un syllabus GL validé par l'équipe pédagogique, puis rejouer TC-05 jusqu'à la persistance de la date de validation.
3. Ajouter une deuxième évaluation de test avec un autre coefficient pour démontrer la formule de moyenne pondérée, y compris le traitement des notes manquantes.
4. Rejouer l'impression sur un navigateur avec aperçu natif et vérifier la sortie A4.
5. Tester les contrôles d'accès étudiants sur les routes et API avec un autre matricule, après définition de la règle d'accès souhaitée.

## 4. Données créées pendant la recette

- Séance `GL`, `LPRIGL-A`, 27/09/2026, 08:00–10:00, 2 h, thème « Conception & Patterns », 16 étudiants « Présent ».
- Évaluation « Contrôle Continu 1 - Conception & Patterns », 27/09/2026, coefficient 2, barème 20, trois notes saisies.
- Fichiers téléchargés dans le dossier local `Téléchargements` : `Presences_LPRIGL-A.xlsx` et `Notes_LPRIGL-A.xlsx`. Ils ont été ouverts en lecture seule pour vérifier leur structure et leurs valeurs.

Ces enregistrements ont été laissés en place pour permettre la vérification du résultat observé. Aucune correction du code ou suppression de données n'a été effectuée dans cette campagne.
