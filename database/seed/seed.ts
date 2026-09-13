/**
 * Seeds the database with:
 *  - one ADMIN account (credentials from env vars, not hard-coded)
 *  - 12 demo players (Dindigul taluks, categories incl. Under 17)
 *  - 5 matches, including one with registration released (fee + discipline cap set)
 *  - match points entries (the ranking source of truth)
 *  - registration permissions (area-wide + one institution-specific override)
 *  - 4 announcements, 5 news articles, 6 achievements
 *
 * Run with: npm run db:seed
 */
import dotenv from "dotenv";
dotenv.config();

import { db, pool } from "../../server/db";
import { eq } from "drizzle-orm";
import {
  users,
  players,
  playerStats,
  matches,
  matchPoints,
  registrationPermissions,
  announcements,
  news,
  achievements,
} from "../../shared/schema/schema";
import { hashPassword } from "../../server/services/password";

const AREAS = [
  "Dindigul", "Palani", "Oddanchatram", "Vedasandur", "Nilakottai",
  "Natham", "Kodaikanal", "Athoor", "Gujiliamparai", "Vadamadurai",
];
const CLUBS = [
  "Dindigul Rollers Club", "Palani Skaters", "Oddanchatram Wheels",
  "Vedasandur Skate Club", "Nilakottai Rollers",
];
const CATEGORIES = ["UNDER_8", "UNDER_10", "UNDER_12", "UNDER_14", "UNDER_17", "UNDER_19", "ABOVE_19"] as const;
const DISCIPLINES = ["AEROSKATOBALL", "SPEED", "ZIG_ZAG", "HUDDLES", "SKATE_WALK"] as const;

const DEMO_PLAYER_NAMES = [
  "Arun Kumar", "Meena Sundaram", "Karthik R", "Divya S",
  "Vignesh P", "Priya Ramesh", "Suresh Babu", "Lakshmi N",
  "Ganesh Prasad", "Anitha Selvam", "Vijay Anand", "Kavya Murthy",
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

async function seed() {
  console.log("Seeding DDABA database...");

  // ---------- ADMIN ----------
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ddaba.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is not set. Add a strong password to your .env file before seeding."
    );
  }

  const adminHash = await hashPassword(adminPassword);
  const [admin] = await db
    .insert(users)
    .values({ email: adminEmail, passwordHash: adminHash, role: "ADMIN" })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash: adminHash,
        role: "ADMIN",
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    })
    .returning();

  console.log(`Admin credentials synchronized: ${adminEmail}`);
  const adminRow = admin;

  // ---------- REGISTRATION PERMISSIONS ----------
  for (let i = 0; i < AREAS.length; i++) {
    await db
      .insert(registrationPermissions)
      .values({
        area: AREAS[i],
        institution: null,
        isOpen: i % 2 === 0, // alternate open/closed for a realistic demo
        note: i % 2 === 0 ? "Open for the 2026 season." : "Closed — reopens after selection trials.",
        createdByUserId: adminRow?.id ?? null,
      })
      .onConflictDoNothing({ target: [registrationPermissions.area, registrationPermissions.institution] });
  }
  // One institution-specific override: this school stays open even though
  // Oddanchatram (index 2, even) is already area-wide open — demonstrates
  // an override that agrees; a real admin might instead close one school
  // within an otherwise-open taluk, or vice versa.
  await db
    .insert(registrationPermissions)
    .values({
      area: "Nilakottai",
      institution: "Askya School",
      isOpen: true,
      note: "Opened early as an exception ahead of the area-wide date.",
      createdByUserId: adminRow?.id ?? null,
    })
    .onConflictDoNothing({ target: [registrationPermissions.area, registrationPermissions.institution] });
  console.log("Registration permissions seeded.");

  // ---------- DEMO PLAYERS ----------
  const demoPassword = process.env.SEED_DEMO_PASSWORD || "DemoPlayer#2026x";
  const demoHash = await hashPassword(demoPassword);
  const seededPlayerIds: number[] = [];

  for (let i = 0; i < DEMO_PLAYER_NAMES.length; i++) {
    const name = DEMO_PLAYER_NAMES[i];
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@demo.ddaba.local`;
    const playerIdCode = `DDABA-${String(1000 + i)}`;

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash: demoHash, role: "PLAYER" })
      .onConflictDoNothing({ target: users.email })
      .returning();

    if (!user) continue; // already seeded

    const [player] = await db
      .insert(players)
      .values({
        userId: user.id,
        playerId: playerIdCode,
        fullName: name,
        phone: `9${String(100000000 + i).slice(0, 9)}`,
        dateOfBirth: `${2005 + (i % 15)}-0${(i % 9) + 1}-15`,
        gender: i % 2 === 0 ? "MALE" : "FEMALE",
        club: pick(CLUBS, i),
        category: pick(CATEGORIES, i),
        area: pick(AREAS, i),
        city: pick(AREAS, i),
        profileImage: null,
        status: "ACTIVE",
      })
      .returning();

    await db.insert(playerStats).values({
      playerId: player.id,
      matchesPlayed: 10 + i,
      wins: 6 + (i % 5),
      losses: 4 + (i % 3),
      goals: 12 + i * 2,
      assists: 5 + i,
      awards: i % 4,
    });

    seededPlayerIds.push(player.id);
  }
  console.log("Demo players + legacy stats seeded.");

  // ---------- MATCHES ----------
  const matchRows = [
    {
      tournamentName: "Dindigul District Championship 2026",
      title: "Dindigul vs Palani",
      discipline: "AEROSKATOBALL" as const,
      date: "2026-09-15",
      time: "09:00:00",
      venue: "Dindigul District Sports Complex",
      city: "Dindigul",
      category: "UNDER_19" as const,
      teamA: "Dindigul Rollers Club",
      teamB: "Palani Skaters",
      status: "UPCOMING" as const,
      description: "Opening match of the district championship.",
      maxDisciplinesPerRegistration: 2,
      requireBirthCertificate: true,
      registrationReleased: true,
    },
    {
      tournamentName: "Dindigul District Championship 2026",
      title: "Semifinal",
      discipline: "AEROSKATOBALL" as const,
      date: "2026-09-19",
      time: "15:00:00",
      venue: "Dindigul District Sports Complex",
      city: "Dindigul",
      category: "UNDER_19" as const,
      teamA: "Dindigul Rollers Club",
      teamB: "Vedasandur Skate Club",
      status: "UPCOMING" as const,
      description: "Semifinal round.",
      maxDisciplinesPerRegistration: 1,
      requireBirthCertificate: false,
      registrationReleased: false,
    },
    {
      tournamentName: "Zonal Selection Trials",
      title: "Dindigul vs Oddanchatram",
      discipline: "SPEED" as const,
      date: "2026-07-20",
      time: "09:30:00",
      venue: "Oddanchatram Municipal Ground",
      city: "Oddanchatram",
      category: "UNDER_17" as const,
      teamA: "Dindigul Rollers Club",
      teamB: "Oddanchatram Wheels",
      status: "COMPLETED" as const,
      scoreA: 3,
      scoreB: 5,
      description: "Zonal qualifier — completed.",
      maxDisciplinesPerRegistration: 1,
      requireBirthCertificate: false,
      registrationReleased: false,
    },
    {
      tournamentName: "Zonal Selection Trials",
      title: "Palani vs Vedasandur",
      discipline: "ZIG_ZAG" as const,
      date: "2026-07-22",
      time: "11:00:00",
      venue: "Palani Sports Ground",
      city: "Palani",
      category: "UNDER_14" as const,
      teamA: "Palani Skaters",
      teamB: "Vedasandur Skate Club",
      status: "COMPLETED" as const,
      scoreA: 4,
      scoreB: 2,
      description: "Zig Zag qualifier round.",
      maxDisciplinesPerRegistration: 1,
      requireBirthCertificate: false,
      registrationReleased: false,
    },
    {
      tournamentName: "Friendly Series",
      title: "Nilakottai vs Natham",
      discipline: "HUDDLES" as const,
      date: "2026-08-15",
      time: "16:00:00",
      venue: "Nilakottai Community Ground",
      city: "Nilakottai",
      category: "UNDER_10" as const,
      teamA: "Nilakottai Rollers",
      teamB: "Natham Skaters",
      status: "CANCELLED" as const,
      description: "Cancelled due to weather.",
      maxDisciplinesPerRegistration: 1,
      requireBirthCertificate: false,
      registrationReleased: false,
    },
  ];
  const insertedMatches = await db.insert(matches).values(matchRows).returning();
  console.log("Demo matches seeded.");

  // ---------- MATCH POINTS (ranking source of truth) ----------
  if (adminRow && seededPlayerIds.length > 0) {
    const pointEntries = [
      { playerId: seededPlayerIds[0], matchId: insertedMatches[0].id, discipline: "AEROSKATOBALL" as const, category: "UNDER_19" as const, points: 18, year: 2026 },
      { playerId: seededPlayerIds[0], matchId: insertedMatches[1].id, discipline: "AEROSKATOBALL" as const, category: "UNDER_19" as const, points: 22, year: 2026 },
      { playerId: seededPlayerIds[1], matchId: insertedMatches[0].id, discipline: "AEROSKATOBALL" as const, category: "UNDER_19" as const, points: 15, year: 2026 },
      { playerId: seededPlayerIds[2], matchId: insertedMatches[2].id, discipline: "SPEED" as const, category: "UNDER_17" as const, points: 19, year: 2026 },
      { playerId: seededPlayerIds[3], matchId: insertedMatches[3].id, discipline: "ZIG_ZAG" as const, category: "UNDER_14" as const, points: 21, year: 2026 },
      { playerId: seededPlayerIds[4], matchId: insertedMatches[2].id, discipline: "SPEED" as const, category: "UNDER_17" as const, points: 14, year: 2026 },
    ];
    for (const entry of pointEntries) {
      await db
        .insert(matchPoints)
        .values({ ...entry, enteredByUserId: adminRow.id })
        .onConflictDoNothing();
    }
    console.log("Match points seeded.");
  }

  // ---------- ANNOUNCEMENTS ----------
  await db.insert(announcements).values([
    {
      title: "District Championship Registration Open",
      description: "Registrations for the Dindigul District Championship 2026 are now open in select areas. Check the registration status for your taluk/institution.",
      priority: "IMPORTANT",
      matchId: insertedMatches[0]?.id ?? null,
      published: true,
    },
    {
      title: "Zonal Trials — Venue Confirmed",
      description: "The Zonal Selection Trials will be held at the Oddanchatram Municipal Ground as scheduled.",
      priority: "URGENT",
      matchId: insertedMatches[2]?.id ?? null,
      published: true,
    },
    {
      title: "Discipline-wise Rankings Published",
      description: "Rankings for Aeroskatoball, Speed, Zig Zag, Huddles, and Skate Walk are now available district-wide and by area.",
      priority: "NORMAL",
      published: true,
    },
    {
      title: "Annual General Meeting",
      description: "DDABA's annual general meeting for club representatives will be scheduled soon. Details to follow.",
      priority: "NORMAL",
      published: false,
    },
  ]);
  console.log("Demo announcements seeded.");

  // ---------- NEWS ----------
  await db.insert(news).values([
    {
      title: "DDABA Announces 2026 District Championship Schedule",
      summary: "The full schedule for this year's district championship has been released.",
      content: "This is placeholder demo content describing the district championship schedule, participating areas, and key dates for the 2026 season across all five disciplines.",
      author: "DDABA Media Team",
      category: "TOURNAMENT",
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "Dindigul Rollers Club Dominate Zonal Trials",
      summary: "A strong performance secures their spot in the district finals.",
      content: "Demo article content covering the team's trial performance, standout players, and what it means for the upcoming championship.",
      author: "DDABA Media Team",
      category: "PLAYER",
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "New Coaching Camps Launched Across Taluks",
      summary: "DDABA expands grassroots training with new area-level coaching camps.",
      content: "Demo article describing the new coaching camp initiative, locations, and how players can register.",
      author: "DDABA Media Team",
      category: "ASSOCIATION",
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "Player Spotlight: Rising Stars of Palani",
      summary: "A look at promising young talent coming out of the Palani area.",
      content: "Demo article profiling young players from Palani and their progress this season.",
      author: "DDABA Media Team",
      category: "PLAYER",
      published: true,
      publishedAt: new Date(),
    },
    {
      title: "DDABA Reviews Safety Guidelines Ahead of Championship",
      summary: "Updated safety and equipment guidelines released ahead of the district championship.",
      content: "Demo article summarizing updated safety protocols for players and officials.",
      author: "DDABA Media Team",
      category: "GENERAL",
      published: false,
    },
  ]);
  console.log("Demo news seeded.");

  // ---------- ACHIEVEMENTS ----------
  const achievementSeeds = [
    { title: "District Champion 2025", tournament: "Dindigul District Championship", year: 2025, type: "STATE" as const, medal: "Gold" },
    { title: "State-Level Runner-up", tournament: "TN State Skating Meet", year: 2025, type: "NATIONAL" as const, medal: "Silver" },
    { title: "Best Newcomer Award", tournament: "Zonal Trials", year: 2024, type: "ASSOCIATION" as const, medal: "Bronze" },
    { title: "Regional Bronze Medal", tournament: "South Zone Skating Cup", year: 2024, type: "INTERNATIONAL" as const, medal: "Bronze" },
    { title: "Most Valuable Player", tournament: "Dindigul District Championship", year: 2024, type: "STATE" as const, medal: "Gold" },
    { title: "Top Scorer", tournament: "Zonal Trials", year: 2025, type: "ASSOCIATION" as const, medal: "Gold" },
  ];

  for (let i = 0; i < achievementSeeds.length; i++) {
    const a = achievementSeeds[i];
    const pid = seededPlayerIds[i % Math.max(seededPlayerIds.length, 1)];
    await db.insert(achievements).values({
      ...a,
      description: `Demo achievement record for ${a.title.toLowerCase()}.`,
      playerId: pid ?? null,
    });
  }
  console.log("Demo achievements seeded.");

  console.log("\nSeed complete.");
  console.log(`Admin login: ${adminEmail} / (the password you set in SEED_ADMIN_PASSWORD)`);
  console.log(`Demo player login: any demo player's email / (SEED_DEMO_PASSWORD, default: DemoPlayer#2026x)`);
  console.log(`Match "${matchRows[0].title}" has registration released — try registering as a demo player.`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
