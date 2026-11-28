# -*- coding: utf-8 -*-
"""Sabotage volontaire (règle commune) : on abîme une COPIE du site de 30 façons ; chaque fois, tools/test_site.mjs doit échouer.
  python tools/test_sabotage.py      (lancé aussi par .github/workflows/tests.yml)
Ancres courtes et stables (règle du 08/10/2026) : si une ancre n'est plus trouvée, le test le dit (à adapter dans le même commit)."""
import os, shutil, subprocess, sys, tempfile

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
SABOTAGES = [
    ("assets/regles.js", "[7, 130, 280, 455]", "[7, 131, 280, 455]", "montant de la vignette faux"),
    ("assets/regles.js", "r.getDay() === 0 ||", "false &&", "report du dimanche oublié"),
    ("assets/regles.js", "age >= 10 ? 1 : 2", "age >= 10 ? 2 : 2", "rythme de la visite technique faux"),
    ("assets/page.js", '<button class="partager"', '<button class="x-partager"', "bouton Partager retiré"),
    ("assets/agenda.js", "alarmes: [15, 7, 1]", "alarmes: [15, 7]", "une alarme de l'agenda retirée"),
    ("assets/carnet.js", "coutKm = entre.reduce", "coutKm = 2 * entre.reduce", "coût au kilomètre faux"),
    # une adresse par langue (21/11/2026) : page arabe modifiée à la main (hreflang retiré), renvoi « ?lang=ar » oublié
    ("ar/vignette/index.html", '<link rel="alternate" hreflang="x-default"', '<link rel="alternate" hreflang="x-defaut"', "page arabe modifiée à la main (hreflang)"),
    ("assets/page.js", "if (voulue && voulue !== FIXE && !robot) aller();", "", "ancien lien ?lang=ar plus renvoyé vers ar/"),
    # parcours commun du Pass : depuis le 25/11/2026 (PASS.1) par le MODULE COMMUN assets/pass-commun.js + le réglage assets/pass-reglages.js
    ("assets/pass-commun.js", "if (!robot) memoriser(cmdNouvelle);", "", "copie du module commun modifiée dans le site"),
    ("assets/pass-reglages.js", "longueur: PASS.longueur }", "longueur: PASS.longueur + 1 }", "code de commande au mauvais format (9 caractères)"),
    ("assets/pass-reglages.js", '" ; code: " + c.code; }', '""; }', "code absent de la ligne pour_activer"),
    ("assets/pass-reglages.js", 'nomSite: { fr: "Ma voiture Tunisie"', 'nomSite: { fr: "Ma voiture"', "nom du site faux dans le message WhatsApp"),
    ("assets/pass-reglages.js", "return verifierCode(code).then(", "return Promise.resolve({}).then(", "code de commande activé pas essayé tout seul au retour"),
    ("assets/pass-reglages.js", "apresAuRetour: true,", "apresAuRetour: false,", "étapes du paiement absentes au retour"),
    ("assets/pass-reglages.js", "ecrirePass({ code: r.code, fin: r.fin, verifie: Date.now() });", "", "code activé au retour mais Pass pas ouvert"),
    ("assets/pass-reglages.js", "emailAuto: true,", "emailAuto: false,", "e-mail automatique coupé (emailAuto: false)"),
    ("assets/pass-reglages.js", 'site: "voiture",', 'site: "voitures",', "mauvaise clé du site pour l'e-mail automatique"),
    ("assets/pass-reglages.js", 'd.set("email", c.email);', 'd.delete("email");', "e-mail pas envoyé à Formspree"),
    ("tools/gabarits/pass.html", "tete: pass.js, pass-commun.js, pass-reglages.js", "tete: pass.js, pass-commun.js", "réglage du site pas chargé par la page"),
    ("tools/construire.py", "https://formspree.io https://api-email.clicvia.com;", "https://formspree.io;", "CSP qui bloque le service d'e-mail"),
    # vers le Pass Ma voiture (25/11/2026, décision d'Ahmed, pas de gratuité) : un seul nom, encadrés, clics comptés
    ("assets/page.js", '${T("Pass Ma voiture", "باقة سيارتك")}</a>` : ""}', '${T("Pass Rappels", "باقة التذكير")}</a>` : ""}', "ancien nom « Pass Rappels » remis dans le pied de page"),
    ("assets/page.js", 'path: "/ma-voiture-tunisie/clic/" + nom', 'path: "clic/" + nom', "clic vers le Pass compté sans le préfixe du site"),
    ("vignette/index.html", ' data-clic="pass-vignette"', "", "encadré de la page vignette sans clic compté"),
    # 28/11/2026 : encadrés de carburant/ et achat-vente/ (audit : seul le pied de page menait au Pass)
    ("carburant/index.html", ' data-clic="pass-carburant"', "", "encadré de la page carburant sans clic compté"),
    ("ar/achat-vente/index.html", '<!--encadre-pass-->', '<!--encadre-x-->', "encadré du Pass retiré de la page arabe achat-vente"),
    ("achat-vente/index.html", 'href="../pass/" data-clic="pass-achat-vente"', 'href="../" data-clic="pass-achat-vente"', "bouton de l'encadré achat-vente qui ne mène pas au Pass"),
    ("ar/carburant/index.html", 'تابع تعبئاتك وكل مصاريف سيارتك', 'تابع تعبئاتك', "texte arabe de l'encadré carburant abîmé"),
    ("tools/modele-video.html", "« Suivez vos pleins et toutes vos dépenses » sur le carburant", "", "« Comment fonctionne le site ? » sans l'encadré du carburant"),
    ("assets/pass.js", '${clic ? ` data-clic="${clic}"` : ""}', "", "encart de la 2e voiture et du carnet sans clic compté"),
    ("tools/modele-video.html", "<b>Pass Ma voiture sur les pages vignette, visite technique, carburant et achat-vente</b>", "<b>Pass</b>", "« Comment fonctionne le site ? » sans l'encadré du Pass"),
]
IGNORER = shutil.ignore_patterns("node_modules", ".git", "_icone", "__pycache__")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    rate = 0
    for f, avant, apres, quoi in SABOTAGES:
        with tempfile.TemporaryDirectory() as tmp:
            copie = os.path.join(tmp, "site")
            shutil.copytree(RACINE, copie, ignore=IGNORER)
            p = os.path.join(copie, f)
            s = open(p, encoding="utf-8").read()
            if avant not in s:
                print(f"FAIL ancre introuvable dans {f} : {avant!r} (adapter ce sabotage)"); rate += 1; continue
            open(p, "w", encoding="utf-8", newline="\n").write(s.replace(avant, apres, 1))
            r = subprocess.run(["node", os.path.join(ICI, "test_site.mjs"), copie], capture_output=True, text=True, encoding="utf-8", stdin=subprocess.DEVNULL)
            if r.returncode == 0:
                print(f"FAIL sabotage NON détecté : {quoi}"); rate += 1
            else:
                print(f"OK   sabotage détecté : {quoi}")
    print("\nTOUT PASSE" if not rate else f"\n{rate} PROBLÈME(S)")
    return 1 if rate else 0


if __name__ == "__main__":
    sys.exit(main())
