/* Pass Ma voiture (partie payante) — chargé juste après page.js par l'accueil, entretien/ et les pages pass/.
   Repris du Pass Journée d'Outils pratiques Tunisie (même système de code d'accès, sans serveur).

   Gratuit pour toujours : tous les calculateurs, les échéances d'UNE voiture et ses rappels dans l'agenda du téléphone.
   Avec le Pass (9 DT pour 12 mois, pas de renouvellement automatique) : jusqu'à 5 voitures (famille), le carnet des
   pleins et des réparations (coût au kilomètre) et son export. Plus d'essai gratuit depuis le 20 octobre 2026 (décision d'Ahmed) :
   un essai déjà commencé sur un téléphone va jusqu'à sa fin, aucun nouveau ne démarre.

   Code d'accès : Ahmed active un client depuis l'application GitHub (dépôt PRIVÉ Ah6259/voiture-pass, bouton « pass »).
   Le robot publie ici, dans donnees/pass.json, SEULEMENT l'empreinte du code (PBKDF2-SHA-256 salée) et la date de fin.
   Le visiteur tape son code UNE fois : le navigateur calcule l'empreinte, la cherche dans pass.json, puis garde le code. */
const PASS = {
  prix: 9,                                     // DT
  mois: 12,                                    // durée du Pass, à partir de l'activation du code
  essaiJours: 30,                              // durée des anciens essais (aucun nouveau depuis le 20 octobre 2026)
  voituresGratuites: 1,
  voituresMax: 5,
  donnees: "donnees/pass.json",
  cle: "mv-pass-v1",                           // code gardé sur l'appareil
  cleEssai: "mv-essai-v1",                     // { debut } d'un essai commencé avant le 20 octobre 2026
  alphabet: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",  // sans O/0 ni I/1 (faciles à confondre)
  longueur: 8,
  whatsapp: "21624321390"
};
const isoP = s => "⁦" + s + "⁩";      // nombre isolé dans un texte arabe

/* ---- dates ---- */
function aujourdhui(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// heure de fin lisible, à l'heure du téléphone : « 07/10/2026 à 14h32 »
function finLisible(isoFin, ar) {
  const d = new Date(isoFin);
  if (isNaN(d)) return "";
  const j = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0") + "h" + String(d.getMinutes()).padStart(2, "0");
  return ar ? isoP(j) + " على الساعة " + isoP(h) : j + " à " + h;
}

/* ---- code gardé sur l'appareil ---- */
function normaliserCode(s) { return String(s || "").toUpperCase().replace(/[\s\-_.]/g, ""); }
function formeCodeOk(c) { return c.length === PASS.longueur && [...c].every(x => PASS.alphabet.includes(x)); }
function lirePass() {
  try {
    const p = JSON.parse(localStorage.getItem(PASS.cle) || "null");
    if (p && typeof p.code === "string" && !isNaN(Date.parse(p.fin))) return p;
  } catch (e) {}
  return null;
}
function ecrirePass(p) {
  try { if (p) localStorage.setItem(PASS.cle, JSON.stringify(p)); else localStorage.removeItem(PASS.cle); } catch (e) {}
}
function passActif() { const p = lirePass(); return !!p && Date.parse(p.fin) > Date.now(); }
function finPass() { const p = lirePass(); return p ? p.fin : ""; }

/* ---- anciens essais de 30 jours (sans code) : plus aucun nouveau depuis le 20 octobre 2026, un essai commencé va jusqu'à sa fin ---- */
function debutEssai() {
  try { const e = JSON.parse(localStorage.getItem(PASS.cleEssai) || "null"); return e && +e.debut > 0 ? +e.debut : 0; } catch (x) { return 0; }
}
function essaiActif() { const d = debutEssai(); return d > 0 && Date.now() - d < PASS.essaiJours * 86400000 && Date.now() >= d; }
function essaiFini() { return debutEssai() > 0 && !essaiActif(); }
function finEssai() { const d = debutEssai(); return d ? new Date(d + PASS.essaiJours * 86400000).toISOString() : ""; }
// plus aucun nouvel essai (décision d'Ahmed du 20 octobre 2026) : seul un essai déjà commencé compte, jusqu'à sa fin
function demarrerEssai() { return essaiActif(); }
// accès aux fonctions du Pass : Pass actif, ou ancien essai encore en cours
function accesPass() { return passActif() || essaiActif(); }
function racineSite() { return document.documentElement.dataset.racine || ""; }
const ICONE_TICKET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M14 7v12"/></svg>';
function htmlBoutonPass(id) {
  return `<a class="btn-pass-grand" id="${id}" href="${racineSite()}pass/">${ICONE_TICKET}<span>${T("Pass Ma voiture : 9 DT par an", "باقة سيارتك: " + isoP("9") + " د في السنة")}<small>${T("Jusqu'à 5 voitures et le carnet des dépenses", "إلى غاية " + isoP("5") + " سيارات ودفتر المصاريف")}</small></span></a>`;
}
// encart affiché à la place d'une fonction du Pass (sans Pass)
function htmlEncartPass(quoi) {
  // titre juste selon l'état (octobre 2026) : un Pass payé terminé n'est pas un « essai terminé »
  const titre = lirePass() ? T("Votre Pass Ma voiture est terminé", "انتهت باقة سيارتك")
    : T("Fonction du Pass Ma voiture", "ميزة من باقة سيارتك");
  return `<div class="pass-bloque"><h2>${titre}</h2>
    <p>${quoi}</p>${htmlBoutonPass("encart-pass")}
    <p class="demain">${T("Votre première voiture, ses échéances et ses rappels restent gratuits pour toujours.", "سيارتك الأولى ومواعيدها وتذكيراتها تبقى مجانية دائمًا.")}</p>
    <p class="pass-liens"><a href="${racineSite()}pass/#code-acces">${T("J'ai déjà un code", "لدي رمز")}</a></p></div>`;
}

/* ---- vérification d'un code ---- */
async function empreinteCode(code, sel, tours) {
  const enc = new TextEncoder();
  const cle = await crypto.subtle.importKey("raw", enc.encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(sel), iterations: tours }, cle, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, "0")).join("");
}
async function chargerListePass() {
  const r = await fetch(racineSite() + PASS.donnees, { cache: "no-store" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json();
  if (!d || typeof d.sel !== "string" || !Array.isArray(d.codes) || !(d.tours > 0)) throw new Error("liste illisible");
  return d;
}
// résultat : { etat: "ok" | "expire" | "inconnu" | "forme" | "reseau" | "impossible", fin, code }
async function verifierCode(saisie) {
  const code = normaliserCode(saisie);
  if (!formeCodeOk(code)) return { etat: "forme", code };
  if (!(window.crypto && window.crypto.subtle) || typeof fetch !== "function") return { etat: "impossible", code };
  let liste, h;
  try { liste = await chargerListePass(); } catch (e) { return { etat: "reseau", code }; }
  try { h = await empreinteCode(code, liste.sel, liste.tours); } catch (e) { return { etat: "impossible", code }; }
  const trouve = liste.codes.find(c => c && c.h === h);
  if (!trouve) return { etat: "inconnu", code };
  if (!(Date.parse(trouve.fin) > Date.now())) return { etat: "expire", fin: trouve.fin, code };
  return { etat: "ok", fin: trouve.fin, code };
}
function annoncerPass() { document.dispatchEvent(new Event("pass")); }
async function activerCode(saisie) {
  const r = await verifierCode(saisie);
  if (r.etat === "ok") { ecrirePass({ code: r.code, fin: r.fin, verifie: Date.now() }); annoncerPass(); }
  return r;
}
// Code déjà gardé : revérifié au plus une fois par heure (ou s'il semble expiré : il a peut-être été prolongé)
async function reverifierPass() {
  const p = lirePass();
  if (!p) return;
  if (Date.now() - (+p.verifie || 0) < 3600000 && Date.parse(p.fin) > Date.now()) return;
  const avant = passActif();
  const r = await verifierCode(p.code);
  if (r.etat === "ok") ecrirePass({ code: p.code, fin: r.fin, verifie: Date.now() });
  else if (r.etat === "inconnu" || r.etat === "expire" || r.etat === "forme") ecrirePass(null);   // arrêté, expiré : nettoyé
  // "reseau" / "impossible" : on garde le code jusqu'à son heure de fin connue
  if (avant !== passActif() || r.etat === "ok" && r.fin !== p.fin) annoncerPass();
}

/* ---- page pass/ : formulaire de demande (Formspree), saisie du code, état du Pass ---- */
function telephoneTn(v) {
  let n = String(v || "").replace(/\D/g, "");
  if (n.length === 11 && n.indexOf("216") === 0) n = n.slice(3);
  return n.length === 8 ? n : "";
}
function brancherFormulairePass() {
  const form = document.getElementById("pass-form");
  if (!form || form.dataset.branche) return;
  form.dataset.branche = "1";
  const statut = document.getElementById("pass-status"), bouton = form.querySelector("button[type=submit]");
  const apres = document.getElementById("apres-pass");
  const dire = (classe, fr, ar) => { statut.className = classe; statut.textContent = T(fr, ar); };
  const champ = n => form.querySelector('[name="' + n + '"]');
  const val = n => { const x = champ(n); return x ? String(x.value || "").trim() : ""; };
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (bouton.disabled) return;
    const tel = telephoneTn(val("telephone"));
    if (!val("nom")) { dire("err", "Indiquez votre nom.", "اكتب اسمك."); champ("nom").focus(); return; }
    if (!tel) { dire("err", "Téléphone : 8 chiffres, par exemple 24 321 390.", "الهاتف: " + isoP("8") + " أرقام، مثال " + isoP("24 321 390") + "."); champ("telephone").focus(); return; }
    if (!champ("conditions").checked) { dire("err", "Cochez « J'accepte les conditions du Pass Ma voiture ».", "يجب الموافقة على شروط باقة سيارتك."); return; }
    const fini = () => {
      // message WhatsApp de la preuve de paiement : on ajoute le nom et le téléphone (= motif du paiement)
      document.querySelectorAll("a.btn-wa[data-texte]").forEach(a =>
        a.setAttribute("href", "https://wa.me/" + PASS.whatsapp + "?text=" + encodeURIComponent(a.getAttribute("data-texte") + val("nom") + " — " + tel)));
      form.hidden = true;
      if (apres) { apres.hidden = false; try { apres.scrollIntoView({ block: "start" }); } catch (x) {} }
    };
    if (val("_gotcha")) { fini(); return; }                // champ piège rempli = robot : rien n'est envoyé
    champ("page").value = location.href.split("#")[0];
    const donnees = new FormData(form);
    donnees.set("telephone", tel);
    // ligne prête à recopier dans le bouton GitHub « pass » (dépôt privé)
    donnees.set("pour_activer", "action: paye ; nom: " + val("nom") + " ; telephone: " + tel);
    bouton.disabled = true;
    dire("", "Envoi…", "جارٍ الإرسال…");
    fetch(form.getAttribute("action"), { method: "POST", body: donnees, headers: { "Accept": "application/json" } })
      .then(r => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        dire("ok", "Merci ! Votre demande a bien été envoyée.", "شكرًا! تم إرسال طلبك.");
        fini();
      })
      .catch(() => dire("err", "Échec de l'envoi — vérifiez votre connexion et réessayez, ou écrivez-nous sur WhatsApp au 24 321 390.",
        "تعذّر الإرسال — تحقّق من الاتصال وأعد المحاولة، أو راسلنا عبر واتساب على " + isoP("24 321 390") + "."))
      .then(() => { bouton.disabled = false; });
  });
}
function brancherCodeAcces() {
  const form = document.getElementById("code-form");
  if (!form || form.dataset.branche) return;
  form.dataset.branche = "1";
  const statut = document.getElementById("code-status"), bouton = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (bouton.disabled) return;
    const champ = form.querySelector("input[name=code]");
    bouton.disabled = true;
    statut.className = ""; statut.textContent = T("Vérification…", "جارٍ التثبت…");
    const r = await activerCode(champ.value);
    bouton.disabled = false;
    const M = {
      ok: ["Code accepté : votre Pass Ma voiture est actif sur ce téléphone jusqu'au " + finLisible(r.fin) + ".",
           "تم قبول الرمز: باقة سيارتك مفعّلة على هذا الهاتف إلى غاية " + finLisible(r.fin, true) + "."],
      forme: ["Le code a 8 caractères (lettres et chiffres), par exemple ABCD-EF23.", "الرمز يتكون من " + isoP("8") + " حروف وأرقام، مثال " + isoP("ABCD-EF23") + "."],
      inconnu: ["Code non reconnu. Vérifiez-le ; si vous venez de le recevoir, réessayez dans 10 minutes.", "رمز غير معروف. تثبّت منه؛ إن وصلك للتو، أعد المحاولة بعد " + isoP("10") + " دقائق."],
      expire: ["Ce code a expiré le " + finLisible(r.fin) + ". Pour continuer, demandez un nouveau Pass ci-dessous.", "انتهت صلاحية هذا الرمز في " + finLisible(r.fin, true) + ". للمواصلة، اطلب باقة جديدة أسفله."],
      reseau: ["Pas de connexion : vérifiez Internet et réessayez.", "لا يوجد اتصال: تحقّق من الإنترنت وأعد المحاولة."],
      impossible: ["Votre navigateur ne peut pas vérifier le code : mettez-le à jour ou essayez Chrome.", "متصفحك لا يستطيع التثبت من الرمز: حدّثه أو جرّب ⁨Chrome⁩."]
    }[r.etat];
    statut.className = r.etat === "ok" ? "ok" : "err";
    statut.textContent = T(M[0], M[1]);
    if (r.etat === "ok") champ.value = "";
  });
}
// carte « Votre Pass Journée est actif » en haut de la page pass/
function majEtatPass() {
  const e = document.getElementById("pass-etat");
  if (e) {
    e.hidden = !passActif();
    if (passActif()) e.innerHTML = `<b>${T("Votre Pass Ma voiture est actif", "باقة سيارتك مفعّلة")}</b> ${T("sur ce téléphone jusqu'au " + finLisible(finPass()) + " : jusqu'à 5 voitures et le carnet.",
      "على هذا الهاتف إلى غاية " + finLisible(finPass(), true) + ": إلى غاية " + isoP("5") + " سيارات والدفتر.")}`;
  }
  document.querySelectorAll(".entete-pass").forEach(a => a.classList.toggle("actif", passActif()));
}
/* ---- rappel de fin du Pass (demande d'Ahmed, octobre 2026) ----
   Pas de Telegram ni d'e-mail : la page elle-même remercie le client et lui rappelle la fin.
   - Pass payé (code) valide qui finit dans 7 jours ou moins (Pass de 12 mois : la règle des 7 jours) -> petit bandeau,
     au plus une fois par jour. Un ancien essai (sans code) n'est pas concerné.
   - Pass terminé (au plus 30 jours après la fin) -> message « Votre Pass Ma voiture est terminé — merci ! », une seule fois.
   Mémoire sur l'appareil : PASS.cleRappel = { fin, vu (jour du dernier bandeau), finVu (message de fin montré) }. */
PASS.cleRappel = "mv-pass-rappel-v1";
function lireRappel() { try { const r = JSON.parse(localStorage.getItem(PASS.cleRappel) || "null"); return r && typeof r === "object" ? r : {}; } catch (e) { return {}; } }
function ecrireRappel(r) { try { localStorage.setItem(PASS.cleRappel, JSON.stringify(r)); } catch (e) {} }
// note l'heure de fin AVANT la revérification (qui efface un code expiré) : le message de fin reste possible
function noterFinPass() {
  const p = lirePass(), r = lireRappel();
  if (p && p.fin !== r.fin) ecrireRappel({ fin: p.fin, vu: r.vu || "", finVu: false });
}
// { type: "proche" | "fini", fin } ou null
function etatRappel() {
  const r = lireRappel(), maintenant = Date.now();
  if (passActif()) {
    const fin = lirePass().fin, proche = Date.parse(fin) - maintenant <= 7 * 864e5;   // Pass de 12 mois : 7 jours avant
    return proche && r.vu !== aujourdhui() ? { type: "proche", fin } : null;
  }
  const t = Date.parse(r.fin);
  if (t > 0 && t <= maintenant && !r.finVu && maintenant - t <= 30 * 864e5) return { type: "fini", fin: r.fin };
  return null;
}
let rappelMontre = null;
function dessinerRappel() {
  const ancien = document.getElementById("rappel-zone");
  if (ancien) ancien.remove();
  const e = rappelMontre, main = document.querySelector("main");
  if (!e || !main) return;
  const racine = document.documentElement.dataset.racine || "";
  const b = document.createElement("aside");
  b.className = "rappel-pass" + (e.type === "fini" ? " fini" : "");
  b.id = "rappel-pass";
  b.setAttribute("role", "status");
  b.innerHTML = '<button type="button" class="rappel-fermer" aria-label="' + T("Fermer", "إغلاق") + '">×</button>' +
    (e.type === "proche"
      ? "<p><b>" + T("Merci pour votre inscription !", "شكرًا على اشتراكك!") + "</b> " +
        T("Votre Pass Ma voiture se termine le " + finLisible(e.fin) + ".", "تنتهي باقة سيارتك في " + finLisible(e.fin, true) + ".") + "</p>"
      : "<p><b>" + T("Votre Pass Ma voiture est terminé — merci !", "انتهت باقة سيارتك — شكرًا لك!") + "</b> " +
        T("Il a pris fin le " + finLisible(e.fin) + ".", "انتهت في " + finLisible(e.fin, true) + ".") + "</p>") +
    '<p class="rappel-actions"><a class="btn-pro rappel-renouveler" href="' + racine + 'pass/#offre">' + T("Renouveler mon Pass", "جدّد باقتي") + "</a>" +
    '<a class="rappel-avis" href="' + racine + '#avis">' + T("Donner mon avis", "أعطِ رأيك") + "</a></p>";
  // tout en haut, sous l'en-tête (avant le grand bandeau de la page) : vu sans faire défiler
  const zone = document.createElement("div");
  zone.className = "wrap rappel-zone";
  zone.id = "rappel-zone";
  zone.appendChild(b);
  b.querySelector(".rappel-fermer").addEventListener("click", () => { rappelMontre = null; zone.remove(); });
  const avant = document.querySelector("body > .hero") || main;
  avant.parentNode.insertBefore(zone, avant);
}
function afficherRappel() {
  const e = etatRappel();
  if (!e) return;
  const r = lireRappel();
  if (e.type === "proche") r.vu = aujourdhui(); else r.finVu = true;
  ecrireRappel(r);
  rappelMontre = e;
  dessinerRappel();
}
document.addEventListener("langue", () => { if (rappelMontre) dessinerRappel(); });

document.addEventListener("pass", () => { majEtatPass(); document.dispatchEvent(new Event("recalcul")); });
document.addEventListener("langue", majEtatPass);
document.addEventListener("DOMContentLoaded", () => {
  brancherFormulairePass();
  brancherCodeAcces();
  majEtatPass();
  noterFinPass();
  reverifierPass().catch(() => {}).then(() => { noterFinPass(); afficherRappel(); });
});
