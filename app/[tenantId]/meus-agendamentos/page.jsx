"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function statusLabel(a) {
  if (a.cancelado) return "Cancelado";
  if (a.concluida) return "Concluído";
  return "Agendado";
}
function statusColor(a) {
  if (a.cancelado) return "text-red-600";
  if (a.concluida) return "text-green-600";
  return "text-blue-600";
}

export default function MeusAgendamentos() {
  const { tenantId } = useParams();
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroProcedimento, setFiltroProcedimento] = useState("");
  const [filtroData, setFiltroData] = useState("");
  const [filtroHora, setFiltroHora] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const token = localStorage.getItem("clientPortalToken");
        const r = await fetch(`${apiBase()}/api/client-portal/appointments/history`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId }
        });
        const data = await r.json();
        setAppointments(data.history || []);
      } catch (e) {
        console.error("Erro ao carregar histórico:", e);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  // aplica filtros
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (filtroStatus) {
        if (filtroStatus === "agendado" && (a.concluida || a.cancelado)) return false;
        if (filtroStatus === "concluido" && !a.concluida) return false;
        if (filtroStatus === "cancelado" && !a.cancelado) return false;
      }
      if (filtroProcedimento) {
        const has = (a.procedures || []).some(p =>
          p.name.toLowerCase().includes(filtroProcedimento.toLowerCase())
        );
        if (!has) return false;
      }
      if (filtroData && a.date !== filtroData) return false;
      if (filtroHora && a.time !== filtroHora) return false;
      return true;
    });
  }, [appointments, filtroStatus, filtroProcedimento, filtroData, filtroHora]);

  // grupos
  const agendados = useMemo(
    () => filtered.filter(a => !a.cancelado && !a.concluida),
    [filtered]
  );
  const finalizados = useMemo(
    () => filtered.filter(a => a.cancelado || a.concluida),
    [filtered]
  );

  if (loading) return <div className="p-4">Carregando…</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Meus Agendamentos</h1>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="border rounded-lg p-2"
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
          onChange={e => setFiltroProcedimento(e.target.value)}
          className="border rounded-lg p-2"
        />

        <input
          type="date"
          value={filtroData}
          onChange={e => setFiltroData(e.target.value)}
          className="border rounded-lg p-2 col-span-1"
        />

        <input
          type="time"
          value={filtroHora}
          onChange={e => setFiltroHora(e.target.value)}
          className="border rounded-lg p-2 col-span-1"
        />
      </div>

      {/* Agendados */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">Agendados</h2>
        {agendados.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum agendamento ativo.</div>
        ) : (
          agendados.map(ap => (
            <div key={ap._id} className="rounded-lg border p-3 bg-white shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {ap.date.split("-").reverse().join("/")} às {ap.time}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(ap.procedures || []).map(p => p.name).join(", ") || ap.procedure}
                  </div>
                </div>
                <div className={`text-sm font-medium ${statusColor(ap)}`}>
                  {statusLabel(ap)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Valor total: {BRL.format(Number(ap.valor_total || 0))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Concluídos & Cancelados (opacos) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold text-gray-600">Concluídos & Cancelados</h2>
        {finalizados.length === 0 ? (
          <div className="text-gray-500 text-sm">Nenhum histórico.</div>
        ) : (
          finalizados.map(ap => (
            <div
              key={ap._id}
              className="rounded-lg border p-3 bg-white shadow-sm opacity-60"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">
                    {ap.date.split("-").reverse().join("/")} às {ap.time}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(ap.procedures || []).map(p => p.name).join(", ") || ap.procedure}
                  </div>
                </div>
                <div className={`text-sm font-medium ${statusColor(ap)}`}>
                  {statusLabel(ap)}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Valor total: {BRL.format(Number(ap.valor_total || 0))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Botão Voltar centralizado */}
      <div className="pt-2">
        <button
          onClick={() => router.push(`/${tenantId}/home`)}
          className="w-full max-w-xs mx-auto block rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
          style={{ borderColor: "#bca49d", color: "#9d8983" }}
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
