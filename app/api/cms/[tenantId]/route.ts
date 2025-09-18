import { NextResponse } from "next/server";

const OWNER = process.env.CMS_GH_OWNER!;      // ex.: "seu-usuario-ou-org"
const REPO  = process.env.CMS_GH_REPO!;       // ex.: "estetycloud-cms"
const REF   = process.env.CMS_GH_REF ?? "main";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

// CDN gratuito do jsDelivr para arquivos do GitHub
const BASE = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${REF}/tenants`;

const abs = (tenantId: string, name?: string) =>
  name?.startsWith("http") ? name : (name ? `${BASE}/${tenantId}/${name}` : undefined);

export async function GET(_: Request, { params }: { params: { tenantId: string } }) {
  const { tenantId } = params;
  const cfgUrl = `${BASE}/${tenantId}/landing.json`;

  const res = await fetch(cfgUrl, { next: { revalidate: 60 } });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: "landing.json não encontrado para esse tenant." }, { status: 404 });
  }
  const cfg = await res.json();

  const payload = {
    ok: true,
    tenantId,
    branding: cfg.branding ?? { name: "Estúdio", primaryColor: "#bca49d" },
    hero: {
      title: cfg?.hero?.title ?? "",
      subtitle: cfg?.hero?.subtitle ?? "",
      cover: abs(tenantId, cfg?.hero?.cover),
    },
    services: (cfg?.services || []).map((s: any) => ({
      title: s.title, desc: s.desc, price: s.price, image: abs(tenantId, s.image)
    })),
    gallery: (cfg?.gallery || []).map((g: any) => ({ image: abs(tenantId, g.image), caption: g.caption })),
    about: {
      title: cfg?.about?.title, text: cfg?.about?.text, photo: abs(tenantId, cfg?.about?.photo)
    }
  };

  return NextResponse.json(payload);
}
