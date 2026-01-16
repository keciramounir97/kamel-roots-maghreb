const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");
const { transporter } = require("../lib/mailer");
const {
  parseJsonArray,
  normalizeEmail,
  isValidEmail,
  isStrongPassword,
} = require("../utils/text");
const { JWT_SECRET, RESET_TTL_SECONDS } = require("../config/env");

const generateCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const loadAuthUserById = async (userId) => {
  const row = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: { role: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phoneNumber,
    roleId: row.roleId,
    roleName: row.role?.name || null,
    status: row.status || "active",
    sessionToken: row.sessionToken || null,
    permissions: parseJsonArray(row.role?.permissions),
  };
};

const createSession = async (user) => {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const update = { sessionToken, lastLogin: new Date() };
  if (user.id) {
    await prisma.user.updateMany({ where: { id: user.id }, data: update });
  } else if (user.email) {
    await prisma.user.updateMany({ where: { email: user.email }, data: update });
  }
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      sid: sessionToken,
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "30d" }
  );
  return { token, sessionToken };
};

const logoutSession = async (userId) => {
  await prisma.user.updateMany({
    where: { id: Number(userId) },
    data: { sessionToken: null },
  });
};

const createResetCode = async (email) => {
  const code = generateCode();
  const codeHash = await bcrypt.hash(String(code), 10);
  const expiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000);
  await prisma.passwordReset.upsert({
    where: { email },
    create: { email, codeHash, expiresAt },
    update: { codeHash, expiresAt },
  });
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password reset code",
      html: `<h2>Reset your password</h2><p>Your verification code:</p><h1>${code}</h1>`,
    });
  } catch (err) {
    // Log but do not fail the reset creation so API can still return 200
    console.error("Reset email send failed:", err.message);
  }
  return code;
};

const verifyResetCode = async (email, code) => {
  const record = await prisma.passwordReset.findUnique({ where: { email } });
  if (!record) return false;
  const expiresAt = new Date(record.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return false;
  const ok = await bcrypt.compare(String(code), String(record.codeHash));
  return ok;
};

const clearReset = async (email) =>
  prisma.passwordReset.deleteMany({ where: { email } });

const validateAuthInput = ({ email, password }) => {
  const safeEmail = normalizeEmail(email);
  if (!safeEmail || !isValidEmail(safeEmail)) {
    return { ok: false, message: "Invalid email format" };
  }
  if (!password) {
    return { ok: false, message: "Password is required" };
  }
  return { ok: true, email: safeEmail };
};

const validateSignupInput = ({ fullName, phone, email, password }) => {
  const safeEmail = normalizeEmail(email);
  const safeName = String(fullName || "").trim();
  if (!safeName || !phone || !safeEmail || !password) {
    return { ok: false, message: "Missing required fields" };
  }
  if (!isValidEmail(safeEmail)) {
    return { ok: false, message: "Invalid email format" };
  }
  if (!isStrongPassword(password)) {
    return { ok: false, message: "Password must be at least 8 characters long" };
  }
  return { ok: true, email: safeEmail, fullName: safeName };
};

module.exports = {
  loadAuthUserById,
  createSession,
  logoutSession,
  createResetCode,
  verifyResetCode,
  clearReset,
  validateAuthInput,
  validateSignupInput,
};
