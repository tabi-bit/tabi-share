"""
Add Trip, Page, and Block models with relationships.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db_connection import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    url_id: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique identifier for the trip in the URL",
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Title of the trip"
    )
    detail: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Detailed description of the trip"
    )
    # Relationships
    pages: Mapped[list["Page"]] = relationship(
        "Page",
        back_populates="trip",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    trip_id: Mapped[int] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the associated trip",
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Title of the page"
    )
    # Relationships
    trip: Mapped["Trip"] = relationship(
        "Trip",
        back_populates="pages",
    )
    blocks: Mapped[list["Block"]] = relationship(
        "Block",
        back_populates="page",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="Title of the block"
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, comment="Start time of the block(UTC)"
    )
    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="End time of the block(UTC)"
    )
    page_id: Mapped[int] = mapped_column(
        ForeignKey("pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to the associated page",
    )
    detail: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Detailed description of the block"
    )
    block_type: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="Type of the block defined in app as enum"
    )
    transportation_type: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="Type of transportation"
    )
    # Relationships
    page: Mapped["Page"] = relationship(
        "Page",
        back_populates="blocks",
    )
