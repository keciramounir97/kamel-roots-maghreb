const { prisma } = require("../lib/prisma");
const { isDbUnavailable } = require("../utils/dbState");

const SETTINGS_CACHE_TTL_MS =
  Number(process.env.SETTINGS_CACHE_TTL_MS || 15000) || 15000;
const settingsCache = new Map();

const getCachedSetting = (key) => {
  const cached = settingsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    settingsCache.delete(key);
    return null;
  }
  return cached.value;
};

const setCachedSetting = (key, value) => {
  settingsCache.set(key, {
    value,
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
  });
};

const getSetting = async (key, fallbackValue) => {
  try {
    const cached = getCachedSetting(key);
    if (cached !== null) return cached;
    if (isDbUnavailable()) return fallbackValue;
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    const value = setting ? setting.value : fallbackValue;
    setCachedSetting(key, value);
    return value;
  } catch (err) {
    console.warn("getSetting failed:", err.message);
    return fallbackValue;
  }
};

const setSetting = async (key, value) => {
  const safeValue = String(value);
  const result = await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: safeValue },
    update: { value: safeValue },
  });
  setCachedSetting(key, safeValue);
  return result;
};

module.exports = { getSetting, setSetting };
