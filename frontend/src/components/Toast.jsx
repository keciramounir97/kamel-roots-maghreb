export default function Toast({ message, tone = "success" }) {
  if (!message) return null;

  const toneClass =
    tone === "error"
      ? "border-red-500/40 bg-red-600/90 text-white"
      : "border-emerald-500/40 bg-emerald-600/90 text-white";

  return (
    <div
      className={`fixed top-24 z-[60] rtl:left-6 rtl:right-auto ltr:right-6 rounded-lg border px-4 py-3 shadow-xl ${toneClass}`}
      role="status"
      aria-live="polite"
    >
      <div className="text-sm font-semibold">{message}</div>
    </div>
  );
}
