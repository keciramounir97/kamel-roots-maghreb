import { Link } from "react-router-dom";
import RootsPageShell from "../components/RootsPageShell";

export default function Error() {
  return (
    <RootsPageShell
      hero={
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-[#d4af37]">404 • Not Found</p>
          <h1 className="text-5xl font-bold">Page Missing</h1>
          <p className="max-w-3xl mx-auto text-lg opacity-80">
            We couldn't locate the page you were trying to reach. Let us guide you back to the archives.
          </p>
        </div>
      }
    >
      <section className="roots-section text-center">
        <Link
          to="/"
          className="roots-cta inline-flex items-center justify-center gap-2"
        >
          Go to Home
        </Link>
      </section>
    </RootsPageShell>
  );
}
