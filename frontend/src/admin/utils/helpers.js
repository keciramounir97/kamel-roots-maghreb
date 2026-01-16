export const classNames = (...args) => args.filter(Boolean).join(" ");

export const formatDate = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
};
