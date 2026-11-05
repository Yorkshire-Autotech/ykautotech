/* Yorkshire Autotech — reads a WhatsApp message (or shared contact card)
 * pasted into the admin page and pulls out the booking details it can find.
 * Everything it returns is a suggestion; the admin checks it before saving. */
(function () {
  "use strict";

  const MAKES = [
    "Alfa Romeo", "Land Rover", "Range Rover", "Mercedes-Benz", "Mercedes", "Merc", "Volkswagen", "VW",
    "Abarth", "Audi", "BMW", "Citroen", "Citroën", "Cupra", "Dacia", "DS", "Fiat", "Ford", "Honda", "Hyundai",
    "Jaguar", "Jeep", "Kia", "Lexus", "Mazda", "MG", "Mini", "Mitsubishi", "Nissan", "Peugeot", "Polestar",
    "Porsche", "Renault", "Seat", "Skoda", "Škoda", "Smart", "Subaru", "Suzuki", "Tesla", "Toyota", "Vauxhall", "Volvo",
  ];

  // Order matters: more specific phrases first (e.g. dashcam before camera).
  const SERVICES = [
    [/component protection/i, "Component Protection Removal"],
    [/carplay|car play|android auto/i, "CarPlay / Android Auto"],
    [/ambient/i, "Ambient Lighting"],
    [/starlight|star ?light|star roof|stars? (?:roof|headlin)/i, "Starlight Headlining"],
    [/dash ?cam/i, "Dashcam"],
    [/revers(?:e|ing) cam|rear cam|back(?:up)? cam/i, "Reverse Camera"],
    [/steering wheel/i, "Steering Wheel Upgrade"],
    [/virtual cockpit|digital (?:dash|cluster)/i, "Virtual Cockpit"],
    [/diagnos|warning light|fault|engine light/i, "Diagnostics"],
    [/\bcod(?:e|ing)\b|activat|unlock|retrofit/i, "Coding & Retrofits"],
  ];

  const STOP_WORDS = /^(is|it|and|with|i|im|i'm|please|for|the|a|an|to|on|at|in|my|need|needs|want|wants|would|could|can|car|reg|that|this|has|have|got|but|or|any|if|so|from|about|plus)$/i;
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function normalisePhone(raw) {
    let digits = raw.replace(/[^\d+]/g, "");
    if (digits.startsWith("+44")) digits = "0" + digits.slice(3);
    else if (digits.startsWith("44") && digits.length === 12) digits = "0" + digits.slice(2);
    return digits.replace(/\D/g, "");
  }

  function findPhone(text) {
    const m = text.match(/(?:\+44\s?\(?0?\)?\s?|\b0)7\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/);
    return m ? normalisePhone(m[0]) : "";
  }

  /* Splits WhatsApp's copied-message headers off, e.g.
   * "[05/11/2026, 14:02] Dave Bernard: Hi..." or "05/11/2026, 14:02 - Dave: Hi..." */
  function splitChat(text) {
    const header = /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]m)?\]?\s*(?:-\s*)?([^:\n]{1,60}):\s?/i;
    let sender = "";
    const body = [];
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(header);
      if (m) {
        const who = m[1].trim();
        if (!sender && !/^(you|yorkshire autotech)$/i.test(who)) sender = who;
        body.push(line.slice(m[0].length));
      } else {
        body.push(line);
      }
    }
    return { sender, body: body.join("\n").trim() };
  }

  function findVehicle(text) {
    const makeRe = new RegExp(`\\b(${MAKES.map(escapeRe).join("|")})\\b`, "i");
    const m = text.match(makeRe);
    if (!m) return "";
    const make = MAKES.find((x) => x.toLowerCase() === m[1].toLowerCase()) || m[1];
    const after = text.slice(m.index + m[0].length).split(/[\s,.!?]+/).filter(Boolean);
    const model = [];
    for (const word of after) {
      if (STOP_WORDS.test(word) || /^(19|20)\d\d$/.test(word) || model.length === 2) break;
      // After the first model word, only keep words that look like part of a model name
      // ("3 Series", "A-Class", "Golf GTI") so "Focus are you free" stops at "Focus".
      if (model.length && !/\d|^[A-Z]/.test(word) && !/^(series|class|sport|line|estate|coupe|hatch)$/i.test(word)) break;
      model.push(/\d/.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1));
    }
    const year = text.match(/\b(?:19[89]\d|20[0-3]\d)\b(?![\/.-]\d)/);
    return [make, ...model].join(" ") + (year ? ` (${year[0]})` : "");
  }

  function findServices(text) {
    return SERVICES.filter(([re]) => re.test(text)).map(([, name]) => name).join(", ");
  }

  function findDate(text, today) {
    const lower = text.toLowerCase();
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (/\btomorrow\b/.test(lower)) { const d = new Date(base); d.setDate(d.getDate() + 1); return iso(d); }
    if (/\btoday\b/.test(lower)) return iso(base);

    // 11/11, 11/11/26, 11-11-2026
    let m = lower.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/);
    if (m) {
      const day = +m[1], month = +m[2] - 1;
      let year = m[3] ? +m[3] : base.getFullYear();
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (d.getMonth() === month && d.getDate() === day) {
        if (!m[3] && d < base) d.setFullYear(d.getFullYear() + 1);
        return iso(d);
      }
    }

    // 11th November, 11 nov, November 11th
    const mon = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
    m = lower.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${mon}\\b`)) ||
        lower.match(new RegExp(`\\b${mon}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`));
    if (m) {
      const dayFirst = /^\d/.test(m[1]);
      const day = +(dayFirst ? m[1] : m[2]);
      const month = MONTHS.indexOf((dayFirst ? m[2] : m[1]).slice(0, 3));
      const d = new Date(base.getFullYear(), month, day);
      if (d.getMonth() === month) {
        if (d < base) d.setFullYear(d.getFullYear() + 1);
        return iso(d);
      }
    }

    // monday / next monday / this friday
    m = lower.match(/\b(next\s+)?(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/);
    if (m) {
      const d = new Date(base);
      let diff = (DAYS.indexOf(m[2]) - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      if (m[1] && diff < 7) diff += 7;
      d.setDate(d.getDate() + diff);
      return iso(d);
    }
    return "";
  }

  function findTime(text) {
    let m = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i);
    let hour;
    if (m) {
      hour = +m[1] % 12 + (m[3].toLowerCase() === "pm" ? 12 : 0);
    } else {
      m = text.match(/\b(?:at|for|around|about)\s+(\d{1,2})(?:[:.](\d{2}))?\b(?![\/.-]\d)/i) ||
          text.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
      if (!m) return "";
      hour = +m[1];
      if (hour >= 1 && hour <= 7) hour += 12; // "at 2" means 2pm for a workshop
    }
    if (hour < 0 || hour > 23) return "";
    return `${pad(hour)}:00`;
  }

  function findName(text) {
    const m = text.match(/\b(?:my name is|my name's|i am|i'm|im|this is|it's|its)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    const signOff = text.match(/\b(?:[Tt]hanks|[Tt]hank you|[Cc]heers|[Rr]egards|[Tt]a)[,!.]?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[.!]?\s*$/);
    const candidate = m ? m[1] : signOff ? signOff[1] : "";
    const words = candidate.split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !MAKES.some((x) => x.toLowerCase() === w.toLowerCase()));
    return words.join(" ");
  }

  function parse(text, today = new Date()) {
    const raw = String(text || "").trim();
    const result = { name: "", phone: "", vehicle: "", service: "", date: "", time: "", notes: "" };
    if (!raw) return result;

    // Shared contact card (vCard)
    if (/BEGIN:VCARD/i.test(raw)) {
      const fn = raw.match(/^FN[^:]*:(.+)$/im);
      const tel = raw.match(/^(?:item\d+\.)?TEL[^:]*:(.+)$/im);
      if (fn) result.name = fn[1].trim();
      if (tel) result.phone = normalisePhone(tel[1]);
      return result;
    }

    const { sender, body } = splitChat(raw);
    if (sender) {
      const senderPhone = findPhone(sender);
      if (senderPhone) result.phone = senderPhone;
      else result.name = sender.replace(/[~\u202A-\u202E]/g, "").trim();
    }
    result.phone = result.phone || findPhone(body);
    result.name = result.name || findName(body);
    result.vehicle = findVehicle(body);
    result.service = findServices(body);
    result.date = findDate(body, today);
    result.time = findTime(body);
    result.notes = body.replace(/\s+/g, " ").slice(0, 300);
    return result;
  }

  window.parseWhatsAppText = parse;
})();
