import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  time,
  pgEnum,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- ENUMS ----------

export const roleEnum = pgEnum("role", ["PLAYER", "ADMIN"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);
export const playerStatusEnum = pgEnum("player_status", ["ACTIVE", "INACTIVE"]);
export const matchStatusEnum = pgEnum("match_status", [
  "UPCOMING",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
]);
export const priorityEnum = pgEnum("priority", ["NORMAL", "IMPORTANT", "URGENT"]);
export const newsCategoryEnum = pgEnum("news_category", [
  "TOURNAMENT",
  "ACHIEVEMENT",
  "PLAYER",
  "ASSOCIATION",
  "ANNOUNCEMENT",
  "GENERAL",
]);
export const achievementTypeEnum = pgEnum("achievement_type", [
  "STATE",
  "NATIONAL",
  "INTERNATIONAL",
  "ASSOCIATION",
]);

export const categoryEnum = pgEnum("category", [
  "UNDER_8",
  "UNDER_10",
  "UNDER_12",
  "UNDER_14",
  "UNDER_17",
  "UNDER_19",
  "ABOVE_19",
]);

export const disciplineEnum = pgEnum("discipline", [
  "AEROSKATOBALL",
  "SPEED",
  "ZIG_ZAG",
  "HUDDLES",
  "SKATE_WALK",
]);

export const registrationStatusEnum = pgEnum("registration_status", ["PENDING", "VERIFIED", "REJECTED"]);

// ---------- USERS ----------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("PLAYER"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- PLAYERS ----------

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  playerId: varchar("player_id", { length: 50 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  dateOfBirth: date("date_of_birth"),
  gender: genderEnum("gender"),
  club: varchar("club", { length: 255 }),
  // Freeform so administrators can add categories without a schema change.
  category: varchar("category", { length: 100 }),
  // "area" = Dindigul taluk. Kept as a plain string (not FK) so admins can
  // manage the taluk list without a schema migration.
  area: varchar("area", { length: 100 }),
  city: varchar("city", { length: 100 }),
  profileImage: text("profile_image"),
  status: playerStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- PLAYER STATS (legacy aggregate) ----------

export const playerStats = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" })
    .unique(),
  matchesPlayed: integer("matches_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  awards: integer("awards").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- MATCHES ----------
// Registration settings are admin-controlled per match.

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  tournamentName: varchar("tournament_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  discipline: varchar("discipline", { length: 100 }).notNull().default("AEROSKATOBALL"),
  date: date("date").notNull(),
  time: time("time").notNull(),
  venue: varchar("venue", { length: 255 }),
  city: varchar("city", { length: 100 }),
  category: varchar("category", { length: 100 }),
  teamA: varchar("team_a", { length: 255 }).notNull(),
  teamB: varchar("team_b", { length: 255 }).notNull(),
  scoreA: integer("score_a"),
  scoreB: integer("score_b"),
  description: text("description"),
  status: matchStatusEnum("status").notNull().default("UPCOMING"),

  // --- registration settings, set by admin per match ---
  maxDisciplinesPerRegistration: integer("max_disciplines_per_registration").notNull().default(1),
  requireBirthCertificate: boolean("require_birth_certificate").notNull().default(false),
  registrationReleased: boolean("registration_released").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- MATCH POINTS ----------

export const matchPoints = pgTable("match_points", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  discipline: varchar("discipline", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  points: integer("points").notNull(),
  year: integer("year").notNull(),
  enteredByUserId: integer("entered_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  uniqPlayerMatchDiscipline: unique().on(table.playerId, table.matchId, table.discipline),
}));

// ---------- REGISTRATION PERMISSIONS ----------
// Admin adds/removes entries scoping player-registration availability by
// area, optionally narrowed to one institution (school/club) within that
// area. Lookup is most-specific-wins: an institution-level entry for the
// player's exact school/club overrides the area-wide entry, in either
// direction (a specific school can be opened early or closed as an
// exception, even while the rest of its taluk is the opposite).

export const registrationPermissions = pgTable("registration_permissions", {
  id: serial("id").primaryKey(),
  area: varchar("area", { length: 100 }).notNull(),
  // NULL institution = an area-wide (taluk-wide) rule.
  institution: varchar("institution", { length: 255 }),
  isOpen: boolean("is_open").notNull().default(true),
  note: text("note"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // NULLS are distinct in Postgres unique constraints, so an area-wide row
  // (institution NULL) and any number of institution-specific rows for the
  // same area can coexist — but you can't add the same (area, institution)
  // pair twice.
  uniqAreaInstitution: unique().on(table.area, table.institution),
}));

// ---------- MATCH REGISTRATIONS (entry + admin approval) ----------

export const matchRegistrations = pgTable("match_registrations", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),

  // Snapshot of the registrant's details at the time of entry — kept
  // separate from the player's profile since a parent/guardian may be
  // filling this in with slightly different details for a specific event.
  name: varchar("name", { length: 255 }).notNull(),
  age: integer("age").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  fatherName: varchar("father_name", { length: 255 }).notNull(),
  representingName: varchar("representing_name", { length: 255 }).notNull(), // school/college/club
  // Stored as a JSON array of discipline enum strings, length-capped
  // against the match's maxDisciplinesPerRegistration by the API layer.
  disciplines: jsonb("disciplines").notNull(),

  // Document storage: only a server-generated filename is stored here —
  // never a client-supplied path — and the file itself lives outside the
  // web root. Downloads are only ever served through an authenticated,
  // ownership-checked route (see routes/matchRegistrations.ts).
  birthCertificateFile: varchar("birth_certificate_file", { length: 255 }),

  registrationStatus: registrationStatusEnum("registration_status").notNull().default("PENDING"),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  decisionNote: text("decision_note"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // A player registers at most once per match — resubmission edits the
  // existing row rather than creating duplicates.
  uniqPlayerMatch: unique().on(table.playerId, table.matchId),
}));

// ---------- ANNOUNCEMENTS ----------

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  priority: priorityEnum("priority").notNull().default("NORMAL"),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "set null" }),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- NEWS ----------

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  image: text("image"),
  // Optional externally hosted video (YouTube/Vimeo/MP4 URL). Keeping media
  // as URLs lets the CMS work with the existing JSON API without storing
  // large binary files in Postgres.
  videoUrl: text("video_url"),
  author: varchar("author", { length: 255 }),
  category: newsCategoryEnum("category").notNull().default("GENERAL"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- ACHIEVEMENTS ----------

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  playerId: integer("player_id").references(() => players.id, { onDelete: "cascade" }),
  tournament: varchar("tournament", { length: 255 }),
  year: integer("year"),
  type: achievementTypeEnum("type").notNull().default("ASSOCIATION"),
  medal: varchar("medal", { length: 50 }),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- PUBLIC SITE CONTENT ----------

export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  aboutTitle: varchar("about_title", { length: 255 }).notNull().default("About DDABA"),
  mission: text("mission").notNull().default(""),
  vision: text("vision").notNull().default(""),
  objectives: jsonb("objectives").notNull().default([]),
  developmentText: text("development_text").notNull().default(""),
  affiliationText: text("affiliation_text").notNull().default(""),
  contactText: text("contact_text").notNull().default(""),
  contactEmail: varchar("contact_email", { length: 255 }).notNull().default(""),
  contactPhone: varchar("contact_phone", { length: 30 }).notNull().default(""),
  facebookUrl: text("facebook_url").notNull().default(""),
  youtubeUrl: text("youtube_url").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- PASSWORD RESET OTPs ----------

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- AUDIT LOG ----------

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- RELATIONS ----------

export const usersRelations = relations(users, ({ one }) => ({
  player: one(players, { fields: [users.id], references: [players.userId] }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  user: one(users, { fields: [players.userId], references: [users.id] }),
  stats: one(playerStats, { fields: [players.id], references: [playerStats.playerId] }),
  achievements: many(achievements),
  matchPoints: many(matchPoints),
  matchRegistrations: many(matchRegistrations),
}));

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
  player: one(players, { fields: [playerStats.playerId], references: [players.id] }),
}));

export const matchesRelations = relations(matches, ({ many }) => ({
  announcements: many(announcements),
  points: many(matchPoints),
  registrations: many(matchRegistrations),
}));

export const matchPointsRelations = relations(matchPoints, ({ one }) => ({
  player: one(players, { fields: [matchPoints.playerId], references: [players.id] }),
  match: one(matches, { fields: [matchPoints.matchId], references: [matches.id] }),
  enteredBy: one(users, { fields: [matchPoints.enteredByUserId], references: [users.id] }),
}));

export const matchRegistrationsRelations = relations(matchRegistrations, ({ one }) => ({
  player: one(players, { fields: [matchRegistrations.playerId], references: [players.id] }),
  match: one(matches, { fields: [matchRegistrations.matchId], references: [matches.id] }),
  approvedBy: one(users, { fields: [matchRegistrations.approvedByUserId], references: [users.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  match: one(matches, { fields: [announcements.matchId], references: [matches.id] }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  player: one(players, { fields: [achievements.playerId], references: [players.id] }),
}));

// ---------- TYPES ----------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type PlayerStats = typeof playerStats.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type MatchPoints = typeof matchPoints.$inferSelect;
export type NewMatchPoints = typeof matchPoints.$inferInsert;
export type RegistrationPermission = typeof registrationPermissions.$inferSelect;
export type NewRegistrationPermission = typeof registrationPermissions.$inferInsert;
export type MatchRegistration = typeof matchRegistrations.$inferSelect;
export type NewMatchRegistration = typeof matchRegistrations.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;
export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type SiteContent = typeof siteContent.$inferSelect;
export type NewSiteContent = typeof siteContent.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export const CATEGORIES = [
  "UNDER_8", "UNDER_10", "UNDER_12", "UNDER_14", "UNDER_17", "UNDER_19", "ABOVE_19",
] as const;
export const DISCIPLINES = ["AEROSKATOBALL", "SPEED", "ZIG_ZAG", "HUDDLES", "SKATE_WALK"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  UNDER_8: "Under 8",
  UNDER_10: "Under 10",
  UNDER_12: "Under 12",
  UNDER_14: "Under 14",
  UNDER_17: "Under 17",
  UNDER_19: "Under 19",
  ABOVE_19: "Above 19",
};

export const DISCIPLINE_LABELS: Record<string, string> = {
  AEROSKATOBALL: "Aeroskatoball",
  SPEED: "Speed",
  ZIG_ZAG: "Zig Zag",
  HUDDLES: "Huddles",
  SKATE_WALK: "Skate Walk",
};
