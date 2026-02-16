from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Constituency, Party, Result
from app.services.file_processor import process_file

router = APIRouter()


def _build_constituency_payload(
    constituency_name: str,
    party_rows: list[tuple[str, str, int]],
) -> dict[str, Any]:
    ordered = sorted(party_rows, key=lambda row: (-row[2], row[0]))
    total_votes = sum(votes for _, _, votes in ordered)

    parties = []
    for code, full_name, votes in ordered:
        percentage = 0.0 if total_votes == 0 else round((votes / total_votes) * 100, 2)
        parties.append(
            {
                "party_code": code,
                "party_name": full_name,
                "votes": votes,
                "percentage": percentage,
            }
        )

    winning_party = None
    if parties:
        leader = parties[0]
        winning_party = {
            "party_code": leader["party_code"],
            "party_name": leader["party_name"],
            "votes": leader["votes"],
        }

    return {
        "name": constituency_name,
        "total_votes": total_votes,
        "winning_party": winning_party,
        "parties": parties,
    }


@router.post("/import")
async def import_results(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    payload = await file.read()
    if payload is None:
        raise HTTPException(status_code=400, detail="No file payload received")

    try:
        text_payload = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded") from exc

    if text_payload.strip() == "":
        return {
            "message": "Import completed. File contained no data lines.",
            "total_lines": 0,
            "processed_lines": 0,
            "skipped_lines": 0,
            "upserted_results": 0,
            "errors": [],
        }

    summary = process_file(file_content=text_payload, db=db)

    return {
        "message": "Import completed",
        **summary,
    }


@router.get("/constituencies")
def get_constituencies(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    constituency_names = [name for (name,) in db.query(Constituency.name).order_by(Constituency.name.asc()).all()]

    rows = (
        db.query(Constituency.name, Party.code, Party.full_name, Result.votes)
        .join(Result, Result.constituency_id == Constituency.id)
        .join(Party, Party.id == Result.party_id)
        .all()
    )

    grouped_results: dict[str, list[tuple[str, str, int]]] = defaultdict(list)
    for constituency_name, code, full_name, votes in rows:
        grouped_results[constituency_name].append((code, full_name, votes))

    return [
        _build_constituency_payload(constituency_name=name, party_rows=grouped_results.get(name, []))
        for name in constituency_names
    ]


@router.get("/constituencies/{name}")
def get_constituency_by_name(name: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    constituency = db.query(Constituency).filter(Constituency.name == name).first()
    if constituency is None:
        raise HTTPException(status_code=404, detail=f"Constituency '{name}' not found")

    rows = (
        db.query(Party.code, Party.full_name, Result.votes)
        .join(Result, Result.party_id == Party.id)
        .filter(Result.constituency_id == constituency.id)
        .all()
    )

    return _build_constituency_payload(
        constituency_name=constituency.name,
        party_rows=[(code, full_name, votes) for code, full_name, votes in rows],
    )


@router.get("/totals")
def get_totals(db: Session = Depends(get_db)) -> dict[str, Any]:
    parties = db.query(Party.code, Party.full_name).order_by(Party.code.asc()).all()

    vote_rows = (
        db.query(Party.code, func.coalesce(func.sum(Result.votes), 0))
        .outerjoin(Result, Result.party_id == Party.id)
        .group_by(Party.id, Party.code)
        .all()
    )
    votes_by_code = {code: int(total_votes) for code, total_votes in vote_rows}

    constituency_rows = (
        db.query(Result.constituency_id, Party.code, Result.votes)
        .join(Party, Party.id == Result.party_id)
        .all()
    )

    winners_by_constituency: dict[int, tuple[str, int]] = {}
    for constituency_id, code, votes in constituency_rows:
        existing = winners_by_constituency.get(constituency_id)
        if existing is None or votes > existing[1] or (votes == existing[1] and code < existing[0]):
            winners_by_constituency[constituency_id] = (code, votes)

    seats_by_code: dict[str, int] = defaultdict(int)
    for winning_code, _ in winners_by_constituency.values():
        seats_by_code[winning_code] += 1

    total_votes_per_party = []
    total_mps_per_party = []
    for code, full_name in parties:
        total_votes_per_party.append(
            {
                "party_code": code,
                "party_name": full_name,
                "votes": votes_by_code.get(code, 0),
            }
        )
        total_mps_per_party.append(
            {
                "party_code": code,
                "party_name": full_name,
                "seats": seats_by_code.get(code, 0),
            }
        )

    return {
        "total_votes_per_party": sorted(total_votes_per_party, key=lambda row: (-row["votes"], row["party_code"])),
        "total_mps_per_party": sorted(total_mps_per_party, key=lambda row: (-row["seats"], row["party_code"])),
        "overall": {
            "total_votes": sum(votes_by_code.values()),
            "total_constituencies": len(winners_by_constituency),
        },
    }
