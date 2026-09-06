// ─── Lecture Slots — Single source of truth ────────────────────────────────
// Lunch (11:45 AM – 12:45 PM) is intentionally excluded — no attendance taken.

export interface LectureSlot {
  id: 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  label: string;
  time: string;
}

export const LECTURE_SLOTS: LectureSlot[] = [
  { id: 'L1', label: 'Lecture 1', time: '8:45 – 9:45 AM' },
  { id: 'L2', label: 'Lecture 2', time: '9:45 – 10:45 AM' },
  { id: 'L3', label: 'Lecture 3', time: '10:45 – 11:45 AM' },
  { id: 'L4', label: 'Lecture 4', time: '12:45 – 1:45 PM' },
  { id: 'L5', label: 'Lecture 5', time: '1:45 – 2:45 PM' },
  { id: 'L6', label: 'Lecture 6', time: '2:45 – 3:45 PM' },
];

export const VALID_PERIOD_IDS = LECTURE_SLOTS.map(s => s.id);

export function getLectureSlot(id: string): LectureSlot | undefined {
  return LECTURE_SLOTS.find(s => s.id === id);
}
