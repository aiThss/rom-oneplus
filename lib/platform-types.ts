export type SqlValue = string | number | null;
export interface Query {
  bind(...values: SqlValue[]): Query;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Platform {
  db: { prepare(sql: string): Query };
  files: {
    get(key: string): Promise<{ body: BodyInit; httpMetadata?: { contentType?: string } } | null>;
    put(key: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  };
  publicOrigin?: string;
}
