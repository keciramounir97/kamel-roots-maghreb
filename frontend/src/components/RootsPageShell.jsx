export default function RootsPageShell({
  hero,
  heroClassName = "",
  children,
  className = "",
}) {
  return (
    <div className={`roots-shell ${className}`}>
      {hero ? (
        <section className={`heritage-hero text-center ${heroClassName}`}>
          {hero}
        </section>
      ) : null}
      <div className="space-y-10">{children}</div>
    </div>
  );
}
