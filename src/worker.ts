// Web worker: keeps SQLite off the main thread so a runaway query can be killed.
import { Engine } from './engine/engine.ts';
import type { Envelope, Reply } from './protocol.ts';

let engine: Engine | null = null;

self.onmessage = async (e: MessageEvent<Envelope>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') engine = new Engine(msg.base);
    if (!engine) throw new Error('Engine not initialised');
    const value = await engine.handle(msg);
    (self as unknown as Worker).postMessage({ id: msg.id, ok: true, value } satisfies Reply);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: msg.id, ok: false, error: (err as Error).message } satisfies Reply);
  }
};
