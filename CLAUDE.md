# Ma voiture Tunisie (ma-voiture-tunisie)

## EN TOUT PREMIER (24/11/2026, problème vu par Ahmed)
- La mémoire générale, les « update workflow » et le journal de TOUS les sites sont dans le dépôt PRIVÉ **`Ah6259/projets-ahmed`**
  (le dépôt général), PAS ici. Une session ouverte sur ce seul dépôt ne voit donc pas le dernier travail d'Ahmed (le 24/11, une session
  a répondu « dernier update workflow : 22/11 » alors qu'il y en avait deux le jour même dans projets-ahmed).
- **Au début de CHAQUE session, avant de répondre quoi que ce soit** : si `../projets-ahmed` n'existe pas, le brancher
  (`add_repo` Ah6259/projets-ahmed, puis `git clone --depth 30 https://github.com/Ah6259/projets-ahmed ../projets-ahmed`) ; sinon `git pull` ;
  puis `python3 "debut de session.py" voiture` dans `../projets-ahmed` et en résumer le résultat à Ahmed.
- « Dernier workflow / dernière mise à jour » = regarder `git log` de projets-ahmed ET de ce dépôt (toutes branches), jamais un seul.

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
- **Pass Ma voiture** (partie payante) : 9 DT pour 12 mois (l'essai gratuit de 30 jours `mv-essai-v1` est SUPPRIMÉ depuis le 20/10/2026, décision d'Ahmed).
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
  commun ; **une seule version ?v=** `VERSION` pour tout le site, accueil et video/ compris — la changer à chaque modification d'assets/).
  L'accueil est écrit à la main dans `tools/sources/index.html` (depuis le 21/11/2026, voir « Une adresse par langue »).
- Tests (tout doit être vert avant d'envoyer) : `node tools/test_site.mjs` (date FIXÉE au 09/10/2026, montants et dates de
  référence vérifiés à la main), `node tools/test_sw.mjs`, `node tools/test_avis.mjs`, `python tools/test_robot.py`,
  `python tools/test_sabotage.py` (6 sabotages qui doivent tous être détectés). Tous lancés par `tests.yml` à chaque envoi.
- **Visiteur simulé** (règle générale du 18/10/2026, outil commun copié tel quel) : `python3 tools/visiteur_simule.py` (aussi dans tests.yml) — liens/images morts, pages à 390 px dans Chromium, et `tools/scenarios-visiteur.json` : vignette (CV, énergie, kW), carburant (km, conso, prix, aller-retour), mutation (CV, âge), visite technique, fiche de l'accueil — la LOGIQUE est vérifiée (plus de CV → vignette pas plus basse…). Jamais de « % » dans un scénario (l'outil plante). 18/10 : il a trouvé le barème de la vignette plus large que l'écran (corrigé).
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

- **13/10/2026 (demande d'Ahmed)** : page Visite technique — bouton « Prendre rendez-vous » vers la page de rendez-vous de l'ATTT (`REGLES.visite.rendezVous`, aussi surveillée par le robot), photo du centre de visite dans le bandeau (`assets/photo-visite-technique.jpg`, image du site officiel de l'ATTT fournie par Ahmed, créditée sous la photo et dans À propos — pas une licence libre). Boutons vers un site officiel (rendez-vous, paiement de la vignette) : classe `btn-officiel` (vert vif). Page Vignette : image en attente (Ahmed doit l'envoyer).

- **13/10/2026 (suite)** : photos dans le bandeau des pages Vignette (`assets/photo-vignette.jpg`) et Carburant (`assets/photo-carburant.jpg`) — images fournies par Ahmed, source inconnue, sans crédit possible (risque de droits signalé à Ahmed) ; Achat-vente : `assets/photo-achat.jpg` (Wikimedia Commons, John Lucas, CC BY-SA 2.0, plaque floutée). Visite technique : on garde la photo de l'ATTT (la 2e image envoyée par Ahmed porte le nom d'un autre site écrit en travers).

- **18/10/2026 (VS.3, « Fais » d'Ahmed)** : voiture de 10 ans ou plus SANS date de dernière visite → plus aucune date devinée (`prochaineVisite` renvoie `date: null, inconnue: true`) : page Visite technique « En retard ? » + « Date de la dernière visite inconnue : votre visite est peut-être déjà en retard » (FR + AR), accueil : échéance en tête « Date inconnue : en retard ? », jamais mise dans le fichier agenda. Tests dans test_site.mjs + scénario du visiteur simulé ; version 20261018b.

- **18/10/2026 (Pass : case du code, leçon de l'immobilier)** : sur `pass/`, la carte « J'ai un code » (`#code-acces`, champ `#code-saisie`, formulaire `#code-form`) est maintenant EN HAUT, juste sous `#pass-etat`, avant l'offre (gabarit `tools/gabarits/pass.html`) — visible quel que soit l'état ; un code tapé remplace l'ancien (`mv-pass-v1`). L'essai de 30 jours est réel (`mv-essai-v1`). Encart des fonctions payantes : titre « Votre Pass Ma voiture est terminé » si un Pass payé a expiré (au lieu de « essai terminé »). Message « code expiré » : « ci-dessous ». VERSION `20261018c`. Tests « Pass : … » dans test_site.mjs.

- **19/10/2026 — Visiteur simulé : contrôle des ESPACES (règle commune § 29)** : nouvelle copie commune installée, 0 anomalie, aucun défaut d'espace sur ce site.

- **20/10/2026 — Rappel de fin du Pass (demande d'Ahmed ; pas de Telegram ni d'e-mail, la page parle au client)** : `afficherRappel()` de `assets/pass.js`
  (accueil, entretien/, pages Pass) met sous l'en-tête un bandeau `#rappel-pass` à J-7 d'un Pass PAYÉ (code), au plus 1 fois par jour (mémoire
  `mv-pass-rappel-v1`) : « Merci pour votre inscription ! Votre Pass Ma voiture se termine le JJ/MM/AAAA à HHhMM », bouton doré « Renouveler mon Pass »
  (`pass/#offre`), lien « Donner mon avis » (`#avis` de l'accueil), croix ; après la fin (≤ 30 jours) : « terminé — merci ! » une fois. Pas pour l'essai
  de 30 jours (sans inscription, son encart existe). FR + AR, tests « rappel du Pass » dans test_site.mjs ; VERSION 20261020b (construire.py).

- **20/10/2026 — Plus AUCUN essai gratuit (décision écrite d'Ahmed : « Enlève tous les essais gratuits », comme l'immobilier le 15/10)** :
  `demarrerEssai()` ne crée plus d'essai ; sans Pass, la 2e voiture et le carnet montrent l'encart « Fonction du Pass Ma voiture ». Un essai déjà
  commencé sur un téléphone (`mv-essai-v1`) va jusqu'à sa fin (note « Pass ouvert sur ce téléphone jusqu'au … »). Mentions retirées des gabarits
  (pass, conditions § 3 devenu « Durée », entretien). Le robot privé voiture-pass n'avait pas d'action « essai ». Test : aucune page ne parle d'essai gratuit.

- **RÈGLE D'AHMED (25/10/2026, règle commune § 44) : la page « Comment fonctionne le site ? » (`a-propos/`, FR + AR, h1 « Comment fonctionne le site ? » / « كيف يعمل الموقع؟ ») est mise à jour à CHAQUE modification visible, dans le même envoi** (nouvelle page, fonction changée ou retirée). Gabarit `tools/gabarits/a-propos.html` (puis `python tools/construire.py`) : cartes `#fonctionnement` (chaque fonction en une ligne), `#gratuit-pass` (une voiture gratuite, Pass Ma voiture), `#mises-a-jour` (robot quotidien, site indépendant), puis méthode / vos données / limites / photos / contact. Liens : pied de page de toutes les pages (`page.js`, « Comment fonctionne le site ? ») et accueil (`#lien-fonctionnement`). **Test `FONCTIONS` dans `tools/test_site.mjs`** (repère dans le code -> phrase attendue dans la page) : fonction présente mais non expliquée = test rouge = publication bloquée. Nouvelle fonction = une ligne dans `FONCTIONS` + son explication FR + AR dans le gabarit. VERSION 20261025a.

- **08/11/2026 — plan SEO d'Ahmed appliqué à ce site (phase 2 ; contrôle commun `outils visibilite/controle_seo.mjs` de projets-ahmed ;
  plan : `consignes des taches/seo-voiture.md`)** : titres des 8 gabarits et de l'accueil ramenés à <= 70 caractères (sans le suffixe
  « | Ma voiture Tunisie » quand il dépasse), descriptions <= 165 ; garde-fous `titre_seo()` / `desc_seo()` dans `page()` de
  tools/construire.py ; test « SEO : titre de 10 à 70 caractères et description de 40 à 170, titres uniques » dans test_site.mjs.
  Avant : titres de 88 à 111 caractères, descriptions de 208 à 234 (Google les coupait). Tous les tests verts.
- **17/11/2026 — page 404 commune + liens Confidentialité / Conditions (liste des « 20 points » d'Ahmed)** : `404.html` + `404.js` à la racine
  (modèle `outils communs/page-404/` de projets-ahmed : le modifier là-bas puis `installer.py site "Ma voiture Tunisie" "#2B3990"`) ;
  pied (assets/page.js) : liens https://clicvia.com/confidentialite/ et /conditions/ (versions ar/ quand la page est en arabe) ;
  test_site.mjs bloque si la 404 ou un lien manque (FR + AR, toutes les pages) ; 404.html exclue de test_sw / test_avis. Version 20261117a.

- **21/11/2026 — mode sombre lisible (Ahmed, tous les sites)** : bloc final de `assets/style.css` : en sombre, texte foncé sur la couleur
  principale devenue claire (menu actif « Mes échéances », `.btn-principal` « Ajouter les rappels à mon agenda », « Envoyer », onglets), `.partage`
  vert plus foncé, fonds blancs codés en dur -> `--carte`. Mode clair inchangé. Contrôle « contraste < 3 » : 3 -> 0 (8 pages). VERSION 20261121a.

- **21/11/2026 — UNE ADRESSE PAR LANGUE (règle commune § 8 point 9, demande d'Ahmed ; méthode d'Outils pratiques et de Code de la route)** :
  chaque page publique (accueil, vignette, visite-technique, carburant, achat-vente, entretien, pass, pass/conditions, a-propos) existe en
  français seul à son adresse et en arabe seul sous `ar/<même chemin>` (lang="ar" dir="rtl", titre / description / titre de partage arabes de
  `tools/textes-ar.json`, canonical et og:url ar/…, og:locale ar_AR, FAQ Google française retirée, alt / placeholders / listes déjà en arabe,
  fichiers communs pris à la racine), hreflang fr / ar / x-default (= français) réciproques. **Sources** : `tools/gabarits/*.html` (bilingues,
  spans data-l), l'accueil `tools/sources/index.html` (bilingue, écrit à la main ; `index.html` à la racine est FABRIQUÉ), `tools/textes-ar.json`.
  `python tools/construire.py` écrit les pages FR + `ar/`, le `sitemap.xml` (FR + AR + video/, lastmod = jour du changement), la version de
  `video/index.html` et `tools/modele-video.html` (À propos bilingue = modèle de `node tools/page_video.mjs` ; video/ garde une seule adresse
  `?lang=ar`). **Modifier les sources/gabarits puis construire, JAMAIS une page ni `ar/` à la main** : `python tools/construire.py --verifier`
  (robot tests) sonne rouge sinon. `assets/page.js` : langue = celle de l'adresse (`data-langue-fixe`), bouton de langue = autre adresse
  (`data-autre-langue`, paramètres et ancre gardés, crochet `window.allerVers` des tests), ancien lien `?lang=ar` renvoyé vers ar/, langue
  gardée renvoyée seulement en venant d'une page du site (jamais robot, Google, lien partagé, cadre) ; liens de pages = `window.racinePages()`
  (aussi dans pass.js), fichiers = `data-racine`. Descriptions françaises sans mots arabes (la page arabe a les siens). Tests : bloc « une adresse
  par langue » de test_site.mjs (88 vérifications), 2 sabotages de plus (8), scénarios arabes du visiteur simulé sur `ar/…`, `page(…, { lang: "ar" })`
  ouvre ar/<chemin>. Boutons WhatsApp (`.partage`, `.btn-wa`) en vert #1A7F45 (contraste 4,5 en clair). VERSION 20261121c, CACHE_VERSION 2 (sw.js : ar/ = pages HTML, réseau d'abord).

## 22/11/2026 — Google + IA (demande d'Ahmed : « que Google et les IA indexent nos sites »)
- État Search Console (21/11) : accueil « Crawled - currently not indexed » (dernière visite de Google le 12/10), vignette/ inconnue de Google ;
  requêtes vues : « vignette tunisie » (position ~48), « prix vignette tunisie », « vignette tunisie 2026 ».
- Accueil (tools/sources/index.html) : JSON-LD WebSite + éditeur `Organization` Clicvia (@id https://clicvia.com/#organisation, page Facebook),
  retiré de la page arabe avec la FAQ (construire.py, comme avant).
- « Comment fonctionne le site ? » (FR + AR, carte « Mises à jour automatiques et site indépendant ») : « Publié par Clicvia… pour nous
  écrire : Votre avis » + ligne `FONCTIONS` (éditeur Clicvia).
- `llms.txt` réécrit à la main SANS chiffre ni année (l'ancien, de l'outil commun du 13/10, écrivait prix des carburants, barème et « 2026 »).
- À revoir en janvier 2027 : « 2026 » est écrit en dur dans la page vignette/ (titre, H1, description, FAQ) et dans la description de l'accueil.

## 24/11/2026 — Pass : e-mail OBLIGATOIRE (règle d'Ahmed, tous les sites à Pass)
- Formulaire `#pass-form` (gabarit `tools/gabarits/pass.html`, FR + ar/) : champ `#pass-email` (`type="email" name="email" required`) après le
  téléphone ; `assets/pass.js` refuse l'envoi sans e-mail ou e-mail invalide, l'envoie à Formspree (et dans `pour_activer`). Conditions § données
  et petit texte du formulaire : e-mail ajouté. Tests test_site.mjs (champ FR + AR, jsdom : rien n'est envoyé sans e-mail). VERSION 20261124a.

## 25/11/2026 — Pass : PARCOURS COMMUN D'ACHAT (règle commune § 70, référence `outils communs/pass-commun/CONSIGNES.md` de projets-ahmed)
- Le **code de commande est créé AU FORMULAIRE** (`nouveauCodeCommande()` de `assets/pass.js`, `crypto.getRandomValues`, MÊME alphabet et
  MÊME longueur que les codes d'accès : 8 caractères sans O/0/I/1) : envoyé à Formspree (champ `code`, sujet, `pour_activer … ; code: X`).
  Bloc « Dernière étape » (`#apres-pass` du gabarit `pass.html`, FR + AR) : code en gros (`#commande-code`), phrase « numéro de commande » (« Vous le recevez aussi par e-mail » CACHÉE tant que `EMAIL_AUTO = false` dans pass.js : e-mail automatique pas encore en service),
  3 étapes du paiement (motif = le code ; AR 24321390 sans espaces), WhatsApp pré-rempli avec le code, « Ensuite », filet « code oublié »,
  bouton « Nouvelle commande ». Mémoire `pass-commande` = { code, formule, date } SEULEMENT (60 jours ; séparée de `mv-voitures-v1`, `mv-pass-v1`…).
  Retour sur pass/ : bandeau `#commande-attente` + code essayé tout seul (`reprendreCommande()`, même vérification que « J'ai un code ») :
  activé = Pass ouvert + mémoire effacée ; sinon « En attente de votre paiement ».
- Activation (dépôt privé voiture-pass) : bouton « pass », action `paye` + **code** (celui de l'e-mail) + nom + téléphone : activé TEL QUEL
  (mauvais format ou déjà utilisé = refusé) ; champ code vide = ancien comportement. Le Pass dure toujours 12 mois à partir de l'activation.
- Textes : motif = code de commande partout (pass, conditions § 4-5, a-propos) ; test « plus aucun motif : nom et téléphone ».
  Tests « parcours commun » de test_site.mjs (FR + AR) + ligne FONCTIONS ; 9 sabotages de plus dans test_sabotage.py (17). VERSION 20261125b.
- **25/11/2026 (soir, demande d'Ahmed)** : WhatsApp de la preuve = code + NOM + formule (nom lu au formulaire, jamais gardé dans `pass-commande` : au retour, code + formule) ; étiquette « E-mail » seule et erreur « Indiquez votre e-mail. » tant que `EMAIL_AUTO = false` (promesse dans `.email-auto`, cachée) ; 2 sabotages de plus (19). VERSION 20261125c.

## 25/11/2026 — Pass : E-MAIL AUTOMATIQUE EN SERVICE (A.17, méthode `outils communs/email-clients/BRANCHER-UN-SITE.md` de projets-ahmed)
- `assets/pass.js` : `EMAIL_AUTO = true`, `envoyerEmail()` (POST JSON à https://api-email.clicvia.com/inscription, keepalive, jamais bloquant ;
  Formspree et le code restent la voie principale), appelé UNE fois juste avant Formspree, après les vérifications, jamais si le piège est rempli.
  JSON = { site: "voiture", langue (fr / ar = langue de la page), nom, email, code (code de commande), formule (valeur exacte du formulaire) }
  = champs de `verifier()` du Worker (clé `voiture` de sites.json, type pass-code). Retour en arrière en un mot : `EMAIL_AUTO = false`.
- Promesses affichées : « (vous y recevez votre code et les étapes du paiement) », « Vous le recevez aussi par e-mail », erreur e-mail vide longue.
  CSP `connect-src` + https://api-email.clicvia.com (construire.py). Resend cité dans pass/, pass/conditions/ et a-propos/ (FR + AR) ; ligne FONCTIONS.
- Tests : test_site.mjs (FR + AR : demande JSON, piège, CSP, JSON ACCEPTÉ par le vrai `verifier()` chargé depuis projets-ahmed s'il existe,
  sauté sur GitHub) ; test_sabotage.py : 23 sabotages (EMAIL_AUTO = false, appel supprimé, champ mal nommé, CSP). VERSION 20261125d.

## 25/11/2026 — Pass : MODULE COMMUN du parcours d'achat (PASS.1, règle commune § 70.8 ; `outils communs/pass-commun/` de projets-ahmed)
- La page pass/ (FR + ar/) charge `assets/pass.js` (codes d'accès, Pass ouvert, rappels : inchangé) puis **`assets/pass-commun.js`**
  (COPIE EXACTE du module de projets-ahmed, empreinte `assets/pass-commun.empreinte` : NE JAMAIS LA MODIFIER ICI ; on améliore le module
  puis `python3 "outils communs/pass-commun/synchroniser.py"`) puis **`assets/pass-reglages.js`** (ce qui est propre à ce site : nom,
  formule unique, code = `PASS.alphabet` / `PASS.longueur`, textes de ce site, `pour_activer`, essai du code au retour par `verifierCode()`,
  ouverture du Pass `passOuvert`, options `apresAuRetour`, `classesEtat`, `focusNouvelle: false`). Gabarit `pass.html` : `tete: pass.js, pass-commun.js,
  pass-reglages.js` et attributs `data-code`, `data-formule`, `data-email-auto`, `data-etat-commande`. Ancien code du formulaire retiré de pass.js.
- Rien ne change pour le visiteur (comparaison avant / après : mêmes textes, mêmes erreurs, même code, même Formspree, même WhatsApp, même
  mémoire) ; différences voulues du module : e-mail automatique UNE fois par commande (même après un échec de Formspree), piège anti-robot
  rempli = commande pas gardée. Retour en arrière de l'e-mail : `emailAuto: false` dans pass-reglages.js.
- Tests : test_site.mjs (empreinte, copie identique au module si projets-ahmed est à côté — variable `PROJETS_AHMED` pour une autre copie —,
  scripts dans l'ordre, module branché) ; test_sabotage.py : 20 sabotages (11 du réglage / module). VERSION 20261125e.
