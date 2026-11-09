// One engine per page, shared by every <wd-datab1> on it. Runs in a web worker so that a
// query that never ends can be stopped; falls back to the main thread when the host page
// doesn't allow workers.
import EngineWorker from './worker.ts?worker&inline';
import type { Envelope, Reply, Request, ResponseMap } from './protocol.ts';

export const QUERY_TIMEOUT_MS = 5000;

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer?: ReturnType<typeof setTimeout> };

export class EngineClient {
  private worker: Worker | null = null;
  private fallback: Promise<import('./engine/engine.ts').Engine> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  private base: string;

  constructor(base: string) {
    this.base = base;
  }

  private spawn(): Worker | null {
    if (this.worker) return this.worker;
    if (this.fallback) return null;
    try {
      const w = new EngineWorker();
      w.onmessage = (e: MessageEvent<Reply>) => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        clearTimeout(p.timer);
        if (e.data.ok) p.resolve(e.data.value);
        else p.reject(new Error(e.data.error));
      };
      w.onerror = () => this.useFallback();
      w.postMessage({ id: 0, type: 'init', base: this.base } satisfies Envelope);
      this.worker = w;
      return w;
    } catch {
      this.useFallback();
      return null;
    }
  }

  private useFallback() {
    this.worker?.terminate();
    this.worker = null;
    this.fallback ??= import('./engine/engine.ts').then(m => new m.Engine(this.base));
    // re-send what was waiting on the worker
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const p of waiting) p.reject(new Error('retry'));
  }

  async request<R extends Request>(req: R, timeout = 0): Promise<ResponseMap[R['type']]> {
    const w = this.spawn();
    if (!w) {
      const engine = await this.fallback!;
      return engine.handle(req);
    }
    const id = this.nextId++;
    try {
      return await new Promise<ResponseMap[R['type']]>((resolve, reject) => {
        const p: Pending = { resolve: resolve as (v: unknown) => void, reject };
        if (timeout) {
          p.timer = setTimeout(() => {
            // kill the stuck query; a new worker starts on the next request
            this.pending.delete(id);
            w.terminate();
            if (this.worker === w) this.worker = null;
            for (const other of this.pending.values()) other.reject(new Error('retry'));
            this.pending.clear();
            reject(new Error(`De query duurde langer dan ${timeout / 1000} seconden en is afgebroken.`));
          }, timeout);
        }
        this.pending.set(id, p);
        w.postMessage({ id, ...req } satisfies Envelope);
      });
    } catch (e) {
      if ((e as Error).message === 'retry') return this.request(req, timeout);
      throw e;
    }
  }
}
