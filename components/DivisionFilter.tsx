'use client';

import { useState, useEffect } from 'react';

interface Division {
  id: number;
  name: string;
}

interface DivisionFilterProps {
  value: string;
  onChange: (val: string) => void;
}

export default function DivisionFilter({ value, onChange }: DivisionFilterProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);

  useEffect(() => {
    fetch('/api/divisions')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setDivisions(d);
      })
      .catch(() => {});
  }, []);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Filter by division"
      style={{
        width: '100%',
        padding: '10px 14px',
        fontSize: 14,
        border: '1px solid #D1D5DB',
        borderRadius: 8,
        background: '#FFF',
        color: '#111827',
        cursor: 'pointer',
      }}
    >
      <option value="">Select Division</option>
      {divisions.map(d => (
        <option key={d.id} value={String(d.id)}>{d.name}</option>
      ))}
    </select>
  );
}
