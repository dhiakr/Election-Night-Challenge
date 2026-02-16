import { ConstituencyResult } from "@/lib/types";

import { formatNumber, partyColor } from "../utils";
import PartyDonutChart from "./charts/PartyDonutChart";
import EnglandConstituencyMap from "./map/EnglandConstituencyMap";

interface ConstituencyViewProps {
  constituencies: ConstituencyResult[];
  selectedName: string;
  selectedConstituency: ConstituencyResult | null;
  onSelect: (name: string) => void;
}

export default function ConstituencyView({
  constituencies,
  selectedName,
  selectedConstituency,
  onSelect,
}: ConstituencyViewProps) {
  return (
    <article className="panel">
      <h2 className="heading-md">Constituency View</h2>

      {constituencies.length === 0 ? (
        <p className="muted">No constituency results imported yet.</p>
      ) : (
        <div className="stack">
          <section className="constituency-map-shell">
            <h3 className="heading-sm">England Results Map</h3>
            <EnglandConstituencyMap
              constituencies={constituencies}
              selectedName={selectedName}
              onSelect={onSelect}
            />
          </section>

          <div className="constituency-layout">
            <ul className="constituency-list">
              {constituencies.map((item) => (
                <li key={item.name}>
                  <button
                    className={item.name === selectedName ? "constituency-btn selected" : "constituency-btn"}
                    onClick={() => onSelect(item.name)}
                  >
                    <span>{item.name}</span>
                    <small>{item.winning_party?.party_code ?? "No winner"}</small>
                  </button>
                </li>
              ))}
            </ul>

            {selectedConstituency && (
              <div className="constituency-detail">
                <h3>{selectedConstituency.name}</h3>
                <p>
                  Winner:{" "}
                  <strong>
                    {selectedConstituency.winning_party?.party_name ?? "No winner yet"}{" "}
                    {selectedConstituency.winning_party && `(${selectedConstituency.winning_party.party_code})`}
                  </strong>
                </p>
                <p className="muted">Total votes: {formatNumber(selectedConstituency.total_votes)}</p>

                <div className="constituency-chart-layout">
                  <PartyDonutChart
                    parties={selectedConstituency.parties}
                    totalVotes={selectedConstituency.total_votes}
                  />

                  <div className="stack">
                    {selectedConstituency.parties.map((party) => (
                      <div key={party.party_code} className="legend-row">
                        <span className="party-swatch" style={{ backgroundColor: partyColor(party.party_code) }} />
                        <span className="legend-label">
                          {party.party_name} ({party.party_code})
                        </span>
                        <span className="legend-value">
                          {formatNumber(party.votes)} votes ({party.percentage.toFixed(2)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
