const { ensureSchema } = require("../services/schemaService");
const { ensureDefaultRoles, ensureSeedAdminUser } = require("../services/seedService");

async function runMaintenance() {
  await ensureSchema();
  await ensureDefaultRoles();
  await ensureSeedAdminUser();
}

module.exports = { runMaintenance };
