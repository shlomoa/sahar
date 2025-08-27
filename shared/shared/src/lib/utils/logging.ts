// Shared structured logging utility
// Schema: { ts, level, event, msg?, meta? }

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogRecord {
  ts: string;
  level: LogLevel;
  event: string;
  msg?: string;
  meta?: any; // JSON-serializable; caller responsible for pruning circular refs
}

export interface LoggerOptions {
  onRecord?: (rec: LogRecord) => void; // optional callback (e.g., buffering in stubs)
  now?: () => Date;                    // testability hook
}

export interface Logger {
  log: (level: LogLevel, event: string, meta?: any, msg?: string) => void;
  info: (event: string, meta?: any, msg?: string) => void;
  warn: (event: string, meta?: any, msg?: string) => void;
  error: (event: string, meta?: any, msg?: string) => void;
}

export function createLogger(baseMeta: Record<string, any> = {}, options: LoggerOptions = {}): Logger {
  const now = options.now || (() => new Date());
  function core(level: LogLevel, event: string, meta?: any, msg?: string) {
    const rec: LogRecord = { ts: now().toISOString(), level, event };
    const merged = { ...baseMeta, ...(meta || {}) };
    if (msg) rec.msg = msg;
    if (merged && Object.keys(merged).length) rec.meta = merged;
    try {
      console.log(JSON.stringify(rec));
    } catch (e) {
      console.log(JSON.stringify({ ts: rec.ts, level, event, msg: 'logging_failure', error: (e as Error).message }));
    }
    if (options.onRecord) {
      try { options.onRecord(rec); } catch {/* ignore callback errors */}
    }
  }
  return {
    log: core,
    info: (e, m, msg) => core('info', e, m, msg),
    warn: (e, m, msg) => core('warn', e, m, msg),
    error: (e, m, msg) => core('error', e, m, msg),
  };
}
