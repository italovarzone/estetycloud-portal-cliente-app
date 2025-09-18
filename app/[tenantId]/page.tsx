import LandingClient from "./LandingClient";
import TenantBoot from "./TenantBoot";

export const dynamic = "force-dynamic";   // garante render dinâmico em prod
export const revalidate = 0;              // sem SSG para esta página

async function getCms(tenantId: string) {
  try {
    // IMPORTANTE: URL RELATIVA e sem cache estático
    const r = await fetch(`/api/cms/${tenantId}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`CMS ${r.status}`);
    return await r.json();
  } catch (e) {
    // fallback que não quebra a página
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
