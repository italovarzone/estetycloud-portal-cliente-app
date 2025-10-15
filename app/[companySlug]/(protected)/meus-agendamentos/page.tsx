"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function statusLabel(a: any) {
  if (a.cancelado) return "Cancelado";
  if (a.concluida) return "Concluído";
  return "Agendado";
}
function statusColor(a: any) {
  if (a.cancelado) return "text-red-600";
  if (a.concluida) return "text-green-600";
  return "text-blue-600";
}

/** SKELETONS */
function SkeletonTitle() { return <div className="h-6 w-48 rounded bg-gray-200" />; }
function SkeletonFilters() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-10 w-full rounded-lg bg-gray-100" />)}
    </div>
  );
}
function SkeletonCard({ faded = false }: { faded?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 bg-white shadow-sm animate-pulse ${faded ? "opacity-60" : ""}`}>
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

export default function MeusAgendamentos() {
  const { tenantId } = useParams();
  const router = useRouter();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProcedimento, setFiltroProcedimento] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroHora, setFiltroHora] = useState("");

  // menu ⋮
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menusRef = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const btnsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // modal cancelar
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

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
        const r = await fetch(`${apiBase()}/api/client-portal/appointments/history`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": String(tenantId || "") }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "Erro ao carregar histórico.");
        setAppointments(Array.isArray(data.history) ? data.history : []);
      } catch (e: any) {
        console.error("Erro ao carregar histórico:", e);
        setAppointments([]);
        setError(e?.message || "Falha ao carregar histórico.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, router]);

  // fecha menus ao clicar fora
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuOpenId) return;
      const menuEl = menusRef.current.get(menuOpenId);
      const btnEl = btnsRef.current.get(menuOpenId);
      const target = e.target as Node;
      if (menuEl?.contains(target) || btnEl?.contains(target)) return;
      setMenuOpenId(null);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpenId]);

  // aplica filtros
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (filtroStatus) {
        if (filtroStatus === "agendado" && (a.concluida || a.cancelado)) return false;
        if (filtroStatus === "concluido" && !a.concluida) return false;
        if (filtroStatus === "cancelado" && !a.cancelado) return false;
      }
      if (filtroProcedimento) {
        const has = (a.procedures || []).some((p: any) =>
          String(p.name || "").toLowerCase().includes(filtroProcedimento.toLowerCase())
        );
        if (!has) return false;
      }
      if (filtroData && a.date !== filtroData) return false;
      if (filtroHora && a.time !== filtroHora) return false;
      return true;
    });
  }, [appointments, filtroStatus, filtroProcedimento, filtroData, filtroHora]);

  // grupos
  const agendados = useMemo(() => filtered.filter((a) => !a.cancelado && !a.concluida), [filtered]);
  const finalizados = useMemo(() => filtered.filter((a) => a.cancelado || a.concluida), [filtered]);

  // ===== REAGENDAR =====
  function handleReschedule(ap: any) {
    if (ap.cancelado || ap.concluida) return;
    try {
      const payload = {
        _id: ap._id,
        date: ap.date,
        time: ap.time,
        procedures: Array.isArray(ap.procedures) ? ap.procedures.map((p: any) => ({
          _id: String(p.procedureId || p._id || ""),
          procedureId: String(p.procedureId || p._id || ""),
          name: p.name,
          price: Number(p.price || 0),
        })) : (ap.procedure ? [{ _id: "", name: ap.procedure, price: Number(ap.valor_total || 0) }] : []),
      };
      sessionStorage.setItem("editAppointment", JSON.stringify(payload));
    } catch {}
    router.push(`/${localStorage.getItem("tenantSlug")}/novo-agendamento?edit=${encodeURIComponent(ap._id)}`);
  }

  // ===== CANCELAR (modal + chamada) =====
  function openCancel(ap: any) {
    setMenuOpenId(null);
    setCancelTarget(ap);
    setCancelError("");
    setCancelOpen(true);
  }
  async function confirmCancel() {
    if (!cancelTarget?._id) return;
    const token = localStorage.getItem("clientPortalToken") || "";
    try {
      setCancelLoading(true);
      setCancelError("");
      const r = await fetch(`${apiBase()}/api/client-portal/appointments/${encodeURIComponent(cancelTarget._id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-id": String(tenantId || ""),
        },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Falha ao cancelar agendamento.");

      // marca no estado local
      setAppointments((prev) =>
        prev.map((a) => (a._id === cancelTarget._id ? { ...a, cancelado: true } : a))
      );
      setCancelOpen(false);
      setCancelTarget(null);
    } catch (e: any) {
      setCancelError(e?.message || "Erro ao cancelar agendamento.");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Título */}
      <div className="mb-4">
        {loading ? <SkeletonTitle /> : <h1 className="text-xl font-semibold">Meus Agendamentos</h1>}
      </div>

      {/* Filtros */}
      <div className="mb-6">
        {loading ? (
          <SkeletonFilters />
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="border rounded-lg p-2 bg-white">
              <option value="">Todos status</option>
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <input type="text" placeholder="Procedimento" value={filtroProcedimento} onChange={(e) => setFiltroProcedimento(e.target.value)} className="border rounded-lg p-2" />
            <input type="date" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} className="border rounded-lg p-2 col-span-1" />
            <input type="time" value={filtroHora} onChange={(e) => setFiltroHora(e.target.value)} className="border rounded-lg p-2 col-span-1" />
          </div>
        )}
      </div>

      {/* Agendados */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">Agendados</h2>

        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : agendados.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum agendamento ativo.</div>
        ) : (
          agendados.map((ap: any) => {
            const menuOpen = menuOpenId === ap._id;
            return (
              <div key={ap._id} className="rounded-lg border p-3 bg-white shadow-sm relative">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {String(ap.date).split("-").reverse().join("/")} às {ap.time}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {(ap.procedures || []).map((p: any) => p.name).join(", ") || ap.procedure}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Valor total: {BRL.format(Number(ap.valor_total || 0))}
                    </div>
                  </div>

                  {/* Status + menu ⋮ */}
                  <div className="flex flex-col items-end gap-2">
                    <div className={`text-sm font-medium ${statusColor(ap)}`}>{statusLabel(ap)}</div>

                    {!ap.cancelado && !ap.concluida && (
                      <div className="relative">
                        <button
                          ref={(el) => { btnsRef.current.set(ap._id, el); }}
                          type="button"
                          aria-label="Mais ações"
                          aria-expanded={menuOpen}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpen ? null : ap._id);
                          }}
                          className="rounded-md border p-1.5 hover:bg-gray-50"
                          style={{ borderColor: "#e5e7eb" }}
                          title="Mais ações"
                        >
                          {/* ícone ⋮ */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 11.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM10 17a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                          </svg>
                        </button>

                        {menuOpen && (
                          <div
                            ref={(el) => { menusRef.current.set(ap._id, el); }}
                            className="absolute right-0 mt-2 w-40 rounded-lg border bg-white shadow-lg z-10"
                            style={{ borderColor: "#e5e7eb" }}
                          >
                            <button
                              type="button"
                              onClick={() => handleReschedule(ap)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Reagendar
                            </button>
                            <div className="h-px bg-gray-100" />
                            <button
                              type="button"
                              onClick={() => openCancel(ap)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                              style={{ color: "#b91c1c" }}
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Concluídos & Cancelados */}
      <section className="space-y-3 pt-4">
        <h2 className="text-sm font-semibold text-gray-600">Concluídos & Cancelados</h2>

        {loading ? (
          <>
            <SkeletonCard faded /><SkeletonCard faded /><SkeletonCard faded />
          </>
        ) : finalizados.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum histórico.</div>
        ) : (
          finalizados.map((ap: any) => (
            <div key={ap._id} className="rounded-lg border p-3 bg-white shadow-sm opacity-60">
              <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {String(ap.date).split("-").reverse().join("/")} às {ap.time}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {(ap.procedures || []).map((p: any) => p.name).join(", ") || ap.procedure}
                  </div>
                </div>
                <div className={`text-sm font-medium shrink-0 ${statusColor(ap)}`}>{statusLabel(ap)}</div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Valor total: {BRL.format(Number(ap.valor_total || 0))}
              </div>
            </div>
          ))
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

      {/* Modal cancelar */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg mx-4">
            <h3 className="font-semibold mb-2">Cancelar agendamento?</h3>
            <p className="text-sm text-gray-700">
              Vamos avisar a profissional sobre o cancelamento do seu horário
              {cancelTarget ? <> em <strong>{String(cancelTarget.date).split("-").reverse().join("/")}</strong> às <strong>{cancelTarget.time}</strong></> : null}.
            </p>
            {cancelError && (
              <div className="mt-3 rounded-lg border px-3 py-2 text-sm"
                   style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}>
                {cancelError}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setCancelOpen(false)}
                className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50"
                style={{ borderColor: "#e5e7eb" }}
              >
                Manter
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelLoading}
                className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50 font-medium"
                style={{ borderColor: "#fde2e2", color: "#b91c1c" }}
              >
                {cancelLoading ? "Cancelando..." : "Cancelar agendamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* overflow guard mobile */}
      <style jsx global>{` html, body { overflow-x: hidden; } `}</style>
    </div>
  );
}
