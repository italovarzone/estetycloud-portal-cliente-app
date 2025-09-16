export const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000";

export function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
}

export function isValidPassword(pw: string) {
  return !!pw && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

export function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}
