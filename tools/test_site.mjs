// Tests de Ma voiture Tunisie (faux navigateur jsdom) — à lancer après chaque modification :  node tools/test_site.mjs
// Accepte un dossier en argument pour tester une copie sabotée. Date du test FIXÉE (jamais la date du jour : règle commune).
// jsdom : npm install --no-save --no-package-lock jsdom (sur le PC, repris au besoin du dossier de Documents Tunisie).
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const require = createRequire(import.meta.url);
let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = require("jsdom")); }
catch (e) { ({ JSDOM, VirtualConsole } = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../../../documents Tunisie/site/package.json"))("jsdom")); }

const root = process.argv[2] ? resolve(process.argv[2]) : join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = f => readFileSync(join(root, f), "utf8");
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
async function page(chemin = "index.html", { quand = AUJ, stockage = {}, lang } = {}) {
  const dossier = dirname(chemin);
  let html = lire(chemin).replace(/<script[^>]*gc\.zgo\.at[^>]*><\/script>/, "")
    .replace(/<script( defer)? src="((?:\.\.\/)*assets\/[^"?]+)(\?[^"]*)?"><\/script>/g, (_, d, f) => `<script>${lire(join(dossier, f).replace(/\\/g, "/"))}</script>`);
  const vc = new VirtualConsole(), js = [];
  vc.on("jsdomError", e => { if (!/Not implemented/.test(e.message)) js.push(e.message); });
  const url = BASE + (chemin === "index.html" ? "" : chemin.replace(/index\.html$/, "")) + (lang ? "?lang=" + lang : "");
  const dom = new JSDOM(html, { url, runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
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
  check("pass : description cachée quand « Paiement » est ouvert (règle commune), bouton doré dans l'en-tête", d.querySelectorAll(".masque-si-paiement").length >= 2 && /:has\(> details\.paiement\[open\]\) > \.masque-si-paiement\{display:none\}/.test(lire("assets/style.css"))
    && d.querySelector("header .entete-pass"));
  check("pass : formulaire Formspree (site « Ma voiture Tunisie », formule 9 DT 12 mois), saisie du code", d.querySelector('#pass-form[action="https://formspree.io/f/mwlpakqj"] input[name="site"][value="Ma voiture Tunisie"]')
    && d.querySelector('#pass-form input[name="formule"][value="Pass Ma voiture - 9 DT - 12 mois"]') && d.getElementById("code-form"));
  check("aucune trace de l'ancien Pass Journée (Outils pratiques) dans les pages du Pass", !/Pass Journée|Outils pratiques|باقة اليوم/.test(lire("pass/index.html") + lire("pass/conditions/index.html")));
}

// ---- 9. bouton Partager et pied de page sur TOUTES les pages (règle commune)
{
  const manque = [];
  for (const p of PAGES) {
    const { d } = await page(p);
    if (d.querySelectorAll("header .partager").length !== 1) manque.push(p + " partager");
    if (!d.querySelector('footer a[href$="#avis"]')) manque.push(p + " votre avis");
    if (!d.querySelector('.menu a[href="https://auto-ecoles.clicvia.com/"]') || !d.querySelector('.menu a[href="https://code.clicvia.com/"]')) manque.push(p + " liens sites");
  }
  check(`toutes les pages : bouton Partager dans l'en-tête, « Votre avis » au pied, liens Code de la route et Auto-écoles ${manque.join(" | ")}`, !manque.length);
}

console.log(`\n${erreurs ? erreurs + " PROBLÈME(S)" : "TOUT PASSE"} (${total} vérifications)`);
process.exit(erreurs ? 1 : 0);
