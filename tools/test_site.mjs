// Tests de Ma voiture Tunisie (faux navigateur jsdom) — à lancer après chaque modification :  node tools/test_site.mjs
// Accepte un dossier en argument pour tester une copie sabotée. Date du test FIXÉE (jamais la date du jour : règle commune).
// jsdom : npm install --no-save --no-package-lock jsdom (sur le PC, repris au besoin du dossier de Documents Tunisie).
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { execSync } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); }
catch (e) { ({ JSDOM, VirtualConsole } = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../documents Tunisie/site/package.json"))("jsdom")); }

const root = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = f => readFileSync(join(root, f), "utf8");
// pages bilingues (sources) : tools/sources/index.html (accueil) et tools/modele-video.html (À propos, fabriquée par construire.py)
const lireSource = f => f === "index.html" && existsSync(join(root, "tools/sources/index.html")) ? lire("tools/sources/index.html")
  : f === "a-propos/index.html" && existsSync(join(root, "tools/modele-video.html")) ? lire("tools/modele-video.html") : lire(f);
let erreurs = 0, total = 0;
const check = (desc, ok) => { total++; if (ok) console.log("OK   " + desc); else { erreurs++; console.log("FAIL " + desc); } };
const BASE = "https://voiture.clicvia.com/";
const AUJ = "2026-10-09T10:00:00";                       // date fixe des tests

// toutes les pages HTML
const PAGES = [];
(function parcourir(d) {
  for (const n of readdirSync(join(root, d))) {
    const p = d ? d + "/" + n : n;
    if (["node_modules", ".git", "tools", "preuves conditions d'utilisation"].includes(n)) continue;
    if (statSync(join(root, p)).isDirectory()) parcourir(p); else if (n === "index.html") PAGES.push(p);
  }
})("");

// charge une page comme un navigateur (scripts dans l'ordre), avec une horloge fixe et une mémoire de départ
// UNE ADRESSE PAR LANGUE (21/11/2026) : lang "ar" = la page arabe ar/<chemin> (fabriquée par tools/construire.py) ; video/ garde ?lang=ar
async function page(chemin = "index.html", { quand = AUJ, stockage = {}, lang, referrer, avant } = {}) {
  if (lang === "ar" && !chemin.startsWith("ar/") && existsSync(join(root, "ar", chemin))) { chemin = "ar/" + chemin; lang = ""; }
  if (lang === "fr" && chemin.startsWith("ar/")) { chemin = chemin.slice(3); lang = ""; }
  const dossier = dirname(chemin);
  let html = lire(chemin).replace(/<script[^>]*gc\.zgo\.at[^>]*><\/script>/, "")
    .replace(/<script( defer)? src="((?:\.\.\/)*assets\/[^"?]+)(\?[^"]*)?"><\/script>/g, (_, d, f) => `<script>${lire(join(dossier, f).replace(/\\/g, "/"))}</script>`);
  const vc = new VirtualConsole(), js = [];
  vc.on("jsdomError", e => { if (!/Not implemented/.test(e.message)) js.push(e.message); });
  const url = BASE + (chemin === "index.html" ? "" : chemin.replace(/index\.html$/, "")) + (lang ? "?lang=" + lang : "");
  const dom = new JSDOM(html, { url, referrer, runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      const Vrai = w.Date, fixe = new Vrai(quand).getTime();
      class D extends Vrai { constructor(...a) { if (a.length) super(...a); else super(fixe); } static now() { return fixe; } }
      w.Date = D;
      for (const [k, v] of Object.entries(stockage)) w.localStorage.setItem(k, v);
      w.__fichiers = []; w.URL.createObjectURL = () => "blob:x"; w.URL.revokeObjectURL = () => {};
      w.Blob = class { constructor(parts, o) { this.texte = parts.join(""); this.type = (o || {}).type; } };
      w.HTMLAnchorElement.prototype.click = function () {};
      w.scrollTo = () => {}; w.open = () => null;
      w.fetch = async (u) => { const f = String(u).replace(BASE, "").replace(/^(\.\.\/)+/, ""); return existsSync(join(root, f)) ? { ok: true, json: async () => JSON.parse(lire(f)) } : { ok: false, status: 404 }; };
      if (avant) avant(w);
    } });
  await new Promise(r => setTimeout(r, 60));
  return { w: dom.window, d: dom.window.document, js };
}
const clic = (d, sel) => { const e = d.querySelector(sel); if (!e) throw new Error("introuvable : " + sel); e.click(); return e; };
const saisir = (w, el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); el.dispatchEvent(new w.Event("change", { bubbles: true })); };

// ---- 1. toutes les pages : sécurité, en-tête, liens
check(`pages trouvées (${PAGES.length}) : accueil + vignette, visite technique, carburant, achat-vente, entretien, pass, conditions, à propos`,
  ["index.html", "vignette/index.html", "visite-technique/index.html", "carburant/index.html", "achat-vente/index.html", "entretien/index.html", "pass/index.html", "pass/conditions/index.html", "a-propos/index.html"].every(p => PAGES.includes(p)));
const versions = new Set();
const problemes = [];
for (const p of PAGES) {
  const h = lire(p);
  if (!/http-equiv="Content-Security-Policy"/.test(h) || !/noai, noimageai/.test(h) || !/strict-origin-when-cross-origin/.test(h) || !/translate="no"/.test(h) || !/name="google" content="notranslate"/.test(h)) problemes.push(p + " sécurité");
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(h) || /\son[a-z]+=/i.test(h)) problemes.push(p + " script en ligne");
  if (!/formspree\.io/.test(h)) problemes.push(p + " CSP formspree");
  if (!/apple-mobile-web-app-capable/.test(h) || !/rel="manifest"/.test(h)) problemes.push(p + " iPhone");
  [...h.matchAll(/\?v=(\w+)/g)].forEach(m => versions.add(m[1]));
  // liens internes existants
  for (const m of h.matchAll(/href="((?:\.\.\/)*[a-z-]+\/(?:[a-z-]+\/)?)(#[a-z-]+)?"/g)) {
    const cible = join(dirname(p), m[1], "index.html");
    if (!existsSync(join(root, cible)) && !/video\/$/.test(m[1])) problemes.push(p + " lien mort " + m[1]);
  }
}
check(`toutes les pages : CSP, noai, pas de traduction auto, aucun script en ligne, iPhone ${problemes.join(" | ")}`, !problemes.length);
check(`une seule version ?v= pour tout le site (${[...versions].join(", ")})`, versions.size === 1);
check("installation : manifeste (id unique), icônes, service worker, image d'aperçu < 250 Ko", (() => { const m = JSON.parse(lire("manifest.webmanifest"));
  return m.id === "/" && ["assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png", "assets/apple-touch-icon.png", "sw.js", "favicon.ico", "assets/og-image-v2.jpg"].every(f => existsSync(join(root, f)))
    && statSync(join(root, "assets/og-image-v2.jpg")).size < 250 * 1024; })());
check("robots.txt : robots d'IA refusés + sitemap ; sitemap avec toutes les pages publiques", /GPTBot/.test(lire("robots.txt")) && /Sitemap: https:\/\/voiture\.clicvia\.com\/sitemap\.xml/.test(lire("robots.txt"))
  && ["", "vignette/", "visite-technique/", "carburant/", "achat-vente/", "entretien/", "a-propos/"].every(p => lire("sitemap.xml").includes(`<loc>${BASE}${p}</loc>`)));
check("LICENSE « tous droits réservés », .gitattributes eol=lf", /Tous droits réservés/.test(lire("LICENSE")) && /eol=lf/.test(lire(".gitattributes")));
{
  const publics = PAGES.map(lire).join("\n") + ["assets/page.js", "assets/regles.js", "README.md", "CLAUDE.md"].filter(f => existsSync(join(root, f))).map(lire).join("\n");
  const noms = ["sayarti", "sayyara", "automobile.tn", "vehicle.tn", "khadamet", "tayara", "سيارتي تونس"].filter(n => publics.toLowerCase().includes(n.toLowerCase()));
  check(`aucun nom de site concurrent ni le nom arabe déjà pris (« سيارتي تونس ») ${noms.join(", ")}`, !noms.length);
}

// ---- SEO (plan d'Ahmed, 08/11/2026) : titre de 10 à 70 caractères et description de 40 à 170, uniques
{
  const titres = new Map(), mal = [];
  for (const p of PAGES) {
    const h = lire(p), t = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "", d = (h.match(/name="description" content="([^"]*)"/) || [])[1] || "";
    if (t.length < 10 || t.length > 70) mal.push(`${p} titre ${t.length}`);
    if (d.length < 40 || d.length > 170) mal.push(`${p} description ${d.length}`);
    if (titres.has(t)) mal.push(`${p} même titre que ${titres.get(t)}`); titres.set(t, p);
  }
  check(`SEO : titre de 10 à 70 caractères et description de 40 à 170 sur chaque page, titres uniques ${mal.join(" | ")}`, mal.length === 0);
}

// ---- 2. règles : montants et dates de référence (vérifiés à la main dans l'étude du 09/10/2026)
{
  const { w } = await page("vignette/index.html");
  const R = w.eval("REGLES"), M = v => R.vignette.montant(v);
  check("vignette : 6 CV essence 130 ; 4 CV diesel 215 ; 9 CV diesel 405 ; 16 CV GPL 2 500 ; 8 CV hybride 180 ; 4 CV électrique 32,5 ; 12 CV essence 1 050",
    M({ cv: 6, energie: "essence" }) === 130 && M({ cv: 4, energie: "diesel" }) === 215 && M({ cv: 9, energie: "diesel" }) === 405 && M({ cv: 16, energie: "gpl" }) === 2500
    && M({ cv: 8, energie: "hybride" }) === 180 && M({ cv: 4, energie: "electrique" }) === 32.5 && M({ cv: 12, energie: "essence" }) === 1050 && M({ cv: 30, energie: "diesel" }) === 2325);
  const d = (g, s) => { const x = R.vignette.prochaine({ groupe: g }, new w.Date(s)); return x && w.ecrireDate(x.date); };
  check("date limite : pair le 05/03/2027 (vu le 09/10/2026) ; pair le 05/03/2026 (vu le 10/01/2026)", d("pair", "2026-10-09T12:00:00") === "2027-03-05" && d("pair", "2026-01-10T12:00:00") === "2026-03-05");
  check("date limite : impair 2026 = dimanche 5 avril → lundi 06/04/2026 (jour ouvrable suivant) ; impair 2027 = lundi 05/04/2027", d("impair", "2026-01-10T12:00:00") === "2026-04-06" && d("impair", "2026-10-09T12:00:00") === "2027-04-05");
  check("date limite : sociétés 5 février, location 5 mai ; le jour même compte encore", d("societe", "2026-10-09T12:00:00") === "2027-02-05" && d("location", "2026-10-09T12:00:00") === "2027-05-05" && d("pair", "2026-03-05T12:00:00") === "2026-03-05");
  check("mutation : 7 CV de 8 ans = 275 ; 5 CV de 2 ans = 145 ; 12 CV de 12 ans = 450 ; 6 CV de 4 ans = 210", R.mutation.frais(7, 8).total === 275 && R.mutation.frais(5, 2).total === 145
    && R.mutation.frais(12, 12).total === 450 && R.mutation.frais(6, 4).total === 210);
  check("visite technique 36,500 DT ; carburants : sans plomb 2,525, gasoil sans soufre 2,205, gasoil 1,985", R.visite.tarif === 36.5
    && R.carburants.prix.find(p => p.id === "sp").prix === 2.525 && R.carburants.prix.find(p => p.id === "g50").prix === 2.205 && R.carburants.prix.find(p => p.id === "go").prix === 1.985);
  check("puissance fiscale estimée : 110 kW ≈ 8 CV ; 66 kW ≈ 5 CV", R.cvDepuisKw(110) === 8 && R.cvDepuisKw(66) === 5);
  // visite technique
  const { w: wv } = await page("visite-technique/index.html");
  const auj = new wv.Date("2026-10-09T12:00:00"), vis = (c, der) => wv.ecrireDate(wv.prochaineVisite(wv.voitureValide({ circulation: c, visite: der || "" }), auj).date);
  check("visite : voiture de 2020-06-15 → 15/06/2028 (4e année puis tous les 2 ans) ; voiture de 2024-01-10 → 10/01/2028 (1re visite)", vis("2020-06-15") === "2028-06-15" && vis("2024-01-10") === "2028-01-10");
  const r14 = wv.prochaineVisite(wv.voitureValide({ circulation: "2014-03-01" }), auj);
  check("visite (VS.3) : voiture de 2014-03-01 (plus de 10 ans) SANS dernière visite → aucune date devinée, « peut-être déjà en retard » ; avec une visite le 20/02/2026 → 20/02/2027",
    r14.date === null && r14.inconnue === true && /peut-être déjà en retard/.test(r14.detail.fr) && /متأخر/.test(r14.detail.ar) && vis("2014-03-01", "2026-02-20") === "2027-02-20");
}

// ---- 3. fichier agenda (.ics)
{
  const { w } = await page();
  const t = w.fabriquerIcs([{ id: "v1-vignette", date: new w.Date("2027-03-05T12:00:00"), titre: "Vignette — la voiture de papa, avec un titre très long qui dépasse soixante-quinze octets", description: "Ligne 1\nLigne 2 ; virgule, fin" }]);
  const lignes = t.split("\r\n");
  check("agenda : VCALENDAR, événement du 05/03/2027 toute la journée, 3 alarmes (15, 7 et 1 jour avant)", /^BEGIN:VCALENDAR\r\n/.test(t) && /DTSTART;VALUE=DATE:20270305/.test(t) && /DTEND;VALUE=DATE:20270306/.test(t)
    && (t.match(/BEGIN:VALARM/g) || []).length === 3 && /TRIGGER:-P15D/.test(t) && /TRIGGER:-P7D/.test(t) && /TRIGGER:-P1D/.test(t) && /END:VCALENDAR\r\n$/.test(t));
  check("agenda : lignes de 75 octets au plus (pliées), texte échappé (\\n \\; \\,)", lignes.every(l => new TextEncoder().encode(l).length <= 75) && /Ligne 1\\nLigne 2 \\; virgule\\, fin/.test(t.replace(/\r\n /g, "")));
}

// ---- 4. accueil : une voiture notée → échéances, rappels
const VOITURE = JSON.stringify([{ id: "abcd1234", nom: "Clio", groupe: "pair", energie: "essence", cv: 6, circulation: "2019-05-20", assurance: "2026-11-30", vidange: "2026-02-01", kmVidange: 80000, km: 86000, kmMois: 1000, vu: "2026-10-09" }]);
{
  const { w, d, js } = await page("index.html");
  check("accueil vide : aucune erreur JavaScript, message d'invitation, bouton agenda désactivé, pas d'onglet « ajouter » avant la 1re voiture", js.length === 0 && /Remplissez au moins une date/.test(d.getElementById("liste-echeances").textContent)
    && d.getElementById("bouton-agenda").disabled && d.getElementById("voitures-onglets").hidden);
  check("accueil : bouton Partager dans l'en-tête, menu avec Code de la route et Auto-écoles en premier", d.querySelectorAll("header .partager").length === 1
    && /code\.clicvia\.com/.test(d.querySelector(".menu a").href) && /auto-ecoles\.clicvia\.com/.test(d.querySelectorAll(".menu a")[1].href));
  saisir(w, d.getElementById("v-cv"), "6");
  clic(d, '.choix[data-nom="groupe"] button[data-v="impair"]');
  saisir(w, d.getElementById("v-assurance"), "2026-12-01");
  const st = JSON.parse(w.localStorage.getItem("mv-voitures-v1"));
  check("saisie : la voiture est gardée dans le téléphone (groupe, CV, assurance)", st.length === 1 && st[0].groupe === "impair" && st[0].cv === 6 && st[0].assurance === "2026-12-01");
  check("saisie : échéances affichées aussitôt (assurance puis vignette du 05/04/2027, 130 DT)", d.querySelectorAll("#liste-echeances .ech").length === 2
    && /Assurance/.test(d.querySelector("#liste-echeances .ech h3").textContent) && /05\/04\/2027/.test(d.getElementById("liste-echeances").textContent) && /130,000 DT/.test(d.getElementById("liste-echeances").textContent));
}
{
  const { w, d, js } = await page("index.html", { stockage: { "mv-voitures-v1": VOITURE } });
  const ech = [...d.querySelectorAll("#liste-echeances .ech")];
  check("voiture notée : 4 échéances dans l'ordre (assurance, vignette, vidange, visite), aucune erreur", js.length === 0 && ech.length === 4
    && ech.map(e => e.querySelector("h3").textContent).join(",") === "Assurance,Vidange,Vignette,Visite technique");
  check("vidange estimée au plus tôt : 01/02/2027 (12 mois) avant 10 000 km atteints le 08/02/2027", /01\/02\/2027/.test(ech[1].textContent));
  check("couleurs : assurance dans 52 jours = « ok » ; visite technique datée 20/05/2027 « estimée »", ech[0].classList.contains("ok") && /20\/05\/2027/.test(ech[3].textContent) && /estimée/.test(ech[3].textContent));
  clic(d, "#bouton-agenda");
  const f = w.__fichiers[0];
  check("bouton agenda : fichier « rappels-ma-voiture.ics » avec les 4 échéances", !!f && f.nom === "rappels-ma-voiture.ics" && (f.texte.match(/BEGIN:VEVENT/g) || []).length === 4 && /Clio/.test(f.texte) && !d.getElementById("agenda-aide").hidden);
}

// ---- 5. Pass : 2e voiture (plus d'essai gratuit depuis le 20/10/2026, décision d'Ahmed), ancien essai, Pass actif
{
  const { w, d } = await page("index.html", { stockage: { "mv-voitures-v1": VOITURE } });
  clic(d, "#ajouter-voiture");
  check("2e voiture sans Pass : AUCUN essai ne démarre, pas de 2e voiture, encart du Pass « Fonction du Pass Ma voiture »", JSON.parse(w.localStorage.getItem("mv-voitures-v1")).length === 1
    && !w.localStorage.getItem("mv-essai-v1") && /Fonction du Pass Ma voiture/.test(d.getElementById("encart-voitures").textContent) && !/essai/i.test(d.getElementById("encart-voitures").textContent));
}
{
  const { w, d } = await page("index.html", { stockage: { "mv-voitures-v1": VOITURE, "mv-essai-v1": JSON.stringify({ debut: new Date(AUJ).getTime() - 5 * 864e5 }) } });
  clic(d, "#ajouter-voiture");
  check("ancien essai déjà commencé : il va jusqu'à sa fin (2e voiture acceptée, note « Pass ouvert sur ce téléphone jusqu'au … », sans le mot essai)",
    JSON.parse(w.localStorage.getItem("mv-voitures-v1")).length === 2 && !d.getElementById("note-essai").hidden && /Pass ouvert sur ce téléphone jusqu'au/.test(d.getElementById("note-essai").textContent)
    && !/essai/i.test(d.getElementById("note-essai").textContent));
}
{
  const vieux = new Date("2026-08-01T10:00:00").getTime();
  const { w, d } = await page("index.html", { stockage: { "mv-voitures-v1": VOITURE, "mv-essai-v1": JSON.stringify({ debut: vieux }) } });
  clic(d, "#ajouter-voiture");
  check("ancien essai fini : pas de 2e voiture, encart « Pass Ma voiture : 9 DT par an » avec bouton de paiement doré", JSON.parse(w.localStorage.getItem("mv-voitures-v1")).length === 1
    && /Fonction du Pass Ma voiture/.test(d.getElementById("encart-voitures").textContent) && d.querySelector("#encart-voitures .btn-pass-grand"));
  check("essai fini : la 1re voiture et ses rappels restent gratuits", !d.getElementById("bouton-agenda").disabled && d.querySelectorAll("#liste-echeances .ech").length === 4);
}
{
  const { w, d } = await page("index.html", { stockage: { "mv-voitures-v1": VOITURE, "mv-essai-v1": JSON.stringify({ debut: new Date("2026-08-01T10:00:00").getTime() }),
    "mv-pass-v1": JSON.stringify({ code: "ABCDEFGH", fin: "2027-10-09T10:00:00Z", verifie: new Date(AUJ).getTime() }) } });
  clic(d, "#ajouter-voiture");
  check("Pass actif : la 2e voiture est acceptée même après l'essai", JSON.parse(w.localStorage.getItem("mv-voitures-v1")).length === 2 && !d.querySelector("#encart-voitures .btn-pass-grand"));
}
// 18/10/2026 (problème vu sur l'immobilier : code payé impossible à taper quand le téléphone gardait un autre code)
// la case du code est TOUJOURS visible, EN HAUT de pass/, quel que soit l'état gardé ; le code tapé remplace l'ancien ;
// plus d'essai gratuit annoncé (20/10/2026) ; un Pass payé terminé est annoncé « terminé »
{
  const { webcrypto, pbkdf2Sync } = await import("crypto");
  const t0 = new Date(AUJ).getTime(), futur = new Date(t0 + 200 * 864e5).toISOString(), passe = new Date(t0 - 864e5).toISOString();
  const visible = (w, el) => { for (let e = el; e; e = e.parentElement) if (e.hidden || w.getComputedStyle(e).display === "none") return false; return !!el; };
  const ETATS = {
    "aucun code": {},
    "un autre code non payé gardé": { "mv-pass-v1": JSON.stringify({ code: "ZZZZ2222", fin: futur, verifie: 0 }) },
    "un code payé gardé": { "mv-pass-v1": JSON.stringify({ code: "ABCDEFGH", fin: futur, verifie: t0 }) },
    "un code expiré gardé": { "mv-pass-v1": JSON.stringify({ code: "ABCDEFGH", fin: passe, verifie: t0 }) },
    "essai fini": { "mv-essai-v1": JSON.stringify({ debut: t0 - 40 * 864e5 }) }
  };
  const mal = [];
  for (const [nom, stockage] of Object.entries(ETATS)) {
    const { w, d } = await page("pass/index.html", { stockage });
    const bloc = d.getElementById("code-acces"), champ = bloc && bloc.querySelector("input[name=code]"), bouton = bloc && bloc.querySelector("button[type=submit]");
    if (!visible(w, champ) || !visible(w, bouton) || !(bloc.compareDocumentPosition(d.getElementById("offre")) & 4)) mal.push(nom);
  }
  check(`Pass : case du code visible EN HAUT de pass/ (avant l'offre) dans tous les états ${mal}`, mal.length === 0);
  const { w, d } = await page("pass/index.html", { stockage: ETATS["un autre code non payé gardé"] });
  const SEL = "sel-de-test", TOURS = 1000, LISTE = { sel: SEL, tours: TOURS, codes: [{ h: pbkdf2Sync("NEWC2345", SEL, TOURS, 32, "sha256").toString("hex"), fin: futur }] };
  Object.defineProperty(w, "crypto", { value: webcrypto, configurable: true });
  w.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(LISTE)) });
  const cf = d.getElementById("code-form");
  cf.querySelector("input[name=code]").value = "newc-2345";
  cf.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  for (let i = 0; i < 100 && !/Code accepté/.test(d.getElementById("code-status").textContent); i++) await new Promise(r => setTimeout(r, 20));
  const garde = JSON.parse(w.localStorage.getItem("mv-pass-v1") || "{}");
  check("Pass : le code tapé REMPLACE l'ancien code gardé (nouveau code, nouvelle date de fin, Pass actif)", garde.code === "NEWC2345" && garde.fin === futur && w.eval("passActif()"));
  check("Pass : plus d'« essai gratuit » annoncé (décision d'Ahmed du 20/10/2026)", !/essai gratuit|تجربة مجانية/i.test(d.getElementById("offre").textContent));
  const r = await page("index.html", { stockage: { "mv-voitures-v1": VOITURE, "mv-essai-v1": ETATS["essai fini"]["mv-essai-v1"], "mv-pass-v1": ETATS["un code expiré gardé"]["mv-pass-v1"] } });
  clic(r.d, "#ajouter-voiture");
  const enc = r.d.getElementById("encart-voitures");
  check("Pass payé terminé : encart « Votre Pass Ma voiture est terminé » (pas « essai terminé ») + lien « J'ai déjà un code »",
    /Votre Pass Ma voiture est terminé/.test(enc.textContent) && !/essai gratuit/i.test(enc.querySelector("h2").textContent) && !!enc.querySelector('a[href="pass/#code-acces"]'));
}
// 20/10/2026 (décision d'Ahmed : « Enlève tous les essais gratuits ») : aucune page ni aucun script ne parle d'essai gratuit
{
  const mots = /essai gratuit|essais gratuits|essai de 30|jours gratuits|تجربة مجانية|التجربة المجانية|تجربتك المجانية/i, mal = [];
  for (const p of PAGES) if (mots.test(lire(p))) mal.push(p);
  for (const f of ["manifest.webmanifest", "assets/page.js", "assets/accueil.js", "assets/carnet.js", "assets/pass.js", ...readdirSync(join(root, "tools/gabarits")).map(n => "tools/gabarits/" + n)])
    if (existsSync(join(root, f)) && mots.test(lire(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""))) mal.push(f);
  check(`plus aucune page ne parle d'essai gratuit (titres, descriptions, og, JSON-LD, textes, boutons ; FR + AR) ${mal}`, mal.length === 0);
}
// 20/10/2026 (demande d'Ahmed) : rappel de fin du Pass (merci, date de fin, Renouveler, Donner mon avis), puis message après la fin
{
  const t0 = new Date(AUJ).getTime();
  const code = (finMs, extra = {}) => ({ "mv-pass-v1": JSON.stringify({ code: "ABCDEFGH", fin: new Date(finMs).toISOString(), verifie: t0 }), ...extra });
  const z = n => String(n).padStart(2, "0"), lisible = ms => { const x = new Date(ms); return z(x.getDate()) + "/" + z(x.getMonth() + 1) + "/" + x.getFullYear() + " à " + z(x.getHours()) + "h" + z(x.getMinutes()); };
  const tx = el => el ? el.textContent.replace(/[⁦-⁩  ]/g, " ").replace(/\s+/g, " ") : "";
  let r = await page("index.html", { stockage: code(t0 + 20 * 864e5) });
  check("rappel du Pass : rien à J-20", !r.d.getElementById("rappel-pass") && r.js.length === 0);
  r = await page("index.html", { stockage: code(t0 + 7 * 864e5) });
  let b = r.d.getElementById("rappel-pass");
  check("rappel du Pass : bandeau à J-7 (merci, « se termine le JJ/MM/AAAA à HHhMM »)", !!b && r.js.length === 0 &&
    tx(b).includes("Merci pour votre inscription") && tx(b).includes("se termine le " + lisible(t0 + 7 * 864e5)));
  const ren = b && b.querySelector("a.rappel-renouveler"), av = b && b.querySelector("a.rappel-avis"), x = b && b.querySelector("button.rappel-fermer");
  check("rappel du Pass : vrai bouton « Renouveler mon Pass » (pass/#offre), lien « Donner mon avis » (#avis), croix",
    !!ren && ren.getAttribute("href") === "pass/#offre" && !!r.d.getElementById("avis") && /id="offre"/.test(lire("pass/index.html")) && !!av && av.getAttribute("href") === "#avis" && !!x && x.type === "button");
  x.click();
  check("rappel du Pass : la croix ferme le bandeau", !r.d.getElementById("rappel-pass"));
  const memo = r.w.localStorage.getItem("mv-pass-rappel-v1");
  r = await page("index.html", { stockage: code(t0 + 7 * 864e5, { "mv-pass-rappel-v1": memo }) });
  check("rappel du Pass : une fois par jour au plus", !r.d.getElementById("rappel-pass"));
  r = await page("index.html", { stockage: code(t0 + 6 * 864e5, { "mv-pass-rappel-v1": JSON.stringify({ ...JSON.parse(memo), vu: "2000-01-01" }) }) });
  check("rappel du Pass : de nouveau affiché un autre jour", !!r.d.getElementById("rappel-pass"));
  r = await page("entretien/index.html", { stockage: code(t0 + 2 * 864e5) });
  b = r.d.getElementById("rappel-pass");
  check("rappel du Pass : liens justes depuis entretien/ (../pass/#offre, ../#avis)", !!b && b.querySelector("a.rappel-renouveler").getAttribute("href") === "../pass/#offre" && b.querySelector("a.rappel-avis").getAttribute("href") === "../#avis");
  r = await page("index.html", { stockage: code(t0 - 864e5) });
  b = r.d.getElementById("rappel-pass");
  check("rappel du Pass : après la fin, « Votre Pass Ma voiture est terminé — merci ! » avec Renouveler et Donner mon avis",
    !!b && tx(b).includes("est terminé — merci") && !!b.querySelector("a.rappel-renouveler") && !!b.querySelector("a.rappel-avis"));
  r = await page("index.html", { stockage: { "mv-pass-rappel-v1": r.w.localStorage.getItem("mv-pass-rappel-v1") } });
  check("rappel du Pass : message de fin montré une seule fois", !r.d.getElementById("rappel-pass"));
  r = await page("index.html", { stockage: { "mv-essai-v1": JSON.stringify({ debut: t0 - 27 * 864e5 }) } });
  check("rappel du Pass : pas de bandeau pour un ancien essai (seuls les codes payés comptent)", !r.d.getElementById("rappel-pass"));
  r = await page("index.html", { stockage: code(t0 + 3 * 864e5), lang: "ar" });
  b = r.d.getElementById("rappel-pass");
  check("rappel du Pass : en arabe (شكرًا على اشتراكك، جدّد باقتي)", !!b && tx(b).includes("شكرًا على اشتراكك") && tx(b).includes("جدّد باقتي"));
  r = await page("index.html", { stockage: { "mv-pass-v1": "{abîmé", "mv-pass-rappel-v1": "{abîmé" } });
  check("rappel du Pass : stockage abîmé = pas de plantage, pas de bandeau", r.js.length === 0 && !r.d.getElementById("rappel-pass"));
}
{
  const { w, d, js } = await page("index.html", { stockage: { "mv-voitures-v1": "pas du json", "langue": "en" } });
  check("mémoire partagée invalide (« pas du json », langue « en ») : ignorée sans erreur, page en français, aucune voiture", js.length === 0 && w.document.documentElement.lang === "fr"
    && d.getElementById("voitures-onglets").hidden && /Remplissez au moins une date/.test(d.getElementById("liste-echeances").textContent));
}
{
  const { d, js } = await page("index.html", { lang: "ar", stockage: { "mv-voitures-v1": VOITURE } });
  check("accueil en arabe : sens droite-gauche, échéances en arabe, nom « مواعيد سيارتك », aucune erreur", d.documentElement.dir === "rtl" && /التأمين/.test(d.getElementById("liste-echeances").textContent)
    && /مواعيد سيارتك/.test(d.querySelector(".logo-nom").textContent) && js.length === 0);
}

// ---- 6. pages outils
{
  const { d, js } = await page("vignette/index.html");
  check("vignette : exemple 6 CV essence numéro pair → 130,000 DT, date limite 05/03/2027, barème 8 lignes (ligne 5 à 7 CV en surbrillance)", js.length === 0
    && /130,000 DT/.test(d.getElementById("grand").textContent) && /05\/03\/2027/.test(d.getElementById("tableau").textContent) && d.querySelectorAll("#bareme tr").length === 9 && /5 – 7 CV/.test(d.querySelector("#bareme tr.ici").textContent));
}
{
  const { w, d, js } = await page("visite-technique/index.html");
  saisir(w, d.getElementById("circulation"), "2020-06-15");
  check("visite technique : 2020-06-15 → 15/06/2028, prix 36,500 DT, aucune erreur", js.length === 0 && /15\/06\/2028/.test(d.getElementById("grand").textContent) && /36,500 DT/.test(d.getElementById("tableau").textContent));  saisir(w, d.getElementById("circulation"), "2014-03-01");
  const pageVs3 = d.getElementById("grand").textContent + " " + d.getElementById("explication").textContent + " " + d.getElementById("tableau").textContent;
  check("visite technique (VS.3) : voiture de 2014 sans dernière visite → « En retard ? », « peut-être déjà en retard », AUCUNE date affichée", js.length === 0
    && /En retard \?/.test(d.getElementById("grand").textContent) && /peut-être déjà en retard/.test(pageVs3) && !/\d{2}\/\d{2}\/\d{4}/.test(pageVs3) && !/Il reste/.test(pageVs3));
  saisir(w, d.getElementById("derniere"), "2026-02-20");
  check("visite technique (VS.3) : la même voiture avec sa dernière visite (20/02/2026) → 20/02/2027", /20\/02\/2027/.test(d.getElementById("grand").textContent));
}
{
  const vieille = JSON.stringify([{ id: "vieux1234", nom: "Golf", groupe: "pair", energie: "essence", cv: 6, circulation: "2012-04-10", assurance: "2026-11-30" }]);
  const { w, d, js } = await page("index.html", { stockage: { "mv-voitures-v1": vieille } });
  const ech = [...d.querySelectorAll("#liste-echeances .ech")];
  const vt = ech.find(e => /Visite technique/.test(e.querySelector("h3").textContent));
  check("accueil (VS.3) : voiture de 2012 sans dernière visite → visite technique EN TÊTE, « Date inconnue : en retard ? », aucune date devinée", js.length === 0
    && !!vt && ech[0] === vt && vt.classList.contains("inconnue") && /en retard \?/.test(vt.textContent) && !/\d{2}\/\d{2}\/\d{4}/.test(vt.textContent) && !/NaN|undefined/.test(vt.textContent));
  clic(d, "#bouton-agenda");
  const f = w.__fichiers[0];
  check("agenda (VS.3) : la visite sans date n'est PAS mise dans le fichier .ics (seulement assurance + vignette)", !!f && (f.texte.match(/BEGIN:VEVENT/g) || []).length === 2 && !/Visite technique/.test(f.texte));
}
{
  const { w, d, js } = await page("carburant/index.html");
  check("carburant : 5 prix officiels affichés ; exemple 25 km aller-retour, 6,5 L/100 → 8,206 DT ; 22 jours → 180,532 DT", js.length === 0 && d.querySelectorAll("#prix-carbu div").length === 5
    && /8,206 DT/.test(d.getElementById("grand").textContent) && /180,532 DT/.test(d.getElementById("tableau").textContent) && w.coutTrajet(50, 6.5, 2.525) === 8.206);
}
{
  const { d, js } = await page("achat-vente/index.html");
  check("achat-vente : exemple 7 CV de 8 ans → 275,000 DT (estimé), 8 papiers, lien vers le contrat de vente de Documents", js.length === 0 && /275,000 DT/.test(d.getElementById("grand").textContent)
    && d.querySelectorAll("#papiers li").length === 8 && d.querySelector('a[href="https://documents.clicvia.com/vente-voiture/"]'));
}

// ---- 7. carnet des dépenses (Pass ; plus d'essai gratuit depuis le 20/10/2026)
{
  const { d } = await page("entretien/index.html", { stockage: { "mv-voitures-v1": VOITURE } });
  check("carnet sans Pass : formulaire caché, encart du Pass, aucun essai démarré", d.getElementById("carnet-form").hidden && /Pass Ma voiture/.test(d.getElementById("carnet-encart").textContent));
}
{
  const { w, d, js } = await page("entretien/index.html", { stockage: { "mv-voitures-v1": VOITURE, "mv-pass-v1": JSON.stringify({ code: "ABCDEFGH", fin: "2027-10-09T10:00:00Z", verifie: new Date(AUJ).getTime() }) } });
  const ajout = (type, date, montant, km, litres) => { d.getElementById("c-type").value = type; d.getElementById("c-date").value = date; d.getElementById("c-montant").value = montant;
    d.getElementById("c-km").value = km; d.getElementById("c-litres").value = litres || ""; d.getElementById("carnet-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true })); };
  ajout("plein", "2026-09-01", "75", "85000", "30");
  ajout("plein", "2026-09-20", "75", "85500", "30");
  ajout("vidange", "2026-10-01", "120", "86000");
  const c = JSON.parse(w.localStorage.getItem("mv-carnet-v1"));
  const b = w.bilanCarnet(c.abcd1234, new w.Date(AUJ));
  check("carnet avec le Pass : 3 dépenses gardées pour la voiture, aucun essai démarré, aucune erreur", js.length === 0 && c.abcd1234.length === 3 && !w.localStorage.getItem("mv-essai-v1"));
  check("carnet : bilan 12 mois 270 DT, 1 000 km, coût 0,195 DT/km, consommation 3 L/100", b.total12 === 270 && b.km === 1000 && Math.abs(b.coutKm - 0.195) < 1e-9 && Math.abs(b.conso - 3) < 1e-9
    && /0,195/.test(d.getElementById("carnet-bilan").textContent));
  clic(d, "#carnet-export");
  check("carnet : export CSV pour Excel", w.__fichiers.some(f => f.type === "text/csv"));
}
{
  const { d } = await page("entretien/index.html", { stockage: { "mv-essai-v1": JSON.stringify({ debut: new Date("2026-08-01T10:00:00").getTime() }) } });
  check("carnet, essai fini sans Pass : formulaire caché, encart du Pass", d.getElementById("carnet-form").hidden && /Pass Ma voiture/.test(d.getElementById("carnet-encart").textContent));
}

// ---- 8. page du Pass : paiement en 3 étapes, formulaire, code
{
  const { d, js } = await page("pass/index.html");
  const t = d.body.textContent;
  check("pass : 9 DT pour 12 mois, plus d'essai gratuit, 3 étapes de paiement (D17, IZI, 24 321 390), WhatsApp, pas de renouvellement automatique", js.length === 0 && /9 DT/.test(t) && /12 mois/.test(t) && !/essai gratuit/i.test(t)
    && d.querySelectorAll("#paiement .paie-etapes > li").length === 3 && /24 321 390/.test(t) && d.querySelector('a.btn-wa[href^="https://wa.me/21624321390"]') && /Pas de renouvellement automatique/.test(t));
  check("pass : description cachée quand « Paiement » est ouvert (règle commune, pages FR et ar/), bouton doré dans l'en-tête", d.querySelectorAll(".masque-si-paiement").length >= 1 && /masque-si-paiement/.test(lire("ar/pass/index.html")) && /:has\(> details\.paiement\[open\]\) > \.masque-si-paiement\{display:none\}/.test(lire("assets/style.css"))
    && d.querySelector("header .entete-pass"));
  check("pass : formulaire Formspree (site « Ma voiture Tunisie », formule 9 DT 12 mois), saisie du code", d.querySelector('#pass-form[action="https://formspree.io/f/mwlpakqj"] input[name="site"][value="Ma voiture Tunisie"]')
    && d.querySelector('#pass-form input[name="formule"][value="Pass Ma voiture - 9 DT - 12 mois"]') && d.getElementById("code-form"));
  // 24/11/2026 (règle d'Ahmed) : e-mail OBLIGATOIRE dans le formulaire du Pass (FR et ar/) ; sans e-mail -> message, rien n'est envoyé
  {
    const champOk = h => /<input id="pass-email" type="email" name="email" required maxlength="200" autocomplete="email">/.test(h);
    check("pass : champ e-mail obligatoire (name=\"email\" required) juste après le téléphone, pages FR et ar/", champOk(lire("pass/index.html")) && champOk(lire("ar/pass/index.html"))
      && d.querySelector("#pass-tel + label[for=pass-email] + input#pass-email[name=email][required]"));
    const { d: d2, w: w2 } = await page("pass/index.html");
    let envois = 0;
    w2.fetch = async () => { envois++; return { ok: true, status: 200, json: async () => ({}) }; };   // Formspree ET service d'e-mail comptés
    const f = d2.getElementById("pass-form");
    f.querySelector("[name=nom]").value = "Test"; f.querySelector("[name=telephone]").value = "24 321 390"; f.querySelector("[name=conditions]").checked = true;
    f.dispatchEvent(new w2.Event("submit", { bubbles: true, cancelable: true }));
    const vide = d2.getElementById("pass-status").textContent;
    f.querySelector("[name=email]").value = "pas-un-email";
    f.dispatchEvent(new w2.Event("submit", { bubbles: true, cancelable: true }));
    const faux = d2.getElementById("pass-status").textContent;
    check("pass : sans e-mail (« Indiquez votre e-mail : vous y recevez votre code et les étapes du paiement. ») ou e-mail invalide -> message d'erreur et rien n'est envoyé (ni Formspree ni e-mail automatique)",
      envois === 0 && vide === "Indiquez votre e-mail : vous y recevez votre code et les étapes du paiement." && /E-mail invalide/.test(faux));
    f.querySelector("[name=email]").value = "client@exemple.com";
    let corps = null;
    w2.fetch = async (u, o) => { if (/api-email\.clicvia\.com/.test(u)) return { ok: true }; envois++; corps = o && o.body; return { ok: true, status: 200, json: async () => ({}) }; };
    f.dispatchEvent(new w2.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 20));
    check("pass : avec un e-mail valide, la demande part à Formspree avec l'e-mail", envois === 1 && corps && corps.get("email") === "client@exemple.com" && /email: client@exemple\.com/.test(corps.get("pour_activer")));
  }
  check("aucune trace de l'ancien Pass Journée (Outils pratiques) dans les pages du Pass", !/Pass Journée|Outils pratiques|باقة اليوم/.test(lire("pass/index.html") + lire("pass/conditions/index.html")));
}

// ---- 8 bis. PARCOURS COMMUN DU PASS (25/11/2026, règle commune § 70, référence : outils communs/pass-commun/CONSIGNES.md de projets-ahmed)
// code de commande créé AU FORMULAIRE (même alphabet et même longueur que les codes d'accès), page « Dernière étape », motif = le code,
// WhatsApp avec le code, mémoire « pass-commande » (code, formule, date seulement), code essayé tout seul au retour
{
  const { webcrypto, pbkdf2Sync } = await import("crypto");
  const FORMAT = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
  const t0 = new Date(AUJ).getTime(), futur = new Date(t0 + 300 * 864e5).toISOString();
  const attendre = async (cond) => { for (let i = 0; i < 150 && !cond(); i++) await new Promise(r => setTimeout(r, 20)); };
  check("parcours commun : le format des codes de commande est celui des codes d'accès (alphabet sans O/0/I/1, 8 caractères), inchangé",
    /alphabet: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"/.test(lire("assets/pass.js")) && /longueur: 8,/.test(lire("assets/pass.js"))
    && /code: \{ alphabet: PASS\.alphabet, longueur: PASS\.longueur \}/.test(lire("assets/pass-reglages.js")));
  // 25/11/2026 (PASS.1, module commun du parcours d'achat, règle commune § 70.8) : assets/pass-commun.js = COPIE EXACTE du module de
  // projets-ahmed (« outils communs/pass-commun/pass-commun.js », recopié par synchroniser.py) ; assets/pass-reglages.js = ce qui est propre au site
  { const { createHash } = await import("crypto");
    const copie = readFileSync(join(root, "assets/pass-commun.js")), emp = createHash("sha256").update(copie).digest("hex");
    const attendue = existsSync(join(root, "assets/pass-commun.empreinte")) ? lire("assets/pass-commun.empreinte").trim() : "";
    check("module commun du Pass : assets/pass-commun.js NON modifié dans le site (empreinte écrite par synchroniser.py)", emp === attendue);
    const PROJ = [process.env.PROJETS_AHMED, join(root, "../projets-ahmed")].filter(Boolean).concat([join(root, "../../projets-ahmed"), join(root, "../.."), "/home/user/projets-ahmed"])
      .find(x => existsSync(join(x, "outils communs/pass-commun/pass-commun.js")));
    if (PROJ) check("module commun du Pass : copie identique au module de projets-ahmed (sinon : python3 synchroniser.py)",
      readFileSync(join(PROJ, "outils communs/pass-commun/pass-commun.js")).equals(copie));
    else console.log("  (comparaison avec le module de projets-ahmed sautée : dépôt absent, normal sur GitHub)");
    const scripts = h => (h.match(/<script src="[^"]*assets\/[^"?]+/g) || []).map(x => x.replace(/^.*assets\//, ""));
    const sp = scripts(lire("pass/index.html")), sa = scripts(lire("ar/pass/index.html"));
    check("module commun du Pass : pass/ et ar/pass/ chargent pass.js, puis pass-commun.js, puis pass-reglages.js (et seulement ces pages)",
      [sp, sa].every(x => x.indexOf("pass.js") >= 0 && x.indexOf("pass.js") < x.indexOf("pass-commun.js") && x.indexOf("pass-commun.js") === x.indexOf("pass-reglages.js") - 1)
      && !/pass-commun\.js/.test(lire("index.html") + lire("entretien/index.html") + lire("pass/conditions/index.html"))
      && !/brancherFormulairePass|nouveauCodeCommande|envoyerEmail/.test(lire("assets/pass.js")));
    const { w } = await page("pass/index.html");
    check(`module commun du Pass : branché sur le formulaire (version ${w.PassCommun && w.PassCommun.version}), réglage du site « voiture »`,
      !!w.PassCommun && w.PassCommun.reglage && w.PassCommun.reglage.site === "voiture" && w.document.getElementById("pass-form").getAttribute("data-branche") === "1"); }
  const emailsEnvoyes = [];   // JSON envoyés au service d'e-mail (FR puis AR), revérifiés plus bas par le VRAI verifier() du Worker
  for (const lang of ["fr", "ar"]) {
    const L = lang === "ar" ? " (ar/)" : "";
    const { w, d } = await page("pass/index.html", { lang });
    const f = d.getElementById("pass-form");
    { // 25/11/2026 : e-mail automatique EN SERVICE -> l'étiquette annonce « vous y recevez votre code et les étapes du paiement »
      const lab = d.querySelector('label[for="pass-email"]'), cache = lab && lab.querySelector(".email-auto");
      const court = lab ? lab.querySelector(`:scope > [data-l="${lang}"]`).textContent : "";
      check(`formulaire${L} : étiquette « ${lang === "ar" ? "البريد الإلكتروني" : "E-mail"} » seule, promesse « ${lang === "ar" ? "يصلك عليه رمزك وخطوات الدفع" : "vous y recevez votre code et les étapes du paiement"} » AFFICHÉE (EMAIL_AUTO = true)`,
        court === (lang === "ar" ? "البريد الإلكتروني" : "E-mail") && !!cache && !cache.hidden && /emailAuto: true,/.test(lire("assets/pass-reglages.js"))
        && cache.textContent.includes(lang === "ar" ? "يصلك عليه رمزك وخطوات الدفع" : "vous y recevez votre code et les étapes du paiement")); }
    const requis = ["nom", "telephone", "email", "conditions"].every(n => f.querySelector(`[name="${n}"][required]`)) && /\S/.test(f.querySelector('[name="formule"]').value);
    let envois = 0, corps = null;
    const emails = [];   // demandes au service d'e-mail automatique (A.17), gardées à part des envois Formspree
    w.fetch = async (u, o) => { if (/api-email\.clicvia\.com/.test(u)) { emails.push([String(u), o]); return { ok: true }; } envois++; corps = o && o.body; return { ok: true, status: 200, json: async () => ({}) }; };
    const remplir = (nom, tel, email, cond) => { f.querySelector("[name=nom]").value = nom; f.querySelector("[name=telephone]").value = tel; f.querySelector("[name=email]").value = email; f.querySelector("[name=conditions]").checked = cond; };
    const envoyer = () => f.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    for (const essai of [["", "24321390", "a@exemple.com", true], ["Client Test", "", "a@exemple.com", true], ["Client Test", "24321390", "", true], ["Client Test", "24321390", "a@exemple.com", false]]) { remplir(...essai); envoyer(); }
    check(`parcours commun${L} : formulaire à 5 champs obligatoires (nom, téléphone, e-mail, formule, conditions) : un seul manque = rien n'est envoyé, aucun code créé`,
      requis && envois === 0 && emails.length === 0 && !w.localStorage.getItem("pass-commande") && d.getElementById("apres-pass").hidden);
    remplir("Client Test", "+216 24 321 390", "client@exemple.com", true); envoyer();
    await attendre(() => !d.getElementById("apres-pass").hidden);
    const apres = d.getElementById("apres-pass"), code = (d.getElementById("commande-code") || {}).textContent || "";
    const ta = apres.textContent.replace(/\s+/g, " ");
    // lien WhatsApp lu tout de suite (les essais EMAIL_AUTO ci-dessous refont la page sans le nom, comme un retour sur la page)
    const wa = decodeURIComponent((apres.querySelector("a.btn-wa") || { href: "" }).href.split("?text=")[1] || "");
    check(`parcours commun${L} : après l'envoi, « Dernière étape » remplace le formulaire, code au bon format affiché en gros (dir=ltr)`,
      envois === 1 && f.hidden && !apres.hidden && FORMAT.test(code) && d.getElementById("commande-code").getAttribute("dir") === "ltr" && d.querySelector("#apres-pass .code-gros#commande-code"));
    // e-mail automatique EN SERVICE (25/11/2026) : la phrase « Vous le recevez aussi par e-mail » est AFFICHÉE
    const phraseEmail = [...apres.querySelectorAll(".commande-email")];
    const visibleP = el => { for (let e = el; e; e = e.parentElement) if (e.hidden || w.getComputedStyle(e).display === "none") return false; return true; };
    check(`parcours commun${L} : « ${lang === "ar" ? "يصلك أيضًا عبر البريد الإلكتروني" : "Vous le recevez aussi par e-mail"} » AFFICHÉ (e-mail automatique en service, EMAIL_AUTO = true)`,
      phraseEmail.length === 1 && visibleP(phraseEmail[0]) && phraseEmail[0].textContent.includes(lang === "ar" ? "يصلك أيضًا عبر البريد الإلكتروني." : "Vous le recevez aussi par e-mail.")
      && /emailAuto: true,/.test(lire("assets/pass-reglages.js")));
    { // UNE demande au service d'e-mail, en JSON, avec exactement les champs attendus par verifier() de worker.js (site « voiture »)
      const e = emails[0], j = e ? JSON.parse(e[1].body) : {};
      check(`e-mail automatique${L} : UNE demande à https://api-email.clicvia.com/inscription (POST, JSON) avec site voiture, langue ${lang}, nom, e-mail, CE code et la formule`,
        emails.length === 1 && e[0] === "https://api-email.clicvia.com/inscription" && e[1].method === "POST" && /application\/json/.test(e[1].headers["Content-Type"])
        && j.site === "voiture" && j.langue === lang && j.nom === "Client Test" && j.email === "client@exemple.com" && j.code === code
        && j.formule === "Pass Ma voiture - 9 DT - 12 mois" && !j.piege);
      emailsEnvoyes.push(j); }
    check(`parcours commun${L} : phrase « numéro de commande … motif du paiement » + filet de sécurité`, lang === "ar"
      ? ta.includes("هذا رقم طلبك: اكتبه في خانة سبب الدفع، يساعدنا على التعرّف على دفعتك.") && ta.includes("نسيت الرمز في سبب الدفع؟ لا بأس: أرسل الوصل على واتساب وسنجد طلبك.")
      : ta.includes("C'est votre numéro de commande : écrivez-le dans le motif du paiement, il nous sert à reconnaître votre paiement.") && ta.includes("Vous avez oublié le code dans le motif ? Ce n'est pas grave : envoyez quand même la preuve sur WhatsApp, nous retrouvons votre demande."));
    const etapes = [...apres.querySelectorAll(".paie-etapes > li")];
    check(`parcours commun${L} : paiement en 3 étapes (D17, IZI, ${lang === "ar" ? "24321390 sans espaces" : "24 321 390"}), motif = le code`,
      etapes.length === 3 && apres.querySelector('img[alt="D17"]') && apres.querySelector('img[alt="IZI"]') && etapes[1].textContent.includes(lang === "ar" ? "24321390" : "24 321 390")
      && etapes[2].textContent.includes(code) && (lang === "ar" ? /سبب الدفع/.test(etapes[2].textContent) : /Motif/.test(etapes[2].textContent)));
    check(`parcours commun${L} : bouton vert WhatsApp pré-rempli AVEC le code, le NOM (25/11/2026) et la formule`, lang === "ar"
      ? wa === "هذا وصل الدفع — مواعيد سيارتك — الرمز " + code + " — Client Test — باقة سيارتك - 9 د - 12 شهرًا" : wa === "Voici ma preuve de paiement — Ma voiture Tunisie — code " + code + " — Client Test — Pass Ma voiture - 9 DT - 12 mois");
    check(`parcours commun${L} : le code part à Formspree (champ code, sujet, ligne pour_activer « … ; code: CODE »)`,
      corps && corps.get("code") === code && /code [A-Z2-9]{8}$/.test(corps.get("_subject")) && corps.get("pour_activer") === `action: paye ; nom: Client Test ; telephone: 24321390 ; email: client@exemple.com ; code: ${code}`);
    let memo = {}; try { memo = JSON.parse(w.localStorage.getItem("pass-commande")); } catch (e) {}
    const tout = Object.keys(w.localStorage).map(k => w.localStorage.getItem(k)).join(" ");
    check(`parcours commun${L} : le téléphone garde « pass-commande » = { code, formule, date } SEULEMENT, aucune donnée personnelle dans localStorage`,
      Object.keys(memo).sort().join() === "code,date,formule" && memo.code === code && memo.date === "2026-10-09" && memo.formule === "Pass Ma voiture - 9 DT - 12 mois"
      && !/Client Test|24321390|24 321 390|client@exemple\.com/.test(tout));
    // retour sur la page : bandeau + étapes + WhatsApp, code essayé tout seul, pas encore activé = « En attente de votre paiement »
    const r = await page("pass/index.html", { lang, stockage: { "pass-commande": JSON.stringify(memo) }, avant: w2 => { Object.defineProperty(w2, "crypto", { value: webcrypto, configurable: true }); } });
    await attendre(() => /En attente|في انتظار/.test(r.d.getElementById("commande-statut").textContent));
    const ban = r.d.getElementById("commande-attente");
    check(`parcours commun${L} : retour sur la page = bandeau « commande en attente » (code + formule), « En attente de votre paiement », étapes et WhatsApp avec le code, « Nouvelle commande »`,
      !ban.hidden && ban.textContent.includes(code) && (lang === "ar" ? /طلبك في الانتظار/.test(ban.textContent) && /في انتظار دفعتك/.test(ban.textContent) : /Votre commande en attente :/.test(ban.textContent) && /En attente de votre paiement/.test(ban.textContent))
      && !r.d.getElementById("apres-pass").hidden && r.d.getElementById("pass-form").hidden && r.d.querySelector("#apres-pass a.btn-wa").href.includes(code) && !decodeURIComponent(r.d.querySelector("#apres-pass a.btn-wa").href).includes("Client Test") && r.d.getElementById("commande-nouvelle") && !r.w.eval("passActif()"));
    r.d.getElementById("commande-nouvelle").click();
    check(`parcours commun${L} : « Nouvelle commande » efface la mémoire et rouvre le formulaire`, !r.w.localStorage.getItem("pass-commande") && !r.d.getElementById("pass-form").hidden && r.d.getElementById("apres-pass").hidden && r.d.getElementById("commande-attente").hidden);
  }
  // code de commande ACTIVÉ (empreinte publiée par le robot privé) : le Pass s'ouvre tout seul, la commande est effacée
  {
    const SEL = "sel-de-test", TOURS = 1000, LISTE = { sel: SEL, tours: TOURS, codes: [{ h: pbkdf2Sync("KQ7MX3PA", SEL, TOURS, 32, "sha256").toString("hex"), fin: futur }] };
    const r = await page("pass/index.html", { stockage: { "pass-commande": JSON.stringify({ code: "KQ7MX3PA", formule: "Pass Ma voiture - 9 DT - 12 mois", date: "2026-10-01" }) },
      avant: w2 => { Object.defineProperty(w2, "crypto", { value: webcrypto, configurable: true }); w2.fetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(LISTE)) }); } });
    await attendre(() => !r.w.localStorage.getItem("pass-commande"));
    const garde = JSON.parse(r.w.localStorage.getItem("mv-pass-v1") || "{}");
    check("parcours commun : code de commande activé = Pass ouvert tout seul au retour (même vérification que « J'ai un code »), mémoire de la commande effacée",
      garde.code === "KQ7MX3PA" && garde.fin === futur && r.w.eval("passActif()") && !r.w.localStorage.getItem("pass-commande") && !r.d.getElementById("pass-etat").hidden
      && r.d.getElementById("commande-attente").hidden && !r.d.getElementById("pass-form").hidden && /Paiement reçu/.test(r.d.getElementById("code-status").textContent));
  }
  {
    const r = await page("pass/index.html", { stockage: { "pass-commande": JSON.stringify({ code: "KQ7MX3PA", formule: "x", date: "2026-08-09" }) } });
    check("parcours commun : commande gardée 60 jours au plus (au-delà : effacée, pas de bandeau)", !r.w.localStorage.getItem("pass-commande") && r.d.getElementById("commande-attente").hidden && !r.d.getElementById("pass-form").hidden);
    const r2 = await page("pass/index.html", { stockage: { "pass-commande": "{abîmé" } });
    check("parcours commun : mémoire abîmée = pas de plantage, formulaire normal", r2.js.length === 0 && !r2.d.getElementById("pass-form").hidden);
  }
  // textes : motif = le code de commande partout ; plus jamais « motif : nom et téléphone » ; l'étape 1 cite nom, téléphone WhatsApp et e-mail
  {
    const vieux = /motif[^.<]{0,80}(nom|téléphone)|(nom|téléphone)[^.<]{0,40}(pour|comme|en) motif|سبب الدفع[^.<]{0,40}(اسم|هاتف)|مع ذكر اسم|ذكر اسمك ورقم هاتفك|Nom et téléphone :/i, mal = [];
    for (const p of PAGES) if (vieux.test(lire(p))) mal.push(p);
    for (const fi of ["assets/pass.js", ...readdirSync(join(root, "tools/gabarits")).map(n => "tools/gabarits/" + n)]) if (vieux.test(lire(fi).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""))) mal.push(fi);
    check(`parcours commun : plus aucun « motif : nom et téléphone » (pages FR + AR, gabarits, pass.js) ${mal}`, mal.length === 0);
    const txt = h => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#39;/g, m => m === "&#39;" ? "'" : " ").replace(/[ ⁦-⁩]/g, " ").replace(/\s+/g, " ");
    const pf = txt(lire("pass/index.html")), pa = txt(lire("ar/pass/index.html")), cf = txt(lire("pass/conditions/index.html")), ca = txt(lire("ar/pass/conditions/index.html"));
    check("parcours commun : motif = code de commande sur la page du Pass, les conditions et « Comment fonctionne le site ? » (FR + AR) ; étape 1 = nom, téléphone WhatsApp et e-mail",
      pf.includes("(nom, téléphone WhatsApp et e-mail)") && pa.includes("الاسم وهاتف واتساب والبريد الإلكتروني") && /Motif : votre code de commande/.test(pf) && /سبب الدفع: رمز طلبك/.test(pa)
      && cf.includes("avec pour motif ce code de commande") && ca.includes("مع كتابة رمز الطلب في خانة سبب الدفع")
      && txt(lire("a-propos/index.html")).includes("à écrire comme motif du paiement") && txt(lire("ar/a-propos/index.html")).includes("تكتبه في خانة سبب الدفع")
      && cf.includes("12 mois à partir de l'activation du code"));
  }
  // e-mail automatique (A.17, 25/11/2026) : piège anti-robot rempli = rien n'est envoyé au service ; CSP qui permet l'envoi ;
  // JSON envoyé ACCEPTÉ par le VRAI verifier() du Worker (projets-ahmed/outils communs/email-clients ; absent sur GitHub = vérification sautée)
  {
    const { w, d } = await page("pass/index.html");
    const emails = [];
    w.fetch = async (u, o) => { if (/api-email\.clicvia\.com/.test(u)) emails.push(o); return { ok: true, status: 200, json: async () => ({}) }; };
    const f = d.getElementById("pass-form");
    f.querySelector("[name=nom]").value = "Robot"; f.querySelector("[name=telephone]").value = "24321390"; f.querySelector("[name=email]").value = "r@exemple.com";
    f.querySelector("[name=conditions]").checked = true; f.querySelector("[name=_gotcha]").value = "spam";
    f.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 20));
    check("e-mail automatique : piège anti-robot rempli = AUCUNE demande au service d'e-mail", emails.length === 0);
    const csp = h => /connect-src[^;"]*https:\/\/api-email\.clicvia\.com/.test(h);
    check("CSP des pages pass/ et ar/pass/ : connect-src autorise https://api-email.clicvia.com (sinon le navigateur bloque l'e-mail automatique)",
      csp(lire("pass/index.html")) && csp(lire("ar/pass/index.html")));
    const dossier = join(root, "..", "..", "projets-ahmed", "outils communs", "email-clients"), autre = "/home/user/projets-ahmed/outils communs/email-clients";
    const ec = existsSync(join(dossier, "worker.js")) ? dossier : existsSync(join(autre, "worker.js")) ? autre : "";
    if (!ec) console.log("  (vérification par le vrai verifier() du Worker sautée : projets-ahmed absent, normal sur GitHub)");
    else {
      const { writeFileSync, mkdtempSync } = await import("fs"), { tmpdir } = await import("os"), { pathToFileURL } = await import("url");
      const wk = readFileSync(join(ec, "worker.js"), "utf8").replace("/*SITES_ICI*/ {}", readFileSync(join(ec, "sites.json"), "utf8").trim());
      const fic = join(mkdtempSync(join(tmpdir(), "email-")), "worker.mjs"); writeFileSync(fic, wk);
      const W = await import(pathToFileURL(fic).href);
      const res = emailsEnvoyes.map(j => W.verifier(j, "https://voiture.clicvia.com"));
      check(`e-mail automatique : le JSON envoyé (FR et AR) est ACCEPTÉ par le vrai verifier() du Worker (site voiture) ${res.map(r => r.erreur || "ok")}`,
        emailsEnvoyes.length === 2 && res.every(r => r.d && r.d.cle === "voiture") && res[0].d.langue === "fr" && res[1].d.langue === "ar"
        && res.every((r, i) => r.d.code === emailsEnvoyes[i].code && r.d.prix === 9));
    }
  }
}

// ---- 9. bouton Partager et pied de page sur TOUTES les pages (règle commune)
{
  const manque = [];
  for (const p of PAGES.filter(x => !x.startsWith("ar/"))) {      // chaque page en français, puis sa version arabe (ar/…)
    const { d } = await page(p);
    if (d.querySelectorAll("header .partager").length !== 1) manque.push(p + " partager");
    if (!d.querySelector('footer a[href$="#avis"]')) manque.push(p + " votre avis");
    if (!d.querySelector('.menu a[href="https://auto-ecoles.clicvia.com/"]') || !d.querySelector('.menu a[href="https://code.clicvia.com/"]')) manque.push(p + " liens sites");
    // 17/11/2026 : liens vers les pages communes « Confidentialité » et « Conditions d'utilisation » de clicvia.com, dans la langue de la page
    const lien = (dd, u, t) => [...dd.querySelectorAll("footer nav a")].some(a => a.getAttribute("href") === u && a.textContent.trim() === t);
    if (!lien(d, "https://clicvia.com/confidentialite/", "Confidentialité") || !lien(d, "https://clicvia.com/conditions/", "Conditions d'utilisation")) manque.push(p + " confidentialité/conditions (fr)");
    const da = (await page(p, { lang: "ar" })).d;
    if (da.documentElement.lang !== "ar" || !lien(da, "https://clicvia.com/ar/confidentialite/", "الخصوصية") || !lien(da, "https://clicvia.com/ar/conditions/", "شروط الاستعمال")) manque.push(p + " confidentialité/conditions (ar)");
  }
  check(`toutes les pages : bouton Partager dans l'en-tête, « Votre avis » au pied, liens Code de la route et Auto-écoles, liens Confidentialité / Conditions d'utilisation (fr + ar) ${manque.join(" | ")}`, !manque.length);
}
// Page 404 commune (17/11/2026, règle commune § 58 point 14 ; modèle : outils communs/page-404 de projets-ahmed) : sinon GitHub montre sa page anglaise
check("page 404 commune à la racine publiée : 404.html (nom du site, couleur) + 404.js qui cherche la page (« Recherche de la page »)",
  existsSync(join(root, "404.html")) && existsSync(join(root, "404.js")) && lire("404.html").includes("<title>Page introuvable — Ma voiture Tunisie</title>")
  && lire("404.html").includes('<script src="/404.js"></script>') && lire("404.js").includes("Recherche de la page"));
check("À propos : la page introuvable et les liens Confidentialité / Conditions sont expliqués (FR + AR)", lire("a-propos/index.html").includes("Page introuvable, confidentialité, conditions") && lire("ar/a-propos/index.html").includes("صفحة غير موجودة، الخصوصية، الشروط"));

// ---- 25/11/2026 (décision d'Ahmed : amener vers le Pass, PAS de gratuité) : un seul nom « Pass Ma voiture » / « باقة سيارتك » (V.1),
//      encadré « Vous avez plusieurs voitures ? » sur vignette/ et visite-technique/ (V.2), clics vers pass/ comptés (/ma-voiture-tunisie/clic/<nom>)
{
  const anciens = /Pass Rappels|باقة التذكير|باقة سيارتي(?!ك)/;
  const ou = [...PAGES, "assets/page.js", "assets/pass.js", "assets/accueil.js", "assets/carnet.js", "assets/pass-reglages.js", ...readdirSync(join(root, "tools/gabarits")).map(f => "tools/gabarits/" + f)]
    .filter(f => existsSync(join(root, f)) && anciens.test(f.startsWith("assets/page.js") ? lire(f).replace(/\/\/[^\n]*/g, "") : lire(f)));
  check("un seul nom pour l'offre : « Pass Ma voiture » / « باقة سيارتك » partout (plus jamais « Pass Rappels », « باقة التذكير » ni « باقة سيارتي »)" + (ou.length ? " — " + ou.slice(0, 4).join(", ") : ""), !ou.length);
  for (const lang of ["fr", "ar"]) {
    const { d, js } = await page("pass/index.html", { lang }), e = d.querySelector(".entete-pass .long"), p = d.querySelector('#pied a[data-clic="pass-pied"]');
    const nom = lang === "fr" ? "Pass Ma voiture" : "باقة سيارتك";
    check(`${lang} : bouton de l'en-tête des pages du Pass et lien du pied de page = « ${nom} » (clics « pass-entete » / « pass-pied »)`,
      !js.length && e && e.textContent.trim() === nom && e.closest("a").getAttribute("data-clic") === "pass-entete" && p && p.textContent.trim() === nom && /pass\/$/.test(p.getAttribute("href")));
  }
  { const { d } = await page("vignette/index.html");
    check("en-tête : pas de bouton du Pass hors des pages du Pass (accueil, vignette : décision d'Ahmed)", !d.querySelector(".entete-pass") && !(lire("index.html").match(/class="entete-pass/))); }
  // V.2 : encadré sur vignette/ et visite-technique/, FR + ar/ ; 28/11/2026 : aussi carburant/ et achat-vente/ (texte propre à chaque page)
  const enc = h => (h.match(/<!--encadre-pass-->([\s\S]*?)<!--\/encadre-pass-->/) || [])[1] || "";
  const ko = [];
  const PLUS = [/Vous avez plusieurs voitures \? Rappels pour 5 voitures et carnet des dépenses : Pass Ma voiture, 9 DT par an\./, /لديك أكثر من سيارة؟ تذكيرات لـ 5 سيارات ودفتر المصاريف: باقة سيارتك، 9 د في السنة\./];
  const ENCADRES = [["vignette/", "pass-vignette", ...PLUS], ["visite-technique/", "pass-visite", ...PLUS],
    ["carburant/", "pass-carburant", /Suivez vos pleins et toutes vos dépenses de voiture dans le carnet des dépenses : Pass Ma voiture, 9 DT par an\./, /تابع تعبئاتك وكل مصاريف سيارتك في دفتر المصاريف: باقة سيارتك، 9 د في السنة\./],
    ["achat-vente/", "pass-achat-vente", /Vous changez de voiture ou en avez plusieurs \? Rappels pour 5 voitures et carnet des dépenses : Pass Ma voiture, 9 DT par an\./, /تغيّر سيارتك أو لديك أكثر من سيارة؟ تذكيرات لـ 5 سيارات ودفتر المصاريف: باقة سيارتك، 9 د في السنة\./]];
  for (const [ch, clic, reFr, reAr] of ENCADRES) for (const pref of ["", "ar/"]) {
    const h = lire(pref + ch + "index.html"), e = enc(h), t = e.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/[ ⁦-⁩]/g, " ").replace(/\s+/g, " ");
    const bon = pref ? reAr.test(t) && !/[A-Za-z]{3,}/.test(t)
      : reFr.test(t) && !/[؀-ۿ]/.test(t);
    const a = e.match(/<a class="btn-pass-grand" id="encadre-btn" href="([^"]*)" data-clic="([a-z0-9-]+)">/) || [];
    if (!bon || a[1] !== "../pass/" || a[2] !== clic || (h.match(/id="encadre-pass"/g) || []).length !== 1 || /gratuit|offert|essai|مجان|تجربة/i.test(t)) ko.push(pref + ch);
  }
  check("encadré du Pass Ma voiture (texte lié à la page, 5 voitures + carnet, 9 DT par an) sur vignette/, visite-technique/, carburant/ et achat-vente/ (FR + ar/), vrai bouton vers pass/, clic compté, aucune gratuité" + (ko.length ? " — " + ko.join(", ") : ""), !ko.length);
  // C.1 : clics comptés (faux GoatCounter) ; sans GoatCounter (bloqué) : rien, aucune erreur
  const essai = async (chemin, lang, sel, nom, { stockage, avantClic } = {}) => {
    for (const gc of [true, false]) {
      const { w, d, js } = await page(chemin, { lang, stockage }), comptes = [];
      if (gc) w.goatcounter.count = o => comptes.push(o); else delete w.goatcounter.count;
      if (avantClic) avantClic(d);
      comptes.length = 0;   // (l'accueil compte déjà « pass-bloque/voitures » à l'ouverture de l'encart : seul le clic compte ici)
      const a = d.querySelector(sel);
      if (a) { a.addEventListener("click", e => e.preventDefault()); a.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); }
      check(gc ? `clic compté (faux GoatCounter) ${lang} ${chemin} ${sel} → événement « /ma-voiture-tunisie/clic/${nom} »` : `sans GoatCounter (bloqué) ${lang} ${chemin} ${sel} : aucun compte, aucune erreur`,
        !!a && !js.length && (gc ? comptes.length === 1 && comptes[0].path === "/ma-voiture-tunisie/clic/" + nom && comptes[0].event === true && !!comptes[0].title : !comptes.length));
    }
  };
  await essai("vignette/index.html", "fr", "#encadre-btn", "pass-vignette");
  await essai("visite-technique/index.html", "ar", "#encadre-btn", "pass-visite");
  for (const lang of ["fr", "ar"]) { await essai("carburant/index.html", lang, "#encadre-btn", "pass-carburant"); await essai("achat-vente/index.html", lang, "#encadre-btn", "pass-achat-vente"); }
  await essai("carburant/index.html", "fr", '#pied a[data-clic="pass-pied"]', "pass-pied");
  await essai("entretien/index.html", "ar", "#carnet-encart .btn-pass-grand", "pass-entretien", { stockage: { "mv-voitures-v1": VOITURE } });
  await essai("index.html", "fr", "#encart-voitures .btn-pass-grand", "pass-2e-voiture", { stockage: { "mv-voitures-v1": VOITURE }, avantClic: d => clic(d, "#ajouter-voiture") });
  check("rappel de fin du Pass : « Renouveler mon Pass » compté (« pass-rappel »)", /pass\/#offre" data-clic="pass-rappel">/.test(lire("assets/pass.js")));
}
// 25/10/2026 (RÈGLE d'Ahmed, règle commune § 44 : « la page Comment fonctionne le site doit être mise à jour chaque fois qu'on modifie le site ») :
// chaque fonction visible du site (repère dans le code ou les pages) doit être expliquée dans a-propos/ (gabarit tools/gabarits/a-propos.html) ; nouvelle fonction = une ligne ici + son explication FR + AR
{ const brut = lireSource("a-propos/index.html"), ap = brut.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/[\u00a0\u2066-\u2069]/g, " ").replace(/\s+/g, " ");
  const acc = lireSource("index.html"), js = ["page.js", "pass.js", "accueil.js", "agenda.js", "carnet.js", "echeances.js"].map(f => existsSync(join(root, "assets", f)) ? lire("assets/" + f) : "").join("\n");
  const FONCTIONS = [
    ["Mes échéances (accueil)", /Mes prochaines échéances/.test(acc), /Mes échéances \(accueil\) : remplissez la fiche de votre voiture/],
    ["rappels .ics dans l'agenda", /\.ics|text\/calendar/.test(js), /Rappels dans l'agenda : un fichier « \.ics »/],
    ["vignette", existsSync(join(root, "vignette/index.html")), /Vignette : le barème, la date limite/],
    ["visite technique + rendez-vous ATTT", /Prendre rendez-vous/.test(lire("visite-technique/index.html")), /Visite technique : le prix, la prochaine date et le bouton « Prendre rendez-vous »/],
    ["carburant et coût d'un trajet", existsSync(join(root, "carburant/index.html")), /Carburant : les prix officiels et le coût d'un trajet/],
    ["acheter ou vendre (mutation, Documents, Douane, crédit)", existsSync(join(root, "achat-vente/index.html")), /Acheter ou vendre : les frais de mutation[^.]*Douane[^.]*crédit/],
    ["entretien et carnet exportable", /exporterCarnet/.test(js), /Entretien et carnet des dépenses : repères d'entretien, et un carnet[^.]*exporter/],
    ["nos autres sites gratuits", /Gratuit aussi sur nos sites/.test(acc), /Nos autres sites gratuits : Code de la route, Auto-écoles/],
    ["langue FR / AR", /class="langue"/.test(js), /Français \/ arabe : le bouton de langue/],
    ["une adresse par langue (ar/)", existsSync(join(root, "ar/index.html")) && /autreLangue/.test(js), /Une adresse par langue : chaque page existe en français et en arabe \(voiture\.clicvia\.com\/ar\//],
    ["bouton Partager", /class="partager"/.test(js), /Partager : le bouton rond/],
    ["Votre avis", /id="avis"/.test(acc), /Votre avis : un formulaire/],
    ["installation et hors connexion", existsSync(join(root, "sw.js")), /Installer sur le téléphone/],
    ["vidéo de présentation", existsSync(join(root, "video/index.html")), /Vidéo de présentation : courte vidéo/],
    ["une voiture gratuite et Pass Ma voiture (prix, 5 voitures, code)", existsSync(join(root, "pass/index.html")), /une voiture avec ses rappels[\s\S]*Pass Ma voiture \(payant, 9 DT pour 12 mois\) ajoute jusqu'à 5 voitures[\s\S]*code/],
    ["encadré du Pass Ma voiture sur vignette, visite technique, carburant et achat-vente, clics comptés (25/11 et 28/11/2026)", /id="encadre-pass"/.test(lire("carburant/index.html")) && /id="encadre-pass"/.test(lire("achat-vente/index.html")) && /clic\//.test(js), /Pass Ma voiture sur les pages vignette, visite technique, carburant et achat-vente : un encadré lié à la page \(« Vous avez plusieurs voitures \? »[\s\S]{0,120}« Suivez vos pleins et toutes vos dépenses » sur le carburant, « Vous changez de voiture ou en avez plusieurs \? » sur l'achat-vente\)[\s\S]{0,200}Les clics vers la page du Pass sont comptés, sans savoir qui clique/],
    ["e-mail de confirmation automatique (A.17, 25/11/2026)", /const EMAIL_AUTO = true;/.test(js), /E-mail de confirmation : dans la minute qui suit, vous recevez aussi tout cela par e-mail[\s\S]*Resend/],
    ["rappel de fin du Pass", /afficherRappel/.test(js), /avant la fin du Pass, un bandeau vous prévient/],
    ["code de commande au formulaire = motif du paiement, reconnu tout seul (parcours commun du Pass, 25/11/2026)", /pass-commande/.test(js), /le formulaire vous donne aussitôt votre code de commande, à écrire comme motif du paiement[^.]*la page du Pass le reconnaît toute seule/],
    ["vie privée", true, /Vos voitures, vos dates et vos dépenses sont gardées dans votre téléphone/],
    ["mises à jour automatiques", existsSync(join(root, "tools/surveillance.py")), /Un robot surveille chaque jour les annonces officielles/],
    ["site indépendant", true, /Ce site est indépendant/],
    ["éditeur Clicvia (données pour Google, 22/11/2026)", /clicvia\.com\/#organisation/.test(acc), /Publié par Clicvia/]];
  const manque = FONCTIONS.filter(([, sur, re]) => sur && !re.test(ap)).map(([n]) => n);
  check(`page « Comment fonctionne le site ? » à jour : titre et chaque fonction du site expliquée (${FONCTIONS.length} fonctions)` + (manque.length ? " — manque : " + manque.join(", ") : ""),
    manque.length === 0 && /<h1>[^]*?Comment fonctionne le site \?[^]*?كيف يعمل الموقع؟[^]*?<\/h1>/.test(brut)
    && /a-propos\/">\$\{T\("Comment fonctionne le site \?"/.test(lire("assets/page.js")) && /id="lien-fonctionnement"/.test(acc)); }


// ---- UNE ADRESSE PAR LANGUE (21/11/2026, règle commune § 8 point 9 : « une adresse par langue, jamais seulement ?lang= ») ----
// sources bilingues (tools/gabarits/, tools/sources/index.html) -> <chemin>/index.html (français seul) + ar/<chemin>/index.html (arabe seul)
{
  const chemins = ["", "vignette/", "visite-technique/", "carburant/", "achat-vente/", "entretien/", "pass/", "pass/conditions/", "a-propos/"];
  check("une adresse par langue : chaque page publique a sa version arabe ar/…, et aucune page arabe sans page française",
    chemins.every(c => existsSync(join(root, "ar", c, "index.html"))) && PAGES.filter(p => p.startsWith("ar/")).every(p => existsSync(join(root, p.slice(3)))));
  // pages fabriquées à jour (sinon on a modifié une page à la main au lieu de sa source)
  let aJour = false, sortie = "";
  for (const py of [process.env.PYTHON, "python3", "python"].filter(Boolean)) {
    try { sortie = execSync(`${py} tools/construire.py --verifier`, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); aJour = true; break; }
    catch (e) { sortie = (e.stdout || "") + (e.stderr || ""); if (/ÉCHEC/.test(sortie)) break; }
  }
  check(`une adresse par langue : pages fabriquées à jour (python tools/construire.py --verifier) ${aJour ? "" : sortie.trim()}`, aJour);
  const tete = h => [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => m[1] + "=" + m[2]).sort().join(" ");
  const mal = [], titresAr = new Map();
  for (const c of chemins) {
    const fr = lire(c + "index.html"), ar = lire("ar/" + c + "index.html");
    const attendu = [`ar=${BASE}ar/${c}`, `fr=${BASE}${c}`, `x-default=${BASE}${c}`].sort().join(" ");
    if (!/<html lang="fr" dir="ltr"[^>]*data-langue-fixe="fr"/.test(fr) || /data-l="ar"/.test(fr)) mal.push(c + " : page française pas seule");
    if (!/<html lang="ar" dir="rtl"[^>]*data-langue-fixe="ar"/.test(ar) || /data-l="fr"/.test(ar)) mal.push(c + " : page arabe pas seule");
    if (/[؀-ۿ]/.test((fr.match(/<title>([^<]*)<\/title>/) || [])[1] + (fr.match(/name="description" content="([^"]*)"/) || [])[1])) mal.push(c + " : titre ou description française avec de l'arabe");
    if (tete(fr) !== attendu || tete(ar) !== attendu) mal.push(c + " : hreflang fr / ar / x-default pas réciproques");
    if (!fr.includes(`<link rel="canonical" href="${BASE}${c}">`) || !ar.includes(`<link rel="canonical" href="${BASE}ar/${c}">`)) mal.push(c + " : canonical");
    if (!fr.includes(`<meta property="og:url" content="${BASE}${c}">`) || !ar.includes(`<meta property="og:url" content="${BASE}ar/${c}">`)) mal.push(c + " : og:url");
    if (!fr.includes('<meta property="og:locale" content="fr_FR">') || !ar.includes('<meta property="og:locale" content="ar_AR">')) mal.push(c + " : og:locale");
    if (/ld\+json/.test(ar)) mal.push(c + " : FAQ Google française sur la page arabe");
    const t = (ar.match(/<title>([^<]*)<\/title>/) || [])[1] || "", de = (ar.match(/name="description" content="([^"]*)"/) || [])[1] || "";
    if (!/[؀-ۿ]/.test(t) || t.length < 10 || t.length > 70) mal.push(c + ` : titre arabe (${t.length})`);
    if (!/[؀-ۿ]/.test(de) || de.length < 40 || de.length > 170) mal.push(c + ` : description arabe (${de.length})`);
    if (titresAr.has(t)) mal.push(c + " : même titre arabe que " + titresAr.get(t)); titresAr.set(t, c);
    // liens relatifs de la page arabe : fichiers à la racine, pages dans ar/ ; tout doit exister
    for (const m of ar.matchAll(/\b(?:href|src)="(?![a-z]+:|\/\/|#|\?)([^"#?]*)[^"]*"/g)) {
      const cible = join(root, "ar", c, m[1]);
      if (!existsSync(cible) || (statSync(cible).isDirectory() && !existsSync(join(cible, "index.html")))) mal.push(c + " : lien mort " + m[1]);
      else if (/\/$|^\.\.\/$|^$/.test(m[1]) && !cible.startsWith(join(root, "ar")) && !/video\/$/.test(m[1])) mal.push(c + " : la page arabe mène vers une page française " + m[1]);
    }
  }
  check(`une adresse par langue : chaque page en français seul ET en arabe seul (lang, dir), hreflang réciproques, canonical, og:url, og:locale, titres arabes uniques <= 70, liens valides ${mal.join(" | ")}`, mal.length === 0);
  const locs = [...lire("sitemap.xml").matchAll(/<loc>https:\/\/voiture\.clicvia\.com\/([^<]*)<\/loc>/g)].map(m => m[1]);
  check("plan du site : pages françaises ET arabes (ar/…) + video/", chemins.every(c => locs.includes(c) && locs.includes("ar/" + c)) && locs.includes("video/"));
  // menu et pied de la page arabe : liens vers les pages ARABES
  const wa = (await page("vignette/index.html", { lang: "ar" })).d;
  const liensAr = [...wa.querySelectorAll("#entete nav.menu a:not(.menu-annuaire), #pied nav a")].map(a => a.href).filter(h => h.startsWith(BASE));
  check("page arabe : menu et pied de page mènent aux pages arabes (ar/…), logo -> ar/", liensAr.length >= 12 && liensAr.every(h => h.startsWith(BASE + "ar/")) && wa.querySelector("#entete a.logo").href === BASE + "ar/");
  const wf = (await page("vignette/index.html")).d;
  check("page française : menu et pied de page restent en français", [...wf.querySelectorAll("#entete nav.menu a:not(.menu-annuaire), #pied nav a")].map(a => a.href).filter(h => h.startsWith(BASE)).every(h => !h.startsWith(BASE + "ar/")));
  // bouton de langue et renvoi d'un ancien lien « ?lang=ar » : vers l'autre adresse (mêmes paramètres, même ancre)
  async function avecRenvoi(chemin, suite, referrer, stockage = {}) {
    const dossier = dirname(chemin), allers = [];
    const html = lire(chemin).replace(/<script[^>]*gc\.zgo\.at[^>]*><\/script>/, "")
      .replace(/<script( defer)? src="((?:\.\.\/)*assets\/[^"?]+)(\?[^"]*)?"( defer)?><\/script>/g, (_, d, f) => `<script>${lire(join(dossier, f).replace(/\\/g, "/"))}</script>`);
    const dom = new JSDOM(html, { url: BASE + chemin.replace(/index\.html$/, "") + suite, referrer, runScripts: "dangerously", pretendToBeVisual: true,
      virtualConsole: new VirtualConsole(), beforeParse(w) { w.allerVers = u => allers.push(new URL(u, w.location.href).href); for (const [k, v] of Object.entries(stockage)) w.localStorage.setItem(k, v); w.scrollTo = () => {}; } });
    await new Promise(ok => setTimeout(ok, 60));
    return { w: dom.window, allers };
  }
  let r = await avecRenvoi("vignette/index.html", "?lang=ar#bareme");
  check("ancien lien vignette/?lang=ar#bareme -> renvoyé vers ar/vignette/#bareme", r.allers.length === 1 && r.allers[0] === BASE + "ar/vignette/#bareme");
  r = await avecRenvoi("ar/carburant/index.html", "?x=1");
  check("page arabe ouverte directement (lien partagé, Google) : aucun renvoi, page en arabe", r.allers.length === 0 && r.w.document.documentElement.lang === "ar");
  r.w.document.querySelector("#entete button.langue").click();
  check("bouton de langue de la page arabe -> page française, mêmes paramètres", r.allers.length === 1 && r.allers[0] === BASE + "carburant/?x=1"
    && r.w.document.querySelector("#entete button.langue").textContent === "Fr");
  r = await avecRenvoi("index.html", "");
  r.w.document.querySelector("#entete button.langue").click();
  check("bouton de langue de l'accueil -> ar/", r.allers.length === 1 && r.allers[0] === BASE + "ar/");
  r = await avecRenvoi("pass/conditions/index.html", "", "https://www.google.com/", { langue: "ar" });
  check("page française venue de Google avec l'arabe gardé dans le téléphone : reste en français (jamais de bascule pour un lien extérieur)", r.allers.length === 0 && r.w.document.documentElement.lang === "fr");
  r = await avecRenvoi("pass/conditions/index.html", "", BASE + "ar/pass/", { langue: "ar" });
  check("page française ouverte depuis une page arabe du site (arabe gardé) -> renvoyée vers ar/pass/conditions/", r.allers.length === 1 && r.allers[0] === BASE + "ar/pass/conditions/");
  // calculs justes en arabe
  const { d: dv, js: jv } = await page("vignette/index.html", { lang: "ar" });
  check("page arabe de la vignette : exemple 6 CV essence → 130,000, date limite 05/03/2027, aucune erreur", jv.length === 0 && /130,000/.test(dv.getElementById("v-montant")?.textContent || dv.body.textContent)
    && /05\/03\/2027/.test(dv.body.textContent) && dv.documentElement.dir === "rtl");
  const { d: dc, js: jc } = await page("carburant/index.html", { lang: "ar" });
  const { d: dcf } = await page("carburant/index.html");
  const nombres = el => (el.textContent.match(/\d[\d  ]*,\d{3}/g) || []).join("|");
  check("page arabe du carburant : même coût de trajet qu'en français, aucune erreur", jc.length === 0 && nombres(dc.querySelector("main")) && nombres(dc.querySelector("main")) === nombres(dcf.querySelector("main")));
  const { d: dm, js: jm } = await page("achat-vente/index.html", { lang: "ar" });
  const { d: dmf } = await page("achat-vente/index.html");
  check("page arabe d'achat-vente : mêmes frais de mutation qu'en français, aucune erreur", jm.length === 0 && nombres(dm.querySelector("main")) === nombres(dmf.querySelector("main")) && /\d/.test(nombres(dm.querySelector("main"))));
  const { w: wi, d: di, js: ji } = await page("index.html", { lang: "ar", stockage: { "mv-voitures-v1": VOITURE } });
  const ics = wi.fabriquerIcs ? wi.fabriquerIcs([{ id: "x", date: new wi.Date("2027-03-05T12:00:00"), titre: "معلوم الجولان", description: "اختبار" }]) : "";
  check("accueil arabe (ar/) : échéances calculées (vignette 05/03/2027), fichier agenda valide, liens « كل التفاصيل » vers ar/…", ji.length === 0 && /05\/03\/2027/.test(di.getElementById("liste-echeances").textContent)
    && /DTSTART;VALUE=DATE:20270305/.test(ics) && [...di.querySelectorAll("#liste-echeances a.lien-ech")].every(a => a.href.startsWith(BASE + "ar/")));
}

// VIS.3 point 4 (27/11/2026) : l'accueil (FR et AR) garde au moins 450 / 350 mots lisibles SANS JavaScript (hors en-tête, menu et pied) :
// Google le classait « explorée, non indexée » ; section « Les échéances de votre voiture en Tunisie » (faits sourcés du site)
for (const [f, min] of [["index.html", 450], ["ar/index.html", 350]]) {
  const s = readFileSync(join(root, f), "utf8").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/g, " ")
    .replace(/<header[\s\S]*?<\/header>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const mots = s.split(" ").filter(Boolean).length;
  check(`${f} : ${mots} mots lisibles sans JavaScript (${min} au moins, pour Google et les IA) et section des échéances`, mots >= min && /class="carte essentiel"/.test(readFileSync(join(root, f), "utf8")));
}

console.log(`\n${erreurs ? erreurs + " PROBLÈME(S)" : "TOUT PASSE"} (${total} vérifications)`);
process.exit(erreurs ? 1 : 0);
