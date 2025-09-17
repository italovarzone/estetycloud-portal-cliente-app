"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import StepProgress from "../components/StepProgress";

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}
function formatDuration(mins: any) {
  const m = Number(mins || 0);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m`;
  if (h && !r) return `${h}h`;
  return `${r}m`;
}
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Proc = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  status?: number | string | boolean;
};

export default function Step1Procedures({
  cart = [],
  onNext,
}: {
  cart?: Proc[];
  onNext: (list: Proc[]) => void;
}) {
  const router = useRouter();
  const { tenantId } = useParams();
  const search = useSearchParams();
  const editId = search.get("edit"); // quando presente, estamos editando

  const [procedures, setProcedures] = useState<Proc[]>([]);
  const [loading, setLoading] = useState(true);
  const [abortOpen, setAbortOpen] = useState(false);

  // snapshot do agendamento em edição (salvo a partir da tela "Meus agendamentos")
  const [editingAppt, setEditingAppt] = useState<any>(null);

  useEffect(() => {
    if (!editId) return;
    try {
      const cached = JSON.parse(sessionStorage.getItem("editAppointment") || "null");
      if (cached && String(cached._id) === String(editId)) setEditingAppt(cached);
    } catch {}
  }, [editId]);

  // seleção local
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(cart.map((c: any) => String(c._id)))
  );
  useEffect(() => {
    setSelectedIds(new Set(cart.map((c: any) => String(c._id))));
  }, [cart]);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("clientPortalToken") || "";
        const res = await fetch(`${apiBase()}/api/client-portal/procedures`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": String(tenantId || "") },
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

  // quando em modo edição, pré-seleciona os procedimentos do agendamento
  useEffect(() => {
    if (!editId || !editingAppt || !procedures.length) return;

    const byName = new Map<string, string>(
      procedures.map((p) => [String(p.name || "").toLowerCase(), String(p._id)])
    );

    const ids = new Set<string>();
    for (const p of editingAppt.procedures || []) {
      // tenta casar por procedureId/_id, senão por nome
      const raw =
        p?.procedureId || p?._id || byName.get(String(p?.name || "").toLowerCase());
      if (raw) ids.add(String(raw));
    }
    if (ids.size) setSelectedIds(ids);
  }, [editId, editingAppt, procedures]);

  // lista apenas ATIVOS (mesmo que o backend já filtre)
  const activeProcedures = useMemo(
    () =>
      (procedures || []).filter(
        (p) => p?.status === 1 || p?.status === "1" || p?.status === true || p?.status === undefined
      ),
    [procedures]
  );

  function toggle(id: string) {
    id = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedList = useMemo(
    () => activeProcedures.filter((p) => selectedIds.has(String(p._id))),
    [activeProcedures, selectedIds]
  );

  const totals = useMemo(() => {
    const totalMinutes = selectedList.reduce((acc, p) => acc + Number(p.duration || 0), 0);
    const totalPrice = selectedList.reduce((acc, p) => acc + Number(p.price || 0), 0);
    return { totalMinutes, totalPrice };
  }, [selectedList]);

  const goStep = (n: number) => {
    if (n === 2 && selectedList.length) onNext(selectedList);
  };

  function openAbort() {
    setAbortOpen(true);
  }
  function confirmAbort() {
    sessionStorage.setItem(
      "cancelAppointmentMsg",
      editId
        ? "😔 Você desistiu de editar o agendamento."
        : "😔 Você desistiu de criar um novo agendamento. Tudo bem! Quando quiser, é só começar de novo."
    );
    router.push(`/${tenantId}/home`);
  }

  if (loading) return <div>Carregando procedimentos...</div>;

  const prevInfo =
    editId && editingAppt
      ? `${String(editingAppt.date).split("-").reverse().join("/")} às ${editingAppt.time}`
      : "";

  return (
    <div className="space-y-4 pb-28">
      <StepProgress current={1} canGoNext={selectedList.length > 0} onGo={() => goStep(2)} />

      {/* Aviso de edição */}
      {editId && editingAppt && (
        <div
          className="rounded-lg border p-3 bg-amber-50/40 text-sm"
          style={{ borderColor: "#fde68a" }}
        >
          <div className="font-medium">Editando agendamento</div>
          <div className="text-gray-700">
            Agendado originalmente para <b>{prevInfo}</b>.
          </div>
        </div>
      )}

      <h2 className="font-medium">Selecione os procedimentos:</h2>

      <div className="space-y-3">
        {activeProcedures.map((p) => {
          const id = String(p._id);
          const selected = selectedIds.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`w-full text-left p-3 border rounded-lg transition ${
                selected ? "bg-rose-50 border-rose-200" : "bg-white hover:bg-gray-50"
              }`}
              style={{ borderColor: selected ? "#e6cfc9" : "#e5e7eb" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{p.name}</div>

                  {p.description ? (
                    <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{p.description}</div>
                  ) : null}

                  <div className="text-sm text-gray-500 mt-1">
                    {formatDuration(p.duration)} • {brl.format(Number(p.price || 0))}
                  </div>
                </div>

                {selected && (
                  <span
                    className="mt-1 inline-flex items-center justify-center rounded-full text-xs px-2 py-1 shrink-0"
                    style={{ background: "#f3e8e5", color: "#9d8983" }}
                  >
                    Selecionado
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Barra fixa inferior com resumo + ações */}
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
              ) : (
                "Nenhum procedimento selecionado"
              )}
            </div>
            {!!selectedList.length && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs underline"
                style={{ color: "#9d8983" }}
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={openAbort}
              className="w-1/3 rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
              style={{ borderColor: "#e5e7eb", color: "#9d8983" }}
            >
              {editId ? "Cancelar edição" : "Desistir"}
            </button>

            <button
              type="button"
              disabled={!selectedList.length}
              onClick={() => onNext(selectedList)}
              className={`flex-1 rounded-xl border py-3 font-medium shadow-soft ${
                selectedList.length ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400"
              }`}
              style={{
                borderColor: selectedList.length ? "#bca49d" : "#e5e7eb",
                color: selectedList.length ? "#9d8983" : undefined,
              }}
            >
              Avançar
            </button>
          </div>
        </div>
      </div>

      {/* Dialog de desistência */}
      {abortOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAbortOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg mx-4">
            <div className="text-3xl mb-2">😔</div>
            <h3 className="font-semibold mb-2">
              {editId ? "Deseja desistir da edição?" : "Deseja desistir do agendamento?"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Nada será salvo por enquanto. Você pode {editId ? "editar novamente" : "começar de novo"} quando quiser.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAbortOpen(false)}
                className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50"
                style={{ borderColor: "#e5e7eb" }}
              >
                Continuar escolhendo
              </button>
              <button
                onClick={confirmAbort}
                className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50 font-medium"
                style={{ borderColor: "#bca49d", color: "#9d8983" }}
              >
                Sim, desistir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
