import { arc, pie, PieArcDatum } from "d3-shape";

import { PartyResult } from "@/lib/types";

import { formatNumber, partyColor } from "../../utils";

interface PartyDonutChartProps {
  parties: PartyResult[];
  totalVotes: number;
}

export default function PartyDonutChart({ parties, totalVotes }: PartyDonutChartProps) {
  const size = 280;
  const center = size / 2;
  const outerRadius = size * 0.42;
  const innerRadius = size * 0.25;
  const series = parties.filter((party) => party.votes > 0);
  const hasData = series.length > 0 && totalVotes > 0;

  const pieBuilder = pie<PartyResult>().value((party) => party.votes).sort(null);
  const slices = hasData ? pieBuilder(series) : [];
  const arcBuilder = arc<PieArcDatum<PartyResult>>().innerRadius(innerRadius).outerRadius(outerRadius);

  return (
    <figure className="donut-chart-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="d3-chart-svg donut-svg" role="img" aria-label="Constituency vote share chart">
        <g transform={`translate(${center}, ${center})`}>
          {hasData ? (
            slices.map((slice) => {
              const path = arcBuilder(slice);
              if (!path) {
                return null;
              }

              return (
                <path key={slice.data.party_code} d={path} fill={partyColor(slice.data.party_code)} stroke="#ffffff" strokeWidth={2}>
                  <title>
                    {slice.data.party_name} ({slice.data.party_code}): {formatNumber(slice.data.votes)} votes (
                    {slice.data.percentage.toFixed(2)}%)
                  </title>
                </path>
              );
            })
          ) : (
            <circle r={outerRadius} fill="#d9e1ea" />
          )}
        </g>

        <circle cx={center} cy={center} r={innerRadius - 1} fill="rgba(255, 255, 255, 0.95)" />
        <text x={center} y={center - 2} textAnchor="middle" className="donut-center-title">
          Total
        </text>
        <text x={center} y={center + 20} textAnchor="middle" className="donut-center-value">
          {formatNumber(totalVotes)}
        </text>
      </svg>
    </figure>
  );
}
