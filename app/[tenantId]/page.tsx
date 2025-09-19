  import LandingClient from "./LandingClient";
  import TenantBoot from "./TenantBoot";
  import { unstable_noStore as noStore } from "next/cache";
  import { headers } from "next/headers";
  import { notFound } from "next/navigation";

  export const dynamic = "force-dynamic";
  export const revalidate = 0;
  export const runtime = "nodejs";

  const RESERVED = new Set([
    "favicon.ico", "icon.png", "apple-touch-icon.png",
    "robots.txt", "sitemap.xml"
  ]);

  function absoluteBaseUrl() {
    const h = headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    if (!host) throw new Error("Host header ausente");
    return `${proto}://${host}`;
  }

  async function getCms(tenantId: string) {
    noStore();
    const base = absoluteBaseUrl();              // <<< constrói base absoluta
    const r = await fetch(`${base}/api/cms/${tenantId}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`CMS ${r.status}`);
    return r.json();
  }

  export default async function TenantLanding({ params: { tenantId } }: { params: { tenantId: string } }) {
    if (RESERVED.has(tenantId)) notFound();      // <<< não deixe "favicon.ico" cair aqui

    const data = await getCms(tenantId);

    return (
      <main className="bg-[#f8f9fa] text-[#1D1411]">
        <TenantBoot tenantId={tenantId} />
        <LandingClient tenantId={tenantId} data={data} />
      </main>
    );
  }
