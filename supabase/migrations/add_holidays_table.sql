-- Migration: Add Holidays Table

CREATE TABLE holidays (
    date DATE PRIMARY KEY,
    description TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for holidays by date is already covered by PRIMARY KEY
