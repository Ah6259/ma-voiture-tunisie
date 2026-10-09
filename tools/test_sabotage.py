# -*- coding: utf-8 -*-
"""Sabotage volontaire (règle commune) : on abîme une COPIE du site de 6 façons ; chaque fois, tools/test_site.mjs doit échouer.
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
