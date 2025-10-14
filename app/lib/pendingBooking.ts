// app/lib/pendingBooking.ts
const KEY = "pendingAppointment";
const TTL_MS = 10 * 60 * 1000; // 10min

export type PendingPayload = {
  tenantId: string;
  isEditing?: boolean;
  editId?: string | null;
  payload: { date: string; time: string; procedures: { _id: string; name: string; price: number }[] };
  ts: number;
};

export function savePending(p: Omit<PendingPayload, "ts">) {
  const obj: PendingPayload = { ...p, ts: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(obj));
}

export function readPending(): PendingPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PendingPayload;
    if (Date.now() - (data.ts || 0) > TTL_MS) { sessionStorage.removeItem(KEY); return null; }
    return data;
  } catch { return null; }
}

export function clearPending() {
  sessionStorage.removeItem(KEY);
}
