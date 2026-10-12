# Ma voiture Tunisie (ma-voiture-tunisie)

Fichier lu par Claude Code au début de chaque session. **Dépôt PUBLIC : rien de personnel ni de secret, jamais le nom
d'un site concurrent.** Répondre à Ahmed **en français**, simplement.

## AVANT TOUT
Ahmed travaille depuis le PC ET depuis son téléphone : toujours `git pull` avant de modifier, commit + push à la fin.
Nouveau PC, avant le premier commit : `git config user.name Ah6259` et `git config user.email 200752748+Ah6259@users.noreply.github.com`.
Règles communes à tous les sites d'Ahmed : `../../regles communes a tous les sites.md` (hors de ce dépôt).

## Le site (créé le 09/10/2026, demande d'Ahmed : « ajoute Ma voiture … et tous les services reliés à ma voiture »)
- En ligne : https://ah6259.github.io/ma-voiture-tunisie/ — FR + AR (`?lang=ar`). Nom arabe : « مواعيد سيارتك »
  (« سيارتي » est déjà une marque : ne pas l'utiliser comme nom).
- **Accueil « Mes échéances »** : fiche de la voiture (groupe de la vignette pair / impair / société / location — on ne devine
  PAS la parité depuis la plaque, non confirmée —, carburant, CV, 1re mise en circulation, dernière visite, fin d'assurance,
  dernière vidange, kilométrage) → échéances triées avec jours restants → **fichier agenda .ics** (alarmes 15, 7, 1 jour avant).
  Gardé dans le téléphone : `mv-voitures-v1` (valeurs validées : mémoire partagée par tous les sites d'ah6259.github.io).
- Pages : `vignette/` (barème, date limite, CV estimés depuis les kW), `visite-technique/`, `carburant/` (prix + coût d'un
  trajet), `achat-vente/` (frais de mutation ATTT estimés, papiers, liens Documents, FCR → simulateur de la Douane),
  `entretien/` (repères + **carnet des dépenses**), `pass/`, `pass/conditions/`, `a-propos/`.
  Amendes et permis : PAS de doublon, liens vers le site Code de la route (pages déjà vérifiées).
- **Liens entre sites** : menu (Code de la route et Auto-écoles en premier, bordure dorée), encadré « Gratuit aussi sur nos
  sites » (Code de la route, Auto-écoles, Professionnels, Documents), Outils (crédit) sur achat-vente. Clics comptés « lien-site/… ».
- **Pass Ma voiture** (partie payante) : 9 DT pour 12 mois, essai gratuit de 30 jours au premier usage (`mv-essai-v1`).
  Gratuit pour toujours : tous les calculateurs + UNE voiture et ses rappels. Pass : jusqu'à 5 voitures + carnet (`mv-carnet-v1`).
  Code d'accès comme Outils pratiques (`assets/pass.js`, `donnees/pass.json` = empreintes seulement). Clients : dépôt PRIVÉ
  `Ah6259/voiture-pass` (bouton « pass » dans l'application GitHub du téléphone).

## Règles officielles : `assets/regles.js` (objet REGLES) — étude du 09/10/2026 dans « etude et plan.md » (dossier privé)
- Vignette : barème LF 2022 inchangé jusqu'en 2026 (4 CV 65/215/390 … 16 CV et + 2 100/2 325/2 500 essence/diesel/GPL),
  électrique −50 %, hybride sans réduction ; dates 5 février / 5 mars (pair) / 5 avril (impair) / 5 mai, report au jour
  ouvrable suivant (dimanche, fériés fixes, Aïds listés dans `religieux` : à compléter chaque janvier).
- Visite technique 36,500 DT (sûr) ; rythme 4 ans puis 2 ans puis 1 an dès 10 ans (À VÉRIFIER → « estimée » sur le site).
- Carburants (inchangés depuis le 24/11/2022) : 2,525 / 2,855 / 2,205 / 2,550 / 1,985 DT. GPL non chiffré.
- Mutation ATTT : 145 DT jusqu'à 5 CV + 15 DT/CV + supplément d'âge (addition À VÉRIFIER → « estimation »).
- Jamais affichés (non confirmés) : pénalités de retard de la vignette, contre-visite, droit d'enregistrement, amende sans visite.

## Fabrication et tests
- Pages : `python tools/construire.py` (gabarits `tools/gabarits/<page>.html`, « __ » = sous-dossier ; en-tête technique
  commun ; **une seule version ?v=** `VERSION` pour tout le site, accueil compris — la changer à chaque modification d'assets/).
  L'accueil `index.html` est écrit à la main.
- Tests (tout doit être vert avant d'envoyer) : `node tools/test_site.mjs` (date FIXÉE au 09/10/2026, montants et dates de
  référence vérifiés à la main), `node tools/test_sw.mjs`, `node tools/test_avis.mjs`, `python tools/test_robot.py`,
  `python tools/test_sabotage.py` (6 sabotages qui doivent tous être détectés). Tous lancés par `tests.yml` à chaque envoi.
- Icônes : `python tools/icone.py` (Chrome sans écran). Image d'aperçu : `assets/og-image-v1.jpg` (nouveau nom si on la change).

## Robot de surveillance (`surveillance.yml`, chaque jour 6h23)
`tools/surveillance.py` : flux RSS de la presse (titres « carburants / vignette / visite technique » + « hausse, nouveau,
tarif… »), empreinte des montants du tableau de l'ATTT, liens officiels (7 jours de panne → alerte). Il ne change JAMAIS un
montant : alerte = issue « Ma voiture : une règle a peut-être changé » → e-mail à Ahmed → une session Claude vérifie la source
officielle et met à jour `assets/regles.js` + les tests. Rien à signaler → dates « vérifiés le » mises à jour (battement de cœur).
**Depuis le 10/10/2026 (audit des robots, décision d'Ahmed)** : chaque jour, presse SEULE (`--leger` : pas d'ATTT, pas de liens, pas de
tests du site, pas de commit si rien de neuf) ; passage complet le LUNDI ou lancé à la main (ATTT, liens, tests, dates, battement de cœur).

- **Adresse depuis le 11/10/2026 : https://voiture.clicvia.com/** (domaine clicvia.com d'Ahmed, ligne DNS `CNAME voiture → ah6259.github.io` nuage gris, fichier `CNAME`). L'ancienne adresse ah6259.github.io/ma-voiture-tunisie/ redirige seule. Site à la racine « / » : `BASE_SITE` de assets/page.js (sw.js, vidéo) ; GoatCounter garde le préfixe `/ma-voiture-tunisie`. Si l'outil vidéo réécrit le bloc VIDEO_SITE, remettre `"base": BASE_SITE` et l'ORIGINE voiture.clicvia.com.
- **11/10/2026 — aperçu WhatsApp** : `og:url` (adresse canonique) ajouté sur chaque page (sans lui, WhatsApp peut montrer une petite vignette ; règle commune § 14).

- **Visibilité Google (12/10/2026, règle commune § 8)** : liens vers nos autres sites en `https://<site>.clicvia.com/` (jamais `ah6259.github.io`), lien « Tous nos services » → https://clicvia.com/ dans le pied de page, `robots.txt` avec ligne Sitemap, `sitemap.xml` daté, JSON-LD sur l'accueil, clé IndexNow `377f054ba9c5ed40d6796adc8d87d1e8.txt` à la racine (ne pas supprimer : robot `indexnow` du portail). Contrôle : `node "outils visibilite/controle.mjs"` (dépôt projets-ahmed). Sitemap envoyé dans Search Console par Ahmed le 12/10/2026.

- **Google + Bing (12/10/2026)** : sitemap envoyé par Ahmed dans Google Search Console et dans Bing Webmaster Tools (site clicvia.com/), indexation de l'accueil demandée. Pour un nouveau site : mêmes gestes, voir `nouveau site - procedure.md` § 4 étape 5 (dépôt projets-ahmed).
