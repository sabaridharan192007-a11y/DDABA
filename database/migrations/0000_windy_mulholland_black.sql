CREATE TYPE "public"."achievement_type" AS ENUM('STATE', 'NATIONAL', 'INTERNATIONAL', 'ASSOCIATION');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('UNDER_8', 'UNDER_10', 'UNDER_12', 'UNDER_14', 'UNDER_17', 'UNDER_19', 'ABOVE_19');--> statement-breakpoint
CREATE TYPE "public"."discipline" AS ENUM('AEROSKATOBALL', 'SPEED', 'ZIG_ZAG', 'HUDDLES', 'SKATE_WALK');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."news_category" AS ENUM('TOURNAMENT', 'ACHIEVEMENT', 'PLAYER', 'ASSOCIATION', 'ANNOUNCEMENT', 'GENERAL');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('NORMAL', 'IMPORTANT', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('PLAYER', 'ADMIN');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"player_id" integer,
	"tournament" varchar(255),
	"year" integer,
	"type" "achievement_type" DEFAULT 'ASSOCIATION' NOT NULL,
	"medal" varchar(50),
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"priority" "priority" DEFAULT 'NORMAL' NOT NULL,
	"match_id" integer,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" integer,
	"metadata" jsonb,
	"ip_address" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"discipline" "discipline" NOT NULL,
	"category" "category" NOT NULL,
	"points" integer NOT NULL,
	"year" integer NOT NULL,
	"entered_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_points_player_id_match_id_discipline_unique" UNIQUE("player_id","match_id","discipline")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"age" integer NOT NULL,
	"category" "category" NOT NULL,
	"father_name" varchar(255) NOT NULL,
	"representing_name" varchar(255) NOT NULL,
	"disciplines" jsonb NOT NULL,
	"birth_certificate_file" varchar(255),
	"registration_status" "registration_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by_user_id" integer,
	"approved_at" timestamp,
	"decision_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_registrations_player_id_match_id_unique" UNIQUE("player_id","match_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"discipline" "discipline" DEFAULT 'AEROSKATOBALL' NOT NULL,
	"date" date NOT NULL,
	"time" time NOT NULL,
	"venue" varchar(255),
	"city" varchar(100),
	"category" "category",
	"team_a" varchar(255) NOT NULL,
	"team_b" varchar(255) NOT NULL,
	"score_a" integer,
	"score_b" integer,
	"description" text,
	"status" "match_status" DEFAULT 'UPCOMING' NOT NULL,
	"max_disciplines_per_registration" integer DEFAULT 1 NOT NULL,
	"require_birth_certificate" boolean DEFAULT false NOT NULL,
	"registration_released" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"image" text,
	"author" varchar(255),
	"category" "news_category" DEFAULT 'GENERAL' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"awards" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_stats_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"player_id" varchar(50) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"date_of_birth" date,
	"gender" "gender",
	"club" varchar(255),
	"category" "category",
	"position" varchar(100),
	"area" varchar(100),
	"city" varchar(100),
	"profile_image" text,
	"status" "player_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "players_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" varchar(100) NOT NULL,
	"institution" varchar(255),
	"is_open" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registration_permissions_area_institution_unique" UNIQUE("area","institution")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'PLAYER' NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"last_login_ip" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "achievements" ADD CONSTRAINT "achievements_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "announcements" ADD CONSTRAINT "announcements_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_points" ADD CONSTRAINT "match_points_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_points" ADD CONSTRAINT "match_points_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_points" ADD CONSTRAINT "match_points_entered_by_user_id_users_id_fk" FOREIGN KEY ("entered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_registrations" ADD CONSTRAINT "match_registrations_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_registrations" ADD CONSTRAINT "match_registrations_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_registrations" ADD CONSTRAINT "match_registrations_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_permissions" ADD CONSTRAINT "registration_permissions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
