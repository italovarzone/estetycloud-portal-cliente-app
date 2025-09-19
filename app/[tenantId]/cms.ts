import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";

function absoluteBaseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "http";
  if (!host) throw new Error("Host header ausente");
  return `${proto}://${host}`;
}

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

export async function getCms(tenantId: string) {
  noStore();
  try {
    const base = absoluteBaseUrl();
    const r = await fetch(`${base}/api/cms/${tenantId}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`CMS ${r.status}`);
    const json = await r.json();
    return { ...FALLBACK, ...json };
  } catch (err) {
    console.error("[getCms] erro CMS:", err);
    return FALLBACK;
  }
}
