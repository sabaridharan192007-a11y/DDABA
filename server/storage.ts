import { db } from "./db";
import {
  users,
  players,
  playerStats,
  matches,
  matchPoints,
  registrationPermissions,
  matchRegistrations,
  announcements,
  news,
  achievements,
  siteContent,
  passwordResetTokens,
  auditLogs,
  type NewUser,
  type NewPlayer,
  type NewMatch,
  type NewMatchPoints,
  type NewRegistrationPermission,
  type NewMatchRegistration,
  type NewAnnouncement,
  type NewNews,
  type NewAchievement,
  type NewSiteContent,
  type NewAuditLog,
} from "../shared/schema/schema";
import { eq, ilike, or, and, desc, sql, isNull } from "drizzle-orm";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ---------- USERS ----------

export const userStorage = {
  async findByEmail(email: string) {
    const [row] = await db.select().from(users).where(eq(users.email, email));
    return row;
  },
  async findById(id: number) {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  },
  async create(data: NewUser) {
    const [row] = await db.insert(users).values(data).returning();
    return row;
  },
  async updatePassword(userId: number, passwordHash: string) {
    const [row] = await db
      .update(users)
      .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return row;
  },
  isLocked(user: { lockedUntil: Date | null }) {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  },
  async recordFailedLogin(userId: number) {
    const [current] = await db.select().from(users).where(eq(users.id, userId));
    if (!current) return;
    const attempts = current.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;
    await db
      .update(users)
      .set({
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : current.lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return { attempts, locked: shouldLock };
  },
  async recordSuccessfulLogin(userId: number, ip: string) {
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },
};

export const passwordResetStorage = {
  async create(userId: number, tokenHash: string, expiresAt: Date) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    const [row] = await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt }).returning();
    return row;
  },
  async findValid(tokenHash: string) {
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenHash), sql`${passwordResetTokens.expiresAt} > now()`));
    return row;
  },
  async remove(id: number) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, id));
  },
};

// ---------- AUDIT LOG ----------

export const auditStorage = {
  async log(entry: NewAuditLog) {
    await db.insert(auditLogs).values(entry);
  },
  async recent(limit = 100) {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  },
};

// ---------- PLAYERS ----------

const publicPlayerColumns = {
  id: players.id,
  playerId: players.playerId,
  fullName: players.fullName,
  club: players.club,
  category: players.category,
  area: players.area,
  city: players.city,
  profileImage: players.profileImage,
  status: players.status,
};

export const playerStorage = {
  async create(data: NewPlayer) {
    const [row] = await db.insert(players).values(data).returning();
    await db.insert(playerStats).values({ playerId: row.id });
    return row;
  },
  async findById(id: number) {
    const [row] = await db.select().from(players).where(eq(players.id, id));
    return row;
  },
  async findPublicById(id: number) {
    const [row] = await db.select(publicPlayerColumns).from(players).where(eq(players.id, id));
    return row;
  },
  async findByUserId(userId: number) {
    const [row] = await db.select().from(players).where(eq(players.userId, userId));
    return row;
  },
  async findByPlayerId(playerId: string) {
    const [row] = await db.select().from(players).where(eq(players.playerId, playerId));
    return row;
  },
  async list(filters: {
    search?: string;
    club?: string;
    area?: string;
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const conditions = [];
    if (filters.search) {
      conditions.push(
        or(
          ilike(players.fullName, `%${filters.search}%`),
          ilike(players.playerId, `%${filters.search}%`),
          ilike(players.club, `%${filters.search}%`)
        )
      );
    }
    if (filters.club) conditions.push(ilike(players.club, `%${filters.club}%`));
    if (filters.area) conditions.push(eq(players.area, filters.area));
    if (filters.category) conditions.push(eq(players.category, filters.category as any));
    if (filters.status) conditions.push(eq(players.status, filters.status as any));

    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);

    return db
      .select()
      .from(players)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(players.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  },
  async listPublic(filters: {
    search?: string;
    club?: string;
    area?: string;
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const conditions = [];
    if (filters.search) {
      conditions.push(
        or(
          ilike(players.fullName, `%${filters.search}%`),
          ilike(players.playerId, `%${filters.search}%`),
          ilike(players.club, `%${filters.search}%`)
        )
      );
    }
    if (filters.club) conditions.push(ilike(players.club, `%${filters.club}%`));
    if (filters.area) conditions.push(eq(players.area, filters.area));
    if (filters.category) conditions.push(eq(players.category, filters.category as any));
    if (filters.status) conditions.push(eq(players.status, filters.status as any));

    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);

    return db
      .select(publicPlayerColumns)
      .from(players)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(players.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  },
  async update(id: number, data: Partial<NewPlayer>) {
    const [row] = await db.update(players).set({ ...data, updatedAt: new Date() }).where(eq(players.id, id)).returning();
    return row;
  },
  async setStatus(id: number, status: "ACTIVE" | "INACTIVE") {
    const [row] = await db.update(players).set({ status, updatedAt: new Date() }).where(eq(players.id, id)).returning();
    return row;
  },
};

// ---------- PLAYER STATS (legacy aggregate) ----------

export const statsStorage = {
  async getByPlayerId(playerId: number) {
    const [row] = await db.select().from(playerStats).where(eq(playerStats.playerId, playerId));
    return row;
  },
  async update(playerId: number, data: Partial<{ matchesPlayed: number; wins: number; losses: number; goals: number; assists: number; awards: number }>) {
    const [row] = await db.update(playerStats).set({ ...data, updatedAt: new Date() }).where(eq(playerStats.playerId, playerId)).returning();
    return row;
  },
};

// ---------- MATCHES ----------

export const matchStorage = {
  async list(status?: string) {
    return db.select().from(matches).where(status ? eq(matches.status, status as any) : undefined).orderBy(desc(matches.date));
  },
  async findById(id: number) {
    const [row] = await db.select().from(matches).where(eq(matches.id, id));
    return row;
  },
  async create(data: NewMatch) {
    const [row] = await db.insert(matches).values(data).returning();
    return row;
  },
  async update(id: number, data: Partial<NewMatch>) {
    const [row] = await db.update(matches).set({ ...data, updatedAt: new Date() }).where(eq(matches.id, id)).returning();
    return row;
  },
  async remove(id: number) {
    await db.delete(matches).where(eq(matches.id, id));
  },
  async setRegistrationReleased(id: number, released: boolean) {
    const [row] = await db
      .update(matches)
      .set({ registrationReleased: released, updatedAt: new Date() })
      .where(eq(matches.id, id))
      .returning();
    return row;
  },
};

// ---------- MATCH POINTS + RANKINGS ----------

export const pointsStorage = {
  async award(data: NewMatchPoints) {
    const [row] = await db
      .insert(matchPoints)
      .values(data)
      .onConflictDoUpdate({
        target: [matchPoints.playerId, matchPoints.matchId, matchPoints.discipline],
        set: { points: data.points, category: data.category, year: data.year, enteredByUserId: data.enteredByUserId, updatedAt: new Date() },
      })
      .returning();
    return row;
  },
  async historyForPlayer(playerId: number, filters: { discipline?: string; year?: number }) {
    const conditions = [eq(matchPoints.playerId, playerId)];
    if (filters.discipline) conditions.push(eq(matchPoints.discipline, filters.discipline as any));
    if (filters.year) conditions.push(eq(matchPoints.year, filters.year));
    return db
      .select({
        id: matchPoints.id,
        points: matchPoints.points,
        discipline: matchPoints.discipline,
        category: matchPoints.category,
        year: matchPoints.year,
        createdAt: matchPoints.createdAt,
        matchTitle: matches.title,
        tournamentName: matches.tournamentName,
        matchDate: matches.date,
      })
      .from(matchPoints)
      .innerJoin(matches, eq(matchPoints.matchId, matches.id))
      .where(and(...conditions))
      .orderBy(desc(matches.date));
  },
  async remove(id: number) {
    const [row] = await db.delete(matchPoints).where(eq(matchPoints.id, id)).returning({ id: matchPoints.id });
    return row;
  },
  async recentEntries(limit = 20) {
    return db
      .select({
        id: matchPoints.id,
        points: matchPoints.points,
        discipline: matchPoints.discipline,
        category: matchPoints.category,
        year: matchPoints.year,
        createdAt: matchPoints.createdAt,
        playerName: players.fullName,
        playerCode: players.playerId,
        matchTitle: matches.title,
      })
      .from(matchPoints)
      .innerJoin(players, eq(matchPoints.playerId, players.id))
      .innerJoin(matches, eq(matchPoints.matchId, matches.id))
      .orderBy(desc(matchPoints.createdAt))
      .limit(limit);
  },
  /** District-wide rankings (no state scope) — filterable by area/category. */
  async rankings(filters: { discipline: string; year: number; area?: string; category?: string }) {
    const conditions = [
      eq(matchPoints.discipline, filters.discipline as any),
      eq(matchPoints.year, filters.year),
      eq(players.status, "ACTIVE"),
    ];
    if (filters.area) conditions.push(eq(players.area, filters.area));
    if (filters.category) conditions.push(eq(matchPoints.category, filters.category as any));

    return db
      .select({
        playerId: players.id,
        playerCode: players.playerId,
        fullName: players.fullName,
        club: players.club,
        area: players.area,
        category: players.category,
        profileImage: players.profileImage,
        totalPoints: sql<number>`sum(${matchPoints.points})::int`,
        matchesCounted: sql<number>`count(distinct ${matchPoints.matchId})::int`,
      })
      .from(matchPoints)
      .innerJoin(players, eq(matchPoints.playerId, players.id))
      .where(and(...conditions))
      .groupBy(players.id)
      .orderBy(desc(sql`sum(${matchPoints.points})`));
  },
};

// ---------- REGISTRATION PERMISSIONS (area + optional institution) ----------

export const registrationPermissionStorage = {
  async list() {
    return db.select().from(registrationPermissions).orderBy(registrationPermissions.area, registrationPermissions.institution);
  },
  async add(data: NewRegistrationPermission) {
    const [row] = await db
      .insert(registrationPermissions)
      .values(data)
      .onConflictDoUpdate({
        target: [registrationPermissions.area, registrationPermissions.institution],
        set: { isOpen: data.isOpen, note: data.note, updatedAt: new Date() },
      })
      .returning();
    return row;
  },
  async remove(id: number) {
    await db.delete(registrationPermissions).where(eq(registrationPermissions.id, id));
  },
  /**
   * Most-specific-wins lookup: an institution-level rule for the exact
   * (area, institution) pair overrides the area-wide rule (institution
   * NULL) for that area, in either direction. Falls back to "closed" if
   * no rule exists at all for the area.
   */
  async isOpenFor(area: string, institution?: string | null) {
    if (institution) {
      const [specific] = await db
        .select()
        .from(registrationPermissions)
        .where(and(eq(registrationPermissions.area, area), eq(registrationPermissions.institution, institution)));
      if (specific) return specific.isOpen;
    }
    const [areaWide] = await db
      .select()
      .from(registrationPermissions)
      .where(and(eq(registrationPermissions.area, area), isNull(registrationPermissions.institution)));
    return areaWide?.isOpen ?? false;
  },
};

// ---------- MATCH REGISTRATIONS (entry + admin approval) ----------

export const matchRegistrationStorage = {
  async create(data: NewMatchRegistration) {
    const [row] = await db.insert(matchRegistrations).values(data).returning();
    return row;
  },
  async findById(id: number) {
    const [row] = await db.select().from(matchRegistrations).where(eq(matchRegistrations.id, id));
    return row;
  },
  async findByPlayerAndMatch(playerId: number, matchId: number) {
    const [row] = await db
      .select()
      .from(matchRegistrations)
      .where(and(eq(matchRegistrations.playerId, playerId), eq(matchRegistrations.matchId, matchId)));
    return row;
  },
  async listForPlayer(playerId: number) {
    return db
      .select({
        id: matchRegistrations.id,
        matchId: matchRegistrations.matchId,
        disciplines: matchRegistrations.disciplines,
        registrationStatus: matchRegistrations.registrationStatus,
        decisionNote: matchRegistrations.decisionNote,
        createdAt: matchRegistrations.createdAt,
        matchTitle: matches.title,
        tournamentName: matches.tournamentName,
        matchDate: matches.date,
      })
      .from(matchRegistrations)
      .innerJoin(matches, eq(matchRegistrations.matchId, matches.id))
      .where(eq(matchRegistrations.playerId, playerId))
      .orderBy(desc(matchRegistrations.createdAt));
  },
  async decide(id: number, status: "VERIFIED" | "REJECTED", approvedByUserId: number, note?: string) {
    const [row] = await db
      .update(matchRegistrations)
      .set({ registrationStatus: status, approvedByUserId, approvedAt: new Date(), decisionNote: note, updatedAt: new Date() })
      .where(eq(matchRegistrations.id, id))
      .returning();
    return row;
  },
  async listForVerification(filters: { matchId?: number; status?: string }) {
    const conditions = [];
    if (filters.matchId) conditions.push(eq(matchRegistrations.matchId, filters.matchId));
    if (filters.status) conditions.push(eq(matchRegistrations.registrationStatus, filters.status as any));
    return db
      .select({
        id: matchRegistrations.id,
        name: matchRegistrations.name,
        age: matchRegistrations.age,
        category: matchRegistrations.category,
        fatherName: matchRegistrations.fatherName,
        representingName: matchRegistrations.representingName,
        disciplines: matchRegistrations.disciplines,
        birthCertificateFile: matchRegistrations.birthCertificateFile,
        decisionNote: matchRegistrations.decisionNote,
        registrationStatus: matchRegistrations.registrationStatus,
        createdAt: matchRegistrations.createdAt,
        matchTitle: matches.title,
        playerCode: players.playerId,
      })
      .from(matchRegistrations)
      .innerJoin(matches, eq(matchRegistrations.matchId, matches.id))
      .innerJoin(players, eq(matchRegistrations.playerId, players.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(matchRegistrations.createdAt));
  },
};

// ---------- ANNOUNCEMENTS ----------

export const announcementStorage = {
  async list(publishedOnly = false) {
    return db.select().from(announcements).where(publishedOnly ? eq(announcements.published, true) : undefined).orderBy(desc(announcements.createdAt));
  },
  async create(data: NewAnnouncement) {
    const [row] = await db.insert(announcements).values(data).returning();
    return row;
  },
  async update(id: number, data: Partial<NewAnnouncement>) {
    const [row] = await db.update(announcements).set({ ...data, updatedAt: new Date() }).where(eq(announcements.id, id)).returning();
    return row;
  },
  async remove(id: number) {
    await db.delete(announcements).where(eq(announcements.id, id));
  },
};

// ---------- NEWS ----------

export const newsStorage = {
  async list(publishedOnly = false) {
    return db.select().from(news).where(publishedOnly ? eq(news.published, true) : undefined).orderBy(desc(news.publishedAt));
  },
  async findById(id: number) {
    const [row] = await db.select().from(news).where(eq(news.id, id));
    return row;
  },
  async create(data: NewNews) {
    const [row] = await db.insert(news).values(data).returning();
    return row;
  },
  async update(id: number, data: Partial<NewNews>) {
    const [row] = await db.update(news).set({ ...data, updatedAt: new Date() }).where(eq(news.id, id)).returning();
    return row;
  },
  async remove(id: number) {
    const [row] = await db.delete(news).where(eq(news.id, id)).returning({ id: news.id });
    return row;
  },
};

// ---------- ACHIEVEMENTS ----------

export const achievementStorage = {
  async list(playerId?: number) {
    return db.select().from(achievements).where(playerId ? eq(achievements.playerId, playerId) : undefined).orderBy(desc(achievements.year));
  },
  async create(data: NewAchievement) {
    const [row] = await db.insert(achievements).values(data).returning();
    return row;
  },
  async update(id: number, data: Partial<NewAchievement>) {
    const [row] = await db.update(achievements).set({ ...data, updatedAt: new Date() }).where(eq(achievements.id, id)).returning();
    return row;
  },
  async remove(id: number) {
    await db.delete(achievements).where(eq(achievements.id, id));
  },
};

// ---------- PUBLIC SITE CONTENT ----------

export const siteContentStorage = {
  async get() {
    const [row] = await db.select().from(siteContent).limit(1);
    return row;
  },
  async getPublic() {
    const [row] = await db
      .select({
        id: siteContent.id,
        aboutTitle: siteContent.aboutTitle,
        mission: siteContent.mission,
        vision: siteContent.vision,
        objectives: siteContent.objectives,
        developmentText: siteContent.developmentText,
        affiliationText: siteContent.affiliationText,
        contactEmail: siteContent.contactEmail,
        contactPhone: siteContent.contactPhone,
        facebookUrl: siteContent.facebookUrl,
        youtubeUrl: siteContent.youtubeUrl,
        updatedAt: siteContent.updatedAt,
      })
      .from(siteContent)
      .limit(1);
    return row;
  },
  async update(data: Partial<NewSiteContent>) {
    const existing = await this.get();
    if (existing) {
      const [row] = await db.update(siteContent).set({ ...data, updatedAt: new Date() }).where(eq(siteContent.id, existing.id)).returning();
      return row;
    }
    const [row] = await db.insert(siteContent).values(data as NewSiteContent).returning();
    return row;
  },
};

// ---------- OVERVIEW / ANALYTICS ----------

export const overviewStorage = {
  async stats() {
    const [[playerCount], [activePlayerCount], [upcomingMatchCount], [newsCount], [achievementCount], [pendingRegistrationsCount]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(players),
        db.select({ count: sql<number>`count(*)::int` }).from(players).where(eq(players.status, "ACTIVE")),
        db.select({ count: sql<number>`count(*)::int` }).from(matches).where(eq(matches.status, "UPCOMING")),
        db.select({ count: sql<number>`count(*)::int` }).from(news).where(eq(news.published, true)),
        db.select({ count: sql<number>`count(*)::int` }).from(achievements),
        db.select({ count: sql<number>`count(*)::int` }).from(matchRegistrations).where(eq(matchRegistrations.registrationStatus, "PENDING")),
      ]);

    return {
      totalPlayers: playerCount.count,
      activePlayers: activePlayerCount.count,
      upcomingMatches: upcomingMatchCount.count,
      publishedNews: newsCount.count,
      totalAchievements: achievementCount.count,
      pendingRegistrations: pendingRegistrationsCount.count,
    };
  },
};
