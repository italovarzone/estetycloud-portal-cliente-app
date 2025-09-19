import { getCms } from "./cms";
import LandingClient from "./LandingClient";
import TenantBoot from "./TenantBoot";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const RESERVED = new Set([
  "favicon.ico", "icon.png", "apple-touch-icon.png",
  "robots.txt", "sitemap.xml"
]);

export default async function TenantLanding({
  params: { tenantId },
}: {
  params: { tenantId: string };
}) {
  if (RESERVED.has(tenantId)) notFound();

  const data = await getCms(tenantId);

  return (
    <main className="bg-[#f8f9fa] text-[#1D1411]">
      <TenantBoot tenantId={tenantId} />
      <LandingClient tenantId={tenantId} data={data} />
    </main>
  );
}
