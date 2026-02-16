import csv
from typing import Any

from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ..constants import PARTY_CODE_TO_NAME
from ..models import Constituency, Party, Result

IMPORT_LOCK_ID = 205241
MAX_ERROR_DETAILS = 100


def _normalize_party_code(raw_code: str) -> str | None:
    candidate = raw_code.strip()
    if candidate in PARTY_CODE_TO_NAME:
        return candidate

    lowered = candidate.lower()
    for known_code in PARTY_CODE_TO_NAME:
        if known_code.lower() == lowered:
            return known_code

    return None


def _parse_votes(raw_votes: str) -> int | None:
    value = raw_votes.strip()
    if value == "":
        return None

    try:
        parsed = int(value)
    except ValueError:
        return None

    if parsed < 0:
        return None

    return parsed


def _parse_pair(first: str, second: str) -> tuple[str, int] | None:
    first_party = _normalize_party_code(first)
    second_party = _normalize_party_code(second)

    first_votes = _parse_votes(first)
    second_votes = _parse_votes(second)

    if first_party is not None and second_votes is not None:
        return first_party, second_votes

    if second_party is not None and first_votes is not None:
        return second_party, first_votes

    return None


def _parse_line(raw_line: str) -> list[str]:
    reader = csv.reader([raw_line], delimiter=",", escapechar="\\", skipinitialspace=True)
    return [token.strip() for token in next(reader)]


def _append_error(summary: dict[str, Any], line_number: int, line: str, message: str) -> None:
    if len(summary["errors"]) >= MAX_ERROR_DETAILS:
        return

    summary["errors"].append(
        {
            "line_number": line_number,
            "line": line,
            "message": message,
        }
    )


def process_file(file_content: str, db: Session) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "total_lines": 0,
        "processed_lines": 0,
        "skipped_lines": 0,
        "upserted_results": 0,
        "errors": [],
    }

    with db.begin():
        # Transaction-scoped lock to serialize concurrent imports.
        db.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": IMPORT_LOCK_ID})

        parties = db.query(Party.id, Party.code).all()
        party_id_by_code = {party.code: party.id for party in parties}

        constituency_rows = db.query(Constituency.id, Constituency.name).all()
        constituency_id_by_name = {row.name: row.id for row in constituency_rows}

        for line_number, raw_line in enumerate(file_content.splitlines(), start=1):
            summary["total_lines"] += 1

            if raw_line.strip() == "":
                summary["skipped_lines"] += 1
                _append_error(summary, line_number, raw_line, "Empty line")
                continue

            try:
                tokens = _parse_line(raw_line)
            except csv.Error:
                summary["skipped_lines"] += 1
                _append_error(summary, line_number, raw_line, "Could not parse CSV line")
                continue

            if len(tokens) < 3:
                summary["skipped_lines"] += 1
                _append_error(summary, line_number, raw_line, "Expected constituency and at least one party/vote pair")
                continue

            constituency_name = tokens[0].strip()
            if constituency_name == "":
                summary["skipped_lines"] += 1
                _append_error(summary, line_number, raw_line, "Missing constituency name")
                continue

            payload_tokens = tokens[1:]
            if len(payload_tokens) % 2 != 0:
                _append_error(summary, line_number, raw_line, "Trailing token without a matching pair; ignored")

            party_votes: dict[str, int] = {}
            for i in range(0, len(payload_tokens) - 1, 2):
                first = payload_tokens[i]
                second = payload_tokens[i + 1]

                parsed_pair = _parse_pair(first, second)
                if parsed_pair is None:
                    _append_error(
                        summary,
                        line_number,
                        raw_line,
                        f"Invalid party/vote pair '{first}' + '{second}'",
                    )
                    continue

                party_code, votes = parsed_pair
                party_votes[party_code] = votes

            if not party_votes:
                summary["skipped_lines"] += 1
                _append_error(summary, line_number, raw_line, "No valid party/vote pairs found")
                continue

            constituency_id = constituency_id_by_name.get(constituency_name)
            if constituency_id is None:
                constituency = Constituency(name=constituency_name)
                db.add(constituency)
                db.flush()
                constituency_id = constituency.id
                constituency_id_by_name[constituency_name] = constituency_id

            for party_code, votes in party_votes.items():
                party_id = party_id_by_code[party_code]

                insert_stmt = insert(Result).values(
                    constituency_id=constituency_id,
                    party_id=party_id,
                    votes=votes,
                    last_updated=func.now(),
                )

                upsert_stmt = insert_stmt.on_conflict_do_update(
                    index_elements=["constituency_id", "party_id"],
                    set_={
                        "votes": insert_stmt.excluded.votes,
                        "last_updated": func.now(),
                    },
                )

                db.execute(upsert_stmt)
                summary["upserted_results"] += 1

            summary["processed_lines"] += 1

    return summary
