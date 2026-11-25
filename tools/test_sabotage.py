# -*- coding: utf-8 -*-
"""Sabotage volontaire (règle commune) : on abîme une COPIE du site de 19 façons ; chaque fois, tools/test_site.mjs doit échouer.
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
    # parcours commun du Pass (25/11/2026, règle commune § 70) : chaque nouvelle vérification doit attraper son sabotage
    ("assets/pass.js", "const n = PASS.longueur, t", "const n = PASS.longueur + 1, t", "code de commande au mauvais format (9 caractères)"),
    ("assets/pass.js", 'donnees.set("code", commande.code);', "", "code de commande pas envoyé à Formspree"),
    ("assets/pass.js", "ecrireCommande(commande);", "", "commande pas gardée dans le téléphone"),
    ("assets/pass.js", "JSON.stringify({ code: c.code, formule: c.formule, date: c.date })",
     'JSON.stringify({ code: c.code, formule: c.formule, date: c.date, tel: (document.getElementById("pass-tel") || {}).value })', "téléphone du client gardé dans localStorage"),
    ("assets/pass.js", '"Voici ma preuve de paiement — Ma voiture Tunisie — code " + c.code', '"Voici ma preuve de paiement — Ma voiture Tunisie — code "', "code absent du message WhatsApp"),
    ("assets/pass.js", "const r = await verifierCode(c.code);", 'const r = { etat: "inconnu" };', "code de commande activé pas essayé tout seul au retour"),
    ("assets/pass.js", "age <= PASS.commandeJours", "age <= 9999", "commande gardée plus de 60 jours"),
    ("assets/pass.js", 'if (haut && bandeau) haut.hidden = false;', "", "bandeau « commande en attente » absent au retour"),
    ("assets/pass.js", "e.hidden = !PASS.emailAuto;", "e.hidden = false;", "phrase « aussi par e-mail » affichée alors que l'e-mail automatique n'existe pas"),
    # 25/11/2026 (demande d'Ahmed) : nom dans le message WhatsApp ; pas de promesse d'e-mail dans l'étiquette tant que EMAIL_AUTO = false
    ("assets/pass.js", 'const n = nom ? " — " + nom : "";', 'const n = "";', "nom absent du message WhatsApp de la preuve"),
    ("assets/pass.js", "x.hidden = !EMAIL_AUTO; });", "x.hidden = false; });", "étiquette de l'e-mail qui promet le code par e-mail"),
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
