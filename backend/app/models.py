from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from .database import Base


class Constituency(Base):
    __tablename__ = "constituencies"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    results = relationship("Result", back_populates="constituency", cascade="all, delete-orphan")


class Party(Base):
    __tablename__ = "parties"

    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True, nullable=False)
    full_name = Column(String, nullable=False)

    results = relationship("Result", back_populates="party")


class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True)
    constituency_id = Column(Integer, ForeignKey("constituencies.id"), nullable=False)
    party_id = Column(Integer, ForeignKey("parties.id"), nullable=False)
    votes = Column(Integer, nullable=False)
    last_updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    constituency = relationship("Constituency", back_populates="results")
    party = relationship("Party", back_populates="results")

    __table_args__ = (
        UniqueConstraint("constituency_id", "party_id", name="unique_constituency_party"),
    )
