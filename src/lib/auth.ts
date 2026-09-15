import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { type User } from "./db";
import { createSessionRow, deleteSessionByToken, findSessionUserId } from "./data/sessions";
import { findUserById } from "./data/users";

export const COOKIE = "mpl_session";

export const hashPassword = (pw: string) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compareSync(pw, hash);

export async function createSession(userId: string) {
  const token = randomBytes(24).toString("hex");
  await createSessionRow(token, userId);
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
  if (token) await deleteSessionByToken(token);
  store.delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const userId = await findSessionUserId(token);
  if (!userId) return null;
  return findUserById(userId);
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
