from sqlalchemy.orm import Session

from ..constants import PARTY_CODE_TO_NAME
from ..models import Party


def seed_parties(db: Session) -> None:
    for code, full_name in PARTY_CODE_TO_NAME.items():
        party = db.query(Party).filter_by(code=code).first()
        if party is None:
            db.add(Party(code=code, full_name=full_name))
            continue

        if party.full_name != full_name:
            party.full_name = full_name

    db.commit()
