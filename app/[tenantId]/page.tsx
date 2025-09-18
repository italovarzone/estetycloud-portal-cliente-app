import LandingClient from "./LandingClient";
import TenantBoot from "./TenantBoot";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { unstable_noStore as noStore } from "next/cache";

async function getCms(tenantId: string) {
  noStore();
  const r = await fetch(`/api/cms/${tenantId}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`CMS ${r.status}`);
  return r.json();
}

export default async function TenantLanding({ params: { tenantId } }: { params: { tenantId: string } }) {
  const data = await getCms(tenantId);

  return (
    <main className="bg-[#f8f9fa] text-[#1D1411]">
      <TenantBoot tenantId={tenantId} />
      <LandingClient tenantId={tenantId} data={data} />
    </main>
  );
}
