import { db } from "./client";
import type { User } from "@/lib/db";

/** Look up a user by email (citext column -> case-insensitive match). */
export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}

/** Find a user whose profile_pic_url matches (/api/files/<name>). */
export async function findUserByProfilePic(url: string): Promise<User | null> {
  const { data, error } = await db()
    .from("users")
    .select("*")
    .eq("profile_pic_url", url)
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}

export async function insertUser(user: User): Promise<User> {
  const { data, error } = await db().from("users").insert(user).select("*").single();
  if (error) throw error;
  return data as User;
}

/** Patch selected columns on a user; returns the updated row. */
export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  const { data, error } = await db()
    .from("users")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as User;
}
