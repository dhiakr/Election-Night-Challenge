export interface PartyResult {
  party_code: string;
  party_name: string;
  votes: number;
  percentage: number;
}

export interface WinningParty {
  party_code: string;
  party_name: string;
  votes: number;
}

export interface ConstituencyResult {
  name: string;
  total_votes: number;
  winning_party: WinningParty | null;
  parties: PartyResult[];
}

export interface TotalsEntryVotes {
  party_code: string;
  party_name: string;
  votes: number;
}

export interface TotalsEntrySeats {
  party_code: string;
  party_name: string;
  seats: number;
}

export interface TotalsResponse {
  total_votes_per_party: TotalsEntryVotes[];
  total_mps_per_party: TotalsEntrySeats[];
  overall: {
    total_votes: number;
    total_constituencies: number;
  };
}

export interface ImportResponse {
  message: string;
  total_lines: number;
  processed_lines: number;
  skipped_lines: number;
  upserted_results: number;
  errors: Array<{
    line_number: number;
    line: string;
    message: string;
  }>;
}
