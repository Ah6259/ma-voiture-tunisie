# Ma voiture Tunisie

Site gratuit, en français et en arabe, pour ne plus oublier les échéances de sa voiture en Tunisie : vignette, visite
technique, assurance, vidange — avec des rappels dans l'agenda du téléphone. Aussi : barème de la vignette, prix des
carburants et coût d'un trajet, frais de mutation de la carte grise, repères d'entretien et carnet des dépenses.

En ligne : https://ah6259.github.io/ma-voiture-tunisie/

## Comment il vit tout seul
- Site statique sur GitHub Pages ; tous les calculs se font dans le téléphone du visiteur (rien n'est envoyé).
- Robot `surveillance.yml` (chaque jour) : guette les annonces officielles et les tarifs de l'ATTT ; en cas de changement,
  il ouvre une alerte (e-mail) sans rien modifier. Presse chaque jour ; ATTT, liens, tests et dates chaque lundi (battement de cœur).
- Robot `tests.yml` : tous les tests à chaque modification ; `gendarme-tests.yml` et `relance-pages.yml` : kit commun.

## Plan de continuité (si Ahmed ou Claude n'est pas là)
1. Le site continue de marcher sans rien faire : les dates de la vignette se calculent seules chaque année.
2. Chaque janvier (loi de finances) : vérifier le barème de la vignette et compléter les dates des Aïds dans `assets/regles.js`
   (`religieux`), puis changer `VERSION` dans `tools/construire.py`, lancer `python tools/construire.py` et les tests.
3. Une alerte « une règle a peut-être changé » : ouvrir le lien de l'article, vérifier la source officielle, corriger
   `assets/regles.js` et la valeur attendue dans `tools/test_site.mjs`, lancer les tests, envoyer.
4. Pass Ma voiture : les clients sont dans le dépôt PRIVÉ `voiture-pass` (bouton « pass » depuis l'application GitHub).
   Si personne ne l'active plus, le site reste entièrement utilisable (une voiture gratuite, tous les calculateurs).
5. Successeur GitHub du compte : à désigner (Settings → Account → Successor settings).

© 2026 — tous droits réservés (voir LICENSE). Ce site n'est pas un service officiel.
