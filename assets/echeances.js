/* Moteur des échéances (accueil « Mes échéances ») : à partir des renseignements d'une voiture, calcule la prochaine
   date de chaque échéance — vignette, visite technique, assurance, vidange — avec le nombre de jours restants.
   Les règles officielles sont dans assets/regles.js (objet REGLES). Tout est calculé dans le téléphone.
   Les voitures sont gardées dans le téléphone (localStorage « mv-voitures-v1 », toujours dans un try, valeurs validées :
   la mémoire du navigateur est partagée par tous les sites d'ah6259.github.io). */
const CLE_VOITURES = "mv-voitures-v1";
/* ---- une voiture (valeurs nettoyées) ---- */
const ENERGIES = ["essence", "diesel", "gpl", "hybride", "electrique"];
const GROUPES = ["pair", "impair", "societe", "location"];
function voitureValide(v) {
  if (!v || typeof v !== "object") return null;
  const n = (x, min, max) => { if (x === "" || x === null || x === undefined) return null; const y = Math.round(+x); return isFinite(y) && y >= min && y <= max ? y : null; };
  return {
    id: /^[a-z0-9]{4,12}$/.test(v.id || "") ? v.id : Math.random().toString(36).slice(2, 10),
    nom: String(v.nom || "").slice(0, 30),
    groupe: GROUPES.includes(v.groupe) ? v.groupe : "",          // date limite de la vignette : numéro pair / impair, société, location
    energie: ENERGIES.includes(v.energie) ? v.energie : "essence",
    cv: n(v.cv, 1, 60),                                 // puissance fiscale (carte grise)
    circulation: lireDate(v.circulation) ? v.circulation : "",   // 1re mise en circulation
    visite: lireDate(v.visite) ? v.visite : "",                  // date de la dernière visite technique (facultatif)
    assurance: lireDate(v.assurance) ? v.assurance : "",         // fin de l'assurance
    vidange: lireDate(v.vidange) ? v.vidange : "",               // date de la dernière vidange
    kmVidange: n(v.kmVidange, 0, 2000000),
    km: n(v.km, 0, 2000000),                                     // kilométrage aujourd'hui
    kmMois: n(v.kmMois, 0, 20000),                               // kilomètres par mois (environ)
    vu: lireDate(v.vu) ? v.vu : ""                               // jour où le kilométrage a été noté
  };
}
function lireVoitures() {
  try {
    const t = JSON.parse(localStorage.getItem(CLE_VOITURES) || "[]");
    return Array.isArray(t) ? t.map(voitureValide).filter(Boolean).slice(0, 5) : [];
  } catch (e) { return []; }
}
function ecrireVoitures(t) { try { localStorage.setItem(CLE_VOITURES, JSON.stringify(t.slice(0, 5))); } catch (e) {} }

/* ---- calcul des échéances ---- */
// renvoie [{ type, date, montant?, detail, lien, sur }] — sur = la date est certaine (règle officielle) ou estimée
function echeancesVoiture(v, aujourdhui) {
  const auj = midi(aujourdhui || new Date());
  const res = [];
  // 1. vignette (taxe de circulation)
  const dv = REGLES.vignette.prochaine(v, auj);
  if (dv) res.push({ type: "vignette", date: dv.date, montant: REGLES.vignette.montant(v), detail: dv.detail, lien: "vignette/", sur: true });
  // 2. visite technique
  const vt = prochaineVisite(v, auj);
  if (vt) res.push({ type: "visite", date: vt.date, montant: REGLES.visite.tarif, detail: vt.detail, lien: "visite-technique/", sur: vt.sur });
  // 3. assurance
  const fa = lireDate(v.assurance);
  if (fa) {
    let f = fa;
    // date passée depuis plus d'un mois : on suppose un renouvellement annuel (contrat d'un an)
    while (joursEntre(auj, f) < -31) f = plusAns(f, 1);
    res.push({ type: "assurance", date: f, detail: { fr: "Fin de votre contrat d'assurance", ar: "نهاية عقد التأمين" }, lien: "", sur: f === fa });
  }
  // 4. vidange
  const vd = prochaineVidange(v, auj);
  if (vd) res.push({ type: "vidange", date: vd.date, detail: vd.detail, lien: "entretien/", sur: false });
  return res.sort((a, b) => a.date - b.date);
}

function prochaineVisite(v, auj) {
  const c = lireDate(v.circulation);
  if (!c) return null;
  const R = REGLES.visite;
  // calendrier des visites depuis la 1re mise en circulation : première à « premiere » ans, puis tous les « periode » ans
  const visites = [];
  let d = plusAns(c, R.premiere);
  for (let i = 0; i < 80 && visites.length < 200; i++) {
    visites.push(d);
    const age = (d - c) / (365.25 * JOUR_MS);
    d = plusAns(d, R.periode(age));
  }
  const derniere = lireDate(v.visite);
  if (derniere) {
    const age = (derniere - c) / (365.25 * JOUR_MS);
    const p = plusAns(derniere, R.periode(age));
    return { date: p, sur: true, detail: { fr: "Un an après votre dernière visite", ar: "بعد سنة من آخر فحص" }, retard: joursEntre(auj, p) < 0 };
  }
  const prochaine = visites.find(x => joursEntre(auj, x) >= -31) || visites[visites.length - 1];
  return { date: prochaine, sur: false, detail: { fr: "Calculée depuis la 1re mise en circulation", ar: "محسوبة من تاريخ أول جولان" } };
}

function prochaineVidange(v, auj) {
  const R = REGLES.vidange;
  const dVid = lireDate(v.vidange);
  if (!dVid && !(v.kmVidange !== null && v.km !== null && v.kmMois > 0)) return null;
  let date = dVid ? plusMois(dVid, R.mois) : null, parKm = null;
  if (v.kmVidange !== null && v.km !== null && v.kmMois > 0) {
    const reste = v.kmVidange + R.km - v.km;                 // km avant la prochaine vidange
    const base = lireDate(v.vu) || auj;
    parKm = new Date(base.getTime() + Math.max(-365, reste / v.kmMois * 30.44) * JOUR_MS);
    if (!date || parKm < date) date = midi(parKm);
  }
  if (!date) return null;
  return { date, detail: { fr: `Tous les ${R.km.toLocaleString("fr-FR")} km ou ${R.mois} mois (le premier atteint)`, ar: `كل ${R.km} كم أو ${R.mois} شهرًا (الأقرب)` } };
}

// état d'une échéance selon les jours restants
function etatEcheance(jours) {
  if (jours < 0) return "depasse";
  if (jours <= 7) return "urgent";
  if (jours <= 30) return "bientot";
  return "ok";
}
