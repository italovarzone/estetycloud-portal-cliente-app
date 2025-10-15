import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

// fallback caso CMS não responda
const FALLBACK = {
  brand: {
    name: "Estety Cloud",
    logo: "/assets/images/logo_fundo_transp.png",
    primary: "#9d8983",
    accent: "#bca49d",
  },
  hero: {
    title: "Estety Cloud",
    subtitle: "Portal do Cliente",
  },
};

/**
 * Resolve a base URL corretamente, tanto no SSR quanto no client.
 */
function safeBaseUrl(): string {
  try {
    // 🔹 Tenta resolver via headers (SSR)
    const h = headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // 🔹 headers() não existe (provável client ou build)
  }

  // 🔹 Fallback: usa window.location.origin no client
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // 🔹 Fallback final: variável de ambiente (útil na Vercel)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  throw new Error("❌ Não foi possível resolver a base URL (nem SSR nem client)");
}

/**
 * Busca o CMS do tenant.
 */
export async function getCms(tenantId: string) {
  noStore();

  try {
    const base = safeBaseUrl();
    const url = `${base}/api/cms/${tenantId}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`CMS ${r.status}`);
    const json = await r.json();
    return { ...FALLBACK, ...json };
  } catch (err) {
    console.error("[getCms] erro CMS:", err);
    return FALLBACK;
  }
}
