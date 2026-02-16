import { PARTY_COLORS } from "./constants";

export function formatNumber(value: number): string {
  return Intl.NumberFormat("en-GB").format(value);
}

export function partyColor(code: string): string {
  return PARTY_COLORS[code] ?? "#718096";
}

export function normalizeConstituencyName(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, "");
}
