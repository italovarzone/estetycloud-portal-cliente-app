"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toBRDate(input: any) {
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function Badge({ children, tone = "gray" }: { children: any; tone?: "green" | "red" | "yellow" | "gray" }) {
  const tones: Record<string, string> = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function Progress({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((used * 100) / total))) : 0;
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded bg-gray-100 overflow-hidden">
        <div className="h-2 bg-[#9d8983]" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-[11px] text-gray-600">{used}/{total}</div>
    </div>
  );
}

function SkeletonTitle() { return <div className="h-6 w-48 rounded bg-gray-200" />; }
function SkeletonCard() {
  return (
    <div className="rounded-lg border p-3 bg-white shadow-sm animate-pulse">
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 rounded bg-gray-200 mb-2" />
          <div className="h-3 w-56 max-w-full rounded bg-gray-100" />
        </div>
        <div className="h-4 w-20 rounded bg-gray-200 shrink-0" />
      </div>
      <div className="h-3 w-32 rounded bg-gray-100 mt-2" />
    </div>
  );
}

export default function MeusPacotes() {
  const { tenantId } = useParams();
  const router = useRouter();

  const [subs, setSubs] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // subscriptionId -> expanded

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("clientPortalToken");
        if (!token) {
          router.replace(`/${localStorage.getItem("tenantSlug")}/login`);
          return;
        }
        const r = await fetch(`${apiBase()}/api/client-portal/my-packages`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": String(tenantId || "") },
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "Erro ao carregar pacotes.");
        setSubs(Array.isArray(data.subscriptions) ? data.subscriptions : []);
        setCycles(Array.isArray(data.cycles) ? data.cycles : []);
      } catch (e: any) {
        console.error("Erro ao carregar pacotes:", e);
        setSubs([]);
        setCycles([]);
        setError(e?.message || "Falha ao carregar pacotes.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, router]);

  const totalResumo = useMemo(() => {
    return subs.map((s) => {
      const total = (s.items || []).reduce((acc: number, it: any) => acc + Number(it.totalPerCycle || 0), 0);
      const remaining = (s.items || []).reduce((acc: number, it: any) => acc + Number(it.remaining || 0), 0);
      const used = (s.items || []).reduce((acc: number, it: any) => acc + Number(it.used || 0), 0);
      return { id: String(s._id), total, remaining, used };
    });
  }, [subs]);

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function scheduleItem(sub: any, item: any) {
    try {
      const tenantSlug = String(localStorage.getItem("tenantSlug") || "");
      const params = new URLSearchParams();
      params.set("fromPackage", "1");
      params.set("subId", String(sub._id || sub.id || ""));
      if (item?.procedureId) params.set("procId", String(item.procedureId));
      if (item?.name) params.set("procName", encodeURIComponent(String(item.name)));
      if (item?.packagePrice != null) params.set("pkgPrice", String(Number(item.packagePrice || 0)));
      if (sub?.packageName) params.set("pkgLabel", encodeURIComponent(String(sub.packageName)));
      router.push(`/${tenantSlug}/novo-agendamento?${params.toString()}`);
    } catch (e) {
      console.error("scheduleItem error", e);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Título */}
      <div className="mb-4">
        {loading ? <SkeletonTitle /> : <h1 className="text-xl font-semibold">Meus Pacotes</h1>}
      </div>

      {/* Aviso de pagamento */}
      {!loading && (
        <div className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: "#e6cfc9", background: "#fff8f6", color: "#9d8983" }}>
          O pagamento do pacote será realizado até um dia antes do vencimento do ciclo.
        </div>
      )}

      {/* Lista */}
      <section className="space-y-3">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : subs.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum pacote ativo encontrado.</div>
        ) : (
          subs.map((s: any) => {
            const resumo = totalResumo.find((r) => r.id === String(s._id));
            const id = String(s._id);
            const isExpired = !!s.expired;
            const isPaid = !!s.paid;
            const remain = resumo?.remaining ?? 0;
            return (
              <div key={id} className="rounded-lg border p-3 bg-white shadow-sm">
                {/* Header */}
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.packageName || "Pacote"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {toBRDate(s.cycleStart)} → {toBRDate(s.cycleEnd)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Restantes no ciclo: <strong>{remain}</strong></div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isExpired && <Badge tone="red">Vencido</Badge>}
                    {isPaid ? <Badge tone="green">Pago</Badge> : <Badge tone="yellow">Pendente</Badge>}
                  </div>
                </div>

                {/* Items (uso) */}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(s.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="rounded-md border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-700 mb-1 truncate">{it.name}</div>
                          <Progress used={Number(it.used || 0)} total={Number(it.totalPerCycle || 0)} />
                        </div>
                        <div className="shrink-0">
                          <button
                            type="button"
                            disabled={Number(it.remaining || 0) <= 0}
                            onClick={() => scheduleItem(s, it)}
                            className={`rounded-md border px-2 py-1 text-xs ${Number(it.remaining || 0) > 0 ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400"}`}
                            style={{ borderColor: "#e5e7eb", color: Number(it.remaining || 0) > 0 ? "#9d8983" : undefined }}
                            title={Number(it.remaining || 0) > 0 ? "Agendar este procedimento do pacote" : "Sem saldo neste ciclo"}
                          >
                            Agendar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expand (histórico) */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(id)}
                    className="rounded-md border px-3 py-2 text-sm bg-white hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    {expanded[id] ? "Ocultar histórico" : "Ver histórico de uso"}
                  </button>
                </div>

                {expanded[id] && (
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {/* Histórico de uso no ciclo atual */}
                    <div className="rounded-lg border p-3">
                      <div className="text-sm font-semibold mb-2">Uso no ciclo</div>
                      {(Array.isArray(s.usageHistory) && s.usageHistory.length) ? (
                        <ul className="space-y-2 text-sm">
                          {s.usageHistory.map((u: any, i: number) => (
                            <li key={i} className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {(u.used || []).map((x: any, j: number) => (
                                  <div key={j} className="text-gray-700 truncate">- {String(x.qty || 0)}x • {x.name || x.procedureName || x.procedureId}</div>
                                ))}
                              </div>
                              <div className="text-xs text-gray-500 shrink-0">{toBRDate(u.at)}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-gray-500">Nenhum uso registrado neste ciclo.</div>
                      )}
                    </div>

                    {/* Ciclos arquivados */}
                    <div className="rounded-lg border p-3">
                      <div className="text-sm font-semibold mb-2">Ciclos anteriores</div>
                      {cycles.filter((c) => String(c.packageId) === String(s.packageId)).length ? (
                        <ul className="space-y-2 text-sm">
                          {cycles
                            .filter((c) => String(c.packageId) === String(s.packageId))
                            .map((c, i) => (
                              <li key={i} className="flex items-center justify-between gap-3">
                                <div className="text-gray-700">
                                  {toBRDate(c.cycleStart)} → {toBRDate(c.cycleEnd)}
                                </div>
                                <div className="shrink-0">{c.paid ? <Badge tone="green">Pago</Badge> : <Badge tone="yellow">Pendente</Badge>}</div>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-gray-500">Sem ciclos anteriores.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Erro */}
      {!loading && error && (
        <div className="mt-6 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}>
          {error}
        </div>
      )}

      {/* Voltar */}
      <div className="pt-4">
        <button
          onClick={() => router.push(`/${localStorage.getItem("tenantSlug")}/home`)}
          className="w-full max-w-xs mx-auto block rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
          style={{ borderColor: "#bca49d", color: "#9d8983" }}
        >
          Voltar
        </button>
      </div>

      {/* overflow guard mobile */}
      <style jsx global>{` html, body { overflow-x: hidden; } `}</style>
    </div>
  );
}
