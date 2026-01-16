/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import * as d3 from "d3";

import {
  Archive,
  FileText,
  LocateFixed,
  Plus,
  Search,
  Upload,
  UserRound,
  FileCode2,
  Network,
} from "lucide-react";

import { useThemeStore } from "../../store/theme";

import { useTranslation } from "../../context/TranslationContext";

const CARD_W = 220;

const CARD_H = 120;

const MAX_GEDCOM_BYTES = 50 * 1024 * 1024;

const GEDCOM_EXTENSIONS = new Set(["ged", "gedcom"]);

const uid = () => String(Date.now() + Math.floor(Math.random() * 10000));

const normalizeSpaces = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const getFileExtension = (name) => {
  const parts = String(name || "")
    .toLowerCase()
    .split(".");
  return parts.length > 1 ? parts.pop() : "";
};

const hasGedcomIndividuals = (text) =>
  /(^|\r?\n)\s*0\s+@?[^\r\n]*\bINDI\b/i.test(String(text || ""));

const createEmptyForm = () => ({
  id: null,
  name: "",
  gender: "",
  birthYear: "",
  birthPlace: "",
  deathDate: "",
  deathPlace: "",
  father: "",
  mother: "",
  spouse: "",
  children: [],
  details: "",
  profession: "",
  archiveSource: "",
  documentCode: "",
  reliability: "",
  color: "#f5f1e8",
});

const normalizeGenderValue = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("m")) return "M";
  if (normalized.startsWith("f")) return "F";
  return "";
};

const splitName = (raw) => {
  const cleaned = normalizeSpaces(raw);

  if (!cleaned) return { full: "", given: "", surname: "" };

  const slashMatch = cleaned.match(/^(.*?)\/([^/]+)\/?(.*)$/);

  if (slashMatch) {
    const given = normalizeSpaces(slashMatch[1]);

    const surname = normalizeSpaces(slashMatch[2]);

    const suffix = normalizeSpaces(slashMatch[3]);

    const full = normalizeSpaces(
      [given, surname, suffix].filter(Boolean).join(" ")
    );

    return { full: full || cleaned.replace(/\//g, " "), given, surname };
  }

  if (cleaned.includes(",")) {
    const [surnameRaw, givenRaw] = cleaned.split(",", 2);

    const surname = normalizeSpaces(surnameRaw);

    const given = normalizeSpaces(givenRaw);

    const full = normalizeSpaces([given, surname].filter(Boolean).join(" "));

    return { full: full || cleaned, given, surname };
  }

  const parts = cleaned.split(" ").filter(Boolean);

  if (parts.length > 1) {
    const surname = parts[parts.length - 1];

    const given = parts.slice(0, -1).join(" ");

    return { full: cleaned, given, surname };
  }

  return { full: cleaned, given: cleaned, surname: "" };
};

/** ===== GEDCOM PARSE / BUILD (kept, just supports details + children) ===== */

// eslint-disable-next-line react-refresh/only-export-components
export const parseGedcom = (raw) => {
  const text = String(raw || "").replace(/^\uFEFF/, "");

  const persons = new Map();

  const families = new Map();

  let currentType = null;

  let currentId = null;

  let inBirth = false;

  let inDeath = false;

  let noteTarget = null;

  const ensurePerson = (id) => {
    const key = String(id || "");

    if (!key) return null;

    if (!persons.has(key)) {
      persons.set(key, {
        id: key,

        names: {},

        gender: "",

        birthYear: "",

        birthPlace: "",

        deathDate: "",

        deathPlace: "",

        profession: "",

        archiveSource: "",

        documentCode: "",

        reliability: "",

        details: "",

        color: "",

        famc: null,

        fams: [],

        father: null,

        mother: null,

        spouse: null,

        children: [],

        given: "",

        surname: "",
      });
    }

    return persons.get(key);
  };

  const ensureFamily = (id) => {
    const key = String(id || "");

    if (!key) return null;

    if (!families.has(key)) {
      families.set(key, { id: key, husb: null, wife: null, chil: [] });
    }

    return families.get(key);
  };

  const mergeField = (current, incoming) => {
    const next = normalizeSpaces(incoming);
    if (!next) return current || "";
    if (!current) return next;
    if (String(current).includes(next)) return current;
    return `${current}; ${next}`;
  };

  const finalizeNote = () => {
    if (!noteTarget) return;

    const p = ensurePerson(noteTarget.id);

    if (p) {
      const note = String(noteTarget.text || "").trim();

      if (note) p.details = note;
    }

    noteTarget = null;
  };

  const lines = text.split(/\r\n|\n|\r/);

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();

    if (!line) continue;

    const parts = line.split(/\s+/);

    const level = Number(parts[0]);

    if (noteTarget && !Number.isNaN(level) && level <= noteTarget.level) {
      finalizeNote();
    }

    if (parts[0] === "0") {
      finalizeNote();

      inBirth = false;

      inDeath = false;

      const hasPointer = String(parts[1] || "").startsWith("@");

      const pointer = hasPointer ? parts[1] : null;

      const tag = hasPointer ? parts[2] : parts[1];

      if (tag === "INDI" && pointer) {
        currentType = "INDI";

        currentId = pointer;

        ensurePerson(pointer);

        continue;
      }

      if (tag === "FAM" && pointer) {
        currentType = "FAM";

        currentId = pointer;

        ensureFamily(pointer);

        continue;
      }

      currentType = null;

      currentId = null;

      continue;
    }

    if (!currentType || !currentId) continue;

    if (currentType === "INDI") {
      const p = ensurePerson(currentId);

      const tag = parts[1];

      const value = parts.slice(2).join(" ").trim();

      if (noteTarget && (tag === "CONT" || tag === "CONC")) {
        noteTarget.text += tag === "CONT" ? `\n${value}` : value;

        continue;
      }

      if (tag === "NAME") {
        const rawName = value;

        if (rawName) {
          const parsed = splitName(rawName);

          if (parsed.full) p.names.en = parsed.full;

          if (parsed.given) p.given = parsed.given;

          if (parsed.surname) p.surname = parsed.surname;
        }

        continue;
      }

      if (tag === "GIVN") {
        p.given = value;

        continue;
      }

      if (tag === "SURN") {
        p.surname = value;

        continue;
      }

      if (tag === "SEX") {
        p.gender = value;

        continue;
      }

      if (tag === "BIRT") {
        inBirth = true;

        if (value) {
          const cleaned = normalizeSpaces(value);

          p.birthYear = cleaned || p.birthYear;

          inBirth = false;
        }

        continue;
      }

      if (inBirth && tag === "DATE") {
        const cleaned = normalizeSpaces(value);

        p.birthYear = cleaned || p.birthYear;

        inBirth = false;

        continue;
      }

      if (inBirth && tag === "PLAC") {
        p.birthPlace = normalizeSpaces(value);

        continue;
      }

      if (tag === "DEAT") {
        inDeath = true;

        if (value) {
          const cleaned = normalizeSpaces(value);

          if (cleaned && cleaned !== "Y") p.deathDate = cleaned;

          inDeath = false;
        }

        continue;
      }

      if (inDeath && tag === "DATE") {
        const cleaned = normalizeSpaces(value);

        if (cleaned && cleaned !== "Y") p.deathDate = cleaned;

        inDeath = false;

        continue;
      }

      if (inDeath && tag === "PLAC") {
        p.deathPlace = normalizeSpaces(value);

        continue;
      }

      if (tag === "NOTE") {
        noteTarget = { id: currentId, level, text: value };

        continue;
      }

      if (tag === "OCCU") {
        p.profession = value;

        continue;
      }

      if (tag === "SOUR") {
        p.archiveSource = mergeField(p.archiveSource, value);

        continue;
      }

      if (tag === "REFN" || tag === "_DOC") {
        p.documentCode = mergeField(p.documentCode, value);

        continue;
      }

      if (tag === "_RELI" || tag === "RELI") {
        p.reliability = value;

        continue;
      }

      if (tag === "_COLOR" || tag === "COLOR") {
        p.color = value;

        continue;
      }

      if (tag === "FAMC") {
        p.famc = value;

        continue;
      }

      if (tag === "FAMS") {
        if (value) p.fams.push(value);
      }
    }

    if (currentType === "FAM") {
      const f = ensureFamily(currentId);

      const tag = parts[1];

      if (tag === "HUSB") f.husb = String(parts[2] || "").trim();

      if (tag === "WIFE") f.wife = String(parts[2] || "").trim();

      if (tag === "CHIL") {
        const childId = String(parts[2] || "").trim();

        if (childId) f.chil.push(childId);
      }
    }
  }

  finalizeNote();

  for (const p of persons.values()) {
    const given = normalizeSpaces(p.given);

    const surname = normalizeSpaces(p.surname);

    if (given || surname) {
      const combined = normalizeSpaces(
        [given, surname].filter(Boolean).join(" ")
      );

      if (combined) p.names.en = combined;
    } else if (p.names?.en) {
      const parsed = splitName(p.names.en);

      if (parsed.given) p.given = parsed.given;

      if (parsed.surname) p.surname = parsed.surname;
    }
  }

  // Set father/mother from famc

  for (const p of persons.values()) {
    const fam = p.famc ? families.get(p.famc) : null;

    if (fam) {
      p.father = fam.husb || null;

      p.mother = fam.wife || null;
    }
  }

  // Set spouse from fams

  for (const f of families.values()) {
    if (f.husb && f.wife) {
      const a = persons.get(f.husb);

      const b = persons.get(f.wife);

      if (a && !a.spouse) a.spouse = f.wife;

      if (b && !b.spouse) b.spouse = f.husb;
    }

    // Set children arrays on parents

    for (const child of f.chil || []) {
      if (f.husb && persons.get(f.husb)) {
        const dad = persons.get(f.husb);

        if (!dad.children.includes(child)) dad.children.push(child);
      }

      if (f.wife && persons.get(f.wife)) {
        const mom = persons.get(f.wife);

        if (!mom.children.includes(child)) mom.children.push(child);
      }
    }
  }

  return Array.from(persons.values());
};

// eslint-disable-next-line react-refresh/only-export-components
export const buildGedcom = (people, locale, t) => {
  const safeName = (p) => {
    const names = p?.names || {};

    const raw =
      names?.[locale] ||
      names?.en ||
      names?.fr ||
      names?.ar ||
      names?.es ||
      t("unknown", "Unknown");

    return normalizeSpaces(String(raw).replace(/\r?\n/g, " "));
  };

  const namePartsFor = (p) => {
    const raw = safeName(p);

    const given = normalizeSpaces(p?.given);

    const surname = normalizeSpaces(p?.surname);

    if (given || surname) {
      const full = normalizeSpaces([given, surname].filter(Boolean).join(" "));

      return { full: full || raw, given, surname };
    }

    return splitName(raw);
  };

  const byId = new Map();

  for (const p of people) byId.set(String(p.id), p);

  const idMap = new Map();

  let indiIndex = 1;

  for (const p of people) idMap.set(String(p.id), `@I${indiIndex++}@`);

  const families = new Map(); // key -> { id, husbId, wifeId, children: [] }

  const pairIndex = new Map();

  let famIndex = 1;

  const ensureFamily = (key) => {
    const k = String(key || "");

    if (!families.has(k)) {
      families.set(k, {
        id: `@F${famIndex++}@`,

        husbId: "",

        wifeId: "",

        children: [],
      });
    }

    return families.get(k);
  };

  const pairKey = (a, b) => {
    const aId = String(a || "").trim();

    const bId = String(b || "").trim();

    if (!aId || !bId) return null;

    return [aId, bId].sort().join("|");
  };

  const ensurePairFamily = (aId, bId, fallbackKey) => {
    const pair = pairKey(aId, bId);

    if (pair && pairIndex.has(pair)) {
      return families.get(pairIndex.get(pair));
    }

    const fam = ensureFamily(fallbackKey);

    if (pair) pairIndex.set(pair, fallbackKey);

    return fam;
  };

  const setFamilyParents = (fam, husbId, wifeId) => {
    if (husbId && !fam.husbId) fam.husbId = husbId;

    if (wifeId && !fam.wifeId) fam.wifeId = wifeId;
  };

  const parentKey = (fatherId, motherId) =>
    `P:${String(fatherId || "")}|${String(motherId || "")}`;

  const spouseKey = (a, b) => `S:${[String(a), String(b)].sort().join("|")}`;

  const famcByPerson = new Map(); // personId -> famId

  const famsByPerson = new Map(); // personId -> Set(famId)

  const addFams = (personId, famId) => {
    const pid = String(personId || "");

    const fid = String(famId || "");

    if (!pid || !fid) return;

    if (!famsByPerson.has(pid)) famsByPerson.set(pid, new Set());

    famsByPerson.get(pid).add(fid);
  };

  const resolveSpouseRoles = (aId, bId) => {
    const pa = byId.get(aId);

    const pb = byId.get(bId);

    const ag = String(pa?.gender || "").toUpperCase();

    const bg = String(pb?.gender || "").toUpperCase();

    if (ag.startsWith("F") && bg.startsWith("M")) {
      return { husbId: bId, wifeId: aId };
    }

    if (ag.startsWith("M") && bg.startsWith("F")) {
      return { husbId: aId, wifeId: bId };
    }

    const sorted = [aId, bId].sort();

    return { husbId: sorted[0], wifeId: sorted[1] };
  };

  // Parent links (from father/mother)

  for (const p of people) {
    if (!p.father && !p.mother) continue;

    const fatherId = p.father ? String(p.father) : "";

    const motherId = p.mother ? String(p.mother) : "";

    const fam = ensurePairFamily(
      fatherId,

      motherId,

      parentKey(fatherId, motherId)
    );

    if (fatherId && idMap.has(fatherId)) setFamilyParents(fam, fatherId, "");

    if (motherId && idMap.has(motherId)) setFamilyParents(fam, "", motherId);

    const childId = String(p.id);

    if (idMap.has(childId) && !fam.children.includes(childId))
      fam.children.push(childId);

    famcByPerson.set(childId, fam.id);

    if (fatherId) addFams(fatherId, fam.id);

    if (motherId) addFams(motherId, fam.id);
  }

  // Also include children arrays (if used)

  for (const p of people) {
    const pid = String(p.id);

    const ch = Array.isArray(p.children) ? p.children : [];

    for (const childIdRaw of ch) {
      const childId = String(childIdRaw || "");

      if (!childId || !idMap.has(childId)) continue;

      // try to build family with spouse if exists, else single parent family

      const spouseId = p.spouse ? String(p.spouse) : "";

      let husbId = "";

      let wifeId = "";

      if (spouseId) {
        const roles = resolveSpouseRoles(pid, spouseId);

        husbId = roles.husbId;

        wifeId = roles.wifeId;
      } else {
        const g = String(p.gender || "").toUpperCase();

        if (g.startsWith("F")) {
          wifeId = pid;
        } else {
          husbId = pid;
        }
      }

      const fam = ensurePairFamily(
        husbId,

        wifeId,

        parentKey(husbId || pid, wifeId || spouseId)
      );

      if (idMap.has(husbId)) setFamilyParents(fam, husbId, "");

      if (idMap.has(wifeId)) setFamilyParents(fam, "", wifeId);

      if (!fam.children.includes(childId)) fam.children.push(childId);

      famcByPerson.set(childId, fam.id);

      if (husbId) addFams(husbId, fam.id);

      if (wifeId) addFams(wifeId, fam.id);
    }
  }

  // Spouse links

  for (const p of people) {
    if (!p.spouse) continue;

    const a = String(p.id);

    const b = String(p.spouse);

    if (!idMap.has(a) || !idMap.has(b)) continue;

    const roles = resolveSpouseRoles(a, b);

    const fam = ensurePairFamily(roles.husbId, roles.wifeId, spouseKey(a, b));

    if (!fam.husbId && !fam.wifeId) {
      fam.husbId = roles.husbId;

      fam.wifeId = roles.wifeId;
    }

    addFams(a, fam.id);

    addFams(b, fam.id);
  }

  const lines = [];

  lines.push("0 HEAD");

  lines.push("1 SOUR RootsMaghreb");

  lines.push("1 GEDC");

  lines.push("2 VERS 5.5.1");

  lines.push("2 FORM LINEAGE-LINKED");

  lines.push("1 CHAR UTF-8");

  for (const p of people) {
    const pid = String(p.id);

    const indiId = idMap.get(pid);

    lines.push(`0 ${indiId} INDI`);

    const nameParts = namePartsFor(p);

    const nameLine = nameParts.surname
      ? `${nameParts.given} /${nameParts.surname}/`.trim()
      : nameParts.full;

    lines.push(`1 NAME ${nameLine || t("unknown", "Unknown")}`);

    if (nameParts.given) lines.push(`1 GIVN ${nameParts.given}`);

    if (nameParts.surname) lines.push(`1 SURN ${nameParts.surname}`);

    if (p.gender) lines.push(`1 SEX ${String(p.gender).slice(0, 1)}`);

    if (p.birthYear || p.birthPlace) {
      lines.push("1 BIRT");

      if (p.birthYear) lines.push(`2 DATE ${String(p.birthYear)}`);
      if (p.birthPlace) lines.push(`2 PLAC ${String(p.birthPlace)}`);
    }

    if (p.deathDate || p.deathPlace) {
      const death = String(p.deathDate || "").trim();

      lines.push("1 DEAT");

      if (death) lines.push(`2 DATE ${death}`);
      if (p.deathPlace) lines.push(`2 PLAC ${String(p.deathPlace)}`);
    }

    if (p.details) {
      const noteLines = String(p.details || "")
        .split(/\r?\n/)

        .map((l) => l.trim())

        .filter(Boolean);

      if (noteLines.length) {
        lines.push(`1 NOTE ${noteLines[0]}`);

        for (const extra of noteLines.slice(1)) {
          lines.push(`2 CONT ${extra}`);
        }
      }
    }

    if (p.profession) {
      lines.push(`1 OCCU ${String(p.profession).trim()}`);
    }

    if (p.archiveSource) {
      lines.push(`1 SOUR ${String(p.archiveSource).trim()}`);
    }

    if (p.documentCode) {
      lines.push(`1 REFN ${String(p.documentCode).trim()}`);
    }

    if (p.reliability) {
      lines.push(`1 _RELI ${String(p.reliability).trim()}`);
    }

    if (p.color) lines.push(`1 _COLOR ${String(p.color).trim()}`);

    const famc = famcByPerson.get(pid);

    if (famc) lines.push(`1 FAMC ${famc}`);

    const fams = famsByPerson.get(pid);

    if (fams && fams.size) {
      for (const famId of Array.from(fams).sort())
        lines.push(`1 FAMS ${famId}`);
    }
  }

  for (const fam of families.values()) {
    lines.push(`0 ${fam.id} FAM`);

    if (fam.husbId && idMap.has(fam.husbId))
      lines.push(`1 HUSB ${idMap.get(fam.husbId)}`);

    if (fam.wifeId && idMap.has(fam.wifeId))
      lines.push(`1 WIFE ${idMap.get(fam.wifeId)}`);

    for (const childId of fam.children) {
      if (!idMap.has(childId)) continue;

      lines.push(`1 CHIL ${idMap.get(childId)}`);
    }
  }

  lines.push("0 TRLR");

  return `${lines.join("\r\n")}\r\n`;
};

/** ===== MAIN COMPONENT ===== */

export default function TreesBuilder({
  people: rawPeople = [],
  setPeople,
  readOnly = false,
  onAutoSave,
}) {
  const { theme } = useThemeStore();

  const { locale, dir, t } = useTranslation();

  const people = useMemo(
    () => (Array.isArray(rawPeople) ? rawPeople : []),
    [rawPeople]
  );

  const canMutatePeople = typeof setPeople === "function";

  const isDark = theme === "dark";

  const svgRef = useRef(null);

  const wrapRef = useRef(null);

  const zoomRef = useRef(null);

  const nodesRef = useRef([]);

  const importGedcomRef = useRef(null);

  const [selectedPerson, setSelectedPerson] = useState(null);

  const [personStatus, setPersonStatus] = useState({
    message: "",
    type: "success",
  });

  const [panelTab, setPanelTab] = useState(readOnly ? "selected" : "editor");

  const [peopleQuery, setPeopleQuery] = useState("");

  const [addForm, setAddForm] = useState(() => createEmptyForm());

  const applyPeopleUpdate = (updater) => {
    if (!canMutatePeople || readOnly) {
      setPersonStatus({
        message: t("tree_builder_read_only", "Tree builder is read-only."),
        type: "error",
      });
      return;
    }

    setPeople((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;

      if (!readOnly && onAutoSave) onAutoSave(next);

      return next;
    });
  };

  const notifyPerson = (message, type = "success") => {
    setPersonStatus({ message, type });
  };

  const notifyError = (message) => {
    setPersonStatus({ message, type: "error" });
  };

  useEffect(() => {
    if (readOnly) setPanelTab("selected");
  }, [readOnly]);

  useEffect(() => {
    if (!canMutatePeople) return;
    const isMock = localStorage.getItem("mockupDataActive") === "true";

    if (isMock && people.length === 0) {
      const mockPeople = [
        {
          id: "mock1",

          names: { en: "Kamel Admin" },

          gender: "Male",

          birthYear: "1980",

          details: "Founder of Roots Maghreb",

          children: ["mock3"],

          spouse: "mock2",

          color: "#f8f5ef",
        },

        {
          id: "mock2",

          names: { en: "Sarah Admin" },

          gender: "Female",

          birthYear: "1982",

          details: "Co-Founder",

          children: ["mock3"],

          spouse: "mock1",

          color: "#f8f5ef",
        },

        {
          id: "mock3",

          names: { en: "Junior Admin" },

          gender: "Male",

          birthYear: "2010",

          details: "Future CEO",

          father: "mock1",

          mother: "mock2",

          color: "#f8f5ef",
        },
      ];

      setPeople(mockPeople);
    } else if (!isMock && people.some((p) => p.id === "mock1")) {
      setPeople([]);
    }
  }, [canMutatePeople, people, setPeople]);

  useEffect(() => {
    if (!personStatus.message) return undefined;

    const timer = setTimeout(
      () => setPersonStatus((prev) => ({ ...prev, message: "" })),

      3000
    );

    return () => clearTimeout(timer);
  }, [personStatus.message]);

  const nameOf = useCallback(
    (p) =>
      p?.names?.[locale] ||
      p?.names?.en ||
      p?.names?.fr ||
      p?.names?.ar ||
      p?.names?.es ||
      t("unknown", "Unknown"),
    [locale, t] // <--- Add this array
  );
  const peopleById = useMemo(() => {
    const map = new Map();

    for (const p of people) map.set(String(p.id), p);

    return map;
  }, [people]);

  const relationName = useCallback(
    (id) => {
      if (!id) return "-";

      const found = peopleById.get(String(id));

      return found ? nameOf(found) : "-";
    },
    [peopleById, nameOf]
  );

  const displayGender = useCallback(
    (value) => {
      const normalized = normalizeGenderValue(value);
      if (normalized === "M") return t("male", "Male");
      if (normalized === "F") return t("female", "Female");
      const raw = String(value || "").trim();
      return raw || "-";
    },
    [t]
  );

  const peopleList = useMemo(() => {
    const query = peopleQuery.trim().toLowerCase();

    const list = people.map((p) => ({
      id: String(p.id),

      person: p,

      name: String(nameOf(p)),
    }));

    list.sort((a, b) => a.name.localeCompare(b.name));

    if (!query) return list;

    return list.filter((item) => item.name.toLowerCase().includes(query));
  }, [people, peopleQuery, nameOf]);

  const resetAddForm = useCallback(() => {
    setAddForm(createEmptyForm());
  }, []);

  const startEdit = useCallback(
    (person) => {
      if (readOnly || !person) return;
      setPanelTab("editor");
      setAddForm({
        id: person.id,
        name: nameOf(person),
        gender: normalizeGenderValue(person.gender),
        birthYear: person.birthYear || "",
        birthPlace: person.birthPlace || "",
        deathDate: person.deathDate || "",
        deathPlace: person.deathPlace || "",
        details: person.details || "",
        profession: person.profession || "",
        archiveSource: person.archiveSource || "",
        documentCode: person.documentCode || "",
        reliability: person.reliability || "",
        father: person.father || "",
        mother: person.mother || "",
        spouse: person.spouse || "",
        children: Array.isArray(person.children) ? person.children : [],
        color: person.color || "#f5f1e8",
      });
    },
    [nameOf, readOnly]
  );

  useEffect(() => {
    if (!selectedPerson) return;

    const found =
      people.find((p) => String(p.id) === String(selectedPerson.id)) || null;

    setSelectedPerson(found);
  }, [selectedPerson, people]);

  const links = useMemo(() => {
    const out = [];

    const couplePairs = new Set();

    const childPairs = new Set();

    const byId = new Map(people.map((p) => [String(p.id), p]));

    const hasId = (id) => byId.has(String(id));

    const addCouple = (aId, bId) => {
      const a = String(aId || "");

      const b = String(bId || "");

      if (!a || !b || !hasId(a) || !hasId(b)) return;

      const key = [a, b].sort().join("|");

      if (couplePairs.has(key)) return;

      couplePairs.add(key);

      out.push({ source: a, target: b, type: "couple" });
    };

    for (const child of people) {
      const childId = String(child.id);

      const fatherId = child.father ? String(child.father) : "";

      const motherId = child.mother ? String(child.mother) : "";

      if (fatherId && motherId && hasId(fatherId) && hasId(motherId)) {
        addCouple(fatherId, motherId);

        const key = `C:${[fatherId, motherId, childId].join("|")}`;

        if (!childPairs.has(key)) {
          childPairs.add(key);

          out.push({
            source: fatherId,

            target: childId,

            mate: motherId,

            type: "child",
          });
        }

        continue;
      }

      if (fatherId && hasId(fatherId)) {
        const key = `C:${fatherId}>${childId}`;

        if (!childPairs.has(key)) {
          childPairs.add(key);

          out.push({ source: fatherId, target: childId, type: "child" });
        }
      }

      if (motherId && hasId(motherId)) {
        const key = `C:${motherId}>${childId}`;

        if (!childPairs.has(key)) {
          childPairs.add(key);

          out.push({ source: motherId, target: childId, type: "child" });
        }
      }
    }

    for (const parent of people) {
      const parentId = String(parent.id);

      const children = Array.isArray(parent.children) ? parent.children : [];

      for (const childIdRaw of children) {
        const childId = String(childIdRaw || "");

        if (!childId || !hasId(childId)) continue;

        const child = byId.get(childId);

        const fatherId = child?.father ? String(child.father) : "";

        const motherId = child?.mother ? String(child.mother) : "";

        if (fatherId || motherId) {
          if (fatherId === parentId || motherId === parentId) continue;

          continue;
        }

        const key = `C:${parentId}>${childId}`;

        if (childPairs.has(key)) continue;

        childPairs.add(key);

        out.push({ source: parentId, target: childId, type: "child" });
      }
    }

    for (const p of people) {
      if (!p.spouse) continue;

      addCouple(p.id, p.spouse);
    }

    return out;
  }, [people]);

  const computeGenerations = (nodes, allLinks) => {
    const gen = new Map();

    nodes.forEach((n) => gen.set(String(n.id), 0));

    let changed = true;

    let iterations = 0;

    while (changed && iterations < 50) {
      changed = false;

      iterations++;

      for (const l of allLinks) {
        const sId = String(l.source);

        const tId = String(l.target);

        const sGen = gen.get(sId);

        const tGen = gen.get(tId);

        if (sGen === undefined || tGen === undefined) continue;

        if (l.type === "child") {
          if (tGen < sGen + 1) {
            gen.set(tId, sGen + 1);

            changed = true;
          }
        } else if (l.type === "couple") {
          const maxG = Math.max(sGen, tGen);

          if (sGen !== maxG) {
            gen.set(sId, maxG);

            changed = true;
          }

          if (tGen !== maxG) {
            gen.set(tId, maxG);

            changed = true;
          }
        }
      }
    }

    return gen;
  };

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return;

    const svg = d3.select(svgRef.current);

    let ro = null;

    let cleanupSim = null;

    const draw = () => {
      try {
        const width = Math.max(320, wrapRef.current?.clientWidth || 0);

        const height = Math.max(520, wrapRef.current?.clientHeight || 680);

        d3.selectAll(".d3-tooltip").remove();

        svg.attr("width", width).attr("height", height);

        svg.selectAll("*").remove();

        const defs = svg.append("defs");

        defs

          .append("filter")

          .attr("id", "shadow")

          .append("feDropShadow")

          .attr("dx", 0)

          .attr("dy", 10)

          .attr("stdDeviation", 10)

          .attr("flood-opacity", 0.35);

        const zoomRect = svg

          .append("rect")

          .attr("width", width)

          .attr("height", height)

          .attr("fill", "transparent");

        const g = svg.append("g");

        const zoom = d3

          .zoom()

          .scaleExtent([0.2, 2.8])

          .on("zoom", (e) => g.attr("transform", e.transform));

        zoomRef.current = zoom;

        svg.call(zoom);

        const gens = computeGenerations(people, links);

        const nodes = people.map((p) => ({
          ...p,

          gen: gens.get(String(p.id)) || 0,

          x: Number.isFinite(p.x)
            ? p.x
            : width / 2 + (Math.random() - 0.5) * 50,

          y: Number.isFinite(p.y)
            ? p.y
            : height / 2 + (Math.random() - 0.5) * 50,
        }));

        nodesRef.current = nodes;

        const byId = new Map(nodes.map((n) => [String(n.id), n]));

        const simLinks = links

          .map((l) => ({
            ...l,

            source: byId.get(String(l.source)) || String(l.source),

            target: byId.get(String(l.target)) || String(l.target),

            mate: l.mate ? byId.get(String(l.mate)) : null,
          }))

          .filter(
            (l) => typeof l.source !== "string" && typeof l.target !== "string"
          );

        const coupleColor = isDark ? "#d4af37" : "#5d4037"; // Gold/Brown
        const coupleInnerColor = isDark ? "#2c1810" : "#f5f1e8"; // Background
        const childColor = isDark ? "#556b2f" : "#6b8e23"; // Olive Green distinct

        const coupleLinks = simLinks.filter((l) => l.type === "couple");
        const childLinksOnly = simLinks.filter((l) => l.type !== "couple");

        const linkLayer = g.append("g").attr("class", "links");

        // Double Line: Outer Thick
        const coupleOuter = linkLayer
          .selectAll("path.couple-outer")
          .data(coupleLinks)
          .enter()
          .append("path")
          .attr("class", "couple-outer")
          .attr("fill", "none")
          .attr("stroke", coupleColor)
          .attr("stroke-width", 12) // Thicker for visibility
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 1);

        // Double Line: Inner Thin (Gap or Second Color)
        // User asked for "double line of a color".
        // We use the outer as the main color, and inner as the "gap" color (bg)
        // effectively creating two parallel lines of the outer color.
        // Or we can make the inner a DIFFERENT color if requested.
        // "link parent parent with double line of a color" -> usually implies two parallel lines.
        const coupleInner = linkLayer
          .selectAll("path.couple-inner")
          .data(coupleLinks)
          .enter()
          .append("path")
          .attr("class", "couple-inner")
          .attr("fill", "none")
          .attr("stroke", coupleInnerColor)
          .attr("stroke-width", 4) // visible gap
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 1);

        // Child Links: Single visible line of another color
        const childLinks = linkLayer
          .selectAll("path.child-link")
          .data(childLinksOnly)
          .enter()
          .append("path")
          .attr("class", "child-link")
          .attr("fill", "none")
          .attr("stroke", childColor)
          .attr("stroke-width", 3)
          .attr("stroke-dasharray", "5,5") // Optional: dashed for child? Or solid. User said "one visible line". Solid is better.
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr("opacity", 0.8)
          .attr("marker-end", "url(#arrow)"); // Maybe add arrow? No, simple line is fine.

        let tooltip = d3.select("body").select(".d3-tooltip");

        if (tooltip.empty()) {
          tooltip = d3

            .select("body")

            .append("div")

            .attr("class", "d3-tooltip")

            .style("position", "absolute")

            .style("visibility", "hidden")

            .style("background", isDark ? "#3e2723" : "#f8f5ef")

            .style("color", isDark ? "#f8f5ef" : "#3e2723")

            .style("border", isDark ? "1px solid #2c1810" : "1px solid #e8dfca")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("font-family", "Manrope")
            .style("box-shadow", "0 6px 16px rgba(0,0,0,0.18)")
            .style("pointer-events", "none")

            .style("z-index", "9999");
        }

        const sim = d3

          .forceSimulation(nodes)

          .force("charge", d3.forceManyBody().strength(-1500))

          .force("center", d3.forceCenter(width / 2, height / 2))

          .force("collision", d3.forceCollide().radius(CARD_W * 0.6))

          .force("y", d3.forceY((d) => d.gen * 200).strength(1.2))

          .force("x", d3.forceX().strength(0.05))

          .force(
            "link",

            d3

              .forceLink(simLinks)

              .id((d) => String(d.id))

              .distance((d) => (d.type === "couple" ? 150 : 240))

              .strength((d) => (d.type === "couple" ? 0.6 : 0.85))
          );

        const node = g

          .selectAll("g.node")

          .data(nodes, (d) => String(d.id))

          .enter()

          .append("g")

          .attr("class", "node")

          .style("cursor", "grab")

          .call(
            d3

              .drag()

              .on("start", (event, d) => {
                if (!event.active) sim.alphaTarget(0.3).restart();

                d.fx = d.x;

                d.fy = d.y;
              })

              .on("drag", (event, d) => {
                d.fx = event.x;

                d.fy = event.y;
              })

              .on("end", (event, d) => {
                if (!event.active) sim.alphaTarget(0);

                d.fx = null;

                d.fy = null;
              })
          )

          .on("click", (_event, d) => {
            const found =
              people.find((p) => String(p.id) === String(d.id)) || d;

            setSelectedPerson(found);
          })

          .on("mouseover", (e, d) => {
            const name = nameOf(d);
            const gender = displayGender(d.gender);
            const birthDate = normalizeSpaces(d.birthYear || d.birthDate || "");
            const birthPlace = normalizeSpaces(d.birthPlace || "");
            const deathDate = normalizeSpaces(d.deathDate || d.deathYear || "");
            const deathPlace = normalizeSpaces(d.deathPlace || "");
            const details = String(d.details || "").trim();
            const profession = normalizeSpaces(d.profession || "");
            const archiveSource = Array.isArray(d.archiveSource)
              ? d.archiveSource.filter(Boolean).join(", ")
              : normalizeSpaces(d.archiveSource || "");
            const documentCode = Array.isArray(d.documentCode)
              ? d.documentCode.filter(Boolean).join(", ")
              : normalizeSpaces(d.documentCode || "");
            const reliability = normalizeSpaces(d.reliability || "");

            // Resolve relationships for tooltip
            const getP = (id) =>
              people.find((x) => String(x.id) === String(id))?.names?.[
                locale
              ] ||
              people.find((x) => String(x.id) === String(id))?.names?.["en"] ||
              "Unknown";
            const fatherName = d.father ? getP(d.father) : "";
            const motherName = d.mother ? getP(d.mother) : "";
            const spouseName = d.spouse ? getP(d.spouse) : "";

            const rows = [];
            const addRow = (label, value) => {
              if (!value) return;
              rows.push(
                `<div class="flex justify-between gap-4"><span class="opacity-70">${label}:</span><span>${value}</span></div>`
              );
            };

            addRow(t("gender", "Gender"), displayGender(d.gender));
            addRow(t("born", "Born"), birthDate);
            addRow(t("birth_place", "Birth place"), birthPlace);
            addRow(t("died", "Died"), deathDate);
            addRow(t("death_place", "Death place"), deathPlace);
            addRow(t("profession", "Profession"), profession);
            addRow(t("spouse", "Spouse"), spouseName);
            addRow(t("father", "Father"), fatherName);
            addRow(t("mother", "Mother"), motherName);

            const detailsHtml = details
              ? `<div class="mt-2 text-[10px] opacity-80 border-t pt-1 whitespace-pre-line">${details}</div>`
              : "";

            const sourceRows = [];
            if (archiveSource) {
              sourceRows.push(
                `<div class="flex justify-between gap-4"><span class="opacity-70">${t(
                  "archive_source",
                  "Archive Source"
                )}:</span><span>${archiveSource}</span></div>`
              );
            }
            if (documentCode) {
              sourceRows.push(
                `<div class="flex justify-between gap-4"><span class="opacity-70">${t(
                  "document_code",
                  "Document Code"
                )}:</span><span>${documentCode}</span></div>`
              );
            }
            if (reliability) {
              sourceRows.push(
                `<div class="flex justify-between gap-4"><span class="opacity-70">${t(
                  "reliability",
                  "Reliability"
                )}:</span><span>${reliability}</span></div>`
              );
            }

            const sourcesHtml = sourceRows.length
              ? `<div class="mt-2 pt-2 border-t text-[10px] space-y-1">${sourceRows.join(
                  ""
                )}</div>`
              : "";
            const infoHtml = rows.join("");
            const emptyHtml =
              !infoHtml && !detailsHtml && !sourcesHtml
                ? `<div class="opacity-60">${t(
                    "no_details",
                    "No details"
                  )}</div>`
                : "";

            const tooltipHtml = `
            <div class="text-sm font-bold border-b pb-1 mb-1">${name} <span class="opacity-70 text-xs">(${gender})</span></div>
            <div class="space-y-1 text-xs">
              ${infoHtml}
              ${emptyHtml}
              ${detailsHtml}
              ${sourcesHtml}
            </div>
          `;

            tooltip
              .style("visibility", "visible")
              .html(tooltipHtml)
              .style("top", `${e.pageY + 15}px`)
              .style("left", `${e.pageX + 15}px`);
          })
          .on("mousemove", (e) => {
            tooltip
              .style("top", `${e.pageY + 15}px`)
              .style("left", `${e.pageX + 15}px`);
          })
          .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
          });

        zoomRect.on("click", () => {
          setSelectedPerson(null);

          tooltip.style("visibility", "hidden");
        });

        node

          .append("rect")

          .attr("x", -CARD_W / 2)

          .attr("y", -CARD_H / 2)

          .attr("width", CARD_W)

          .attr("height", CARD_H)

          .attr("rx", 6)

          .attr("filter", "url(#shadow)")

          .attr("fill", (d) => d.color || (isDark ? "#3e2723" : "#f5f1e8"))

          .attr("stroke", isDark ? "#2c1810" : "#e8dfca")

          .attr("stroke-width", 1.4);

        node;

        // NAME
        node
          .append("text")
          .attr("y", -32)
          .attr("text-anchor", "middle")
          .style("font-weight", 700)
          .style("font-size", "14px")
          .style("fill", isDark ? "#f5f1e8" : "#2c1810")
          .style("font-family", "Cinzel, serif")
          .text((d) => {
            const n = String(nameOf(d));
            return n.length > 22 ? n.substring(0, 20) + "..." : n;
          });

        // GENDER ICON
        node
          .append("text")
          .attr("y", -14)
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .style("fill", (d) => {
            const genderCode = normalizeGenderValue(d.gender);
            if (genderCode === "M") return "#3498db";
            if (genderCode === "F") return "#e74c3c";
            return "#999";
          })
          .text((d) => {
            const genderCode = normalizeGenderValue(d.gender);
            if (genderCode === "M") return "M";
            if (genderCode === "F") return "F";
            return "";
          });

        // BIRTH DATE
        node
          .append("text")
          .attr("y", 2)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", isDark ? "#d4af37" : "#5d4037")
          .style("font-family", "Manrope")
          .text((d) => {
            const b = d.birthDate || d.birthYear || "";
            return b ? `b. ${b}` : "";
          });

        // DEATH DATE
        node
          .append("text")
          .attr("y", 14)
          .attr("text-anchor", "middle")
          .style("font-size", "10px")
          .style("fill", isDark ? "#aaa" : "#777")
          .style("font-family", "Manrope")
          .text((d) => {
            const dead = d.deathDate || d.deathYear || "";
            return dead ? `d. ${dead}` : "";
          });

        // Add tooltip title for comprehensive hover info
        node.append("title").text((d) => {
          const details = [];
          details.push(`Name: ${nameOf(d)}`);
          if (d.gender) details.push(`Gender: ${d.gender}`);
          if (d.birthYear || d.birthDate)
            details.push(`Born: ${d.birthDate || d.birthYear}`);
          if (d.birthPlace) details.push(`Birth Place: ${d.birthPlace}`);
          if (d.deathDate || d.deathYear)
            details.push(`Died: ${d.deathDate || d.deathYear}`);
          if (d.deathPlace) details.push(`Death Place: ${d.deathPlace}`);
          if (d.details) details.push(`Details: ${d.details}`);

          // Add family info
          const fatherName = d.father ? relationName(d.father) : null;
          const motherName = d.mother ? relationName(d.mother) : null;
          const spouseName = d.spouse ? relationName(d.spouse) : null;

          if (fatherName) details.push(`Father: ${fatherName}`);
          if (motherName) details.push(`Mother: ${motherName}`);
          if (spouseName) details.push(`Spouse: ${spouseName}`);

          const kids = people.filter(
            (p) => p.father === d.id || p.mother === d.id
          );
          if (kids.length > 0) {
            details.push(`Children: ${kids.map((k) => nameOf(k)).join(", ")}`);
          }

          return details.join("\n");
        });

        // PLACE
        node
          .append("text")
          .attr("y", 28)
          .attr("text-anchor", "middle")
          .style("font-size", "9px")
          .style("font-style", "italic")
          .style("fill", isDark ? "#ffffff60" : "#00000060")
          .style("font-family", "Manrope")
          .text((d) => {
            const loc = d.birthPlace || d.deathPlace || "";
            return loc.length > 25 ? loc.substring(0, 23) + "..." : loc;
          });

        // DETAILS (New)
        node
          .append("text")
          .attr("y", 42)
          .attr("text-anchor", "middle")
          .style("font-size", "9px")
          .style("fill", isDark ? "#ffffff80" : "#2c181080")
          .style("font-family", "Manrope")
          .text((d) => {
            const det = d.details || "";
            if (!det) return "";
            return det.length > 30 ? det.substring(0, 28) + "..." : det;
          });

        const couplePath = (d) => {
          const direction = d.source.x <= d.target.x ? 1 : -1;

          const startX = d.source.x + direction * (CARD_W / 2);

          const endX = d.target.x - direction * (CARD_W / 2);

          return `M${startX},${d.source.y}L${endX},${d.target.y}`;
        };

        const childPath = (d) => {
          const mate = d.mate;

          const startX = mate ? (d.source.x + mate.x) / 2 : d.source.x;

          const startY =
            (mate ? Math.max(d.source.y, mate.y) : d.source.y) + CARD_H / 2;

          const endX = d.target.x;

          const endY = d.target.y - CARD_H / 2;

          const midY = startY + (endY - startY) * 0.55;

          return `M${startX},${startY}V${midY}H${endX}V${endY}`;
        };

        sim.on("tick", () => {
          coupleOuter.attr("d", couplePath);
          coupleInner.attr("d", couplePath);
          childLinks.attr("d", childPath);

          node.attr("transform", (d) => `translate(${d.x},${d.y})`);

          nodesRef.current = nodes;
        });

        cleanupSim = () => {
          sim.stop();

          tooltip.remove();
        };
      } catch (err) {
        console.error("Tree render failed:", err);
        notifyError(
          err?.message || t("tree_render_failed", "Failed to render tree")
        );
      }
    };

    let resizeCleanup = null;

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => draw());
      ro.observe(wrapRef.current);
    } else if (typeof window !== "undefined") {
      const onResize = () => draw();
      window.addEventListener("resize", onResize);
      resizeCleanup = () => window.removeEventListener("resize", onResize);
    }

    draw();

    return () => {
      if (cleanupSim) cleanupSim();

      if (ro) ro.disconnect();

      if (resizeCleanup) resizeCleanup();
    };
  }, [people, links, locale, isDark, t, nameOf, relationName, displayGender]);

  const ensureSpouseBidirectional = (arr, aId, bId) => {
    if (!aId || !bId) return arr;

    const a = arr.find((p) => String(p.id) === String(aId));

    const b = arr.find((p) => String(p.id) === String(bId));

    if (!a || !b) return arr;

    const next = arr.map((p) => ({ ...p }));

    for (const p of next) {
      if (String(p.id) === String(aId)) p.spouse = String(bId);

      if (String(p.id) === String(bId)) p.spouse = String(aId);
    }

    return next;
  };

  const addChildToParent = (arr, parentId, childId) => {
    if (!parentId || !childId) return arr;

    const next = arr.map((p) => ({
      ...p,

      children: Array.isArray(p.children) ? [...p.children] : [],
    }));

    const parent = next.find((p) => String(p.id) === String(parentId));

    if (!parent) return arr;

    if (!parent.children.includes(String(childId)))
      parent.children.push(String(childId));

    return next;
  };

  const removeChildFromParent = (arr, parentId, childId) => {
    if (!parentId || !childId) return arr;

    const next = arr.map((p) => ({
      ...p,

      children: Array.isArray(p.children) ? [...p.children] : [],
    }));

    const parent = next.find((p) => String(p.id) === String(parentId));

    if (!parent) return arr;

    parent.children = parent.children.filter(
      (cid) => String(cid) !== String(childId)
    );

    return next;
  };

  const removeParentFromChild = (arr, parentId, childId) => {
    if (!parentId || !childId) return arr;

    return arr.map((p) => {
      if (String(p.id) !== String(childId)) return p;

      const next = { ...p };

      if (String(next.father) === String(parentId)) next.father = null;

      if (String(next.mother) === String(parentId)) next.mother = null;

      return next;
    });
  };

  const setParentOnChild = (arr, parentId, childId, gender) => {
    if (!parentId || !childId) return arr;
    const g = String(gender || "").toLowerCase();
    const isMale = g.startsWith("m");
    const isFemale = g.startsWith("f");
    return arr.map((p) => {
      if (String(p.id) !== String(childId)) return p;
      const next = { ...p };
      if (isMale && !next.father) next.father = String(parentId);
      if (isFemale && !next.mother) next.mother = String(parentId);
      if (!isMale && !isFemale) {
        if (!next.father) next.father = String(parentId);
        else if (!next.mother) next.mother = String(parentId);
      }
      return next;
    });
  };

  const importGedcom = async (file) => {
    if (!file) return;

    try {
      const ext = getFileExtension(file.name);
      if (!GEDCOM_EXTENSIONS.has(ext)) {
        notifyError(
          t(
            "invalid_gedcom_type",
            "Unsupported file type. Use .ged or .gedcom."
          )
        );
        return;
      }

      if (file.size > MAX_GEDCOM_BYTES) {
        notifyError(t("file_too_large", "File is too large (max 50MB)."));
        return;
      }

      let text = "";
      if (typeof file.text === "function") {
        text = await file.text();
      } else {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || "");
          reader.onerror = () =>
            reject(reader.error || new Error("Failed to read GEDCOM file."));
          reader.readAsText(file);
        });
      }
      const trimmed = String(text || "").trim();
      if (!trimmed) {
        notifyError(t("gedcom_empty", "GEDCOM file is empty."));
        return;
      }

      if (!hasGedcomIndividuals(text)) {
        notifyError(t("gedcom_no_people", "No individuals found in GEDCOM."));
        return;
      }

      const parsed = parseGedcom(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        notifyError(t("gedcom_no_people", "No individuals found in GEDCOM."));
        return;
      }

      applyPeopleUpdate(parsed);
      notifyPerson(t("gedcom_imported", "GEDCOM imported."));
    } catch (err) {
      console.error("GEDCOM import failed:", err);
      notifyError(
        err?.message || t("import_gedcom_failed", "Failed to import GEDCOM")
      );
    }
  };

  const addPerson = (e) => {
    e.preventDefault();

    const name = addForm.name.trim();

    if (!name) {
      notifyError(t("name_required", "Name is required"));

      return;
    }

    const nextFatherRaw = addForm.father ? String(addForm.father) : "";

    const nextMotherRaw = addForm.mother ? String(addForm.mother) : "";

    const nextSpouseRaw = addForm.spouse ? String(addForm.spouse) : "";

    if (nextFatherRaw && nextMotherRaw && nextFatherRaw === nextMotherRaw) {
      notifyError(
        t("parents_conflict", "Father and mother cannot be the same person.")
      );

      return;
    }

    if (addForm.id) {
      const editId = String(addForm.id);

      if (
        nextFatherRaw === editId ||
        nextMotherRaw === editId ||
        nextSpouseRaw === editId
      ) {
        notifyError(
          t(
            "invalid_relation_self",

            "A person cannot be their own parent, spouse, or child."
          )
        );

        return;
      }

      const existing = people.find((p) => String(p.id) === editId);

      if (!existing) {
        notifyError(t("person_not_found", "Person not found."));

        return;
      }

      const nextChildren = Array.from(
        new Set(
          (addForm.children || [])

            .map(String)

            .filter((id) => id && id !== editId)
        )
      );

      applyPeopleUpdate((prev) => {
        let next = prev.map((p) => ({
          ...p,

          children: Array.isArray(p.children) ? [...p.children] : [],
        }));

        const prevPerson = next.find((p) => String(p.id) === editId);

        if (!prevPerson) return prev;

        const prevSpouseId = prevPerson.spouse ? String(prevPerson.spouse) : "";

        const prevFatherId = prevPerson.father ? String(prevPerson.father) : "";

        const prevMotherId = prevPerson.mother ? String(prevPerson.mother) : "";

        const prevChildren = Array.isArray(prevPerson.children)
          ? prevPerson.children.map(String)
          : [];

        const nameParts = splitName(name);

        const nextNames = { ...(prevPerson.names || {}) };

        nextNames[locale] = nameParts.full || name;

        const updated = {
          ...prevPerson,

          names: nextNames,

          given: nameParts.given,

          surname: nameParts.surname,

          gender: addForm.gender.trim(),

          birthYear: String(addForm.birthYear || "").trim(),

          birthPlace: String(addForm.birthPlace || "").trim(),

          deathDate: String(addForm.deathDate || "").trim(),

          deathPlace: String(addForm.deathPlace || "").trim(),

          details: String(addForm.details || "").trim(),

          profession: String(addForm.profession || "").trim(),

          archiveSource: String(addForm.archiveSource || "").trim(),

          documentCode: String(addForm.documentCode || "").trim(),

          reliability: String(addForm.reliability || "").trim(),

          father: nextFatherRaw ? nextFatherRaw : null,

          mother: nextMotherRaw ? nextMotherRaw : null,

          spouse: nextSpouseRaw ? nextSpouseRaw : null,

          children: nextChildren,

          color: addForm.color || "#f5f1e8",
        };

        next = next.map((p) => (String(p.id) === editId ? updated : p));

        const nextSpouseId = updated.spouse ? String(updated.spouse) : "";

        if (prevSpouseId && prevSpouseId !== nextSpouseId) {
          next = next.map((p) => {
            if (String(p.id) !== prevSpouseId) return p;

            if (String(p.spouse) === editId) return { ...p, spouse: null };

            return p;
          });
        }

        if (nextSpouseId) {
          next = next.map((p) => {
            if (String(p.id) === nextSpouseId) return { ...p, spouse: editId };

            if (String(p.spouse) === nextSpouseId && String(p.id) !== editId) {
              return { ...p, spouse: null };
            }

            return p;
          });
        }

        const nextFatherId = updated.father ? String(updated.father) : "";

        const nextMotherId = updated.mother ? String(updated.mother) : "";

        if (prevFatherId && prevFatherId !== nextFatherId) {
          next = removeChildFromParent(next, prevFatherId, editId);
        }

        if (prevMotherId && prevMotherId !== nextMotherId) {
          next = removeChildFromParent(next, prevMotherId, editId);
        }

        if (nextFatherId) next = addChildToParent(next, nextFatherId, editId);

        if (nextMotherId) next = addChildToParent(next, nextMotherId, editId);

        const nextChildrenSet = new Set(nextChildren.map(String));

        for (const childId of prevChildren) {
          if (!nextChildrenSet.has(String(childId))) {
            next = removeParentFromChild(next, editId, childId);
          }
        }

        for (const childId of nextChildrenSet) {
          next = setParentOnChild(next, editId, childId, updated.gender);
        }

        const genderKey = String(updated.gender || "").toLowerCase();

        const isMale = genderKey.startsWith("m");

        const isFemale = genderKey.startsWith("f");

        if (isMale || isFemale) {
          next = next.map((p) => {
            const pid = String(p.id);

            if (pid === editId) return p;

            const nextChild = { ...p };

            if (isMale) {
              if (String(nextChild.mother) === editId) nextChild.mother = null;

              if (String(nextChild.father) === editId) return nextChild;

              if (nextChildrenSet.has(pid) && !nextChild.father) {
                nextChild.father = editId;
              }
            }

            if (isFemale) {
              if (String(nextChild.father) === editId) nextChild.father = null;

              if (String(nextChild.mother) === editId) return nextChild;

              if (nextChildrenSet.has(pid) && !nextChild.mother) {
                nextChild.mother = editId;
              }
            }

            return nextChild;
          });
        }

        return next;
      });

      resetAddForm();

      setSelectedPerson(null);

      notifyPerson(t("person_updated", "Person updated."));

      return;
    }

    const newId = uid();

    const nameParts = splitName(name);

    const newChildren = Array.from(
      new Set((addForm.children || []).map(String).filter(Boolean))
    );

    const newPerson = {
      id: newId,

      names: { [locale]: nameParts.full || name },

      given: nameParts.given,

      surname: nameParts.surname,

      gender: addForm.gender.trim(),

      birthYear: String(addForm.birthYear || "").trim(),

      birthPlace: String(addForm.birthPlace || "").trim(),

      deathDate: String(addForm.deathDate || "").trim(),

      deathPlace: String(addForm.deathPlace || "").trim(),

      details: String(addForm.details || "").trim(),

      profession: String(addForm.profession || "").trim(),

      archiveSource: String(addForm.archiveSource || "").trim(),

      documentCode: String(addForm.documentCode || "").trim(),

      reliability: String(addForm.reliability || "").trim(),

      father: nextFatherRaw ? nextFatherRaw : null,

      mother: nextMotherRaw ? nextMotherRaw : null,

      spouse: nextSpouseRaw ? nextSpouseRaw : null,

      children: newChildren,

      color: addForm.color || "#f5f1e8",
    };

    applyPeopleUpdate((prev) => {
      let next = [...prev, newPerson];

      if (newPerson.spouse) {
        next = next.map((p) => {
          if (String(p.spouse) === String(newPerson.spouse))
            return { ...p, spouse: null };

          return p;
        });

        next = ensureSpouseBidirectional(next, newPerson.id, newPerson.spouse);
      }

      for (const c of newPerson.children || []) {
        next = addChildToParent(next, newPerson.id, c);

        next = setParentOnChild(next, newPerson.id, c, newPerson.gender);
      }

      if (newPerson.father)
        next = addChildToParent(next, newPerson.father, newPerson.id);

      if (newPerson.mother)
        next = addChildToParent(next, newPerson.mother, newPerson.id);

      return next;
    });

    resetAddForm();

    notifyPerson(t("person_added", "Person added."));
  };

  const deletePerson = (id) => {
    if (!id) return;

    if (
      !window.confirm(
        t(
          "delete_person_confirm",

          "Are you sure you want to delete this person?"
        )
      )
    )
      return;

    const targetId = String(id);

    applyPeopleUpdate((prev) => {
      const filtered = prev.filter((p) => String(p.id) !== targetId);

      return filtered.map((p) => {
        const next = {
          ...p,

          children: Array.isArray(p.children) ? [...p.children] : [],
        };

        if (String(next.father) === targetId) next.father = null;

        if (String(next.mother) === targetId) next.mother = null;

        if (String(next.spouse) === targetId) next.spouse = null;

        next.children = next.children.filter((cid) => String(cid) !== targetId);

        return next;
      });
    });

    if (selectedPerson?.id === id) setSelectedPerson(null);

    notifyPerson(t("person_deleted", "Person deleted."));
  };

  /** ===== EXPORTS ===== */

  const exportGedcomFile = () => {
    let gedcom = "";
    try {
      gedcom = buildGedcom(people, locale, t);
    } catch (err) {
      notifyError(
        err?.message || t("gedcom_build_failed", "Failed to build GEDCOM")
      );
      return;
    }

    const blob = new Blob([gedcom], { type: "text/plain;charset=utf-8" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `tree-${Date.now()}.ged`;

    document.body.appendChild(a);

    a.click();

    a.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  /** ===== UI STYLES ===== */

  const border = isDark ? "border-[#2c1810]" : "border-[#e8dfca]";

  const card = isDark ? "bg-[#3e2723]" : "bg-white";

  const subtle = isDark ? "bg-[#3e2723]/60" : "bg-[#f8f5ef]";

  const inputBg = isDark ? "bg-[#3e2723]" : "bg-[#f5f1e8]";

  const inputText = isDark ? "text-white" : "text-[#6c5249]";

  const selectedChildren = useMemo(() => {
    if (!selectedPerson) return [];

    const ids = new Set();

    // by children array

    for (const c of selectedPerson.children || []) ids.add(String(c));

    // also derived from father/mother of others

    for (const p of people) {
      if (String(p.father) === String(selectedPerson.id)) ids.add(String(p.id));

      if (String(p.mother) === String(selectedPerson.id)) ids.add(String(p.id));
    }

    const out = [];

    for (const id of ids) {
      const child = people.find((p) => String(p.id) === id);

      if (child) out.push(child);
    }

    return out;
  }, [selectedPerson, people]);

  const centerTree = () => {
    const zoom = zoomRef.current;

    const wrapEl = wrapRef.current;

    const svgEl = svgRef.current;

    const nodes = nodesRef.current || [];

    if (!zoom || !wrapEl || !svgEl || nodes.length === 0) return;

    const width = Math.max(320, wrapEl.clientWidth || 0);

    const height = Math.max(520, wrapEl.clientHeight || 0);

    const xs = nodes.map((n) => n.x).filter((v) => Number.isFinite(v));

    const ys = nodes.map((n) => n.y).filter((v) => Number.isFinite(v));

    if (!xs.length || !ys.length) return;

    const minX = Math.min(...xs) - CARD_W / 2;

    const maxX = Math.max(...xs) + CARD_W / 2;

    const minY = Math.min(...ys) - CARD_H / 2;

    const maxY = Math.max(...ys) + CARD_H / 2;

    const boundsWidth = Math.max(maxX - minX, CARD_W);

    const boundsHeight = Math.max(maxY - minY, CARD_H);

    const scale = Math.min(width / boundsWidth, height / boundsHeight);

    const clamped = Math.max(0.2, Math.min(scale * 0.9, 2.8));

    const midX = (minX + maxX) / 2;

    const midY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity

      .translate(width / 2, height / 2)

      .scale(clamped)

      .translate(-midX, -midY);

    d3.select(svgEl).transition().duration(500).call(zoom.transform, transform);
  };

  return (
    <div dir={dir} className="relative">
      {personStatus.message ? (
        <div
          className={`fixed top-24 z-[60] rtl:left-6 rtl:right-auto ltr:right-6 rounded-lg border px-4 py-3 shadow-xl ${
            personStatus.type === "error"
              ? "border-red-500/40 bg-red-600/90 text-white"
              : "border-emerald-500/40 bg-emerald-600/90 text-white"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="text-sm font-semibold">{personStatus.message}</div>
        </div>
      ) : null}

      <input
        ref={importGedcomRef}
        type="file"
        accept=".ged,.gedcom"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] || null;

          if (f) void importGedcom(f);

          e.target.value = "";
        }}
      />

      {/* LAYOUT: Flex Column */}
      <div className="flex flex-col h-full bg-inherit">
        {/* TOOLBAR */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b ${border} ${subtle} z-20`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (zoomRef.current && svgRef.current)
                  d3.select(svgRef.current)
                    .transition()
                    .call(zoomRef.current.scaleBy, 1.3);
              }}
              className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-current border ${border}`}
              title={t("zoom_in", "Zoom In")}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (zoomRef.current && svgRef.current)
                  d3.select(svgRef.current)
                    .transition()
                    .call(zoomRef.current.scaleBy, 0.7);
              }}
              className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-current border ${border} flex items-center justify-center`}
              title={t("zoom_out", "Zoom Out")}
            >
              <div className="w-4 h-0.5 bg-current" />
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-md border ${border} ${card} hover:opacity-90 inline-flex items-center gap-2 text-xs font-semibold shadow ml-2`}
              onClick={centerTree}
            >
              <LocateFixed className="w-3.5 h-3.5" />
              {t("center", "Center")}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => importGedcomRef.current?.click()}
              className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-current border ${border} flex items-center gap-2 text-xs font-semibold`}
            >
              <Upload className="w-4 h-4" />
              {t("import_gedcom", "Import GEDCOM")}
            </button>
            <button
              onClick={exportGedcomFile}
              className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-current border ${border} flex items-center gap-2 text-xs font-semibold`}
            >
              <FileCode2 className="w-4 h-4" />
              {t("export_gedcom", "Export GEDCOM")}
            </button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div
            ref={wrapRef}
            className="relative bg-opacity-50 min-h-[70vh] w-full border-b border-inherit"
          >
            {/* SVG will be here */}
            <svg
              ref={svgRef}
              className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
            />

            {!people.length ? (
              <div className="absolute inset-0 flex items-center justify-center text-center px-6 pointer-events-none">
                <div
                  className={`max-w-md rounded-xl border ${border} ${card} p-6 shadow-lg pointer-events-auto`}
                >
                  <div className="text-lg font-semibold">
                    {readOnly
                      ? t("tree_empty", "No people to display yet.")
                      : t(
                          "tree_empty_prompt",
                          "Start building your family tree."
                        )}
                  </div>
                  <p className="text-sm opacity-70 mt-2">
                    {readOnly
                      ? t(
                          "tree_empty_readonly_hint",
                          "There is no GEDCOM data for this tree yet."
                        )
                      : t(
                          "tree_empty_hint",
                          "Add a person manually or import a GEDCOM file."
                        )}
                  </p>
                  {!readOnly ? (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        className="px-4 py-2 rounded-md bg-[#5d4037] text-white text-sm font-semibold"
                        onClick={() => {
                          resetAddForm();
                          setPanelTab("add");
                        }}
                      >
                        {t("add_person", "Add Person")}
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-md border ${border} text-sm font-semibold`}
                        onClick={() => importGedcomRef.current?.click()}
                      >
                        {t("import_gedcom", "Import GEDCOM")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {readOnly && selectedPerson ? (
              <div
                className={`absolute bottom-3 left-3 z-10 w-[min(320px,85%)] rounded-md border ${border} ${card} p-3 shadow-lg heritage-panel heritage-panel--grid`}
              >
                <div className="text-sm font-semibold">
                  {nameOf(selectedPerson)}
                </div>

                <div className="mt-1 text-xs opacity-70">
                  {selectedPerson.birthYear
                    ? `${t("birth_year", "Birth Year")}: ${
                        selectedPerson.birthYear
                      }`
                    : `${t("birth_year", "Birth Year")}: -`}
                </div>

                <div className="text-xs opacity-70">
                  {selectedPerson.birthPlace
                    ? `${t("birth_place", "Birth Place")}: ${
                        selectedPerson.birthPlace
                      }`
                    : `${t("birth_place", "Birth Place")}: -`}
                </div>

                <div className="text-xs opacity-70">
                  {selectedPerson.deathDate
                    ? `${t("death_date", "Death Date")}: ${
                        selectedPerson.deathDate
                      }`
                    : `${t("death_date", "Death Date")}: -`}
                </div>

                <div className="text-xs opacity-70">
                  {selectedPerson.deathPlace
                    ? `${t("death_place", "Death Place")}: ${
                        selectedPerson.deathPlace
                      }`
                    : `${t("death_place", "Death Place")}: -`}
                </div>

                <div className="text-xs opacity-70">
                  {`${t("gender", "Gender")}: ${displayGender(
                    selectedPerson.gender
                  )}`}
                </div>

                <div className="text-xs opacity-70">
                  {t("spouse", "Spouse")}: {relationName(selectedPerson.spouse)}
                </div>

                <div className="text-xs opacity-70">
                  {t("children", "Children")}:{" "}
                  {selectedChildren.length
                    ? selectedChildren.map((c) => nameOf(c)).join(", ")
                    : "-"}
                </div>
              </div>
            ) : null}
          </div>

          <div
            className={`w-full border-t ${border} p-4 text-[#6c5249] dark:text-[#ffffff]`}
          >
            {/* Sidebar/Editor Content moved here - Explicit text colors to fix white-on-white */}
            <div className="flex flex-col md:flex-row gap-6 h-[600px]">
              {/* Search / List Column */}
              <div className="w-full md:w-1/3 flex flex-col gap-4 border-r border-[#d4af37]/20 pr-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#d4af37]/20">
                  <span className="font-cinzel font-bold text-lg text-[#5d4037] dark:text-[#d4af37]">
                    {t("people_list", "People List")}
                  </span>
                  <div className="text-xs opacity-60 font-serif italic">
                    {people.length} {t("records", "records")}
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 text-[#5d4037] dark:text-[#d4af37]" />
                  <input
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    placeholder={t("search_people", "Search people...")}
                    className={`w-full pl-9 pr-3 py-2 rounded-md border ${border} ${inputBg} ${inputText} focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] transition-all`}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {peopleList.length ? (
                    peopleList.map((item) => {
                      const active =
                        selectedPerson &&
                        String(selectedPerson.id) === String(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedPerson(item.person)}
                          className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${
                            active
                              ? "bg-[#5d4037] border-[#5d4037] text-white shadow-md transform scale-[1.02]"
                              : `bg-white dark:bg-[#3e2723]/30 border-transparent hover:border-[#d4af37]/50 hover:bg-[#5d4037]/5 dark:hover:bg-[#d4af37]/10 ${inputText}`
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                                  active
                                    ? "bg-white/20 border-white/40 text-white"
                                    : "bg-[#5d4037]/10 border-[#5d4037]/20 text-[#5d4037] dark:text-[#d4af37] dark:border-[#d4af37]/20"
                                }`}
                              >
                                {item.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-serif font-medium text-base">
                                {item.name}
                              </span>
                            </div>
                            <span
                              className={`text-xs ${
                                active ? "opacity-80" : "opacity-50"
                              }`}
                            >
                              {item.person.birthYear || "-"}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 opacity-50 italic font-serif">
                      {t("no_results", "No results found")}
                    </div>
                  )}
                </div>
              </div>

              {/* Editor Column */}
              <div className="w-full md:w-2/3 flex flex-col">
                {!readOnly ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center gap-1 bg-[#5d4037]/5 dark:bg-white/5 p-1 rounded-lg mb-4 self-start">
                      <button
                        onClick={() => {
                          resetAddForm();
                          setPanelTab("add");
                        }}
                        className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${
                          panelTab === "add"
                            ? "bg-[#5d4037] text-white shadow-sm"
                            : "text-[#5d4037] dark:text-[#d4af37] hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        {t("add_person", "Add Person")}
                      </button>
                      <button
                        onClick={() => startEdit(selectedPerson)}
                        disabled={!selectedPerson}
                        className={`px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${
                          panelTab === "editor"
                            ? "bg-[#5d4037] text-white shadow-sm"
                            : "text-[#5d4037] dark:text-[#d4af37] hover:bg-black/5 dark:hover:bg-white/5"
                        } ${
                          !selectedPerson ? "cursor-not-allowed opacity-30" : ""
                        }`}
                      >
                        {t("edit_person", "Edit Person")}
                      </button>
                    </div>

                    {/* SCROLLABLE FORM AREA */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <form onSubmit={addPerson} className="space-y-8">
                        {/* SECTION: PERSONAL INFO */}
                        <div className="space-y-4">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5d4037] dark:text-[#d4af37] border-b border-[#d4af37]/30 pb-1">
                            <UserRound className="w-4 h-4" />
                            {t("personal_info", "Personal Info")}
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] mb-1 block">
                                {t("full_name", "Full Name")}
                              </label>
                              <input
                                value={addForm.name}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    name: e.target.value,
                                  }))
                                }
                                placeholder="e.g. Ahmed Ben Mohamed"
                                className={`w-full px-4 py-2.5 rounded-lg border ${border} ${inputBg} ${inputText} focus:ring-2 focus:ring-[#d4af37]/40`}
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] mb-1 block">
                                {t("gender", "Gender")}
                              </label>
                              <select
                                value={addForm.gender}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    gender: e.target.value,
                                  }))
                                }
                                className={`w-full px-4 py-2.5 rounded-lg border ${border} ${inputBg} ${inputText} appearance-none cursor-pointer`}
                              >
                                <option value="">Select...</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] mb-2 block">
                                {t("select_color", "Select a Color:")}
                              </label>
                              <div className="flex gap-3 items-center bg-gradient-to-r from-[#5d4037]/5 to-transparent p-3 rounded-lg border border-[#d4af37]/20">
                                <input
                                  type="color"
                                  value={addForm.color || "#f5f1e8"}
                                  onChange={(e) =>
                                    setAddForm((s) => ({
                                      ...s,
                                      color: e.target.value,
                                    }))
                                  }
                                  className="w-12 h-12 p-0.5 rounded-lg border-2 border-[#d4af37]/40 cursor-pointer shadow-md hover:scale-105 transition-transform"
                                />
                                <div className="flex-1">
                                  <div className="text-xs font-semibold text-[#5d4037] dark:text-[#d4af37]">
                                    {addForm.color || "#f5f1e8"}
                                  </div>
                                  <div className="text-[10px] opacity-60 mt-0.5">
                                    This color will appear on the family tree
                                    card
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="col-span-2">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] mb-1 block">
                                {t("details", "Details / Biography")}
                              </label>
                              <textarea
                                value={addForm.details}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    details: e.target.value,
                                  }))
                                }
                                placeholder="Additional notes..."
                                rows={3}
                                className={`w-full px-4 py-2.5 rounded-lg border ${border} ${inputBg} ${inputText} focus:ring-2 focus:ring-[#d4af37]/40`}
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] mb-1 block">
                                {t("profession", "Profession")}
                              </label>
                              <input
                                value={addForm.profession}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    profession: e.target.value,
                                  }))
                                }
                                placeholder="e.g. Doctor, Teacher, Engineer..."
                                className={`w-full px-4 py-2.5 rounded-lg border ${border} ${inputBg} ${inputText} focus:ring-2 focus:ring-[#d4af37]/40`}
                              />
                            </div>

                            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                  {t("archive_source", "Archive Source")}
                                </label>
                                <div className="flex items-center gap-2">
                                  <Archive className="w-4 h-4 text-[#d4af37]" />
                                  <input
                                    value={addForm.archiveSource}
                                    onChange={(e) =>
                                      setAddForm((s) => ({
                                        ...s,
                                        archiveSource: e.target.value,
                                      }))
                                    }
                                    placeholder={t(
                                      "archive_source_placeholder",
                                      "e.g. National Archives"
                                    )}
                                    className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText}`}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                  {t("document_code", "Document Code")}
                                </label>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-[#d4af37]" />
                                  <input
                                    value={addForm.documentCode}
                                    onChange={(e) =>
                                      setAddForm((s) => ({
                                        ...s,
                                        documentCode: e.target.value,
                                      }))
                                    }
                                    placeholder={t(
                                      "document_code_placeholder",
                                      "e.g. ALG-1920-042"
                                    )}
                                    className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText} font-mono`}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION: DATES & PLACES */}
                        <div className="space-y-4">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5d4037] dark:text-[#d4af37] border-b border-[#d4af37]/30 pb-1">
                            <span className="w-4 h-4 text-center font-serif italic">
                              i
                            </span>
                            {t("dates_places", "Dates & Places")}
                          </label>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                {t("year_of_birth", "Year of Birth")}
                              </label>
                              <input
                                value={addForm.birthYear}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    birthYear: e.target.value,
                                  }))
                                }
                                placeholder="YYYY"
                                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                {t(
                                  "city_country",
                                  "City or Country (Optional)"
                                )}
                              </label>
                              <input
                                value={addForm.birthPlace}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    birthPlace: e.target.value,
                                  }))
                                }
                                placeholder="e.g. Algiers, Algeria"
                                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                {t("year_of_death", "Year of Death (Optional)")}
                              </label>
                              <input
                                value={addForm.deathDate}
                                onChange={(e) =>
                                  setAddForm((s) => ({
                                    ...s,
                                    deathDate: e.target.value,
                                  }))
                                }
                                placeholder="YYYY"
                                className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText}`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* SECTION: FAMILY RELATIONS */}
                        <div className="space-y-4">
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#5d4037] dark:text-[#d4af37] border-b border-[#d4af37]/30 pb-1">
                            <Network className="w-4 h-4" />
                            {t("relations", "Family Relations")}
                          </label>

                          <div className="grid grid-cols-1 gap-4">
                            {/* PARENTS & SPOUSE */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                  {t("father", "Father")}
                                </label>
                                <select
                                  value={addForm.father || ""}
                                  onChange={(e) =>
                                    setAddForm((s) => ({
                                      ...s,
                                      father: e.target.value,
                                    }))
                                  }
                                  className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText} text-sm`}
                                >
                                  <option value="">{t("none", "None")}</option>
                                  {people
                                    .filter(
                                      (p) => String(p.id) !== String(addForm.id)
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {nameOf(p)}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                  {t("mother", "Mother")}
                                </label>
                                <select
                                  value={addForm.mother || ""}
                                  onChange={(e) =>
                                    setAddForm((s) => ({
                                      ...s,
                                      mother: e.target.value,
                                    }))
                                  }
                                  className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText} text-sm`}
                                >
                                  <option value="">{t("none", "None")}</option>
                                  {people
                                    .filter(
                                      (p) => String(p.id) !== String(addForm.id)
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {nameOf(p)}
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                  {t("spouse", "Spouse")}
                                </label>
                                <select
                                  value={addForm.spouse || ""}
                                  onChange={(e) =>
                                    setAddForm((s) => ({
                                      ...s,
                                      spouse: e.target.value,
                                    }))
                                  }
                                  className={`w-full px-3 py-2 rounded-lg border ${border} ${inputBg} ${inputText} text-sm`}
                                >
                                  <option value="">{t("none", "None")}</option>
                                  {people
                                    .filter(
                                      (p) => String(p.id) !== String(addForm.id)
                                    )
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {nameOf(p)}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>

                            {/* CHILDREN SELECT */}
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-[#5d4037] dark:text-[#d4af37] block">
                                {t("children", "Children")}
                                <span className="text-[10px] opacity-70 font-normal ml-2 lowercase normal-case">
                                  (Click to select only one.
                                  Ctrl+Click/Cmd+Click to toggle multiple)
                                </span>
                              </label>
                              <div
                                className={`border ${border} rounded-lg h-48 overflow-y-auto p-2 bg-white/50 dark:bg-black/20 custom-scrollbar`}
                              >
                                {people.filter(
                                  (p) => String(p.id) !== String(addForm.id)
                                ).length === 0 && (
                                  <div className="text-xs opacity-50 italic text-center py-4">
                                    No other people available
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {people
                                    .filter(
                                      (p) => String(p.id) !== String(addForm.id)
                                    )
                                    .sort((a, b) =>
                                      nameOf(a).localeCompare(nameOf(b))
                                    )
                                    .map((p) => {
                                      const isSelected = (
                                        addForm.children || []
                                      ).some((c) => String(c) === String(p.id));
                                      return (
                                        <button
                                          key={p.id}
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            const pid = String(p.id);
                                            setAddForm((s) => {
                                              const current = new Set(
                                                (s.children || []).map(String)
                                              );
                                              const isMulti =
                                                e.ctrlKey || e.metaKey;

                                              if (isMulti) {
                                                if (current.has(pid))
                                                  current.delete(pid);
                                                else current.add(pid);
                                              } else {
                                                // Standard behavior: Click selects ONLY this one
                                                if (
                                                  current.has(pid) &&
                                                  current.size === 1
                                                ) {
                                                  // Optionally allow deselect if clicking same? Standard list usually doesn't, but let's allow "deselect all" if clicking empty, but here we click item.
                                                  // Let's stick to strict Select One logic.
                                                  current.clear();
                                                  current.add(pid);
                                                } else {
                                                  current.clear();
                                                  current.add(pid);
                                                }
                                              }
                                              return {
                                                ...s,
                                                children: Array.from(current),
                                              };
                                            });
                                          }}
                                          className={`text-left text-sm px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                                            isSelected
                                              ? "bg-[#5d4037] text-white shadow-sm"
                                              : "hover:bg-[#5d4037]/10 text-[#5d4037] dark:text-[#d4af37]"
                                          }`}
                                        >
                                          <div
                                            className={`w-3 h-3 rounded-full border border-current flex items-center justify-center`}
                                          >
                                            {isSelected && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                            )}
                                          </div>
                                          <span className="truncate">
                                            {nameOf(p)}
                                          </span>
                                          <span className="text-xs opacity-60 ml-auto">
                                            {p.birthYear}
                                          </span>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-[#d4af37]/20">
                          {panelTab === "editor" && (
                            <button
                              type="button"
                              onClick={() => deletePerson(addForm.id)}
                              className="mr-auto px-4 py-2 text-red-600 hover:bg-red-50 rounded text-sm font-bold uppercase tracking-wider transition"
                            >
                              {t("delete", "Delete")}
                            </button>
                          )}
                          <button
                            type="submit"
                            className="px-8 py-3 bg-[#5d4037] text-white font-cinzel font-bold text-sm uppercase tracking-widest rounded shadow-lg hover:bg-[#4a322c] hover:translate-y-[-1px] transition-all"
                          >
                            {panelTab === "add"
                              ? t("add_person", "Add Person")
                              : t("update_person", "Update Person")}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#5d4037]/10 flex items-center justify-center">
                      <UserRound className="w-8 h-8 text-[#5d4037]" />
                    </div>
                    <div className="text-lg font-serif italic">
                      {t("read_only_mode", "View Only Mode - Sign in to Edit")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
