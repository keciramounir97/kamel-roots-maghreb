const state = {
  downUntil: 0,
  lastError: null,
};

const getBackoffMs = () =>
  Number(process.env.DB_BACKOFF_MS || 15000) || 15000;

const isDbUnavailable = () => Date.now() < state.downUntil;

const markDbDown = (err, overrideMs) => {
  const backoffMs =
    typeof overrideMs === "number" && overrideMs > 0
      ? overrideMs
      : getBackoffMs();
  state.downUntil = Date.now() + backoffMs;
  state.lastError = {
    code: err?.code || null,
    message: String(err?.message || ""),
    at: new Date().toISOString(),
  };
};

const clearDbDown = () => {
  state.downUntil = 0;
  state.lastError = null;
};

module.exports = {
  isDbUnavailable,
  markDbDown,
  clearDbDown,
};
