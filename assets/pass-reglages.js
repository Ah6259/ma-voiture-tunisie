/* Réglage de Ma voiture Tunisie pour le parcours commun du Pass (assets/pass-commun.js, copie du module de projets-ahmed :
   « outils communs/pass-commun/ » ; NE PAS modifier pass-commun.js ici, voir son LISEZMOI.md). Page pass/ (FR) et ar/pass/ (AR),
   chargé après assets/pass.js (vérification des codes d'accès, Pass ouvert) dont il reprend PASS, T, isoP, verifierCode…
   Ici seulement ce qui est PROPRE à ce site : nom, formule unique, format du code (8 caractères sans O/0/I/1, sans tiret : celui des
   codes déjà vendus, PASS.alphabet / PASS.longueur), textes de ce site, ligne « pour_activer » du bouton « pass » du dépôt privé
   voiture-pass, et l'ouverture du Pass quand le code de la commande est activé. Fichier externe : aucun script en ligne (CSP). */
(function () {
  var PC = window.PassCommun;
  if (!PC) return;
  var FORMULE = "Pass Ma voiture - 9 DT - 12 mois";
  // remet les boutons WhatsApp à leur message de départ (sans commande)
  function liensDeDepart() {
    document.querySelectorAll("a.btn-wa[data-texte]").forEach(function (a) {
      a.setAttribute("href", "https://wa.me/" + PASS.whatsapp + "?text=" + encodeURIComponent(a.getAttribute("data-texte")));
    });
  }
  PC.brancher({
    site: "voiture",                                // clé du site dans email-clients/sites.json (e-mail automatique)
    type: "pass-code",                              // code tapé sur le site (« J'ai un code »)
    langues: ["fr", "ar"],
    nomSite: { fr: "Ma voiture Tunisie", ar: "مواعيد سيارتك" },
    // E-mail automatique (A.17) EN SERVICE depuis le 25/11/2026 ; false = phrases [data-email-auto] cachées et rien envoyé
    emailAuto: true,
    ids: { form: "pass-form", statut: "pass-status", apres: "apres-pass", attente: "commande-attente", nouvelle: "commande-nouvelle" },
    code: { alphabet: PASS.alphabet, longueur: PASS.longueur },
    formules: { "Pass Ma voiture - 9 DT - 12 mois": { ar: "باقة سيارتك - 9 د - 12 شهرًا" } },
    formuleDefaut: FORMULE,                         // formule unique (champ caché « formule »)
    etapes: ["nom", "telephone", "email", "conditions"],
    textes: {
      emailInvalide: { fr: "E-mail invalide, par exemple nom@exemple.com.", ar: "البريد الإلكتروني غير صحيح، مثال " + isoP("nom@exemple.com") + "." },
      conditions: { fr: "Cochez « J'accepte les conditions du Pass Ma voiture ».", ar: "يجب الموافقة على شروط باقة سيارتك." },
      merci: { fr: "Merci ! Votre demande a bien été envoyée.", ar: "شكرًا! تم إرسال طلبك." },
      verification: { fr: "Vérification de votre code…", ar: "جارٍ التثبت من رمزك…" },
      attentePaiement: { fr: "En attente de votre paiement : dès qu'il est reçu, votre code est activé et votre Pass s'ouvre ici tout seul.",
                         ar: "في انتظار دفعتك: بمجرد استلامها يُفعَّل رمزك وتُفتح باقتك هنا وحدها." },
      attenteImpossible: { fr: "Pas de connexion : votre code sera vérifié à votre prochaine visite.", ar: "لا يوجد اتصال: سيتم التثبت من رمزك في زيارتك القادمة." }
    },
    classesEtat: { attenteImpossible: "err" },
    apresAuRetour: true,                            // au retour : bandeau en haut ET la page « Dernière étape » (3 étapes, WhatsApp)
    focusNouvelle: false,
    selecteurWa: "a.btn-wa[data-texte]",            // les 2 boutons WhatsApp de la preuve (offre et « Dernière étape »)
    // formule affichée en arabe avec les nombres isolés (le message WhatsApp, lui, les garde sans caractères d'isolement)
    apresRemplir: function (x) {
      document.querySelectorAll("[data-formule]").forEach(function (e) {
        e.textContent = T(x.formule || FORMULE, "باقة سيارتك - " + isoP("9") + " د - " + isoP("12") + " شهرًا");
      });
    },
    formspree: function (d, c) {
      d.set("email", c.email);
      d.set("code", c.code);
      d.set("_subject", "Pass Ma voiture — Ma voiture Tunisie — code " + c.code);
    },
    // ligne prête à recopier dans le bouton GitHub « pass » (dépôt privé voiture-pass) : le code est activé TEL QUEL
    pourActiver: function (c) { return "action: paye ; nom: " + c.nom + " ; telephone: " + c.tel + " ; email: " + c.email + " ; code: " + c.code; },
    // retour sur la page : même vérification que la case « J'ai un code » ; seul « reseau » est dit « pas de connexion »
    essayerCode: function (code) {
      return verifierCode(code).then(function (r) {
        return { etat: r.etat === "ok" ? "ok" : r.etat === "reseau" ? "reseau" : "inconnu", fin: r.fin, code: r.code };
      });
    },
    // code de la commande activé : le Pass s'ouvre sur ce téléphone
    passOuvert: function (r) {
      ecrirePass({ code: r.code, fin: r.fin, verifie: Date.now() });
      liensDeDepart();
      var cs = document.getElementById("code-status");
      if (cs) { cs.className = "ok"; cs.textContent = T("Paiement reçu : votre Pass Ma voiture est ouvert sur ce téléphone jusqu'au " + finLisible(r.fin) + ".",
        "تم استلام الدفع: باقة سيارتك مفتوحة على هذا الهاتف إلى غاية " + finLisible(r.fin, true) + "."); }
      annoncerPass();
    },
    nouvelle: function (p) {
      liensDeDepart();
      var st = document.getElementById("pass-status");
      if (st) { st.className = ""; st.textContent = ""; }
      try { p.form.scrollIntoView({ block: "start" }); } catch (x) {}
    }
  });
})();
