"use client";

import { useEffect, useMemo, useState } from "react";

import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature as topojsonFeature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

import { ConstituencyResult } from "@/lib/types";

import { PARTY_COLORS, PARTY_LABELS } from "../../constants";
import { formatNumber, normalizeConstituencyName, partyColor } from "../../utils";

interface WpcProperties {
  PCON13NM?: string;
}

type WpcFeature = Feature<Geometry, WpcProperties>;
type EnglandTopology = Topology<{ wpc: GeometryCollection }>;

interface PopupState {
  constituencyNameOnMap: string;
  result: ConstituencyResult | null;
  xPct: number;
  yPct: number;
}

interface EnglandConstituencyMapProps {
  constituencies: ConstituencyResult[];
  selectedName: string;
  onSelect: (name: string) => void;
}

const SVG_WIDTH = 780;
const SVG_HEIGHT = 920;

export default function EnglandConstituencyMap({
  constituencies,
  selectedName,
  onSelect,
}: EnglandConstituencyMapProps) {
  const [features, setFeatures] = useState<WpcFeature[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMap = async () => {
      try {
        const response = await fetch("/data/england-wpc.topojson");
        if (!response.ok) {
          throw new Error("Map download failed");
        }

        const topology = (await response.json()) as EnglandTopology;
        const mapData = topojsonFeature(topology, topology.objects.wpc) as FeatureCollection<Geometry, WpcProperties>;
        if (cancelled) {
          return;
        }

        setFeatures(mapData.features as WpcFeature[]);
        setMapError(null);
      } catch {
        if (cancelled) {
          return;
        }

        setMapError("Could not load England constituency map");
      }
    };

    loadMap();
    return () => {
      cancelled = true;
    };
  }, []);

  const constituencyByNormalizedName = useMemo(() => {
    const output = new Map<string, ConstituencyResult>();
    for (const constituency of constituencies) {
      output.set(normalizeConstituencyName(constituency.name), constituency);
    }
    return output;
  }, [constituencies]);

  const featureCollection = useMemo<FeatureCollection<Geometry, WpcProperties>>(
    () => ({
      type: "FeatureCollection",
      features,
    }),
    [features]
  );

  const pathGenerator = useMemo(() => {
    const projection = geoMercator();
    if (features.length > 0) {
      projection.fitSize([SVG_WIDTH, SVG_HEIGHT], featureCollection);
    }
    return geoPath(projection);
  }, [featureCollection, features.length]);

  const regions = useMemo(() => {
    return features.map((feature) => {
      const constituencyNameOnMap = feature.properties?.PCON13NM ?? "Unknown Constituency";
      const normalized = normalizeConstituencyName(constituencyNameOnMap);
      const result = constituencyByNormalizedName.get(normalized) ?? null;
      const winnerCode = result?.winning_party?.party_code ?? "";
      const path = pathGenerator(feature);
      const [cx, cy] = pathGenerator.centroid(feature);
      const xPct = Number.isFinite(cx) ? Math.min(96, Math.max(4, (cx / SVG_WIDTH) * 100)) : 50;
      const yPct = Number.isFinite(cy) ? Math.min(95, Math.max(6, (cy / SVG_HEIGHT) * 100)) : 50;

      return {
        constituencyNameOnMap,
        result,
        winnerCode,
        path,
        xPct,
        yPct,
      };
    });
  }, [constituencyByNormalizedName, features, pathGenerator]);

  const coverageCount = useMemo(() => regions.filter((region) => region.result !== null).length, [regions]);

  const handleRegionClick = (region: (typeof regions)[number]) => {
    setPopup({
      constituencyNameOnMap: region.constituencyNameOnMap,
      result: region.result,
      xPct: region.xPct,
      yPct: region.yPct,
    });

    if (region.result) {
      onSelect(region.result.name);
    }
  };

  return (
    <div className="england-map">
      <div className="map-legend-row">
        {Object.entries(PARTY_COLORS).map(([partyCode, color]) => (
          <span key={partyCode} className="legend-chip">
            <span className="party-swatch" style={{ backgroundColor: color }} />
            <span>
              {partyCode}: {PARTY_LABELS[partyCode]}
            </span>
          </span>
        ))}
        <span className="legend-chip">
          <span className="party-swatch" style={{ backgroundColor: "#d9e1ea" }} />
          <span>No data mapped</span>
        </span>
      </div>

      <p className="muted">
        Click any constituency area to open results. Map matches imported names against England constituency
        boundaries.
      </p>

      <div className="england-map-stage" onClick={() => setPopup(null)}>
        {mapError ? (
          <p className="error-text">{mapError}</p>
        ) : regions.length === 0 ? (
          <p className="muted">Loading England map...</p>
        ) : (
          <>
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="england-map-svg" role="img" aria-label="England constituency map">
              {regions.map((region) => {
                if (!region.path) {
                  return null;
                }

                const selected = region.result?.name === selectedName;
                const fillColor = region.winnerCode ? partyColor(region.winnerCode) : "#d9e1ea";

                return (
                  <path
                    key={region.constituencyNameOnMap}
                    d={region.path}
                    className={selected ? "england-region selected" : "england-region"}
                    fill={fillColor}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRegionClick(region);
                    }}
                  >
                    <title>
                      {region.result
                        ? `${region.result.name}: ${region.result.winning_party?.party_name ?? "No winner"}`
                        : `${region.constituencyNameOnMap}: no imported data`}
                    </title>
                  </path>
                );
              })}
            </svg>

            <p className="map-coverage-text">
              Coverage: {coverageCount} of {regions.length} map areas currently matched to imported constituencies.
            </p>

            {popup && (
              <aside
                className="map-popup"
                style={{ left: `${popup.xPct}%`, top: `${popup.yPct}%` }}
                onClick={(event) => event.stopPropagation()}
              >
                <button className="map-popup-close" onClick={() => setPopup(null)} aria-label="Close popup">
                  x
                </button>

                <h4>{popup.result?.name ?? popup.constituencyNameOnMap}</h4>

                {popup.result ? (
                  <>
                    <p>
                      <strong>Winner:</strong> {popup.result.winning_party?.party_name ?? "No winner yet"}{" "}
                      {popup.result.winning_party && `(${popup.result.winning_party.party_code})`}
                    </p>
                    <p>
                      <strong>Total votes:</strong> {formatNumber(popup.result.total_votes)}
                    </p>

                    <div className="stack compact-stack">
                      {popup.result.parties.slice(0, 5).map((party) => (
                        <div key={party.party_code} className="legend-row">
                          <span className="party-swatch" style={{ backgroundColor: partyColor(party.party_code) }} />
                          <span className="legend-label">
                            {party.party_code} {party.party_name}
                          </span>
                          <span className="legend-value">{party.percentage.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="muted">No imported data currently matches this boundary name.</p>
                )}
              </aside>
            )}
          </>
        )}
      </div>
    </div>
  );
}
