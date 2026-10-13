# -*- coding: utf-8 -*-
"""Robot de surveillance de Ma voiture Tunisie (lancé chaque jour par .github/workflows/surveillance.yml, --leger sauf le lundi).
Il NE MODIFIE JAMAIS un montant du site : il prévient (alerte = issue GitHub → e-mail à Ahmed) et c'est une session
Claude qui vérifie la source officielle puis met à jour assets/regles.js.

1. Actualités (flux RSS de la presse tunisienne, lecture lente, User-Agent honnête) : un article RÉCENT dont le titre parle
   d'un changement des prix des carburants, du barème ou du calendrier de la vignette, ou des tarifs de la visite technique
   → alerte (une seule fois par article : donnees/veille.json garde ceux déjà vus).
2. ATTT (page d'accueil, tableau des tarifs) : empreinte des montants « 26,500 », « 16,000 »… ; si elle change → alerte.
3. Liens officiels cités par le site (taxe-circulation, amendes, douane, ATTT) : injoignables 7 jours de suite → alerte.
4. Tout s'est bien passé → date « vérifiés le » des carburants et date MAJ du site mises à jour (battement de cœur).
--leger (audit des robots du 10/10/2026, décision d'Ahmed : « arrête la vérification non importante ») : les jours ordinaires,
   seule la veille des actualités (1) tourne ; ATTT, liens officiels et dates (2 à 4) une fois par semaine (passage complet).
Codes de sortie : 0 rien à signaler ; 2 alerte à ouvrir (texte dans alerte.txt) ; 3 panne du robot lui-même.
Usage : python tools/surveillance.py [--sans-reseau] [--leger] [--aujourdhui AAAA-MM-JJ]"""
import argparse, datetime as dt, email.utils, hashlib, html, json, os, re, sys, time, urllib.request
import xml.etree.ElementTree as ET

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
VEILLE = os.path.join(RACINE, "donnees", "veille.json")
UA = {"User-Agent": "ma-voiture-tunisie/1.0 (+https://voiture.clicvia.com/)"}
FLUX = ["https://lapresse.tn/feed/", "https://www.webdo.tn/fr/feed/",
        "https://managers.tn/feed/", "https://kapitalis.com/tunisie/feed/", "https://www.mosaiquefm.net/fr/rss",
        "https://www.mosaiquefm.net/ar/rss"]
# un titre doit parler du SUJET et d'un CHANGEMENT (ou d'une nouvelle année) pour donner l'alerte
SUJETS = [r"carburant", r"essence", r"gasoil", r"gazoil", r"prix à la pompe", r"المحروقات", r"البنزين", r"الغازوال",
          r"vignette", r"taxe de circulation", r"معلوم الجولان", r"معاليم الجولان", r"visite technique", r"الفحص الفني"]
CHANGE = [r"hausse", r"augment", r"baisse", r"nouveau", r"nouvelle", r"nouveaux", r"tarif", r"prix", r"barème", r"délai", r"date limite",
          r"20\d\d", r"زيادة", r"الترفيع", r"تعديل", r"أسعار", r"تعريف", r"آجال", r"جديد"]
ATTT = "https://www.attt.com.tn/"
LIENS = ["https://taxe-circulation.finances.gov.tn", "https://amendes.finances.gov.tn", "https://www.douane.gov.tn/taxationveh/", ATTT,
         "https://www.attt.com.tn/DEV_WEB/prendreunrendezvous.php?code_menu=73"]     # page de rendez-vous de l'ATTT (bouton de la page Visite technique)
JOURS_RECENT = 10


def lire(url, essais=2, pause=3):
    dernier = None
    for i in range(essais):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read()
        except Exception as e:  # réseau, certificat, 4xx/5xx
            dernier = e
            time.sleep(pause * (i + 1))
    raise RuntimeError(f"{url} : {dernier}")


def articles(xml_brut):
    """Flux RSS → [(titre, lien, date ou None)]."""
    racine = ET.fromstring(xml_brut)
    res = []
    for it in racine.iter("item"):
        t = (it.findtext("title") or "").strip()
        l = (it.findtext("link") or "").strip()
        d = it.findtext("pubDate")
        try:
            d = email.utils.parsedate_to_datetime(d).date() if d else None
        except Exception:
            d = None
        if t and l:
            res.append((html.unescape(t), l, d))
    return res


def pertinent(titre):
    t = titre.lower()
    return any(re.search(s, t) for s in SUJETS) and any(re.search(c, t) for c in CHANGE)


def empreinte_attt(page_html):
    texte = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", page_html)))
    montants = re.findall(r"\b\d{1,4},\d{3}\b", texte)
    return hashlib.sha256(" ".join(montants).encode()).hexdigest()[:16], montants[:60]


def lire_json(chemin, defaut):
    try:
        return json.load(open(chemin, encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return defaut


def ecrire(chemin, texte):
    open(chemin, "w", encoding="utf-8", newline="\n").write(texte)


def maj_dates(jour):
    """Battement de cœur : « vérifiés le » des carburants (regles.js) et MAJ du site (page.js)."""
    f = jour.strftime("%d/%m/%Y")
    p = os.path.join(RACINE, "assets", "regles.js"); s = open(p, encoding="utf-8").read()
    s2 = re.sub(r'verifie: "\d\d/\d\d/\d{4}"', f'verifie: "{f}"', s, count=1)
    if s2 != s: ecrire(p, s2)
    p = os.path.join(RACINE, "assets", "page.js"); s = open(p, encoding="utf-8").read()
    s2 = re.sub(r'const MAJ = "\d\d/\d\d/\d{4}";', f'const MAJ = "{f}";', s, count=1)
    if s2 != s: ecrire(p, s2)


def main(argv=None, lecteur=lire):
    o = argparse.ArgumentParser(); o.add_argument("--sans-reseau", action="store_true"); o.add_argument("--aujourdhui", default="")
    o.add_argument("--leger", action="store_true")
    a = o.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    jour = dt.date.fromisoformat(a.aujourdhui) if a.aujourdhui else dt.date.today()
    v = lire_json(VEILLE, {})
    v.setdefault("vus", []); v.setdefault("pannes_liens", {})
    alertes, notes = [], []
    if a.sans_reseau:
        print("Contrôle sans réseau : rien à vérifier en ligne."); return 0

    # 1. actualités
    flux_ok = 0
    for f in FLUX:
        try:
            liste = articles(lecteur(f)); flux_ok += 1
        except Exception as e:
            notes.append(f"flux illisible : {e}"); continue
        for titre, lien, d in liste:
            if lien in v["vus"] or not pertinent(titre):
                continue
            if d and (jour - d).days > JOURS_RECENT:
                continue
            v["vus"].append(lien)
            alertes.append(f"- Article à vérifier : « {titre} » ({d or 'date inconnue'}) — {lien}")
        time.sleep(1)
    v["vus"] = v["vus"][-400:]
    if flux_ok == 0:
        alertes.append("- Aucun flux d'actualités n'a pu être lu (tous en panne ou bloqués) : la veille des prix ne fonctionne plus.")

    if a.leger:   # jour ordinaire : actualités seulement, rien d'autre n'est touché (pas de commit si rien de neuf)
        ecrire(VEILLE, json.dumps(v, ensure_ascii=False, indent=1) + "\n")
        if alertes:
            ecrire(os.path.join(RACINE, "alerte.txt"), "\n".join(alertes))
            print("\n".join(alertes))
            return 2
        print(f"Veille des actualités : rien à signaler le {jour:%d/%m/%Y} ({flux_ok} flux lus).")
        return 0

    # 2. tarifs de l'ATTT
    try:
        e, montants = empreinte_attt(lecteur(ATTT).decode("utf-8", "replace"))
        if not montants:
            notes.append("ATTT : aucun montant trouvé sur la page (format changé ?)")
        elif v.get("attt") and v["attt"] != e:
            alertes.append(f"- Les montants du tableau des tarifs de l'ATTT ont changé.\n  Avant : {' '.join(v.get('attt_montants', []))}\n  Maintenant : {' '.join(montants)}\n  Source : {ATTT}")
            v["attt"], v["attt_montants"] = e, montants
        else:
            v["attt"], v["attt_montants"] = e, montants
    except Exception as e:
        notes.append(f"ATTT injoignable : {e}")

    # 3. liens officiels du site
    for l in LIENS:
        try:
            lecteur(l); v["pannes_liens"].pop(l, None)
        except Exception:
            debut = v["pannes_liens"].setdefault(l, jour.isoformat())
            if (jour - dt.date.fromisoformat(debut)).days >= 7:
                alertes.append(f"- Lien officiel injoignable depuis le {debut} : {l} (à remplacer sur le site ?)")

    v["dernier"] = jour.isoformat()
    os.makedirs(os.path.dirname(VEILLE), exist_ok=True)
    ecrire(VEILLE, json.dumps(v, ensure_ascii=False, indent=1) + "\n")
    for n in notes:
        print("note :", n)
    if alertes:
        texte = "\n".join(alertes) + ("\n\nNotes du robot :\n" + "\n".join("- " + n for n in notes) if notes else "")
        ecrire(os.path.join(RACINE, "alerte.txt"), texte)
        print(texte)
        return 2
    maj_dates(jour)
    print(f"Rien à signaler le {jour:%d/%m/%Y} ({flux_ok} flux lus).")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("Panne du robot :", e)
        sys.exit(3)
