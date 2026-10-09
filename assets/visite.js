/* Page visite technique : prochaine date à partir de la 1re mise en circulation (et de la dernière visite si connue).
   Même calcul que l'accueil (assets/echeances.js → prochaineVisite). Les dates tapées restent dans la page. */
function calculerVisite() {
  const v = voitureValide({ circulation: document.getElementById("circulation").value, visite: document.getElementById("derniere").value });
  const auj = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12);
  const r = prochaineVisite(v, auj);
  const g = document.getElementById("grand"), ex = document.getElementById("explication"), t = document.getElementById("tableau");
  if (!r) {
    g.textContent = "—";
    ex.textContent = T("Indiquez la date de 1re mise en circulation (sur la carte grise).", "أدخل تاريخ أول جولان (في البطاقة الرمادية).");
    t.innerHTML = "";
    return;
  }
  const j = joursEntre(auj, r.date), c = lireDate(v.circulation);
  const age = c ? Math.floor((auj - c) / (365.25 * JOUR_MS)) : null;
  g.innerHTML = dateLisible(r.date);
  ex.textContent = (r.sur ? T("Un an ou deux après votre dernière visite, selon l'âge de la voiture.", "سنة أو سنتان بعد آخر فحص، حسب عمر السيارة.")
    : T("Date estimée depuis la 1re mise en circulation : la date de votre dernier certificat fait foi.", "تاريخ تقديري انطلاقًا من أول جولان: تاريخ آخر شهادة هو المرجع."));
  t.innerHTML = [
    [T("Âge de la voiture", "عمر السيارة"), age === null ? "—" : iso(age) + T(age > 1 ? " ans" : " an", " سنة")],
    [T("Rythme des visites", "نسق الفحوصات"), age !== null && age >= REGLES.visite.premiere ? (age >= 10 ? T("chaque année", "كل سنة") : T("tous les 2 ans", "كل سنتين")) : T("pas encore de visite", "لا فحص بعد")],
    [j < 0 ? T("En retard de", "متأخر بـ") : T("Il reste", "يبقى"), iso(Math.abs(j)) + T(Math.abs(j) > 1 ? " jours" : " jour", " يوم")],
    [T("Prix", "الثمن"), dt(REGLES.visite.tarif)]
  ].map(([a, b], i) => `<tr${i === 2 ? ' class="total"' : ""}><td>${a}</td><td>${b}</td></tr>`).join("");
}
["circulation", "derniere"].forEach(id => { const e = document.getElementById(id); e.addEventListener("input", calculerVisite); e.addEventListener("change", calculerVisite); });
document.addEventListener("langue", calculerVisite);
