import LandingClient from "./LandingClient";
import TenantBoot from "./TenantBoot";

export const revalidate = 60; // ok manter

async function getCms(tenantId: string) {
  try {
    // IMPORTANTE: URL RELATIVA no Server Component
    const r = await fetch(`/api/cms/${tenantId}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`CMS ${r.status}`);
    const json = await r.json();
    return json;
  } catch (e) {
    // nunca deixe o server crashar — devolva um “esqueleto”
    return {
      ok: false,
      _error: String(e),
      branding: { name: "Estety Cloud", primaryColor: "#bca49d" },
      hero: { title: "Conteúdo indisponível por enquanto", subtitle: "", cover: "" },
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
