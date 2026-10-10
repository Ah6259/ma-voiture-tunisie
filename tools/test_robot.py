# -*- coding: utf-8 -*-
"""Scénarios du robot de surveillance (tools/surveillance.py), sans réseau : de fausses sources remplacent Internet.
  python tools/test_robot.py"""
import importlib.util, json, os, shutil, sys, tempfile

ICI = os.path.dirname(os.path.abspath(__file__))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
erreurs = total = 0


def check(desc, ok):
    global erreurs, total
    total += 1
    print(("OK   " if ok else "FAIL ") + desc)
    if not ok:
        erreurs += 1


def rss(*items):
    return ("<rss><channel>" + "".join(f"<item><title>{t}</title><link>{l}</link><pubDate>{d}</pubDate></item>" for t, l, d in items) + "</channel></rss>").encode()


ATTT_AVANT = "<table><tr><td>26,500</td><td>16,000</td><td>145,000</td></tr></table>".encode()
ATTT_APRES = "<table><tr><td>29,000</td><td>16,000</td><td>145,000</td></tr></table>".encode()


def robot(dossier):
    """Charge une copie de surveillance.py qui travaille dans <dossier> (copie du site)."""
    spec = importlib.util.spec_from_file_location("surv", os.path.join(dossier, "tools", "surveillance.py"))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


def copie():
    d = tempfile.mkdtemp()
    for x in ("tools", "assets", "donnees"):
        shutil.copytree(os.path.join(os.path.dirname(ICI), x), os.path.join(d, x), ignore=shutil.ignore_patterns("_icone", "__pycache__", "gabarits"))
    v = os.path.join(d, "donnees", "veille.json")
    if os.path.exists(v):
        os.remove(v)
    return d


def lecteur(table, panne=()):
    def lire(url, **k):
        if any(p in url for p in panne):
            raise RuntimeError("panne simulée " + url)
        for cle, val in table.items():
            if cle in url:
                return val
        return b"<rss><channel></channel></rss>" if "feed" in url or "rss" in url else b"<html>ok</html>"
    return lire


# 1. un article récent sur une hausse des carburants → alerte, une seule fois
d = copie(); m = robot(d)
L = lecteur({"lapresse": rss(("Carburants : nouvelle hausse des prix à la pompe", "https://ex.tn/a1", "Thu, 08 Oct 2026 10:00:00 +0100"),
                             ("Football : victoire de l'EST", "https://ex.tn/a2", "Thu, 08 Oct 2026 10:00:00 +0100")), "attt": ATTT_AVANT})
c = m.main(["--aujourdhui", "2026-10-09"], lecteur=L)
alerte = open(os.path.join(d, "alerte.txt"), encoding="utf-8").read() if os.path.exists(os.path.join(d, "alerte.txt")) else ""
check("article récent « nouvelle hausse des prix à la pompe » → alerte (code 2) avec le lien ; le football est ignoré", c == 2 and "https://ex.tn/a1" in alerte and "a2" not in alerte)
os.remove(os.path.join(d, "alerte.txt"))
c = m.main(["--aujourdhui", "2026-10-10"], lecteur=L)
check("le même article le lendemain : déjà vu, rien à signaler (code 0)", c == 0)
check("rien à signaler → dates « vérifiés le » mises à jour (carburants et site)", 'verifie: "10/10/2026"' in open(os.path.join(d, "assets", "regles.js"), encoding="utf-8").read()
      and 'const MAJ = "10/10/2026";' in open(os.path.join(d, "assets", "page.js"), encoding="utf-8").read())

# 2. vieil article (plus de 10 jours) ; titre arabe
d = copie(); m = robot(d)
c = m.main(["--aujourdhui", "2026-10-09"], lecteur=lecteur({"lapresse": rss(("Hausse des prix des carburants", "https://ex.tn/v", "Mon, 01 Sep 2026 10:00:00 +0100")),
                                                           "mosaiquefm.net/ar": rss(("تعديل أسعار المحروقات بداية من الغد", "https://ex.tn/ar", "Fri, 09 Oct 2026 08:00:00 +0100")), "attt": ATTT_AVANT}))
alerte = open(os.path.join(d, "alerte.txt"), encoding="utf-8").read()
check("vieil article ignoré ; titre arabe « تعديل أسعار المحروقات » → alerte", c == 2 and "ex.tn/ar" in alerte and "ex.tn/v" not in alerte)

# 3. tarifs de l'ATTT : première lecture = référence ; changement → alerte avec avant / après
d = copie(); m = robot(d)
c1 = m.main(["--aujourdhui", "2026-10-09"], lecteur=lecteur({"attt": ATTT_AVANT}))
c2 = m.main(["--aujourdhui", "2026-10-10"], lecteur=lecteur({"attt": ATTT_APRES}))
alerte = open(os.path.join(d, "alerte.txt"), encoding="utf-8").read()
check("ATTT : 1re lecture = référence (code 0) ; 26,500 devient 29,000 → alerte avant/après", c1 == 0 and c2 == 2 and "26,500" in alerte and "29,000" in alerte)
regles = open(os.path.join(d, "assets", "regles.js"), encoding="utf-8").read()
check("le robot ne change JAMAIS un montant du site (visite toujours 36.5)", "tarif: 36.5" in regles)

# 4. pannes : tous les flux en panne → alerte ; un lien officiel en panne 7 jours → alerte, 3 jours → rien
d = copie(); m = robot(d)
c = m.main(["--aujourdhui", "2026-10-09"], lecteur=lecteur({"attt": ATTT_AVANT}, panne=("feed", "rss")))
check("tous les flux d'actualités en panne → alerte « la veille ne fonctionne plus »", c == 2 and "Aucun flux" in open(os.path.join(d, "alerte.txt"), encoding="utf-8").read())
d = copie(); m = robot(d)
L = lecteur({"attt": ATTT_AVANT}, panne=("amendes.finances",))
c3 = m.main(["--aujourdhui", "2026-10-01"], lecteur=L)
c4 = m.main(["--aujourdhui", "2026-10-04"], lecteur=L)
c5 = m.main(["--aujourdhui", "2026-10-08"], lecteur=L)
check("lien officiel en panne : rien les 3 premiers jours, alerte au 7e jour", c3 == 0 and c4 == 0 and c5 == 2 and "amendes.finances" in open(os.path.join(d, "alerte.txt"), encoding="utf-8").read())
d = copie(); m = robot(d)
c = m.main(["--aujourdhui", "2026-10-09"], lecteur=lecteur({"attt": ATTT_AVANT, "lapresse": b"pas du xml <<<"}))
check("un flux illisible n'arrête pas le robot (les autres sont lus)", c == 0)
v = json.load(open(os.path.join(d, "donnees", "veille.json"), encoding="utf-8"))
check("donnees/veille.json : date du dernier passage et empreinte ATTT gardées", v.get("dernier") == "2026-10-09" and len(v.get("attt", "")) == 16)

# 5. jour ordinaire (--leger) : actualités seulement ; ATTT, liens et dates ne sont pas touchés (pas de commit)
d = copie(); m = robot(d)
_regles = open(os.path.join(d, "assets", "regles.js"), encoding="utf-8").read()
_vus = []
def _lect(url):
    _vus.append(url); return lecteur({"attt": ATTT_AVANT})(url)
c = m.main(["--leger", "--aujourdhui", "2026-10-11"], lecteur=_lect)
check("--leger : rien à signaler (code 0), ATTT et liens officiels non lus", c == 0 and m.ATTT not in _vus and not any(l in _vus for l in m.LIENS))
check("--leger : dates « vérifiés le » inchangées (pas de commit inutile)", open(os.path.join(d, "assets", "regles.js"), encoding="utf-8").read() == _regles)
c = m.main(["--leger", "--aujourdhui", "2026-10-09"], lecteur=lecteur({"lapresse": rss(("Vignette 2027 : nouveau barème", "https://ex.tn/vg", "Thu, 08 Oct 2026 10:00:00 +0100"))}))
check("--leger : un article sur la vignette donne quand même l'alerte (code 2)", c == 2 and "ex.tn/vg" in open(os.path.join(d, "alerte.txt"), encoding="utf-8").read())

print(f"\n{'TOUT PASSE' if not erreurs else str(erreurs) + ' PROBLÈME(S)'} ({total} vérifications)")
sys.exit(1 if erreurs else 0)
