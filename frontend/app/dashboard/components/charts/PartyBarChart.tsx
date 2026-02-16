import { scaleBand, scaleLinear } from "d3-scale";

import { formatNumber, partyColor } from "../../utils";

export interface PartyBarDatum {
  partyCode: string;
  partyName: string;
  value: number;
}

interface PartyBarChartProps {
  data: PartyBarDatum[];
  ariaLabel: string;
  yAxisLabel: string;
  formatValue?: (value: number) => string;
  yTickFormat?: (value: number) => string;
}

export default function PartyBarChart({
  data,
  ariaLabel,
  formatValue = formatNumber,
  yTickFormat = (value) =>
    Intl.NumberFormat("en-GB", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value),
}: PartyBarChartProps) {
  const margin = { top: 14, right: 16, bottom: 48, left: 48 };
  const innerWidth = Math.max(320, data.length * 68);
  const width = margin.left + innerWidth + margin.right;
  const height = 260;

  const xScale = scaleBand<string>()
    .domain(data.map((entry) => entry.partyCode))
    .range([margin.left, width - margin.right])
    .padding(0.24);

  const maxValue = Math.max(...data.map((entry) => entry.value), 1);
  const yScale = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const yTicks = yScale.ticks(4);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="d3-chart-svg" role="img" aria-label={ariaLabel}>
     

      {yTicks.map((tick) => (
        <g key={`tick-${tick}`} transform={`translate(0, ${yScale(tick)})`}>
          <line x1={margin.left} x2={width - margin.right} y1={0} y2={0} className="chart-grid-line" />
          <text x={margin.left - 8} y={4} textAnchor="end" className="chart-tick-label">
            {yTickFormat(tick)}
          </text>
        </g>
      ))}

      {data.map((entry) => {
        const barX = xScale(entry.partyCode);
        if (barX === undefined) {
          return null;
        }

        const barY = yScale(entry.value);
        const barHeight = yScale(0) - barY;
        const barWidth = xScale.bandwidth();

        return (
          <g key={entry.partyCode}>
            <rect
              x={barX}
              y={barY}
              width={barWidth}
              height={Math.max(barHeight, 0)}
              rx={6}
              fill={partyColor(entry.partyCode)}
            >
              <title>
                {entry.partyName} ({entry.partyCode}): {formatValue(entry.value)}
              </title>
            </rect>

            <text x={barX + barWidth / 2} y={height - margin.bottom + 16} textAnchor="middle" className="chart-tick-label">
              {entry.partyCode}
            </text>
            <text x={barX + barWidth / 2} y={barY - 6} textAnchor="middle" className="chart-value-label">
              {formatValue(entry.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
