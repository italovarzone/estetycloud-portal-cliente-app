import LandingClient from "./LandingClient";
import TenantBoot from "./TenantBoot";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic"; // impede SSG
export const revalidate = 0;            // nada de HTML estático

async function getCms(tenantId: string) {
  noStore(); // garante que este request não usa cache
  try {
    const r = await fetch(`/api/cms/${tenantId}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`CMS ${r.status}`);
    return await r.json();
  } catch (e) {
    return {
      ok: false,
      _error: String(e),
      branding: { name: "Estety Cloud", primaryColor: "#bca49d" },
      hero: { title: "Conteúdo indisponível no momento", subtitle: "", cover: "" },
      services: [],
      gallery: [],
      about: {},
      contact: {}
    };
  }
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
