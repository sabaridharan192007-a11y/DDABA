CREATE TABLE "site_content" (
  "id" serial PRIMARY KEY NOT NULL,
  "about_title" varchar(255) DEFAULT 'About DDABA' NOT NULL,
  "mission" text DEFAULT '' NOT NULL,
  "vision" text DEFAULT '' NOT NULL,
  "objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "development_text" text DEFAULT '' NOT NULL,
  "affiliation_text" text DEFAULT '' NOT NULL,
  "contact_text" text DEFAULT '' NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
