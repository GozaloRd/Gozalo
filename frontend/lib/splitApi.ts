import { api, getToken } from "./api";

export type SplitStatus = "open" | "complete" | "cancelled";
export type ParticipantStatus = "invited" | "paid" | "declined";

export type SplitParticipant = {
  id: string;
  splitId: string;
  userId?: string;
  email?: string;
  nickname?: string;
  status: ParticipantStatus;
  paidAt?: string;
  user?: { id: string; fullName: string };
};

export type SplitPayment = {
  id: string;
  organizerUserId: string;
  targetType: "ticket" | "reservation";
  targetId: string;
  eventId: string;
  totalAmount: number;
  parts: number;
  shareAmount: number;
  status: SplitStatus;
  inviteToken: string;
  expiresAt?: string;
  participants?: SplitParticipant[];
  organizer?: { id: string; fullName: string };
  event?: { id: string; title: string; startAt: string; coverImageUrl?: string };
};

export type CreateSplitResult = {
  id: string;
  inviteToken: string;
  shareAmount: number;
  totalAmount: number;
  parts: number;
  expiresAt: string;
  inviteLink: string;
  targetTitle: string;
};

export async function createSplit(body: {
  targetType: "ticket" | "reservation";
  targetId: string;
  parts: number;
  nicknames?: string[];
}) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<CreateSplitResult>(`/api/split`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function getSplitByToken(inviteToken: string) {
  return api<SplitPayment>(`/api/split/token/${inviteToken}`);
}

export async function payMyShare(inviteToken: string) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ splitId: string; shareAmount: number; allPaid: boolean; status: SplitStatus }>(
    `/api/split/token/${inviteToken}/pay`,
    { method: "POST", token }
  );
}

export async function fetchMySplits() {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ data: SplitPayment[] }>(`/api/split/my`, { token });
}
