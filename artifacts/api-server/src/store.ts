import mongoose, { Schema, model, Document } from "mongoose";
import crypto from "crypto";
import { config } from "./config";
import { logger } from "./lib/logger";

// ── Password Hashing (HMAC-SHA256 + random salt) ────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  // Legacy plain-text migration: if no colon, it's an unhashed password
  if (!stored.includes(":")) return password === stored;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return password === stored;
  const hashToCompare = crypto.createHmac("sha256", salt).update(password).digest("hex");
  return hash === hashToCompare;
}

// ── Session Token Store ─────────────────────────────────────────────────
interface SessionData {
  token: string;
  username: string;
  role: string;
  expiresAt: number;
}

const sessionMap = new Map<string, SessionData>();

export const sessionStore = {
  create(username: string, role: string): string {
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
    sessionMap.set(token, { token, username, role, expiresAt });
    // Cleanup expired sessions periodically
    for (const [k, v] of sessionMap.entries()) {
      if (v.expiresAt < Date.now()) sessionMap.delete(k);
    }
    return token;
  },
  get(token: string): SessionData | null {
    if (!token) return null;
    const session = sessionMap.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      sessionMap.delete(token);
      return null;
    }
    return session;
  },
  remove(token: string): void {
    sessionMap.delete(token);
  },
  removeByUser(username: string): void {
    for (const [k, v] of sessionMap.entries()) {
      if (v.username === username) sessionMap.delete(k);
    }
  },
};

// ── Login Attempt Tracking (Brute Force Protection) ─────────────────────
interface LoginAttempt {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
  lockoutMultiplier: number; // escalating lockout
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_ATTEMPTS = 3;             // 3 tries only
const BASE_LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes base
const ATTEMPT_WINDOW = 10 * 60 * 1000;   // 10 minute window

function getOrCreateAttempt(key: string): LoginAttempt {
  let attempt = loginAttempts.get(key);
  if (!attempt || (attempt.blockedUntil < Date.now() && Date.now() - attempt.firstAttempt > ATTEMPT_WINDOW)) {
    attempt = { count: 0, firstAttempt: Date.now(), blockedUntil: 0, lockoutMultiplier: attempt?.lockoutMultiplier || 1 };
  }
  return attempt;
}

export const loginGuard = {
  isBlocked(key: string): { blocked: boolean; remainingMs: number } {
    const attempt = loginAttempts.get(key);
    if (!attempt) return { blocked: false, remainingMs: 0 };
    if (attempt.blockedUntil > Date.now()) {
      return { blocked: true, remainingMs: attempt.blockedUntil - Date.now() };
    }
    if (Date.now() - attempt.firstAttempt > ATTEMPT_WINDOW && attempt.blockedUntil < Date.now()) {
      // Keep lockoutMultiplier but reset count
      attempt.count = 0;
      attempt.firstAttempt = Date.now();
      loginAttempts.set(key, attempt);
      return { blocked: false, remainingMs: 0 };
    }
    return { blocked: false, remainingMs: 0 };
  },
  recordFailure(key: string): { attemptsLeft: number; blocked: boolean } {
    const attempt = getOrCreateAttempt(key);
    attempt.count++;
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      // Progressive lockout: 30min → 60min → 120min → 240min...
      const lockoutMs = BASE_LOCKOUT_DURATION * attempt.lockoutMultiplier;
      attempt.blockedUntil = Date.now() + lockoutMs;
      attempt.lockoutMultiplier = Math.min(attempt.lockoutMultiplier * 2, 16); // cap at 8 hours
      loginAttempts.set(key, attempt);
      logger.warn({ key, count: attempt.count, lockoutMinutes: lockoutMs / 60000 }, "BLOCKED — too many failed login attempts (progressive)");
      return { attemptsLeft: 0, blocked: true };
    }
    loginAttempts.set(key, attempt);
    return { attemptsLeft: MAX_LOGIN_ATTEMPTS - attempt.count, blocked: false };
  },
  recordSuccess(key: string): void {
    // Only reset count, keep multiplier for 1 hour after success
    const attempt = loginAttempts.get(key);
    if (attempt) {
      attempt.count = 0;
      attempt.blockedUntil = 0;
      loginAttempts.set(key, attempt);
      // Clear multiplier after 1 hour of good behavior
      setTimeout(() => loginAttempts.delete(key), 60 * 60 * 1000);
    }
  },
};

function isString(val: any): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

// ── Whitelisted UID model ──────────────────────────────────────────────
export interface WhitelistedUid {
  uid: string;
  days: number;
  bluestack: boolean;
  addedBy: string;
  addedAt: string;
  name?: string;
  ip?: string;
}

interface UidDoc extends WhitelistedUid, Document { }

const uidSchema = new Schema<UidDoc>({
  uid: { type: String, required: true, unique: true },
  days: { type: Number, default: 30 },
  bluestack: { type: Boolean, default: true },
  addedBy: { type: String, default: "" },
  addedAt: { type: String, default: () => new Date().toISOString() },
  name: { type: String, default: "" },
  ip: { type: String, default: "" },
});

const UidModel = model<UidDoc>("WhitelistedUid", uidSchema);

const fallbackUids = new Map<string, WhitelistedUid>();

export const uidStore = {
  async save(uid: string, days: number, bluestack: boolean, addedBy: string, name = "", ip = ""): Promise<void> {
    if (!isString(uid)) return;
    await ensureConnection();
    if (!connected) {
      fallbackUids.set(uid, { uid, days, bluestack, addedBy, name, ip, addedAt: new Date().toISOString() });
      return;
    }
    try {
      await UidModel.updateOne({ uid }, { uid, days, bluestack, addedBy, name, ip, addedAt: new Date().toISOString() }, { upsert: true });
      logger.info({ uid, addedBy, name, ip }, "UID saved to MongoDB");
    } catch (err) {
      logger.error({ err, uid }, "Failed to save UID to MongoDB");
    }
  },

  async remove(uid: string): Promise<void> {
    if (!isString(uid)) return;
    await ensureConnection();
    if (!connected) {
      fallbackUids.delete(uid);
      return;
    }
    try {
      await UidModel.deleteOne({ uid });
      logger.info({ uid }, "UID removed from MongoDB");
    } catch (err) {
      logger.error({ err, uid }, "Failed to remove UID from MongoDB");
    }
  },

  async listByUser(username: string): Promise<WhitelistedUid[]> {
    if (!isString(username)) return [];
    await ensureConnection();
    if (!connected) {
      return Array.from(fallbackUids.values()).filter(u => u.addedBy === username);
    }
    const docs = await UidModel.find({ addedBy: username });
    return docs.map(d => ({ uid: d.uid, days: d.days, bluestack: d.bluestack, addedBy: d.addedBy, name: d.name || "", ip: d.ip || "", addedAt: d.addedAt }));
  },

  async removeByUser(username: string): Promise<string[]> {
    if (!isString(username)) return [];
    await ensureConnection();
    if (!connected) {
      const uidsToRemove: string[] = [];
      for (const [uid, data] of fallbackUids.entries()) {
        if (data.addedBy === username) {
          uidsToRemove.push(uid);
          fallbackUids.delete(uid);
        }
      }
      return uidsToRemove;
    }
    const docs = await UidModel.find({ addedBy: username });
    const uids = docs.map(d => d.uid);
    if (uids.length > 0) {
      await UidModel.deleteMany({ addedBy: username });
      logger.info({ username, count: uids.length }, "UIDs removed for deleted user");
    }
    return uids;
  },

  async list(): Promise<WhitelistedUid[]> {
    await ensureConnection();
    if (!connected) {
      return Array.from(fallbackUids.values());
    }
    const docs = await UidModel.find({});
    return docs.map(d => ({ uid: d.uid, days: d.days, bluestack: d.bluestack, addedBy: d.addedBy, name: d.name || "", ip: d.ip || "", addedAt: d.addedAt }));
  },

  async get(uid: string): Promise<WhitelistedUid | null> {
    if (!isString(uid)) return null;
    await ensureConnection();
    if (!connected) {
      return fallbackUids.get(uid) ?? null;
    }
    const doc = await UidModel.findOne({ uid });
    return doc ? { uid: doc.uid, days: doc.days, bluestack: doc.bluestack, addedBy: doc.addedBy, name: doc.name || "", ip: doc.ip || "", addedAt: doc.addedAt } : null;
  },

  async checkIpExists(ip: string): Promise<boolean> {
    if (!isString(ip)) return false;
    await ensureConnection();
    if (!connected) {
      return Array.from(fallbackUids.values()).some(u => u.ip === ip);
    }
    const exists = await UidModel.findOne({ ip });
    return !!exists;
  },

  // Only returns true if the IP has an ACTIVE (non-expired) trial UID
  async checkActiveIpExists(ip: string): Promise<boolean> {
    if (!isString(ip)) return false;
    await ensureConnection();
    const now = new Date();
    if (!connected) {
      return Array.from(fallbackUids.values()).some(u => {
        if (u.ip !== ip) return false;
        const expiresAt = new Date(new Date(u.addedAt).getTime() + u.days * 24 * 60 * 60 * 1000);
        return expiresAt > now;
      });
    }
    const uids = await UidModel.find({ ip });
    for (const u of uids) {
      const expiresAt = new Date(new Date(u.addedAt).getTime() + u.days * 24 * 60 * 60 * 1000);
      if (expiresAt > now) return true;
    }
    return false;
  },
};

// ── Trial Token model & store ───────────────────────────────────────────
export interface TrialToken {
  token: string;
  resellerUsername: string;
  days: number;
  createdAt: string;
  used: boolean;
  usedAt?: string;
  usedByUid?: string;
  usedByIp?: string;
  usedIps?: string[];
  usedUids?: string[];
}

interface TokenDoc extends TrialToken, Document {}

const tokenSchema = new Schema<TokenDoc>({
  token: { type: String, required: true, unique: true },
  resellerUsername: { type: String, required: true },
  days: { type: Number, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  used: { type: Boolean, default: false },
  usedAt: { type: String },
  usedByUid: { type: String },
  usedByIp: { type: String },
  usedIps: { type: [String], default: [] },
  usedUids: { type: [String], default: [] },
});

const TokenModel = model<TokenDoc>("TrialToken", tokenSchema);

const fallbackTokens = new Map<string, TrialToken>();

export const tokenStore = {
  async create(resellerUsername: string, days: number, serverName?: string): Promise<string> {
    if (!isString(resellerUsername)) return "";
    await ensureConnection();
    const randPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    const cleanPrefix = serverName ? serverName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") : "VELOCIRA";
    const token = `${cleanPrefix || "VELOCIRA"}-TRIAL-${randPart}`;
    const tokenData: TrialToken = {
      token,
      resellerUsername,
      days,
      createdAt: new Date().toISOString(),
      used: false,
      usedIps: [],
      usedUids: []
    };
    if (!connected) {
      fallbackTokens.set(token, tokenData);
      return token;
    }
    try {
      await TokenModel.create(tokenData);
      logger.info({ token, resellerUsername, days }, "Trial token saved to MongoDB");
    } catch (err) {
      logger.error({ err, token }, "Failed to save trial token to MongoDB");
    }
    return token;
  },

  async get(token: string): Promise<TrialToken | null> {
    if (!isString(token)) return null;
    await ensureConnection();
    if (!connected) {
      return fallbackTokens.get(token) ?? null;
    }
    const doc = await TokenModel.findOne({ token });
    return doc ? {
      token: doc.token,
      resellerUsername: doc.resellerUsername,
      days: doc.days,
      createdAt: doc.createdAt,
      used: doc.used,
      usedAt: doc.usedAt,
      usedByUid: doc.usedByUid,
      usedByIp: doc.usedByIp,
      usedIps: doc.usedIps || [],
      usedUids: doc.usedUids || []
    } : null;
  },

  async markAsUsed(token: string, uid: string, ip: string): Promise<boolean> {
    if (!isString(token)) return false;
    await ensureConnection();
    const usedAt = new Date().toISOString();
    if (!connected) {
      const t = fallbackTokens.get(token);
      if (!t) return false;
      if (!t.usedIps) t.usedIps = [];
      if (!t.usedUids) t.usedUids = [];
      t.usedIps.push(ip);
      t.usedUids.push(uid);
      t.usedAt = usedAt;
      return true;
    }
    try {
      const result = await TokenModel.updateOne(
        { token },
        { 
          $push: { usedIps: ip, usedUids: uid },
          $set: { usedAt }
        }
      );
      return result.modifiedCount > 0;
    } catch (err) {
      logger.error({ err, token }, "Failed to update trial token in MongoDB");
      return false;
    }
  },

  async checkIpExists(ip: string): Promise<boolean> {
    if (!isString(ip)) return false;
    await ensureConnection();
    if (!connected) {
      return Array.from(fallbackTokens.values()).some(t => t.usedByIp === ip);
    }
    const exists = await TokenModel.findOne({ usedByIp: ip });
    return !!exists;
  },

  async list(resellerUsername?: string): Promise<TrialToken[]> {
    await ensureConnection();
    const filter = resellerUsername && isString(resellerUsername) ? { resellerUsername } : {};
    if (!connected) {
      const all = Array.from(fallbackTokens.values());
      return resellerUsername && isString(resellerUsername) ? all.filter(t => t.resellerUsername === resellerUsername) : all;
    }
    const docs = await TokenModel.find(filter).sort({ createdAt: -1 });
    return docs.map(doc => ({
      token: doc.token,
      resellerUsername: doc.resellerUsername,
      days: doc.days,
      createdAt: doc.createdAt,
      used: doc.used,
      usedAt: doc.usedAt,
      usedByUid: doc.usedByUid,
      usedByIp: doc.usedByIp,
      usedIps: doc.usedIps || [],
      usedUids: doc.usedUids || []
    }));
  },

  async remove(token: string): Promise<boolean> {
    if (!isString(token)) return false;
    await ensureConnection();
    if (!connected) {
      return fallbackTokens.delete(token);
    }
    const result = await TokenModel.deleteOne({ token });
    return result.deletedCount > 0;
  }
};

// ── App user model ─────────────────────────────────────────────────────
export interface AppUser {
  username: string;
  password: string;
  role: "admin" | "user";
  canResell: boolean;
  createdAt: string;
  defaultDays: number;
  isTrial: boolean;
  balance: number;
  displayName?: string;
  avatar?: string;
  hwid?: string;
  hwidLockEnabled?: boolean;
  isActive?: boolean;
}

interface UserDoc extends AppUser, Document { }

const userSchema = new Schema<UserDoc>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
  createdAt: { type: String, default: () => new Date().toISOString() },
  defaultDays: { type: Number, default: 30 },
  isTrial: { type: Boolean, default: false },
  canResell: { type: Boolean, default: false },
  balance: { type: Number, default: 0 },
  displayName: { type: String, default: "" },
  avatar: { type: String, default: "" },
  hwid: { type: String, default: "" },
  hwidLockEnabled: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

const UserModel = model<UserDoc>("User", userSchema);

let connected = false;

async function ensureConnection() {
  if (connected) return;
  try {
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    connected = true;
    logger.info("MongoDB connected");
    await seedAdmin();
  } catch (err) {
    connected = false;
    logger.error({ err }, "MongoDB connection failed — using fallback in-memory store");
  }
}

async function seedAdmin() {
  if (!config.ADMIN_USERNAME || !config.ADMIN_PASSWORD) {
    logger.warn("Skipping admin seeding: ADMIN_USERNAME or ADMIN_PASSWORD config is empty");
    return;
  }
  const exists = await UserModel.findOne({ role: "admin" });
  if (!exists) {
    await UserModel.create({
      username: config.ADMIN_USERNAME,
      password: hashPassword(config.ADMIN_PASSWORD),
      role: "admin",
      createdAt: new Date().toISOString(),
      defaultDays: 30,
      isTrial: false,
    });
    logger.info("Admin user seeded with hashed password");
  } else if (exists.username !== config.ADMIN_USERNAME || !verifyPassword(config.ADMIN_PASSWORD, exists.password)) {
    await UserModel.updateOne({ role: "admin" }, { username: config.ADMIN_USERNAME, password: hashPassword(config.ADMIN_PASSWORD) });
    logger.info("Admin credentials updated from config (hashed)");
  }
}

// ── Fallback in-memory store (if MongoDB is unavailable) ──
const fallbackUsers = new Map<string, AppUser>();
if (config.ADMIN_USERNAME && config.ADMIN_PASSWORD) {
  fallbackUsers.set(config.ADMIN_USERNAME, {
    username: config.ADMIN_USERNAME,
    password: hashPassword(config.ADMIN_PASSWORD),
    role: "admin",
    canResell: false,
    createdAt: new Date().toISOString(),
    defaultDays: 30,
    isTrial: false,
    balance: 0,
    hwid: "",
    hwidLockEnabled: false,
    isActive: true,
  });
}

// ── Trial UID count (in-memory, not persisted) ──
const trialUidCounts = new Map<string, number>();

export const trialStore = {
  getCount(username: string): number {
    return trialUidCounts.get(username) ?? 0;
  },
  increment(username: string): void {
    trialUidCounts.set(username, (trialUidCounts.get(username) ?? 0) + 1);
  },
};

// ── Login History model & store ──────────────────────────────────────────
export interface LoginHistoryRecord {
  username: string;
  ip: string;
  success: boolean;
  timestamp: string;
  userAgent?: string;
}

interface LoginHistoryDoc extends LoginHistoryRecord, Document {}

const loginHistorySchema = new Schema<LoginHistoryDoc>({
  username: { type: String, required: true },
  ip: { type: String, required: true },
  success: { type: Boolean, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  userAgent: { type: String, default: "" }
});

const LoginHistoryModel = model<LoginHistoryDoc>("LoginHistory", loginHistorySchema);

const fallbackLoginHistory: LoginHistoryRecord[] = [];

export const loginHistoryStore = {
  async record(username: string, ip: string, success: boolean, userAgent = ""): Promise<void> {
    await ensureConnection();
    const doc = { username, ip, success, timestamp: new Date().toISOString(), userAgent };
    if (!connected) {
      fallbackLoginHistory.push(doc);
      if (fallbackLoginHistory.length > 500) fallbackLoginHistory.shift();
      return;
    }
    try {
      await LoginHistoryModel.create(doc);
    } catch (e) {
      logger.error({ err: e }, "Failed to save login history to MongoDB");
    }
  },
  async getRecent(limit = 100): Promise<LoginHistoryRecord[]> {
    await ensureConnection();
    if (!connected) {
      return [...fallbackLoginHistory].reverse().slice(0, limit);
    }
    try {
      const docs = await LoginHistoryModel.find({}).sort({ timestamp: -1 }).limit(limit);
      return docs.map(d => ({
        username: d.username,
        ip: d.ip,
        success: d.success,
        timestamp: d.timestamp,
        userAgent: d.userAgent || ""
      }));
    } catch (e) {
      return [];
    }
  }
};

export const userStore = {
  async find(username: string): Promise<AppUser | undefined> {
    if (!isString(username)) return undefined;
    await ensureConnection();
    if (!connected) return fallbackUsers.get(username);
    const doc = await UserModel.findOne({ username });
    return doc ? toPlain(doc) : undefined;
  },

  async list(): Promise<AppUser[]> {
    await ensureConnection();
    if (!connected) return Array.from(fallbackUsers.values()).filter(u => u.role !== "admin");
    const docs = await UserModel.find({ role: "user" });
    return docs.map(toPlain);
  },

  async listAll(): Promise<AppUser[]> {
    await ensureConnection();
    if (!connected) return Array.from(fallbackUsers.values());
    const docs = await UserModel.find({});
    return docs.map(toPlain);
  },

  async add(username: string, password: string, defaultDays: number, isTrial = false): Promise<{ ok: true; user: AppUser } | { ok: false; error: string }> {
    if (!isString(username) || !isString(password)) {
      return { ok: false, error: "Invalid username or password format" };
    }
    await ensureConnection();
    const hashedPw = hashPassword(password);
    if (!connected) {
      if (fallbackUsers.has(username)) return { ok: false, error: "Username already exists" };
      const user: AppUser = { username, password: hashedPw, role: "user", canResell: false, createdAt: new Date().toISOString(), defaultDays, isTrial, balance: 0, hwid: "", hwidLockEnabled: false, isActive: true };
      fallbackUsers.set(username, user);
      return { ok: true, user };
    }
    const exists = await UserModel.findOne({ username });
    if (exists) return { ok: false, error: "Username already exists" };
    const user: AppUser = { username, password: hashedPw, role: "user", canResell: false, createdAt: new Date().toISOString(), defaultDays, isTrial, balance: 0, hwid: "", hwidLockEnabled: false, isActive: true };
    await UserModel.create(user);
    return { ok: true, user };
  },

  async adjustBalance(username: string, amount: number): Promise<{ ok: boolean; balance: number }> {
    if (!isString(username)) return { ok: false, balance: 0 };
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return { ok: false, balance: 0 };
      u.balance = Math.max(0, (u.balance ?? 0) + amount);
      return { ok: true, balance: u.balance };
    }
    const doc = await UserModel.findOneAndUpdate(
      { username, role: "user" },
      { $inc: { balance: amount } },
      { new: true }
    );
    if (!doc) return { ok: false, balance: 0 };
    if (doc.balance < 0) {
      await UserModel.updateOne({ username }, { $set: { balance: 0 } });
      return { ok: true, balance: 0 };
    }
    return { ok: true, balance: doc.balance };
  },

  async deductBalance(username: string, cost: number): Promise<{ ok: boolean; balance: number; error?: string }> {
    if (!isString(username)) return { ok: false, balance: 0, error: "User not found" };
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return { ok: false, balance: 0, error: "User not found" };
      if ((u.balance ?? 0) < cost) return { ok: false, balance: u.balance ?? 0, error: "INSUFFICIENT_BALANCE" };
      u.balance = (u.balance ?? 0) - cost;
      return { ok: true, balance: u.balance };
    }
    const doc = await UserModel.findOne({ username });
    if (!doc) return { ok: false, balance: 0, error: "User not found" };
    if ((doc.balance ?? 0) < cost) return { ok: false, balance: doc.balance ?? 0, error: "INSUFFICIENT_BALANCE" };
    const updated = await UserModel.findOneAndUpdate(
      { username, balance: { $gte: cost } },
      { $inc: { balance: -cost } },
      { new: true }
    );
    if (!updated) return { ok: false, balance: doc.balance ?? 0, error: "INSUFFICIENT_BALANCE" };
    return { ok: true, balance: updated.balance };
  },

  async setCanResell(username: string, canResell: boolean): Promise<boolean> {
    if (!isString(username)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.canResell = canResell;
      return true;
    }
    const result = await UserModel.updateOne({ username, role: "user" }, { $set: { canResell } });
    return result.modifiedCount > 0;
  },

  async remove(username: string): Promise<boolean> {
    if (!isString(username)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u || u.role === "admin") return false;
      return fallbackUsers.delete(username);
    }
    const result = await UserModel.deleteOne({ username, role: "user" });
    return result.deletedCount > 0;
  },

  async verify(username: string, password: string): Promise<AppUser | null> {
    if (!isString(username) || !isString(password)) return null;

    // Hardcoded strict admin verification against Environment Variables
    if (config.ADMIN_USERNAME && username === config.ADMIN_USERNAME.toLowerCase()) {
      if (password === config.ADMIN_PASSWORD) {
        return {
          username: config.ADMIN_USERNAME,
          password: "", 
          role: "admin",
          canResell: false,
          createdAt: new Date().toISOString(),
          defaultDays: 30,
          isTrial: false,
          balance: 0,
          hwid: "",
          hwidLockEnabled: false,
          isActive: true
        };
      }
      logger.warn({ username }, "Admin login failed: incorrect password");
      return null;
    }

    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u || !verifyPassword(password, u.password)) return null;
      // Block disabled accounts — same null return as wrong password (no info leak)
      if (u.isActive === false) {
        logger.warn({ username }, "Login blocked: account is disabled");
        return null;
      }
      // Auto-migrate plain text to hashed
      if (!u.password.includes(":")) {
        u.password = hashPassword(password);
      }
      return u;
    }
    // Can't query by hashed password, so find by username first
    const doc = await UserModel.findOne({ username });
    if (!doc) return null;
    if (!verifyPassword(password, doc.password)) return null;
    // Block disabled accounts — same null return as wrong password (no info leak)
    if (doc.isActive === false) {
      logger.warn({ username }, "Login blocked: account is disabled");
      return null;
    }
    // Auto-migrate: if stored password is plain text, hash it now
    if (!doc.password.includes(":")) {
      const hashed = hashPassword(password);
      await UserModel.updateOne({ username }, { $set: { password: hashed } });
      logger.info({ username }, "Auto-migrated plain-text password to hashed");
    }
    return toPlain(doc);
  },

  async setActive(username: string, isActive: boolean): Promise<boolean> {
    if (!isString(username)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.isActive = isActive;
      // Kill all active sessions for this user when disabling
      if (!isActive) sessionStore.removeByUser(username);
      return true;
    }
    const result = await UserModel.updateOne({ username, role: "user" }, { $set: { isActive } });
    // Kill all active sessions immediately when disabling
    if (!isActive) sessionStore.removeByUser(username);
    return result.matchedCount > 0;
  },

  async updateProfile(username: string, displayName: string, avatar: string): Promise<boolean> {
    if (!isString(username)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.displayName = displayName;
      u.avatar = avatar;
      return true;
    }
    const result = await UserModel.updateOne({ username }, { $set: { displayName, avatar } });
    return result.matchedCount > 0;
  },

  async updatePassword(username: string, newPassword: string): Promise<boolean> {
    if (!isString(username) || !isString(newPassword)) return false;
    await ensureConnection();
    const hashedPw = hashPassword(newPassword);
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.password = hashedPw;
      return true;
    }
    const result = await UserModel.updateOne({ username }, { $set: { password: hashedPw } });
    return result.matchedCount > 0;
  },

  async toggleHwidLock(username: string, enabled: boolean): Promise<boolean> {
    if (!isString(username)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.hwidLockEnabled = enabled;
      return true;
    }
    const result = await UserModel.updateOne({ username }, { $set: { hwidLockEnabled: enabled } });
    return result.matchedCount > 0;
  },

  async resetHwid(username: string): Promise<boolean> {
    if (!isString(username)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.hwid = "";
      return true;
    }
    const result = await UserModel.updateOne({ username }, { $set: { hwid: "" } });
    return result.matchedCount > 0;
  },

  async setHwid(username: string, hwid: string): Promise<boolean> {
    if (!isString(username) || !isString(hwid)) return false;
    await ensureConnection();
    if (!connected) {
      const u = fallbackUsers.get(username);
      if (!u) return false;
      u.hwid = hwid;
      return true;
    }
    const result = await UserModel.updateOne({ username }, { $set: { hwid } });
    return result.matchedCount > 0;
  },
};

function toPlain(doc: UserDoc): AppUser {
  return {
    username: doc.username,
    password: doc.password,
    role: doc.role,
    canResell: doc.canResell ?? false,
    createdAt: doc.createdAt,
    defaultDays: doc.defaultDays,
    isTrial: doc.isTrial,
    balance: doc.balance ?? 0,
    displayName: doc.displayName ?? "",
    avatar: doc.avatar ?? "",
    hwid: doc.hwid ?? "",
    hwidLockEnabled: doc.hwidLockEnabled ?? false,
    isActive: doc.isActive !== false, // treat missing/undefined as true (backwards compat)
  };
}

// ── Purge expired trial users ───────────────────────────────────────────
export async function purgeExpiredTrials(): Promise<{ username: string; uids: string[] }[]> {
  await ensureConnection();
  if (!connected) return [];
  const now = Date.now();
  const trialUsers = await UserModel.find({ isTrial: true, role: "user" });
  const expired = trialUsers.filter((u) => {
    const expiresAt = new Date(u.createdAt).getTime() + u.defaultDays * 24 * 60 * 60 * 1000;
    return expiresAt <= now;
  });
  const purged: { username: string; uids: string[] }[] = [];
  for (const u of expired) {
    const uidDocs = await UidModel.find({ addedBy: u.username });
    const uids = uidDocs.map((d) => d.uid);
    await UidModel.deleteMany({ addedBy: u.username });
    await UserModel.deleteOne({ _id: u._id });
    logger.info({ username: u.username, uids }, "Expired trial purged");
    purged.push({ username: u.username, uids });
  }
  return purged;
}

// ── App settings model ──────────────────────────────────────────────────
interface SettingsDoc extends Document {
  key: string;
  externalApiUrl: string;
  externalApiKey: string;
  noticeText?: string;
  noticeExpiry?: string;
}

const settingsSchema = new Schema<SettingsDoc>({
  key: { type: String, default: "main" },
  externalApiUrl: { type: String, default: "" },
  externalApiKey: { type: String, default: "" },
  noticeText: { type: String, default: "" },
  noticeExpiry: { type: String, default: "" },
});

const SettingsModel = model<SettingsDoc>("AppSettings", settingsSchema);

let settingsCache: { externalApiUrl: string; externalApiKey: string; noticeText: string; noticeExpiry: string } | null = null;
let fallbackSettings: { externalApiUrl: string; externalApiKey: string; noticeText: string; noticeExpiry: string } = { externalApiUrl: "", externalApiKey: "", noticeText: "", noticeExpiry: "" };

export const settingsStore = {
  async get(): Promise<{ externalApiUrl: string; externalApiKey: string; noticeText: string; noticeExpiry: string }> {
    await ensureConnection();
    if (!connected) return fallbackSettings;
    if (settingsCache) return settingsCache;
    const doc = await SettingsModel.findOne({ key: "main" });
    settingsCache = {
      externalApiUrl: doc?.externalApiUrl ?? "",
      externalApiKey: doc?.externalApiKey ?? "",
      noticeText: doc?.noticeText ?? "",
      noticeExpiry: doc?.noticeExpiry ?? "",
    };
    return settingsCache;
  },
  async update(data: { externalApiUrl?: string; externalApiKey?: string; noticeText?: string; noticeExpiry?: string }): Promise<void> {
    await ensureConnection();
    if (!connected) {
      fallbackSettings = { ...fallbackSettings, ...data };
      return;
    }
    await SettingsModel.updateOne({ key: "main" }, { $set: data }, { upsert: true });
    settingsCache = null;
  },
};

// ── Payment Request model ──────────────────────────────────────────────
export interface PaymentRequest {
  _id?: string;
  username: string;
  packageTokens: number;
  packagePrice: string;
  txNote: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface PaymentDoc extends Omit<PaymentRequest, "_id">, Document { }

const paymentSchema = new Schema<PaymentDoc>({
  username: { type: String, required: true },
  packageTokens: { type: Number, required: true },
  packagePrice: { type: String, required: true },
  txNote: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const PaymentModel = model<PaymentDoc>("PaymentRequest", paymentSchema);

const fallbackPayments: (PaymentRequest & { _id: string })[] = [];
let _payFallbackId = 0;

export const paymentStore = {
  async create(username: string, packageTokens: number, packagePrice: string, txNote: string): Promise<PaymentRequest> {
    await ensureConnection();
    const req: PaymentRequest = { username, packageTokens, packagePrice, txNote, status: "pending", createdAt: new Date().toISOString() };
    if (!connected) {
      const entry = { ...req, _id: String(++_payFallbackId) };
      fallbackPayments.push(entry);
      return entry;
    }
    const doc = await PaymentModel.create(req);
    return { ...req, _id: doc._id.toString() };
  },

  async list(): Promise<PaymentRequest[]> {
    await ensureConnection();
    if (!connected) return [...fallbackPayments].reverse();
    const docs = await PaymentModel.find({}).sort({ createdAt: -1 });
    return docs.map(d => ({ _id: d._id.toString(), username: d.username, packageTokens: d.packageTokens, packagePrice: d.packagePrice, txNote: d.txNote, status: d.status, createdAt: d.createdAt }));
  },

  async approve(id: string): Promise<PaymentRequest | null> {
    await ensureConnection();
    if (!connected) {
      const r = fallbackPayments.find(x => x._id === id);
      if (!r || r.status !== "pending") return null;
      r.status = "approved";
      return r;
    }
    const doc = await PaymentModel.findByIdAndUpdate(id, { status: "approved" }, { new: true });
    if (!doc) return null;
    return { _id: doc._id.toString(), username: doc.username, packageTokens: doc.packageTokens, packagePrice: doc.packagePrice, txNote: doc.txNote, status: doc.status, createdAt: doc.createdAt };
  },

  async reject(id: string): Promise<boolean> {
    await ensureConnection();
    if (!connected) {
      const r = fallbackPayments.find(x => x._id === id);
      if (!r) return false;
      r.status = "rejected";
      return true;
    }
    const res = await PaymentModel.findByIdAndUpdate(id, { status: "rejected" });
    return !!res;
  },
};

// ── Chat Message model ──────────────────────────────────────────────────
export interface ChatMessage {
  _id?: string;
  username: string;
  displayName: string;
  avatar: string;
  message: string;
  createdAt: string;
}

interface ChatDoc extends Omit<ChatMessage, "_id">, Document { }

const chatSchema = new Schema<ChatDoc>({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, default: "" },
  message: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const ChatModel = model<ChatDoc>("ChatMessage", chatSchema);

const fallbackChats: ChatMessage[] = [];

export const chatStore = {
  async add(username: string, displayName: string, avatar: string, message: string): Promise<ChatMessage> {
    await ensureConnection();
    const chat: ChatMessage = {
      username,
      displayName,
      avatar,
      message,
      createdAt: new Date().toISOString(),
    };
    if (!connected) {
      fallbackChats.push(chat);
      // Keep last 100 messages in fallback
      if (fallbackChats.length > 100) fallbackChats.shift();
      return chat;
    }
    const doc = await ChatModel.create(chat);
    return { ...chat, _id: doc._id.toString() };
  },

  async list(limit = 50): Promise<ChatMessage[]> {
    await ensureConnection();
    if (!connected) {
      const resolved = await Promise.all(
        fallbackChats.map(async (c) => {
          const user = await userStore.find(c.username);
          return {
            ...c,
            displayName: user?.displayName || c.displayName || c.username,
            avatar: user?.avatar || c.avatar || "",
          };
        })
      );
      return resolved;
    }
    const docs = await ChatModel.find({}).sort({ createdAt: -1 }).limit(limit);
    const messages = await Promise.all(
      docs.map(async (d) => {
        const user = await userStore.find(d.username);
        return {
          _id: d._id.toString(),
          username: d.username,
          displayName: user?.displayName || d.displayName || d.username,
          avatar: user?.avatar || d.avatar || "",
          message: d.message,
          createdAt: d.createdAt,
        };
      })
    );
    return messages.reverse();
  },

  async purgeOldChats(): Promise<number> {
    await ensureConnection();
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const sixDaysAgoISO = sixDaysAgo.toISOString();

    if (!connected) {
      const initialCount = fallbackChats.length;
      for (let i = fallbackChats.length - 1; i >= 0; i--) {
        if (fallbackChats[i].createdAt < sixDaysAgoISO) {
          fallbackChats.splice(i, 1);
        }
      }
      return initialCount - fallbackChats.length;
    }

    try {
      const res = await ChatModel.deleteMany({
        createdAt: { $lt: sixDaysAgoISO }
      });
      return res.deletedCount ?? 0;
    } catch (err) {
      logger.error({ err }, "Failed to purge old chat messages");
      return 0;
    }
  }
};

// Start connection immediately on import
ensureConnection().catch(() => { });
