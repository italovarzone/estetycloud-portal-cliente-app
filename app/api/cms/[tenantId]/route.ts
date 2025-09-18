import { NextResponse } from "next/server";

export const runtime = "nodejs";         // garante execução em Node (não Edge)
export const dynamic = "force-dynamic";  // não congele resposta
export const revalidate = 60;

const OWNER = process.env.CMS_GH_OWNER!;
const REPO  = process.env.CMS_GH_REPO!;
const REF   = process.env.CMS_GH_REF || "main";

function makeBases(tenantId: string) {
  const root = `tenants/${tenantId}`;
  return [
    {
      name: "jsdelivr",
      cfg: `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${REF}/${root}/landing.json`,
      asset: (f: string) => `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${REF}/${root}/${f}`,
      parse: async (r: Response) => r.json(),
    },
    {
      name: "raw.githubusercontent",
      cfg: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/${root}/landing.json`,
      asset: (f: string) => `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/${root}/${f}`,
      parse: async (r: Response) => JSON.parse(await r.text()),
    },
    {
      name: "github-contents",
      cfg: `https://api.github.com/repos/${OWNER}/${REPO}/contents/${root}/landing.json?ref=${REF}`,
      asset: (f: string) => `https://raw.githubusercontent.com/${OWNER}/${REPO}/${REF}/${root}/${f}`,
      parse: async (r: Response) => {
        const json = await r.json();
        if (!json?.content) throw new Error("conteúdo ausente");
        const decoded = Buffer.from(json.content, "base64").toString("utf-8");
        return JSON.parse(decoded);
      },
    },
  ];
}

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  const { tenantId } = params;
  const wantDebug = new URL(req.url).searchParams.get("debug") === "1";

  if (!OWNER || !REPO) {
    return NextResponse.json({ ok: false, error: "CMS_GH_OWNER/REPO não configurados" }, { status: 500 });
  }

  const attempts = makeBases(tenantId);
  const debug: any[] = [];
  let cfg: any | null = null;
  let assetBase: ((f: string) => string) | null = null;

  for (const b of attempts) {
    try {
      const res = await fetch(b.cfg, { cache: "no-store" });
      debug.push({ base: b.name, url: b.cfg, status: res.status });
      if (!res.ok) continue;
      cfg = await b.parse(res);
      assetBase = b.asset;
      break;
    } catch (e) {
      debug.push({ base: b.name, error: String(e) });
    }
  }

  if (!cfg || !assetBase) {
    return NextResponse.json(
      { ok: false, error: "landing.json não encontrado/ inválido", debug: wantDebug ? debug : undefined },
      { status: 404 }
    );
  }

  const abs = (name?: string) => (name?.startsWith("http") ? name : name ? assetBase!(name) : undefined);

  try {
    const payload = {
      ok: true,
      tenantId,
      branding: cfg.branding ?? { name: "Estúdio", primaryColor: "#bca49d" },
      hero: { title: cfg?.hero?.title ?? "", subtitle: cfg?.hero?.subtitle ?? "", cover: abs(cfg?.hero?.cover) },
      services: (cfg?.services ?? []).map((s: any) => ({ title: s.title, desc: s.desc, price: s.price, image: abs(s.image) })),
      gallery: (cfg?.gallery ?? []).map((g: any) => ({ image: abs(g.image), caption: g.caption })),
      about: { title: cfg?.about?.title, text: cfg?.about?.text, photo: abs(cfg?.about?.photo) },
      contact: cfg?.contact ?? {},
      testimonials: cfg?.testimonials ?? [],
      faq: cfg?.faq ?? [],
      debug: wantDebug ? debug : undefined,
    };
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Falha ao montar payload", detail: String(e) }, { status: 500 });
  }
}
