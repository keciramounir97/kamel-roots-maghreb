const parseJsonArray = (value) => {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim().toLowerCase());
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const isStrongPassword = (password) =>
  typeof password === "string" && password.length >= 8;
const toNumber = (value) =>
  typeof value === "bigint" ? Number(value) : value;

module.exports = {
  parseJsonArray,
  isValidEmail,
  normalizeEmail,
  isStrongPassword,
  toNumber,
};
