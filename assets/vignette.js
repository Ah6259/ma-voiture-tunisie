/* Page vignette : montant selon le barème officiel (assets/regles.js), date limite selon le groupe, barème complet, CV estimés */
function lignesTableau(rows) { return rows.map(([a, b, cl]) => `<tr${cl ? ` class="${cl}"` : ""}><td>${a}</td><td>${b}</td></tr>`).join(""); }
const NOM_ENERGIE = { essence: ["Essence", "بنزين"], diesel: ["Diesel", "غازوال"], gpl: ["GPL", "غاز البترول المسال"], hybride: ["Hybride essence", "هجينة بنزين"], electrique: ["100 % électrique", "كهربائية بالكامل"] };

function calculerVignette() {
  const v = { energie: document.getElementById("energie").value, cv: Math.round(+document.getElementById("cv").value) || 0, groupe: choixValeur("groupe") };
  const montant = REGLES.vignette.montant(v);
  const auj = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12);
  const d = REGLES.vignette.prochaine(v, auj);
  document.getElementById("titre-res").textContent = T("Votre vignette " + (d ? d.date.getFullYear() : REGLES.annee), "معلوم الجولان " + (d ? d.date.getFullYear() : REGLES.annee));
  document.getElementById("grand").textContent = montant === null ? "—" : dt(montant);
  const j = d ? joursEntre(auj, d.date) : null;
  document.getElementById("tableau").innerHTML = lignesTableau([
    [T("Puissance fiscale", "القوة الجبائية"), iso(v.cv + " CV")],
    [T("Carburant", "الوقود"), T(...NOM_ENERGIE[v.energie])],
    [T("Date limite", "آخر أجل"), d ? dateLisible(d.date, true) : "—", "total"],
    [T("Il reste", "يبقى"), j === null ? "—" : iso(j) + T(j > 1 ? " jours" : " jour", " يوم")]
  ]);
  const p = document.getElementById("partage");
  p.innerHTML = ICONE_WHATSAPP + T("Partager sur WhatsApp", "شارك على واتساب");
  p.href = lienWhatsApp(T(`Vignette ${d ? d.date.getFullYear() : ""} : ${montant === null ? "" : nombre(montant) + " DT"} pour une ${v.cv} CV, à payer avant le ${d ? dateLisible(d.date) : ""}. Calculez la vôtre :`,
    `معلوم الجولان: ${montant === null ? "" : nombre(montant) + " د"} لسيارة ${v.cv} حصان، يُدفع قبل ${d ? dateLisible(d.date) : ""}. احسب معلومك:`));
  bareme(v);
}

function bareme(v) {
  const B = REGLES.vignette.bareme, t = REGLES.vignette.tranche(v.cv);
  const lib = (i) => { const max = B[i][0], min = i ? B[i - 1][0] + 1 : 0;
    return max === Infinity ? T(min + " CV et plus", min + " حصان فما فوق") : min === 0 ? T(max + " CV et moins", max + " حصان فأقل") : min === max ? iso(max + " CV") : iso(min + " – " + max + " CV"); };
  document.getElementById("bareme").innerHTML = `<tr><th>${T("Puissance", "القوة")}</th><th>${T("Essence", "بنزين")}</th><th>${T("Diesel", "غازوال")}</th><th>GPL</th><th>${T("Électrique", "كهربائية")}</th></tr>` +
    B.map((r, i) => `<tr${i === t ? ' class="ici"' : ""}><td>${lib(i)}</td><td class="m">${iso(nombre(r[1], 0))}</td><td class="m">${iso(nombre(r[2], 0))}</td><td class="m">${iso(nombre(r[3], 0))}</td><td class="m">${iso(nombre(r[1] * REGLES.vignette.reductionElectrique, r[1] % 2 ? 1 : 0).replace(",0", ""))}</td></tr>`).join("");
}

function calculerCv() {
  const kw = +document.getElementById("kw").value || 0;
  document.getElementById("cv-estime").textContent = kw > 0 ? iso("≈ " + REGLES.cvDepuisKw(kw) + " CV") : "—";
}

["energie", "cv"].forEach(id => { document.getElementById(id).addEventListener("input", calculerVignette); document.getElementById(id).addEventListener("change", calculerVignette); });
document.getElementById("kw").addEventListener("input", calculerCv);
document.addEventListener("recalcul", calculerVignette);
document.addEventListener("langue", () => { calculerVignette(); calculerCv(); });
