const { getSetting, setSetting } = require("../services/settingsService");
const { logActivity } = require("../services/activityService");
const { getDatabaseErrorResponse } = require("../utils/prismaErrors");

const defaultFooterConfig = {
  enabled: true,
  background: "#03181c",
  text: "#e6f7ff",
  accent: "#0fb5c9",
  brandTitle: "Roots Maghreb",
  brandTagline: "Explore and preserve family heritage across the Maghreb.",
  links: [
    { label: "Home", href: "/" },
    { label: "Library", href: "/library" },
    { label: "Research", href: "/research" },
  ],
  buttons: [
    { label: "Start a Tree", href: "/admin/trees", variant: "solid" },
    { label: "Contact Us", href: "/contactus", variant: "outline" },
  ],
  images: [
    {
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
      alt: "Maghreb landscape",
      href: "/periods",
    },
    {
      src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
      alt: "Family roots",
      href: "/research",
    },
  ],
  socials: [
    { label: "Twitter", href: "https://twitter.com" },
    { label: "Facebook", href: "https://facebook.com" },
  ],
  fineprint: "© Roots Maghreb. All rights reserved.",
};

const parseFooterConfig = (raw) => {
  if (!raw) return { ...defaultFooterConfig };
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return { ...defaultFooterConfig };
    return {
      ...defaultFooterConfig,
      ...parsed,
      links: Array.isArray(parsed.links) ? parsed.links : defaultFooterConfig.links,
      buttons: Array.isArray(parsed.buttons) ? parsed.buttons : defaultFooterConfig.buttons,
      images: Array.isArray(parsed.images) ? parsed.images : defaultFooterConfig.images,
      socials: Array.isArray(parsed.socials) ? parsed.socials : defaultFooterConfig.socials,
    };
  } catch {
    return { ...defaultFooterConfig };
  }
};

const getSettings = async (_req, res) => {
  const allowRegistration = await getSetting("allowRegistration", "true");
  const defaultLanguage = await getSetting("defaultLanguage", "en");
  const notifyAdmins = await getSetting("notifyAdmins", "true");
  const activityRetentionDays = await getSetting("activityRetentionDays", "90");
  res.json({
    allowRegistration: String(allowRegistration).toLowerCase() === "true",
    defaultLanguage,
    notifyAdmins: String(notifyAdmins).toLowerCase() === "true",
    activityRetentionDays: Number(activityRetentionDays) || 90,
  });
};

const saveSettings = async (req, res) => {
  try {
    const {
      allowRegistration,
      defaultLanguage,
      notifyAdmins,
      activityRetentionDays,
    } = req.body || {};

    if (typeof allowRegistration === "boolean") {
      await setSetting("allowRegistration", allowRegistration);
    }
    if (typeof defaultLanguage === "string") {
      await setSetting("defaultLanguage", defaultLanguage);
    }
    if (typeof notifyAdmins === "boolean") {
      await setSetting("notifyAdmins", notifyAdmins);
    }
    if (typeof activityRetentionDays === "number") {
      await setSetting("activityRetentionDays", activityRetentionDays);
    }

    await logActivity(req.user.id, "security", "Updated settings");
    res.json({ message: "Settings saved" });
  } catch (err) {
    console.error("Save settings failed:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError) {
      return res.status(dbError.status).json({ message: dbError.message });
    }
    res.status(500).json({ message: "Save settings failed" });
  }
};

const getFooter = async (_req, res) => {
  try {
    const raw = await getSetting("footerConfig", "");
    const footer = parseFooterConfig(raw);
    res.json({ footer });
  } catch (err) {
    console.error("Get footer failed:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError) {
      return res.status(dbError.status).json({ message: dbError.message });
    }
    res.status(500).json({ message: "Failed to load footer" });
  }
};

const saveFooter = async (req, res) => {
  try {
    const incoming = req.body?.footer ?? {};
    const footer = parseFooterConfig(incoming);
    await setSetting("footerConfig", JSON.stringify(footer));
    if (req.user?.id) {
      await logActivity(req.user.id, "settings", "Updated footer");
    }
    res.json({ message: "Footer saved", footer });
  } catch (err) {
    console.error("Save footer failed:", err.code || "", err.message);
    const dbError = getDatabaseErrorResponse(err);
    if (dbError) {
      return res.status(dbError.status).json({ message: dbError.message });
    }
    res.status(500).json({ message: "Save footer failed" });
  }
};

module.exports = { getSettings, saveSettings, getFooter, saveFooter };
