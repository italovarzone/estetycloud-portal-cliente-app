"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import StepProgress from "../../components/StepProgress";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}
function formatDuration(mins) {
  const m = Number(mins || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h && !r) return `${h}h`;
  return `${r}m`;
}
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function Step1Procedures({ cart = [], onNext }) {
  const { tenantId } = useParams();
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);

  // seleção local
  const [selectedIds, setSelectedIds] = useState(() => new Set(cart.map((c) => String(c._id))));
  useEffect(() => {
    setSelectedIds(new Set(cart.map((c) => String(c._id))));
  }, [cart]);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("clientPortalToken");
        const res = await fetch(`${apiBase()}/api/client-portal/procedures`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
        });
        const data = await res.json();
        setProcedures(Array.isArray(data.procedures) ? data.procedures : []);
      } catch {
        setProcedures([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  function toggle(id) {
    id = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  const selectedList = useMemo(
    () => procedures.filter((p) => selectedIds.has(String(p._id))),
    [procedures, selectedIds]
  );

  const totals = useMemo(() => {
    const totalMinutes = selectedList.reduce((acc, p) => acc + Number(p.duration || 0), 0);
    const totalPrice   = selectedList.reduce((acc, p) => acc + Number(p.price || 0), 0);
    return { totalMinutes, totalPrice };
  }, [selectedList]);

  const goStep = (n) => {
    if (n === 2 && selectedList.length) onNext(selectedList);
  };

  if (loading) return <div>Carregando procedimentos...</div>;

  return (
    <div className="space-y-4 pb-28">
      <StepProgress current={1} canGoNext={selectedList.length > 0} onGo={goStep} />

      <h2 className="font-medium">Selecione os procedimentos:</h2>

      <div className="space-y-3">
        {procedures.map((p) => {
          const id = String(p._id);
          const selected = selectedIds.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`w-full text-left p-3 border rounded-lg transition
                ${selected ? "bg-rose-50 border-rose-200" : "bg-white hover:bg-gray-50"}`}
              style={{ borderColor: selected ? "#e6cfc9" : "#e5e7eb" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-500">
                    {formatDuration(p.duration)} • {brl.format(Number(p.price || 0))}
                  </div>
                </div>
                {selected && (
                  <span className="inline-flex items-center justify-center rounded-full text-xs px-2 py-1"
                        style={{ background: "#f3e8e5", color: "#9d8983" }}>
                    Selecionado
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra fixa inferior com resumo */}
      <div className="fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur border-t">
        <div className="mx-auto w-full max-w-md p-4">
          <div className="flex items-center justify-between mb-3 text-sm">
            <div className="text-gray-600">
              {selectedList.length ? (
                <>
                  <span className="font-medium">{selectedList.length}</span> selecionado(s) •{" "}
                  <span className="font-medium">{formatDuration(totals.totalMinutes)}</span> •{" "}
                  <span className="font-medium">{brl.format(totals.totalPrice)}</span>
                </>
              ) : ("Nenhum procedimento selecionado")}
            </div>
            {!!selectedList.length && (
              <button type="button" onClick={clearSelection} className="text-xs underline"
                      style={{ color: "#9d8983" }}>
                Limpar
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!selectedList.length}
            onClick={() => onNext(selectedList)}
            className={`w-full rounded-xl border py-3 font-medium shadow-soft ${
              selectedList.length ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400"}`}
            style={{ borderColor: selectedList.length ? "#bca49d" : "#e5e7eb", color: selectedList.length ? "#9d8983" : undefined }}
          >
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
}
