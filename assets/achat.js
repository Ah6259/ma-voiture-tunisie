/* Page acheter / vendre : frais de mutation estimés (assets/regles.js → REGLES.mutation) */
function calculerMutation() {
  const cv = Math.round(+document.getElementById("cv").value) || 0, ans = Math.floor(+document.getElementById("age").value);
  const r = REGLES.mutation.frais(cv, ans >= 0 ? ans : 0);
  document.getElementById("grand").textContent = r ? dt(r.total) : "—";
  document.getElementById("tableau").innerHTML = r ? [
    [T(`Frais de base (${REGLES.mutation.base} DT jusqu'à ${REGLES.mutation.cvBase} CV + ${REGLES.mutation.parCv} DT par CV au-delà)`,
       `المعلوم الأساسي (${REGLES.mutation.base} د إلى غاية ${REGLES.mutation.cvBase} حصان + ${REGLES.mutation.parCv} د عن كل حصان إضافي)`), dt(r.fixe)],
    [T("Supplément selon l'âge", "إضافة حسب العمر"), dt(r.supplement)],
    [T("Total estimé", "المجموع التقديري"), dt(r.total), "total"]
  ].map(([a, b, cl]) => `<tr${cl ? ` class="${cl}"` : ""}><td>${a}</td><td>${b}</td></tr>`).join("") : "";
}
["cv", "age"].forEach(id => document.getElementById(id).addEventListener("input", calculerMutation));
document.addEventListener("langue", calculerMutation);
