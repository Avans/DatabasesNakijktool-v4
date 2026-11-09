// Messages between the component (main thread) and the engine (web worker).
import type { QueryResult, Verdict } from './engine/grader.ts';

export interface AssignmentInfo {
  id: number;
  schema: string;
  metaTag: string;
  title: string;
  description: string;
  /** Rules that apply on top of the result (shown to the student up front). */
  requirements: string[];
}

export interface TableInfo { name: string; columns: { name: string; type: string; pk: boolean }[] }

export type Request =
  | { type: 'init'; base: string }
  | { type: 'assignment'; aid: number }
  | { type: 'grade'; aid: number; query: string }
  | { type: 'expected'; aid: number }
  | { type: 'schema'; aid: number };

export interface ResponseMap {
  init: true;
  assignment: AssignmentInfo | null;
  grade: Verdict;
  expected: QueryResult;
  schema: TableInfo[];
}

export type Envelope = { id: number } & Request;
export type Reply = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: string };
