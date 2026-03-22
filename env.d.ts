// Type declarations for Cloudflare D1 and next-on-pages

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    last_row_id: number;
    changes: number;
    served_by: string;
    internal_stats: null;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

interface CloudflareEnv {
  DB: D1Database;
  REMOVE_BG_API_KEY: string;
}
