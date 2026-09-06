import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const cache = sqliteTable('source_cache', {
  key: text('key').primaryKey(),
  body: text('body').notNull(),
  sourceUrl: text('source_url').notNull(),
  updatedAt: integer('updated_at').notNull(),
  attemptedAt: integer('attempted_at').notNull(),
  error: text('error'),
});
export const documents = sqliteTable('documents', {
  key: text('key').primaryKey(),
  body: text('body').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
export const admin = sqliteTable('admin', {
  id: integer('id').primaryKey(),
  username: text('username').notNull(),
  salt: text('salt').notNull(),
  hash: text('hash').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  expires: integer('expires').notNull(),
});
export const throttle = sqliteTable('login_throttle', {
  id: integer('id').primaryKey(),
  attempts: integer('attempts').notNull(),
  until: integer('until').notNull(),
});
