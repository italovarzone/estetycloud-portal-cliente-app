// app/lib/auth.ts
export function getClientToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("clientPortalToken") || "";
}
