import Link from "next/link";

export default function HomePage() {
  return (
    <main className="screen-shell home-shell">
      <section className="panel hero-panel">
        <p className="kicker">Election Night System</p>
        <h1 className="heading-xl">Real-Time Results Ingestion and Reporting</h1>
        <p className="muted">
          Import rolling constituency files, apply deterministic override rules, and track seat and vote totals from
          a single dashboard.
        </p>

        <div className="hero-actions">
          <Link className="primary-btn" href="/upload" prefetch={false}>
            Upload Results File
          </Link>
          <Link className="secondary-btn" href="/dashboard" prefetch={false}>
            Open Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
