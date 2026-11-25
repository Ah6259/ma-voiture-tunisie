# -*- coding: utf-8 -*-
"""Fabrique les pages du site. UNE ADRESSE PAR LANGUE (21/11/2026, règle commune § 8 point 9 ; même méthode qu'Outils pratiques
et Code de la route) : chaque page existe en français à son adresse (<chemin>/index.html) ET en arabe (ar/<chemin>/index.html).

Sources (bilingues : spans data-l="fr" / data-l="ar", écrites à la main) :
  - tools/gabarits/<page>.html : lignes « clé: valeur » (titre, description, og_titre, og_description, tete, scripts, corps, faq),
    puis « --- », puis le contenu de <body> (sans l'en-tête ni le pied, ajoutés par assets/page.js) ; « __ » = sous-dossier ;
  - tools/sources/index.html   : l'accueil, page entière écrite à la main ;
  - tools/textes-ar.json        : titre, description et titre de partage ARABES de chaque page (clé = chemin, "" = accueil).
Ce programme écrit, pour chaque page :
  - <chemin>/index.html     : français seul (textes arabes retirés), lang="fr", data-langue-fixe="fr", data-autre-langue ;
  - ar/<chemin>/index.html  : arabe seul, lang="ar" dir="rtl", titre / description / canonical / og:url / og:locale arabes,
                              fichiers communs (style, scripts, images, données) pris à la racine, pages dans ar/ ;
  - hreflang fr / ar / x-default (= français) réciproques sur les deux ; sitemap.xml (FR + AR + video/) ;
  - tools/modele-video.html : la page « Comment fonctionne le site ? » BILINGUE, modèle de tools/page_video.mjs (video/ garde une
    seule adresse, ?lang=ar) ; la version ?v= de video/index.html est aussi remplacée (UNE version pour tout le site).
  python tools/construire.py             → écrit tout
  python tools/construire.py --verifier  → n'écrit rien ; code 1 si une page fabriquée n'est pas à jour (robot « tests »)
Ne JAMAIS modifier <chemin>/index.html ni ar/ à la main : modifier la source puis construire."""
import html as H, json, os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(ICI)
VERSION = "20261125h"           # à changer à chaque modification des fichiers assets/ (le test vérifie une seule version)
BASE = "https://voiture.clicvia.com/"
CSP = ("default-src 'self'; script-src 'self' https://gc.zgo.at; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://prix-eaux-tunisie.goatcounter.com; "
       "connect-src 'self' https://prix-eaux-tunisie.goatcounter.com https://formspree.io https://api-email.clicvia.com; object-src 'none'; base-uri 'self'; "
       "form-action 'self' https://formspree.io")


def titre_seo(t, maxi=70):
    """Titre Google <= 70 caractères : le suffixe « | Ma voiture Tunisie » saute s'il dépasse, puis coupe à un séparateur (règle commune SEO)."""
    t = " ".join(t.split())
    if len(t) <= maxi:
        return t
    base = t.split(" | ")[0].strip()
    if len(base) <= maxi:
        return base
    for sep in (" : ", " — ", " (", ", "):
        i = base.rfind(sep, 0, maxi)
        if i > 20:
            return base[:i].rstrip(" ,:—(")
    return base[:maxi - 1].rsplit(" ", 1)[0] + "…"


def desc_seo(d, maxi=165):
    """Description <= 165 caractères, coupée en fin de phrase, sinon au mot + « … »."""
    d = " ".join(d.split())
    if len(d) <= maxi:
        return d
    i = max(d.rfind(". ", 0, maxi), d.rfind(" ? ", 0, maxi), d.rfind(" ! ", 0, maxi))
    if i > 40:
        return d[:i + 1].strip()
    return d[:maxi - 1].rsplit(" ", 1)[0] + "…"


def lire_gabarit(chemin):
    texte = open(chemin, encoding="utf-8").read()
    tete, corps = texte.split("\n---\n", 1)
    meta = {}
    for ligne in tete.splitlines():
        if ":" in ligne and not ligne.startswith("#"):
            k, v = ligne.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, corps


def page(chemin_page, meta, corps):
    profondeur = chemin_page.count("/")
    r = "../" * profondeur
    # en-tête : règles, page commune (+ « tete », ex. pass.js) ; bas de page : les scripts propres à la page (« scripts »)
    tete = ["regles.js", "page.js"] + [s.strip() for s in meta.get("tete", "").split(",") if s.strip()]
    bas = [s.strip() for s in meta.get("scripts", "").split(",") if s.strip()]
    faq = ""
    if meta.get("faq"):
        q = json.load(open(os.path.join(ICI, "gabarits", meta["faq"]), encoding="utf-8"))
        faq = ('<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in q]}, ensure_ascii=False) + "\n</script>\n")
    attr_corps = (" " + meta["corps"]) if meta.get("corps") else ""
    robots = '<meta name="robots" content="noai, noimageai">' if meta.get("index", "oui") == "oui" else '<meta name="robots" content="noindex, noai, noimageai">'
    return f"""<!doctype html>
<html lang="fr" dir="ltr" translate="no" data-racine="{r}">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
{robots}
<title>{titre_seo(meta['titre'])}</title>
<meta name="description" content="{desc_seo(meta['description'])}">
<link rel="canonical" href="{BASE}{chemin_page.rsplit('index.html', 1)[0]}">
<link rel="icon" href="{r}assets/logo.svg" type="image/svg+xml">
<link rel="manifest" href="{r}manifest.webmanifest">
<link rel="apple-touch-icon" href="{r}assets/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Ma voiture">
<meta name="theme-color" content="#2B3990">
<meta property="og:title" content="{meta.get('og_titre', meta['titre'])}">
<meta property="og:description" content="{meta.get('og_description', meta['description'])}">
<meta property="og:image" content="{BASE}assets/og-image-v2.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:type" content="website">
<meta property="og:url" content="{BASE}{chemin_page.rsplit('index.html', 1)[0]}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&family=Noto+Kufi+Arabic:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{r}assets/style.css?v={VERSION}">
{faq}{chr(10).join(f'<script src="{r}assets/{s}?v={VERSION}"></script>' for s in tete)}
</head>
<body{attr_corps}>
<header class="entete" id="entete"></header>
{corps.strip()}
<footer id="pied"></footer>
{"".join(f'<script src="{r}assets/{s}?v={VERSION}"></script>' + chr(10) for s in bas)}<script data-goatcounter="https://prix-eaux-tunisie.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</body>
</html>
"""


# ---------------------------------------------------------------------------------------------------------------
# UNE ADRESSE PAR LANGUE : page bilingue -> page française seule + page arabe seule (ar/…)
# ---------------------------------------------------------------------------------------------------------------
NOM_AR = "مواعيد سيارتك"
BALISE = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(/?)>", re.S)
VIDES = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
HTML_SOURCE = re.compile(r'<html lang="fr" dir="ltr" translate="no" data-racine="([^"]*)">')
# textes d'attributs écrits seulement en français dans les sources (bloc commun « Paiement ») : leur arabe sur la page arabe
ATTRIBUTS_AR = {
    'title="Voir comment faire" aria-label="Voir comment faire"': 'title="كيف أقوم بذلك؟" aria-label="كيف أقوم بذلك؟"',
    'alt="Exemple D17 : Transfert rapide, numéro 24 321 390, montant, Envoyer"': 'alt="مثال D17: التحويل السريع، الرقم 24 321 390، المبلغ، إرسال"',
    'alt="Exemple IZI : Transfert, montant, numéro 24 321 390, Suivant"': 'alt="مثال IZI: تحويل، المبلغ، الرقم 24 321 390، التالي"',
}


def retirer_langue(texte, autre):
    """Enlève chaque élément data-l="<autre>" (et tout ce qu'il contient)."""
    sortie, i, saut = [], 0, 0
    for m in BALISE.finditer(texte):
        if m.start() < max(i, saut):
            continue
        ferme, nom, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if nom in ("script", "style") and not ferme:          # jamais de balise cherchée dans un script ou un style
            fin = texte.find(f"</{nom}", m.end())
            saut = len(texte) if fin < 0 else fin
            continue
        if ferme or f'data-l="{autre}"' not in attrs:
            continue
        sortie.append(texte[i:m.start()])
        if nom in VIDES or m.group(4):
            i = m.end()
            continue
        prof, j = 1, len(texte)                               # fin de l'élément : même nom de balise, en comptant l'imbrication
        for n in BALISE.finditer(texte, m.end()):
            if n.group(2).lower() != nom or n.group(4):
                continue
            prof += -1 if n.group(1) else 1
            if prof == 0:
                j = n.end()
                break
        i = j
    sortie.append(texte[i:])
    return re.sub(r"\n[ \t]*\n([ \t]*\n)+", "\n\n", "".join(sortie))


def _resoudre(chemin, rel):
    parts = [x for x in chemin.split("/") if x]
    for x in rel.split("/"):
        if x in ("", "."):
            continue
        if x == "..":
            if parts:
                parts.pop()
        else:
            parts.append(x)
    return "/".join(parts) + ("/" if parts and (rel.endswith("/") or rel in ("", ".", "..")) else "")


def _plus_un_niveau(url, chemin, miroir):
    """Adresse relative vue depuis la page arabe (un dossier plus bas) : une page qui existe aussi en arabe reste dans ar/ ;
    tout le reste (style, scripts, images, données, video/) est pris à la racine du site."""
    if not url or re.match(r"^([a-z][a-z0-9+.-]*:|//|/|#|\?)", url, re.I):
        return url
    p = url.split("#")[0].split("?")[0]
    if p == "" or p.endswith("/") or p in (".", ".."):
        if _resoudre(chemin, p) in miroir:
            return url
    return "../" + url


def _reecrire_liens(texte, chemin, miroir):
    def attr(m):
        return f'{m.group(1)}="{_plus_un_niveau(m.group(2), chemin, miroir)}"'
    return re.sub(r'\b(href|src|action|poster)="([^"]*)"', attr, texte)


def tete_langues(chemin):
    fr, ar = BASE + chemin, BASE + "ar/" + chemin
    return (f'<link rel="alternate" hreflang="fr" href="{fr}">\n<link rel="alternate" hreflang="ar" href="{ar}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{fr}">')


def versions(source, chemin, miroir, textes):
    """source = page bilingue ; chemin = "" (accueil), "vignette/", "pass/conditions/"… Renvoie (française, arabe)."""
    m = HTML_SOURCE.search(source)
    if not m:
        raise SystemExit(f"ÉCHEC - {chemin or 'accueil'} : balise <html lang=\"fr\" dir=\"ltr\" translate=\"no\" data-racine=…> attendue")
    racine = m.group(1)
    tx = textes.get(chemin) or {}
    titre_ar, desc_ar = tx.get("titre", "").strip(), tx.get("description", "").strip()
    if not titre_ar or not desc_ar:
        raise SystemExit(f"ÉCHEC - {chemin or 'accueil'} : titre ou description arabe manquant dans tools/textes-ar.json")
    tete = tete_langues(chemin)
    vers_ar = racine + "ar/" + chemin                    # bouton de langue : adresse relative de l'autre version
    vers_fr = "../" + racine + chemin

    fr = retirer_langue(source, "ar")
    fr = fr.replace(m.group(0), f'<html lang="fr" dir="ltr" translate="no" data-racine="{racine}" data-langue-fixe="fr" data-autre-langue="{vers_ar}">', 1)
    fr = fr.replace('<link rel="canonical"', tete + '\n<link rel="canonical"', 1)
    fr = re.sub(r'(<meta property="og:url" content="[^"]*">)', r'\1\n<meta property="og:locale" content="fr_FR">\n<meta property="og:locale:alternate" content="ar_AR">', fr, count=1)

    ar = retirer_langue(source, "fr")
    ar = _reecrire_liens(ar, chemin, miroir)
    # textes des photos, des cases et des listes en arabe dès le serveur (assets/page.js les garde ensuite)
    ar = re.sub(r'\balt="[^"]*"([^>]*?\sdata-alt-ar="([^"]*)")', r'alt="\2"\1', ar)
    ar = re.sub(r'(<option\b[^>]*\sdata-ar="([^"]*)"[^>]*>)[^<]*(</option>)', r'\1\2\3', ar)
    ar = re.sub(r'(<(?:input|textarea)\b[^>]*\sdata-ph-ar="([^"]*)")', r'\1 placeholder="\2"', ar)
    for a, b in ATTRIBUTS_AR.items():
        ar = ar.replace(a, b)
    ar = ar.replace(m.group(0), f'<html lang="ar" dir="rtl" translate="no" data-racine="../{racine}" data-site="{racine}" data-langue-fixe="ar" data-autre-langue="{vers_fr}">', 1)
    url_ar = BASE + "ar/" + chemin
    t, d = H.escape(titre_seo(titre_ar), quote=False), H.escape(desc_seo(desc_ar))
    og_t = H.escape(tx.get("og_titre") or titre_ar.split(" | ")[0])
    ar = re.sub(r'<link rel="canonical" href="[^"]*">', lambda x: tete + f'\n<link rel="canonical" href="{url_ar}">', ar, count=1)
    ar = re.sub(r'<meta property="og:url" content="[^"]*">',
                lambda x: f'<meta property="og:url" content="{url_ar}">\n<meta property="og:locale" content="ar_AR">\n<meta property="og:locale:alternate" content="fr_FR">', ar, count=1)
    ar = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "", ar, flags=re.S)   # FAQ Google écrite en français
    ar = re.sub(r"<title>.*?</title>", lambda x: f"<title>{t}</title>", ar, count=1, flags=re.S)
    ar = re.sub(r'<meta name="description" content="[^"]*">', lambda x: f'<meta name="description" content="{d}">', ar, count=1)
    ar = re.sub(r'<meta property="og:title" content="[^"]*">', lambda x: f'<meta property="og:title" content="{og_t}">', ar, count=1)
    ar = re.sub(r'<meta property="og:description" content="[^"]*">', lambda x: f'<meta property="og:description" content="{d}">', ar, count=1)
    ar = ar.replace('<meta name="apple-mobile-web-app-title" content="Ma voiture">', '<meta name="apple-mobile-web-app-title" content="سيارتي">', 1)
    return fr, ar


def source_accueil():
    """L'accueil bilingue écrit à la main, avec la version ?v= du site (la source elle-même est remise à jour par main())."""
    return re.sub(r"\?v=\d{8}[a-z]", "?v=" + VERSION, open(os.path.join(ICI, "sources", "index.html"), encoding="utf-8").read())


def sources_bilingues():
    """{chemin: page bilingue} : l'accueil (tools/sources/index.html) et chaque gabarit."""
    pages = {"": source_accueil()}
    dossier = os.path.join(ICI, "gabarits")
    for nom in sorted(os.listdir(dossier)):
        if nom.endswith(".html"):
            meta, corps = lire_gabarit(os.path.join(dossier, nom))
            chemin = nom[:-5].replace("__", "/") + "/"          # « pass__conditions.html » → pass/conditions/
            pages[chemin] = page(chemin + "index.html", meta, corps)
    return pages


def fabriquer():
    """Renvoie ({fichier relatif: contenu}, chemins) de toutes les pages fabriquées."""
    bilingues = sources_bilingues()
    chemins = sorted(bilingues)
    miroir = set(chemins)
    textes = json.load(open(os.path.join(ICI, "textes-ar.json"), encoding="utf-8"))
    fichiers = {}
    for c in chemins:
        fr, ar = versions(bilingues[c], c, miroir, textes)
        fichiers[c + "index.html"] = fr
        fichiers["ar/" + c + "index.html"] = ar
    fichiers["tools/sources/index.html"] = bilingues[""]             # même version ?v= dans la source de l'accueil
    fichiers["tools/modele-video.html"] = bilingues["a-propos/"]    # modèle de tools/page_video.mjs (page bilingue)
    video = lire("video/index.html")
    if video is not None:
        fichiers["video/index.html"] = re.sub(r"\?v=\d{8}[a-z]", "?v=" + VERSION, video)
    return fichiers, chemins


def lire(rel):
    p = os.path.join(RACINE, rel)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None


def sitemap(chemins, anciennes_dates, changes, aujourd_hui):
    lignes = []
    for c in chemins + ["ar/" + c for c in chemins] + ["video/"]:
        loc = BASE + c
        date = aujourd_hui if (c in changes or not anciennes_dates.get(loc)) else anciennes_dates[loc]
        lignes.append(f"  <url><loc>{loc}</loc><lastmod>{date}</lastmod></url>")
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(lignes) + "\n</urlset>\n"


def main(argv):
    import datetime as dt
    fichiers, chemins = fabriquer()
    differents = [f for f, c in fichiers.items() if lire(f) != c]
    base = os.path.join(RACINE, "ar")
    orphelines = []                                      # page arabe sans source = à retirer (page supprimée)
    if os.path.isdir(base):
        for dossier, _, fs in os.walk(base):
            if "index.html" in fs:
                rel = "ar/" + os.path.relpath(os.path.join(dossier, "index.html"), base).replace(os.sep, "/")
                if rel not in fichiers:
                    orphelines.append(rel)
    sm = lire("sitemap.xml") or ""
    dates = {loc: d for loc, d in re.findall(r"<loc>([^<]+)</loc>(?:<lastmod>([^<]*)</lastmod>)?", sm)}
    pages_changees = {f[:-len("index.html")] for f in differents if f.endswith("index.html") and f != "video/index.html"}
    plan = sitemap(chemins, dates, pages_changees, dt.date.today().isoformat())
    if "--verifier" in argv:
        tous = chemins + ["ar/" + c for c in chemins] + ["video/"]
        manque = differents + orphelines + ([] if all(dates.get(BASE + c) for c in tous) else ["sitemap.xml"])
        if manque:
            print("ÉCHEC - pages fabriquées pas à jour (modifier tools/gabarits/ ou tools/sources/ puis lancer python tools/construire.py) : " + ", ".join(manque))
            return 1
        print(f"OK - {len(chemins) * 2} pages fabriquées à jour ({len(chemins)} en français + {len(chemins)} en arabe), version {VERSION}")
        return 0
    for f in differents:
        dest = os.path.join(RACINE, f)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, "w", encoding="utf-8", newline="\n").write(fichiers[f])
    for f in orphelines:
        os.remove(os.path.join(RACINE, f))
    if os.path.isdir(base):
        for dossier, _, _ in sorted(os.walk(base), key=lambda x: -len(x[0])):
            if dossier != base and not os.listdir(dossier):
                os.rmdir(dossier)
    if plan != sm:
        open(os.path.join(RACINE, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write(plan)
    print(f"{len(chemins)} page(s) : français + arabe (ar/) ; {len(differents)} fichier(s) refait(s) ; version {VERSION} ; plan du site à jour")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
