import { api, getToken } from "./api";
import { clearAuthToken } from "./authToken";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: "customer" | "venue_owner" | "admin" | "staff";
  points?: number;
  avatarUrl?: string | null;
};

export async function fetchAuthMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return await api<AuthUser>("/api/auth/me", { token });
  } catch {
    return null;
  }
}

export async function logoutClient() {
  if (typeof window === "undefined") return;
  await clearAuthToken();
  localStorage.removeItem("gozalo_dashboard_venue_id");
}

export async function updateAuthProfile(body: {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}): Promise<AuthUser> {
  return api<AuthUser>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
