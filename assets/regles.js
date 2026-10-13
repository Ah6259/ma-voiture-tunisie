/* Règles officielles utilisées par tout le site — À VÉRIFIER CHAQUE JANVIER (loi de finances) ET À CHAQUE ALERTE DU ROBOT.
   Étude du 09/10/2026 (sources dans « etude et plan.md », dossier privé ; sources publiques citées sur chaque page).
   Règle du site : n'afficher un montant que s'il est SÛR (source officielle ou 2 sources sérieuses concordantes) ;
   ce qui est seulement probable est écrit « estimé » ou « à vérifier » et renvoie vers la source officielle. */
const REGLES = {
  annee: 2026,

  /* ---- Vignette (taxe de circulation), personne physique, DT par an ----
     Barème inchangé depuis la loi de finances 2022 (LF 2024, 2025, 2026 : inchangé). Hybride : AUCUNE réduction (on paie
     selon le moteur thermique). 100 % électrique : −50 %. Depuis le 01/01/2026 : plus d'autocollant (contrôle par la plaque). */
  vignette: {
    // [CV max de la tranche, essence, diesel, GPL]
    bareme: [
      [4, 65, 215, 390], [7, 130, 280, 455], [8, 180, 330, 505], [9, 180, 405, 580],
      [11, 230, 455, 630], [13, 1050, 1275, 1450], [15, 1400, 1625, 1800], [Infinity, 2100, 2325, 2500]
    ],
    reductionElectrique: 0.5,
    // dates limites (jour, mois) : la même règle chaque année ; si dimanche ou jour férié → jour ouvrable suivant
    calendrier: {
      societe: { jour: 5, mois: 2, fr: "Sociétés et administrations", ar: "الشركات والإدارات" },
      pair: { jour: 5, mois: 3, fr: "Particuliers, numéro pair", ar: "الخواص، رقم زوجي" },
      impair: { jour: 5, mois: 4, fr: "Particuliers, numéro impair (et motos)", ar: "الخواص، رقم فردي (والدراجات النارية)" },
      location: { jour: 5, mois: 5, fr: "Location, leasing", ar: "الكراء والإيجار المالي" }
    },
    payerEnLigne: "https://taxe-circulation.finances.gov.tn",
    tranche(cv) { return this.bareme.findIndex(t => (cv || 0) <= t[0]); },
    montant(v) {
      const t = this.bareme[this.tranche(v.cv)];
      if (!t || !v.cv) return null;
      if (v.energie === "electrique") return t[1] * this.reductionElectrique;
      return v.energie === "diesel" ? t[2] : v.energie === "gpl" ? t[3] : t[1];   // essence et hybride essence : colonne essence
    },
    // prochaine date limite pour une voiture (v.groupe : pair | impair | societe | location)
    prochaine(v, auj) {
      const c = this.calendrier[v.groupe];
      if (!c) return null;
      let d = jourOuvrable(new Date(auj.getFullYear(), c.mois - 1, c.jour, 12));
      if (joursEntre(auj, d) < 0) d = jourOuvrable(new Date(auj.getFullYear() + 1, c.mois - 1, c.jour, 12));
      return { date: d, detail: { fr: `Date limite de la vignette ${d.getFullYear()} (${c.fr.toLowerCase()})`, ar: `آخر أجل لمعلوم الجولان ${d.getFullYear()} (${c.ar})` } };
    }
  },

  /* ---- Visite technique (ATTT), voitures particulières ----
     Tarif 36,500 DT depuis le 01/01/2025 (LF 2025 : +5 DT) — sûr. Rythme (4e année, puis tous les 2 ans, puis chaque année
     dès 10 ans) — À VÉRIFIER : la date affichée est « estimée » ; la date écrite sur le dernier certificat fait foi. */
  visite: {
    tarif: 36.5,
    premiere: 4,
    periode: age => age >= 10 ? 1 : 2,
    rendezVous: "https://www.attt.com.tn/DEV_WEB/prendreunrendezvous.php?code_menu=73"
  },

  /* ---- Carburants, DT par litre — prix fixés par l'État, inchangés depuis le 24/11/2022 (démenti d'une hausse le 26/09/2026) ---- */
  carburants: {
    depuis: "24/11/2022",
    verifie: "09/10/2026",
    prix: [
      { id: "sp", fr: "Essence sans plomb", ar: "بنزين خالٍ من الرصاص", prix: 2.525 },
      { id: "spp", fr: "Sans plomb premium", ar: "بنزين ممتاز", prix: 2.855 },
      { id: "g50", fr: "Gasoil sans soufre", ar: "غازوال دون كبريت", prix: 2.205 },
      { id: "g50p", fr: "Gasoil sans soufre premium", ar: "غازوال دون كبريت ممتاز", prix: 2.55 },
      { id: "go", fr: "Gasoil ordinaire", ar: "غازوال عادي", prix: 1.985 }
    ]
  },

  /* ---- Mutation (carte grise au nom de l'acheteur), barème ATTT depuis le 01/01/2024 ----
     145 DT jusqu'à 5 CV + 15 DT par CV au-delà (sûr) ; supplément selon l'âge (sûr) ; que le supplément S'AJOUTE : à vérifier
     → le total est affiché comme « estimation ». Délai : 15 jours après la signature. Droit d'enregistrement : non chiffré. */
  mutation: {
    base: 145, cvBase: 5, parCv: 15,
    // supplément selon l'âge : [âge minimum en années, ≤ 6 CV, 7 à 9 CV, > 9 CV]
    age: [[10, 100, 150, 200], [4, 50, 100, 150], [0, 0, 0, 0]],
    delaiJours: 15,
    frais(cv, ans) {
      if (!(cv > 0) || !(ans >= 0)) return null;
      const fixe = this.base + Math.max(0, cv - this.cvBase) * this.parCv;
      const ligne = this.age.find(a => ans >= a[0]);
      const sup = cv <= 6 ? ligne[1] : cv <= 9 ? ligne[2] : ligne[3];
      return { fixe, supplement: sup, total: fixe + sup };
    }
  },

  /* ---- Entretien : ordres de grandeur (le carnet du constructeur est toujours prioritaire) ---- */
  vidange: { km: 10000, mois: 12 },

  /* ---- Puissance fiscale estimée depuis les kW (voitures homologuées depuis 2024) — À VÉRIFIER : la carte grise fait foi ---- */
  cvDepuisKw: kw => Math.round(1.8 * Math.pow(kw / 100, 2) + 3.87 * (kw / 100) + 1.34),

  /* ---- Jours fériés à date fixe en Tunisie (mois, jour) — les fêtes religieuses (dates lunaires) sont dans « religieux » ---- */
  feries: [[1, 1], [1, 14], [3, 20], [4, 9], [5, 1], [7, 25], [8, 13], [10, 15], [12, 17]],
  // Aïd el-Fitr (2 jours) et Aïd el-Idha (2 jours), dates annoncées / prévues — à compléter chaque année par le robot de janvier
  religieux: ["2026-03-20", "2026-03-21", "2026-05-27", "2026-05-28", "2027-03-10", "2027-03-11", "2027-05-17", "2027-05-18"]
};

/* ---- petites fonctions de dates (utilisées par toutes les pages) ---- */
const JOUR_MS = 86400000;

// date « AAAA-MM-JJ » (champ <input type=date>) → Date locale à midi (évite les décalages d'heure)
function lireDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], 12);
  return d.getMonth() === +m[2] - 1 ? d : null;
}
function ecrireDate(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function midi(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); }
function plusMois(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
}
const plusAns = (d, n) => plusMois(d, 12 * n);
const joursEntre = (a, b) => Math.round((midi(b) - midi(a)) / JOUR_MS);


// date limite tombant un dimanche ou un jour férié → jour ouvrable suivant
function jourFerie(d) {
  const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  return REGLES.feries.some(([m, j]) => d.getMonth() + 1 === m && d.getDate() === j) || REGLES.religieux.includes(iso);
}
function jourOuvrable(d) {
  const r = new Date(d.getTime());
  for (let i = 0; i < 10 && (r.getDay() === 0 || jourFerie(r)); i++) r.setDate(r.getDate() + 1);
  return r;
}
