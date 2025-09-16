"use client";

import { useEffect, useMemo, useState } from "react";
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
function SkeletonTitle() {
  return <div className="h-6 w-48 rounded bg-gray-200" />;
}
function SkeletonFilters() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-10 w-full rounded-lg bg-gray-100" />
      ))}
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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("clientPortalToken");
        if (!token) {
          router.replace(`/${tenantId}/login`);
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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      {/* Título */}
      <div className="mb-4">
        {loading ? (
          <SkeletonTitle />
        ) : (
          <h1 className="text-xl font-semibold">Meus Agendamentos</h1>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-6">
        {loading ? (
          <SkeletonFilters />
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="border rounded-lg p-2 bg-white"
            >
              <option value="">Todos status</option>
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>

            <input
              type="text"
              placeholder="Procedimento"
              value={filtroProcedimento}
              onChange={(e) => setFiltroProcedimento(e.target.value)}
              className="border rounded-lg p-2"
            />

            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="border rounded-lg p-2 col-span-1"
            />

            <input
              type="time"
              value={filtroHora}
              onChange={(e) => setFiltroHora(e.target.value)}
              className="border rounded-lg p-2 col-span-1"
            />
          </div>
        )}
      </div>

      {/* Agendados */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">Agendados</h2>

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : agendados.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum agendamento ativo.</div>
        ) : (
          agendados.map((ap: any) => (
            <div key={ap._id} className="rounded-lg border p-3 bg-white shadow-sm">
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

      {/* Concluídos & Cancelados */}
      <section className="space-y-3 pt-4">
        <h2 className="text-sm font-semibold text-gray-600">Concluídos & Cancelados</h2>

        {loading ? (
          <>
            <SkeletonCard faded />
            <SkeletonCard faded />
            <SkeletonCard faded />
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
        <div
          className="mt-6 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "#fee2e2", color: "#b91c1c", background: "#fff1f2" }}
        >
          {error}
        </div>
      )}

      {/* Botão Voltar */}
      <div className="pt-4">
        <button
          onClick={() => router.push(`/${tenantId}/home`)}
          className="w-full max-w-xs mx-auto block rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
          style={{ borderColor: "#bca49d", color: "#9d8983" }}
        >
          Voltar
        </button>
      </div>

      {/* Reforço contra overflow lateral em mobile */}
      <style jsx global>{`
        html, body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}
