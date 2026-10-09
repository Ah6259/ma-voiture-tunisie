/* Page carburant : prix officiels (assets/regles.js → REGLES.carburants) et coût d'un trajet / d'un mois */
// coût d'un trajet : km × L/100 ÷ 100 × prix, arrondi au millime
function coutTrajet(km, conso, prix) { return Math.round(km * conso / 100 * prix * 1000) / 1000; }

function afficherPrix() {
  const C = REGLES.carburants;
  document.getElementById("prix-carbu").innerHTML = C.prix.map(p => `<div><span>${T(p.fr, p.ar)}</span><b>${iso(nombre(p.prix))}</b><span>${T("DT le litre", "د للتر")}</span></div>`).join("");
  document.getElementById("carbu-depuis").textContent = T(`Prix inchangés depuis le ${C.depuis}. GPL : prix non publié officiellement, demandez-le à la station.`,
    `أسعار دون تغيير منذ ${C.depuis}. غاز البترول المسال: سعر غير منشور رسميًا، اسأل عنه في المحطة.`);
  document.querySelectorAll("[data-carbu-verifie]").forEach(x => x.textContent = C.verifie);
  const s = document.getElementById("carbu"), avant = s.value || "sp";
  s.innerHTML = C.prix.map(p => `<option value="${p.id}">${T(p.fr, p.ar)}</option>`).join("");
  s.value = avant;
}

function calculerTrajet() {
  const p = REGLES.carburants.prix.find(x => x.id === document.getElementById("carbu").value) || REGLES.carburants.prix[0];
  const conso = Math.max(0, +document.getElementById("conso").value || 0);
  const km = Math.max(0, +document.getElementById("distance").value || 0) * (document.getElementById("ar").checked ? 2 : 1);
  const jours = Math.max(0, Math.min(31, +document.getElementById("jours").value || 0));
  const trajet = coutTrajet(km, conso, p.prix), litres = km * conso / 100;
  document.getElementById("grand").textContent = dt(trajet);
  document.getElementById("tableau").innerHTML = [
    [T("Distance", "المسافة"), iso(nombre(km, 0) + " km")],
    [T("Carburant utilisé", "الوقود المستهلك"), iso(nombre(litres, 2) + " L")],
    [T("Prix du litre", "سعر اللتر"), dt(p.prix)],
    [T("Par mois", "في الشهر") + " (" + iso(jours) + T(" jours", " يوم") + ")", dt(Math.round(trajet * jours * 1000) / 1000), "total"],
    [T("Par an (11 mois)", "في السنة (⁦11⁩ شهرًا)"), dt(Math.round(trajet * jours * 11 * 1000) / 1000)]
  ].map(([a, b, cl]) => `<tr${cl ? ` class="${cl}"` : ""}><td>${a}</td><td>${b}</td></tr>`).join("");
  const l = document.getElementById("partage");
  l.innerHTML = ICONE_WHATSAPP + T("Partager sur WhatsApp", "شارك على واتساب");
  l.href = lienWhatsApp(T(`Mon trajet de ${nombre(km, 0)} km me coûte ${nombre(trajet)} DT de carburant (${nombre(trajet * jours)} DT par mois). Calculez le vôtre :`,
    `رحلتي بـ${nombre(km, 0)} كم تكلّفني ${nombre(trajet)} د من الوقود (${nombre(trajet * jours)} د في الشهر). احسب رحلتك:`));
}

["carbu", "conso", "distance", "jours", "ar"].forEach(id => { const e = document.getElementById(id); e.addEventListener("input", calculerTrajet); e.addEventListener("change", calculerTrajet); });
document.addEventListener("langue", () => { afficherPrix(); calculerTrajet(); });
