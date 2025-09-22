// app/api/cms/[tenantId]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

const OWNER = process.env.CMS_GH_OWNER!;
const REPO  = process.env.CMS_GH_REPO!;
const REF   = process.env.CMS_GH_REF || "main";

/**
 * Pega o último commit hash da branch REF (ex: "main")
 */
async function resolveCommitSha(): Promise<string> {
  try {
    const r = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/commits/${REF}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: process.env.GH_TOKEN ? `Bearer ${process.env.GH_TOKEN}` : "",
        },
        cache: "no-store",
      }
    );
    if (!r.ok) throw new Error(`GitHub API ${r.status}`);
    const json = await r.json();
    return json.sha;
  } catch (err) {
    console.error("[CMS] Falha ao buscar commit:", err);
    // fallback: usa REF direto (ex: "main")
    return REF;
  }
}

function makeBases(tenantId: string, ref: string) {
  const root = `tenants/${tenantId}`;
  return [
    {
      name: "jsdelivr",
      cfg: `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${ref}/${root}/landing.json`,
      asset: (f: string) =>
        `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${ref}/${root}/${f}`,
      parse: async (r: Response) => r.json(),
    },
    {
      name: "raw",
      cfg: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${root}/landing.json`,
      asset: (f: string) =>
        `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/${root}/${f}`,
      parse: async (r: Response) => JSON.parse(await r.text()),
    },
  ];
}

export async function GET(req: Request, { params }: { params: { tenantId: string } }) {
  const { tenantId } = params;

  // resolve o commit hash mais recente
  const commitSha = await resolveCommitSha();
  const attempts = makeBases(tenantId, commitSha);

  let cfg: any | null = null;
  let assetBase: ((f: string) => string) | null = null;

  for (const b of attempts) {
    const res = await fetch(b.cfg, { cache: "no-store" });
    if (!res.ok) continue;
    cfg = await b.parse(res);
    assetBase = b.asset;
    break;
  }

  if (!cfg || !assetBase) {
    return NextResponse.json(
      { ok: false, error: "landing.json não encontrado" },
      { status: 404 }
    );
  }

  const abs = (name?: string) =>
    name?.startsWith("http") ? name : name ? assetBase!(name) : undefined;

  return NextResponse.json({
    ok: true,
    tenantId,
    branding: cfg.branding ?? { name: "Estúdio", primaryColor: "#bca49d" },
    hero: {
      title: cfg?.hero?.title ?? "",
      subtitle: cfg?.hero?.subtitle ?? "",
      cover: abs(cfg?.hero?.cover),
    },
    services: (cfg?.services ?? []).map((s: any) => ({
      title: s.title,
      desc: s.desc,
      price: s.price,
      image: abs(s.image),
    })),
    gallery: (cfg?.gallery ?? []).map((g: any) => ({
      image: abs(g.image),
      caption: g.caption,
    })),
    about: {
      title: cfg?.about?.title,
      text: cfg?.about?.text,
      photo: abs(cfg?.about?.photo),
    },
    contact: cfg?.contact ?? {},
    testimonials: cfg?.testimonials ?? [],
    faq: cfg?.faq ?? [],
  });
}
