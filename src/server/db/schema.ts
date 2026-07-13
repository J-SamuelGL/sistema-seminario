import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const roleEnum = pgEnum('role', ['participant', 'admin'])
export const categoryEnum = pgEnum('category', ['senior', 'junior'])
export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'accepted',
  'wrong_answer',
  'runtime_error',
  'timeout',
])

// Better Auth core tables
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  role: roleEnum('role').notNull().default('participant'),
  category: categoryEnum('category'),
  checkinToken: text('checkin_token').default(sql`gen_random_uuid()::text`).notNull().unique(),
  checkedInAt: timestamp('checked_in_at'),
  aiQuestionsUsed: integer('ai_questions_used').notNull().default(0),
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  idToken: text('id_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Domain tables
export const problems = pgTable('problems', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  difficulty: text('difficulty').notNull(),
  allowedLanguages: text('allowed_languages').array().notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const testCases = pgTable('test_cases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  problemId: text('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  input: text('input').notNull(),
  expectedOutput: text('expected_output').notNull(),
})

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  problemId: text('problem_id')
    .notNull()
    .references(() => problems.id),
  code: text('code').notNull(),
  language: text('language').notNull(),
  status: submissionStatusEnum('status').notNull().default('pending'),
  claudeFeedback: text('claude_feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const aiQuestions = pgTable('ai_questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  problemId: text('problem_id').references(() => problems.id),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const tournamentState = pgTable('tournament_state', {
  id: integer('id').primaryKey().default(1),
  startedAt: timestamp('started_at'),
})
