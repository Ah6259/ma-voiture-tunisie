/* Accueil « Mes échéances » : fiche de la voiture (gardée dans le téléphone), liste des échéances, rappels dans l'agenda.
   Gratuit : 1 voiture. Avec le Pass Ma voiture (ou pendant l'essai de 30 jours) : jusqu'à 5 voitures. */
let VOITURES = [], COURANTE = 0;
const $ = id => document.getElementById(id);
const CHAMPS = ["nom", "energie", "cv", "circulation", "visite", "assurance", "vidange", "kmVidange", "km", "kmMois"];

const ICONES = {
  vignette: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>',
  visite: '<svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4"/><path d="M12 3l7 3v6c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6z"/></svg>',
  assurance: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4v5c0 5-3.6 8-8 9-4.4-1-8-4-8-9V7z"/><path d="M12 8v8M8 12h8"/></svg>',
  vidange: '<svg viewBox="0 0 24 24"><path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/></svg>'
};
const NOMS = {
  vignette: ["Vignette", "معلوم الجولان"], visite: ["Visite technique", "الفحص الفني"],
  assurance: ["Assurance", "التأمين"], vidange: ["Vidange", "تغيير الزيت"]
};

function voitureDuFormulaire() {
  const v = Object.assign({}, VOITURES[COURANTE] || {});
  CHAMPS.forEach(c => { const e = $("v-" + c); if (e) v[c] = e.value; });
  v.groupe = choixValeur("groupe") || "";
  if (String(v.km) !== String((VOITURES[COURANTE] || {}).km)) v.vu = ecrireDate(new Date());   // jour où le kilométrage a été noté
  return voitureValide(v);
}
function remplirFormulaire(v) {
  CHAMPS.forEach(c => { const e = $("v-" + c); if (e) e.value = v && v[c] !== null && v[c] !== undefined ? v[c] : ""; });
  if (!$("v-energie").value) $("v-energie").value = "essence";
  document.querySelectorAll('.choix[data-nom="groupe"] button').forEach(b => b.classList.toggle("on", !!v && b.dataset.v === v.groupe));
}

function joursTexte(j) {
  if (j < 0) return `<b>${iso(-j)}</b>${T("jours de retard", "يوم تأخير")}`;
  if (j === 0) return `<b>!</b>${T("aujourd'hui", "اليوم")}`;
  return `<b>${iso(j)}</b>${T(j === 1 ? "jour" : "jours", j === 1 ? "يوم" : "يوم")}`;
}

function afficher() {
  const v = VOITURES[COURANTE];
  const liste = $("liste-echeances"), auj = new Date();
  const ech = v ? echeancesVoiture(v, auj) : [];
  if (!ech.length) {
    liste.innerHTML = `<li class="vide">${T("Remplissez au moins une date ci-dessus : vos échéances s'affichent ici aussitôt.", "املأ تاريخًا واحدًا على الأقل أعلاه: تظهر مواعيدك هنا فورًا.")}</li>`;
  } else {
    liste.innerHTML = ech.map(e => {
      const j = joursEntre(auj, e.date);
      const montant = e.montant ? ` · ${dt(e.montant)}` : "";
      const estime = e.sur ? "" : ` · ${T("estimée", "تقديري")}`;
      return `<li class="ech ${etatEcheance(j)}"><span class="ic">${ICONES[e.type]}</span>
        <div><h3>${T(...NOMS[e.type])}</h3><p>${dateLisible(e.date, true)}${montant}${estime}</p><p>${T(e.detail.fr, e.detail.ar)}</p></div>
        <div class="reste">${joursTexte(j)}</div>
        ${e.lien ? `<a class="lien-ech" href="${e.lien}">${T("Tout savoir →", "← كل التفاصيل")}</a>` : ""}</li>`;
    }).join("");
  }
  $("bouton-agenda").disabled = !ech.length;
  // onglets des voitures
  const ong = $("voitures-onglets");
  ong.innerHTML = VOITURES.map((x, i) => `<button type="button" data-i="${i}" class="${i === COURANTE ? "on" : ""}">${x.nom ? x.nom.replace(/[<>&"]/g, "") : T("Voiture ", "سيارة ") + iso(i + 1)}</button>`).join("") +
    (VOITURES.length < PASS.voituresMax ? `<button type="button" id="ajouter-voiture">${T("+ Ajouter une voiture", "+ إضافة سيارة")}</button>` : "");
  ong.hidden = !VOITURES.length;            // rien à choisir tant que la première voiture n'est pas remplie
  $("supprimer-voiture").hidden = VOITURES.length < 2;
  $("encart-voitures").innerHTML = "";
}

function enregistrer() {
  const v = voitureDuFormulaire();
  if (!VOITURES.length) VOITURES.push(v); else VOITURES[COURANTE] = v;
  ecrireVoitures(VOITURES);
  afficher();
}

// une voiture de plus : gratuit pour la 1re, Pass (ou essai de 30 jours) au-delà
function ajouterVoiture() {
  if (VOITURES.length >= PASS.voituresGratuites && !passActif()) {
    if (!essaiActif() && (essaiFini() || !demarrerEssai())) {
      $("encart-voitures").innerHTML = htmlEncartPass(T("Avec le <b>Pass Ma voiture à 9 DT par an</b>, suivez jusqu'à 5 voitures (toute la famille) et tenez le carnet de leurs dépenses.",
        "مع <b>باقة سيارتك بـ" + isoP("9") + " د في السنة</b>، تابع إلى غاية " + isoP("5") + " سيارات (كل العائلة) ودفتر مصاريفها."));
      try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "pass-bloque/voitures", title: "Essai terminé : 2e voiture", event: true }); } catch (e) {}
      return;
    }
  }
  if (!VOITURES.length) VOITURES.push(voitureDuFormulaire());
  VOITURES.push(voitureValide({ energie: "essence" }));
  COURANTE = VOITURES.length - 1;
  ecrireVoitures(VOITURES);
  remplirFormulaire(VOITURES[COURANTE]);
  afficher();
  const n = $("v-nom"); if (n) n.focus();
  noteEssai();
}

function noteEssai() {
  const n = $("note-essai");
  if (!n) return;
  if (VOITURES.length > PASS.voituresGratuites && essaiActif() && !passActif()) {
    n.hidden = false;
    n.innerHTML = T(`Essai gratuit du Pass jusqu'au ${finLisible(finEssai())} : ensuite, seule la première voiture reste gratuite. <a href="pass/">Pass Ma voiture : 9 DT par an</a>`,
      `تجربة مجانية للباقة إلى غاية ${finLisible(finEssai(), true)}: بعدها تبقى السيارة الأولى فقط مجانية. <a href="pass/">باقة سيارتك: ${isoP("9")} د في السنة</a>`);
  } else n.hidden = true;
}

function rappelsAgenda() {
  const auj = new Date(), evts = [];
  // gratuit : la voiture affichée ; avec le Pass ou l'essai : toutes les voitures en une fois
  const lesquelles = accesPass() ? VOITURES : [VOITURES[COURANTE]];
  lesquelles.filter(Boolean).forEach(v => echeancesVoiture(v, auj).forEach(e => {
    const qui = v.nom ? " — " + v.nom : "";
    evts.push({ id: v.id + "-" + e.type, date: e.date,
      titre: T(NOMS[e.type][0], NOMS[e.type][1]) + qui + (e.montant ? " (" + nombre(e.montant) + " DT)" : ""),
      description: T(e.detail.fr, e.detail.ar) + "\n" + T("Ma voiture Tunisie : ", "مواعيد سيارتك: ") + "https://voiture.clicvia.com/" + (e.lien || "") });
  }));
  telechargerIcs(fabriquerIcs(evts), "rappels-ma-voiture.ics");
  $("agenda-aide").hidden = false;
  try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: "agenda/" + evts.length, title: "Rappels ajoutés à l'agenda", event: true }); } catch (e) {}
}

document.addEventListener("DOMContentLoaded", () => {
  VOITURES = lireVoitures();
  COURANTE = 0;
  remplirFormulaire(VOITURES[0] || voitureValide({ energie: "essence" }));
  document.querySelectorAll("#fiche input, #fiche select").forEach(e => { e.addEventListener("input", enregistrer); e.addEventListener("change", enregistrer); });
  document.addEventListener("recalcul", () => { if (document.querySelector('.choix[data-nom="groupe"] button.on')) enregistrer(); });
  $("voitures-onglets").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "ajouter-voiture") return ajouterVoiture();
    COURANTE = +b.dataset.i; remplirFormulaire(VOITURES[COURANTE]); afficher();
  });
  $("supprimer-voiture").addEventListener("click", () => {
    if (VOITURES.length < 2) return;
    VOITURES.splice(COURANTE, 1); COURANTE = 0; ecrireVoitures(VOITURES); remplirFormulaire(VOITURES[0]); afficher();
  });
  $("bouton-agenda").addEventListener("click", rappelsAgenda);
  afficher(); noteEssai();
});
document.addEventListener("langue", () => { if (document.getElementById("liste-echeances")) { afficher(); noteEssai(); } });
document.addEventListener("pass", () => { afficher(); noteEssai(); });
