import LandingClient from "./LandingClient";
import TenantBoot from "./TenantBoot";

export const revalidate = 60;

async function getCms(tenantId: string) {
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cms/${tenantId}`, { cache: "no-store" });
  return r.json();
}

export default async function TenantLanding({ params: { tenantId } }: { params: { tenantId: string } }) {
  const data = await getCms(tenantId);

  return (
    <main className="bg-[#f8f9fa] text-[#1D1411]">
      {/* injeta tenantId no localStorage p/ x-tenant */}
      <TenantBoot tenantId={tenantId} />
      <LandingClient tenantId={tenantId} data={data} />
    </main>
  );
}
