const bcrypt = require("bcryptjs");
const { prisma } = require("../lib/prisma");

const ensureDefaultRoles = async () => {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        permissions TEXT
      )`
    );
    const adminPermissions = JSON.stringify([
      "manage_users",
      "manage_books",
      "manage_all_trees",
      "view_dashboard",
      "upload_books",
    ]);
    const userPermissions = JSON.stringify([
      "manage_own_trees",
      "view_books",
      "download_gedcom",
    ]);
    await prisma.role.upsert({
      where: { id: 1 },
      create: { id: 1, name: "admin", permissions: adminPermissions },
      update: { permissions: adminPermissions },
    });
    await prisma.role.upsert({
      where: { id: 2 },
      create: { id: 2, name: "user", permissions: userPermissions },
      update: { permissions: userPermissions },
    });
  } catch (err) {
    if (err.code === "P2002") return; // ignore duplicate inserts caused by concurrent runs
    console.error("Ensure roles failed:", err.code || "", err.message);
  }
};

const ensureSeedUser = async ({
  email,
  password,
  fullName,
  phone,
  roleId,
  force,
}) => {
  const safeEmail = String(email || "").trim();
  const safePassword = String(password || "");
  if (!safeEmail || !safePassword) return;

  const safeFullName =
    String(fullName || "Admin").trim() || "Admin";
  const phoneRaw = String(phone || "").trim();
  const safePhone = phoneRaw ? phoneRaw : null;
  const safeRoleId = Number(roleId || 1) || 1;

  try {
    const existing = await prisma.user.findUnique({
      where: { email: safeEmail },
      select: { id: true, roleId: true },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(String(safePassword), 10);
      await prisma.user.create({
        data: {
          fullName: safeFullName,
          phoneNumber: safePhone,
          email: safeEmail,
          password: passwordHash,
          roleId: safeRoleId,
          status: "active",
        },
      });
      console.log(`Seeded admin account: ${safeEmail}`);
      return;
    }

    const userId = existing.id;
    const currentRoleId = Number(existing.roleId) || null;

    if (force) {
      const passwordHash = await bcrypt.hash(String(safePassword), 10);
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: passwordHash,
          roleId: safeRoleId,
          status: "active",
          fullName: safeFullName,
          phoneNumber: safePhone,
        },
      });
      console.log(`Seeded admin updated: ${safeEmail}`);
      return;
    }

    if (currentRoleId !== safeRoleId) {
      await prisma.user.update({
        where: { id: userId },
        data: { roleId: safeRoleId, status: "active" },
      });
      console.log(`Ensured admin role for: ${safeEmail}`);
    }
  } catch (err) {
    console.error("Seed admin failed:", err.code || "", err.message);
  }
};

const ensureSeedAdminUser = async () => {
  if (process.env.NODE_ENV === "test") return;

  const force =
    String(process.env.SEED_ADMIN_FORCE || "").toLowerCase() === "true";
  const allowProd =
    String(process.env.SEED_ADMIN_ALLOW_PROD || "").toLowerCase() === "true" ||
    force;
  if (process.env.NODE_ENV === "production" && !allowProd) return;

  const seeds = [
    {
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      fullName: process.env.SEED_ADMIN_FULL_NAME,
      phone: process.env.SEED_ADMIN_PHONE,
      roleId: process.env.SEED_ADMIN_ROLE_ID,
    },
    {
      email: process.env.SEED_ADMIN2_EMAIL,
      password: process.env.SEED_ADMIN2_PASSWORD,
      fullName: process.env.SEED_ADMIN2_FULL_NAME,
      phone: process.env.SEED_ADMIN2_PHONE,
      roleId: process.env.SEED_ADMIN2_ROLE_ID,
    },
    {
      email: process.env.SEED_ADMIN3_EMAIL,
      password: process.env.SEED_ADMIN3_PASSWORD,
      fullName: process.env.SEED_ADMIN3_FULL_NAME,
      phone: process.env.SEED_ADMIN3_PHONE,
      roleId: process.env.SEED_ADMIN3_ROLE_ID,
    },
  ];

  for (const seed of seeds) {
    await ensureSeedUser({ ...seed, force });
  }
};

module.exports = { ensureDefaultRoles, ensureSeedAdminUser };
