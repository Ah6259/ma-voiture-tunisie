/* Carnet des dépenses (page entretien/) — fonction du Pass Ma voiture.
   Gardé dans le téléphone : localStorage « mv-carnet-v1 » = { <id de la voiture>: [ { id, date, type, montant, km, litres } ] }.
   Les voitures sont celles de l'accueil (« mv-voitures-v1 ») ; sans voiture notée, une voiture « Ma voiture » est utilisée.
   Bilan : dépenses des 12 derniers mois, coût au km et consommation (entre le plus petit et le plus grand compteur noté). */
const CLE_CARNET = "mv-carnet-v1";
const TYPES = ["plein", "vidange", "reparation", "pneus", "papiers", "lavage"];
const NOMS_TYPES = { plein: ["Plein", "تعبئة"], vidange: ["Vidange", "تغيير الزيت"], reparation: ["Réparation", "إصلاح"], pneus: ["Pneus", "عجلات"],
  papiers: ["Papiers", "وثائق"], lavage: ["Lavage, parking, péage", "غسيل، موقف، طريق سيارة"] };
let CARNET_VOITURE = 0;

function lireCarnet() {
  try {
    const c = JSON.parse(localStorage.getItem(CLE_CARNET) || "{}");
    if (!c || typeof c !== "object" || Array.isArray(c)) return {};
    const propre = {};
    Object.keys(c).filter(k => /^[a-z0-9]{1,12}$/.test(k) && Array.isArray(c[k])).forEach(k => {
      propre[k] = c[k].map(entreeValide).filter(Boolean).slice(-2000);
    });
    return propre;
  } catch (e) { return {}; }
}
function ecrireCarnet(c) { try { localStorage.setItem(CLE_CARNET, JSON.stringify(c)); return true; } catch (e) { return false; } }
function entreeValide(e) {
  if (!e || !lireDate(e.date) || !TYPES.includes(e.type)) return null;
  const n = (x, max) => { if (x === "" || x === null || x === undefined) return null; const y = +x; return isFinite(y) && y >= 0 && y <= max ? y : null; };
  const montant = n(e.montant, 1000000);
  if (montant === null) return null;
  return { id: /^[a-z0-9]{4,12}$/.test(e.id || "") ? e.id : Math.random().toString(36).slice(2, 10), date: e.date, type: e.type,
           montant: Math.round(montant * 1000) / 1000, km: n(e.km, 2000000), litres: e.type === "plein" ? n(e.litres, 500) : null };
}
function voituresCarnet() {
  const v = lireVoitures();
  return v.length ? v : [voitureValide({ id: "mavoiture", nom: "" })];
}

// bilan d'une liste d'entrées (tests : window.bilanCarnet)
function bilanCarnet(entrees, aujourdhui) {
  const auj = midi(aujourdhui || new Date()), il12 = plusMois(auj, -12);
  const an = entrees.filter(e => { const d = lireDate(e.date); return d && d > il12 && d <= auj; });
  const total12 = an.reduce((s, e) => s + e.montant, 0);
  const avecKm = entrees.filter(e => e.km !== null).sort((a, b) => a.km - b.km);
  let coutKm = null, conso = null, km = 0;
  if (avecKm.length >= 2) {
    km = avecKm[avecKm.length - 1].km - avecKm[0].km;
    if (km > 0) {
      const entre = entrees.filter(e => e.km !== null && e.km > avecKm[0].km && e.km <= avecKm[avecKm.length - 1].km);
      coutKm = entre.reduce((s, e) => s + e.montant, 0) / km;
      const litres = entre.filter(e => e.type === "plein" && e.litres !== null).reduce((s, e) => s + e.litres, 0);
      if (litres > 0) conso = litres / km * 100;
    }
  }
  const parType = {};
  an.forEach(e => { parType[e.type] = (parType[e.type] || 0) + e.montant; });
  return { total12: Math.round(total12 * 1000) / 1000, coutKm, conso, km, parType, n: entrees.length };
}

function afficherCarnet() {
  const voit = voituresCarnet(), c = lireCarnet();
  if (CARNET_VOITURE >= voit.length) CARNET_VOITURE = 0;
  const v = voit[CARNET_VOITURE], liste = (c[v.id] || []).slice().sort((a, b) => b.date < a.date ? -1 : 1);
  const o = document.getElementById("carnet-voitures");
  o.innerHTML = voit.length > 1 ? voit.map((x, i) => `<button type="button" data-i="${i}" class="${i === CARNET_VOITURE ? "on" : ""}">${x.nom ? x.nom.replace(/[<>&"]/g, "") : T("Voiture ", "سيارة ") + iso(i + 1)}</button>`).join("") : "";
  // accès : Pass actif, ou ancien essai encore en cours (plus aucun nouvel essai depuis le 20 octobre 2026)
  const ferme = !accesPass();
  document.getElementById("carnet-form").hidden = ferme;
  document.getElementById("carnet-encart").innerHTML = ferme ? htmlEncartPass(T("Avec le <b>Pass Ma voiture à 9 DT par an</b>, continuez à noter vos pleins et vos réparations, et suivez le coût au kilomètre de vos voitures.",
    "مع <b>باقة سيارتك بـ" + isoP("9") + " د في السنة</b>، واصل تسجيل تعبئاتك وإصلاحاتك وتابع كلفة الكيلومتر لسياراتك.")) :
    (essaiActif() && !passActif() ? `<p class="pass-note">${T("Pass ouvert sur ce téléphone jusqu'au " + finLisible(finEssai()) + ".", "الباقة مفتوحة على هذا الهاتف إلى غاية " + finLisible(finEssai(), true) + ".")} <a class="btn-pass-petit" href="../pass/">${T("Pass 9 DT par an", "الباقة " + isoP("9") + " د في السنة")}</a></p>` : "");
  const b = bilanCarnet(liste);
  document.getElementById("carnet-bilan").innerHTML = liste.length ? `<div class="prix-carbu" style="margin:12px 0">
      <div><span>${T("Dépenses sur 12 mois", "المصاريف خلال ⁦12⁩ شهرًا")}</span><b>${iso(nombre(b.total12, 0))}</b><span>DT</span></div>
      <div><span>${T("Coût au kilomètre", "كلفة الكيلومتر")}</span><b>${b.coutKm === null ? "—" : iso(nombre(b.coutKm, 3))}</b><span>${b.coutKm === null ? T("2 compteurs nécessaires", "يلزم عدّادان") : T("DT / km", "د / كم")}</span></div>
      <div><span>${T("Consommation", "الاستهلاك")}</span><b>${b.conso === null ? "—" : iso(nombre(b.conso, 1))}</b><span>${T("L / 100 km", "ل / 100 كم")}</span></div>
      <div><span>${T("Distance notée", "المسافة المسجّلة")}</span><b>${iso(nombre(b.km, 0))}</b><span>km</span></div></div>` : "";
  document.getElementById("carnet-liste").innerHTML = liste.length ? `<tr><th>${T("Date", "التاريخ")}</th><th>${T("Dépense", "المصروف")}</th><th>km</th><th>${T("Montant", "المبلغ")}</th><th></th></tr>` +
    liste.map(e => `<tr><td>${dateLisible(lireDate(e.date))}</td><td>${T(...NOMS_TYPES[e.type])}${e.litres ? " · " + iso(nombre(e.litres, 2) + " L") : ""}</td><td>${e.km === null ? "" : iso(nombre(e.km, 0))}</td><td class="m">${iso(nombre(e.montant))}</td><td><button type="button" class="lien-bouton" data-suppr="${e.id}" aria-label="${T("Supprimer", "حذف")}">×</button></td></tr>`).join("")
    : `<tr><td class="vide">${T("Aucune dépense notée pour cette voiture.", "لا مصاريف مسجّلة لهذه السيارة.")}</td></tr>`;
  document.getElementById("carnet-export").hidden = !liste.length;
  document.getElementById("c-litres-champ").hidden = document.getElementById("c-type").value !== "plein";
}

function ajouterEntree(ev) {
  ev.preventDefault();
  const statut = document.getElementById("carnet-statut");
  if (!passActif() && !essaiActif() && (essaiFini() || !demarrerEssai())) { afficherCarnet(); return; }
  const e = entreeValide({ date: document.getElementById("c-date").value, type: document.getElementById("c-type").value,
    montant: document.getElementById("c-montant").value, km: document.getElementById("c-km").value, litres: document.getElementById("c-litres").value });
  if (!e) { statut.textContent = T("Indiquez au moins la date et le montant.", "أدخل على الأقل التاريخ والمبلغ."); return; }
  const v = voituresCarnet()[CARNET_VOITURE], c = lireCarnet();
  (c[v.id] = c[v.id] || []).push(e);
  if (!ecrireCarnet(c)) { statut.textContent = T("Impossible d'enregistrer sur ce téléphone (mémoire pleine ou navigation privée).", "تعذّر الحفظ على هذا الهاتف (ذاكرة ممتلئة أو تصفّح خاص)."); return; }
  statut.textContent = T("Ajouté au carnet.", "أُضيف إلى الدفتر.");
  document.getElementById("c-montant").value = ""; document.getElementById("c-litres").value = "";
  afficherCarnet();
}

function exporterCarnet() {
  const v = voituresCarnet()[CARNET_VOITURE], liste = (lireCarnet()[v.id] || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const lignes = [["Date", "Dépense", "Compteur (km)", "Litres", "Montant (DT)"].join(";")]
    .concat(liste.map(e => [e.date, NOMS_TYPES[e.type][0], e.km === null ? "" : e.km, e.litres === null ? "" : String(e.litres).replace(".", ","), String(e.montant).replace(".", ",")].join(";")));
  const blob = new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "carnet-ma-voiture.csv";
  document.body.appendChild(a); a.click(); a.remove();
  if (window.__fichiers) window.__fichiers.push({ nom: a.download, type: "text/csv" });
}

document.getElementById("c-date").value = ecrireDate(new Date());
document.getElementById("carnet-form").addEventListener("submit", ajouterEntree);
document.getElementById("c-type").addEventListener("change", afficherCarnet);
document.getElementById("carnet-export").addEventListener("click", exporterCarnet);
document.getElementById("carnet-voitures").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { CARNET_VOITURE = +b.dataset.i; afficherCarnet(); } });
document.getElementById("carnet-liste").addEventListener("click", e => {
  const b = e.target.closest("[data-suppr]"); if (!b) return;
  const v = voituresCarnet()[CARNET_VOITURE], c = lireCarnet();
  c[v.id] = (c[v.id] || []).filter(x => x.id !== b.dataset.suppr); ecrireCarnet(c); afficherCarnet();
});
document.addEventListener("langue", afficherCarnet);
document.addEventListener("pass", afficherCarnet);
