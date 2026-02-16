import { TotalsResponse } from "@/lib/types";

import { formatNumber } from "../utils";
import PartyBarChart from "./charts/PartyBarChart";

interface ParliamentDistributionViewProps {
  totals: TotalsResponse | null;
}

export default function ParliamentDistributionView({ totals }: ParliamentDistributionViewProps) {
  return (
    <article className="panel">
      <h2 className="heading-md">Parliament Distribution View</h2>

      {!totals ? (
        <p className="muted">No totals available yet.</p>
      ) : (
        <>
          <div className="totals-overview">
            <p>
              <strong>Constituencies counted:</strong> {totals.overall.total_constituencies}
            </p>
            <p>
              <strong>Total votes:</strong> {formatNumber(totals.overall.total_votes)}
            </p>
          </div>

          <h3 className="heading-sm">Seats by Party (MPs)</h3>
          <div className="chart-card">
            <PartyBarChart
              ariaLabel="Bar chart of seats per party"
              yAxisLabel="Seats"
              formatValue={(value) => formatNumber(value)}
              data={totals.total_mps_per_party.map((entry) => ({
                partyCode: entry.party_code,
                partyName: entry.party_name,
                value: entry.seats,
              }))}
            />
          </div>

          <h3 className="heading-sm">Total Votes by Party</h3>
          <div className="chart-card">
            <PartyBarChart
              ariaLabel="Bar chart of votes per party"
              yAxisLabel="Votes"
              formatValue={(value) => formatNumber(value)}
              data={totals.total_votes_per_party.map((entry) => ({
                partyCode: entry.party_code,
                partyName: entry.party_name,
                value: entry.votes,
              }))}
            />
          </div>
        </>
      )}
    </article>
  );
}
