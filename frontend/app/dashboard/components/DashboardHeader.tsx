import Link from "next/link";

interface DashboardHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function DashboardHeader({ refreshing, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="panel dashboard-header">
      <div>
        <h1 className="heading-xl">Election Night Dashboard</h1>
        <p className="muted">Live constituency standings and parliament-wide totals. Auto-refresh every 15 seconds.</p>
      </div>

      <div className="dashboard-actions">
        <button className="secondary-btn" onClick={onRefresh}>
          {refreshing ? "Refreshing..." : "Refresh now"}
        </button>
        <Link className="primary-btn" href="/upload">
          Import new file
        </Link>
      </div>
    </header>
  );
}
