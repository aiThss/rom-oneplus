export function getDb() {
  throw new Error(
    'Drizzle D1 is disabled in Node environment. Use lib/store.ts instead.',
  );
}
