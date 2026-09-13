import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { readDB, writeDB, type User } from "./db";

export const COOKIE = "mpl_session";

export const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compareSync(pw, hash);

export async function createSession(userId: string) {
  const token = randomBytes(24).toString("hex");
  const db = readDB();
  db.sessions = db.sessions.filter((s) => s.user_id !== userId);
  db.sessions.push({ token, user_id: userId, created_at: new Date().toISOString() });
  writeDB(db);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = readDB();
    db.sessions = db.sessions.filter((s) => s.token !== token);
    writeDB(db);
  }
  store.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const db = readDB();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  return db.users.find((u) => u.id === session.user_id) ?? null;
}

/** Strip secrets before serializing a user to the client. */
export function publicUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    profile_pic_url: u.profile_pic_url,
    company: u.company,
    company_size: u.company_size,
    industry: u.industry,
    onboarded: u.onboarded,
    created_at: u.created_at,
  };
}
