import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
});

export const audiences = pgTable("audiences", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
});

export const funnelPhases = pgTable(
  "funnel_phases",
  {
    id: text("id").primaryKey(),
    audienceId: text("audience_id")
      .notNull()
      .references(() => audiences.id),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    goal: text("goal").notNull().default(""),
    channels: text("channels").notNull().default(""),
    message: text("message").notNull().default(""),
  },
  (table) => [unique("funnel_phases_audience_order").on(table.audienceId, table.sortOrder)],
);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  kind: text("kind").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  audienceId: text("audience_id").references(() => audiences.id),
  phaseId: text("phase_id").references(() => funnelPhases.id),
  weekStart: text("week_start"),
  status: text("status").notNull().default("todo"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
