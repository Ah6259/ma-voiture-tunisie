/* Rappels dans l'agenda du téléphone : fabrique un fichier .ics (format standard, lu par Google Agenda, l'agenda de
   l'iPhone, Samsung, Outlook…). Chaque échéance devient un événement « toute la journée » avec des alarmes
   (par défaut 15 jours, 7 jours et 1 jour avant). Tout se fait dans le téléphone : rien n'est envoyé.
   Utilisé par assets/echeances.js (accueil). */
const AGENDA = {
  alarmes: [15, 7, 1],                                    // jours avant l'échéance
  produit: "-//Ma voiture Tunisie//Rappels//FR"
};

// texte ICS : échapper \ ; , et retours à la ligne ; lignes pliées à 75 octets (RFC 5545)
function icsTexte(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function icsPlier(ligne) {
  const octets = new TextEncoder().encode(ligne);
  if (octets.length <= 75) return ligne;
  const morceaux = []; let cour = "", taille = 0;
  for (const c of ligne) {
    const t = new TextEncoder().encode(c).length;
    if (taille + t > (morceaux.length ? 74 : 75)) { morceaux.push(cour); cour = ""; taille = 0; }
    cour += c; taille += t;
  }
  morceaux.push(cour);
  return morceaux.join("\r\n ");
}
const icsJour = d => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
function icsHorodatage(d) {
  return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, "0") + String(d.getUTCDate()).padStart(2, "0") + "T" +
    String(d.getUTCHours()).padStart(2, "0") + String(d.getUTCMinutes()).padStart(2, "0") + String(d.getUTCSeconds()).padStart(2, "0") + "Z";
}

/* evenements : [{ id, date (Date), titre, description }] → texte du fichier .ics */
function fabriquerIcs(evenements, maintenant) {
  const m = maintenant || new Date();
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:" + AGENDA.produit, "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             "X-WR-CALNAME:" + icsTexte("Ma voiture")];
  for (const e of evenements) {
    if (!(e.date instanceof Date) || isNaN(e.date)) continue;
    const fin = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1);
    L.push("BEGIN:VEVENT",
      "UID:" + icsTexte(e.id + "-" + icsJour(e.date) + "@ma-voiture-tunisie"),
      "DTSTAMP:" + icsHorodatage(m),
      "DTSTART;VALUE=DATE:" + icsJour(e.date),
      "DTEND;VALUE=DATE:" + icsJour(fin),
      "SUMMARY:" + icsTexte(e.titre),
      "DESCRIPTION:" + icsTexte(e.description || ""),
      "TRANSP:TRANSPARENT");
    for (const j of AGENDA.alarmes) {
      L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsTexte(e.titre), "TRIGGER:-P" + j + "D", "END:VALARM");
    }
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.map(icsPlier).join("\r\n") + "\r\n";
}

// propose le fichier au téléphone (enregistrer / ouvrir avec l'agenda)
function telechargerIcs(texte, nomFichier) {
  const blob = new Blob([texte], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nomFichier || "rappels-ma-voiture.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  if (window.__fichiers) window.__fichiers.push({ nom: a.download, texte });   // tests
}
