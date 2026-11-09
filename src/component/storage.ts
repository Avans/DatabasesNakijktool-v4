// The student's last submission per assignment, in this browser only (replaces the
// server-side `submissions` table of v2). Every access is guarded: localStorage can be
// unavailable (private mode, blocked cookies).
import { Status } from '../engine/grader.ts';

export interface StoredSubmission {
  query: string;
  status: Status;
  message: string;
  timestamp: string;
  /** Set once the assignment was approved at least once; never lost by a later attempt. */
  approvedAt?: string;
}

const key = (aid: number) => `wd-datab1:v4:${aid}`;

export function loadSubmission(aid: number): StoredSubmission | null {
  try {
    const raw = localStorage.getItem(key(aid));
    return raw ? (JSON.parse(raw) as StoredSubmission) : null;
  } catch {
    return null;
  }
}

export function saveSubmission(aid: number, s: StoredSubmission, previous: StoredSubmission | null): void {
  const approved = s.status === Status.Approved ? (previous?.approvedAt ?? s.timestamp) : previous?.approvedAt;
  try {
    localStorage.setItem(key(aid), JSON.stringify({ ...s, approvedAt: approved }));
  } catch {
    /* not persisted; the result is still shown */
  }
}

/** Every stored assignment id with whether it was ever approved (for the overview page). */
export function allProgress(): Map<number, boolean> {
  const out = new Map<number, boolean>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && /^wd-datab1:v4:(\d+)$/.exec(k);
      if (!m) continue;
      const s = JSON.parse(localStorage.getItem(k!) ?? 'null') as StoredSubmission | null;
      if (s) out.set(Number(m[1]), !!s.approvedAt || s.status === Status.Approved);
    }
  } catch { /* ignore */ }
  return out;
}
