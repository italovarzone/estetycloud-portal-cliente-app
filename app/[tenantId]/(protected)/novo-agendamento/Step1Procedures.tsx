"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import StepProgress from "../components/StepProgress";
import { useScrollIdle } from "../../../hooks/useScrollIdle";

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
  restrictions?: (string | number)[];
  restrictDays?: number;              // <<<
};

type CompletedAppt = {
  _id: string;
  date: string;            // YYYY-MM-DD
  time: string;            // HH:mm
  procedures: { procedureId?: string; name?: string; price?: number }[];
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
  const editId = search.get("edit");

  const [procedures, setProcedures] = useState<Proc[]>([]);
  const [loading, setLoading] = useState(true);
  const [abortOpen, setAbortOpen] = useState(false);

  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [lastHasRestrictions, setLastHasRestrictions] = useState<boolean>(false);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set()); // IDs de procedimentos já concluídos
  const [restrictionInfo, setRestrictionInfo] = useState<{ name: string; days: number } | null>(null);

  const isIdle = useScrollIdle(2000);

  // snapshot do agendamento em edição (vindo da listagem/meus-agendamentos)
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
        const headers: any = { "x-tenant-id": String(tenantId || "") };
        if (token) headers.Authorization = `Bearer ${token}`;

        // 1) Todos os procedimentos ativos
        const res = await fetch(`${apiBase()}/api/client-portal/procedures`, { headers });
        const data = await res.json();
        const list: Proc[] = Array.isArray(data.procedures) ? data.procedures : [];
        setProcedures(list);

        // 2) Último procedimento concluído (texto do topo)
          if (token) {
              const lastRes = await fetch(`${apiBase()}/api/client-portal/appointments/last-completed`, { headers });
              const lastData = await lastRes.json();
              setLastCompleted(lastData.last?.procedures?.[0] || null);

              // se existir último, checa se algum desses tem restrições (para exibir o aviso amarelinho)
              if (lastData.last?.procedures?.length) {
                const names = lastData.last.procedures.map((n: string) => encodeURIComponent(n));
                const procsRes = await fetch(
                  `${apiBase()}/api/client-portal/procedures/by-names?names=${names.join(",")}`,
                  { headers }
                );
                const procsData = await procsRes.json();
                const lastFull = Array.isArray(procsData.procedures) ? procsData.procedures : [];
                if (lastFull.some((p: any) => Array.isArray(p.restrictions) && p.restrictions.length)) {
                  setLastHasRestrictions(true);
                }
              }

              // 3) Histórico de concluídos (para checagem de compatibilidade ao selecionar)
              const completedRes = await fetch(`${apiBase()}/api/client-portal/appointments/completed`, { headers });
              const completed: CompletedAppt[] = await completedRes.json();

              // mapeia nomes -> _id (para quando não vier procedureId)
              const nameToId = new Map<string, string>(list.map((p) => [String(p.name || "").toLowerCase(), String(p._id)]));

              const ids = new Set<string>();
              for (const ap of completed || []) {
                for (const pr of ap.procedures || []) {
                  if (pr.procedureId) ids.add(String(pr.procedureId));
                  else if (pr.name) {
                    const idByName = nameToId.get(String(pr.name).toLowerCase());
                    if (idByName) ids.add(idByName);
                  }
                }
              }
            setCompletedIds(ids);
          } else {
            setLastCompleted(null);
            setLastHasRestrictions(false);
            setCompletedIds(new Set());
          }
      } catch (err) {
        console.error("Erro ao carregar procedimentos:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  // quando em modo edição, pré-seleciona os procedimentos do agendamento
  useEffect(() => {
    if (!editId || !editingAppt || !procedures.length) return;
    const byName = new Map<string, string>(procedures.map((p) => [String(p.name || "").toLowerCase(), String(p._id)]));
    const ids = new Set<string>();
    for (const p of editingAppt.procedures || []) {
      const raw = p?.procedureId || p?._id || byName.get(String(p?.name || "").toLowerCase());
      if (raw) ids.add(String(raw));
    }
    if (ids.size) setSelectedIds(ids);
  }, [editId, editingAppt, procedures]);

  // apenas ativos
  const activeProcedures = useMemo(
    () =>
      (procedures || []).filter(
        (p) => p?.status === 1 || p?.status === "1" || p?.status === true || p?.status === undefined
      ),
    [procedures]
  );

  // separa com restrição vs outros
  const restrictedList = useMemo(
    () => activeProcedures.filter((p) => Array.isArray(p.restrictions) && p.restrictions.length > 0),
    [activeProcedures]
  );
  const otherList = useMemo(
    () => activeProcedures.filter((p) => !Array.isArray(p.restrictions) || !p.restrictions.length),
    [activeProcedures]
  );

  function evaluateRestriction(nextSet: Set<string>) {
    if (nextSet.size !== 1) {
      setRestrictionInfo(null);
      return;
    }

    const onlyId = Array.from(nextSet)[0];
    const proc = activeProcedures.find((x) => String(x._id) === String(onlyId));
    if (!proc || !Array.isArray(proc.restrictions) || !proc.restrictions.length) {
      setRestrictionInfo(null);
      return;
    }

    // verifica se há um procedimento concluído na lista de restrições
    const hasMatch = proc.restrictions.some((rid) => completedIds.has(String(rid)));
    if (hasMatch) {
      const days = Number(proc.restrictDays || 0);
      const info = { name: proc.name, days };
      setRestrictionInfo(info);

      // ✅ envia pelos query params, não sessionStorage
      const url = new URL(window.location.href);
      url.searchParams.set("restrictName", encodeURIComponent(info.name));
      url.searchParams.set("restrictDays", String(info.days));
      window.history.replaceState({}, "", url);
    } else {
      setRestrictionInfo(null);
      // remove params
      const url = new URL(window.location.href);
      url.searchParams.delete("restrictName");
      url.searchParams.delete("restrictDays");
      window.history.replaceState({}, "", url);
    }
  }

  function toggle(id: string) {
    // limpa query params ao sair
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("restrictName");
    cleanUrl.searchParams.delete("restrictDays");
    window.history.replaceState({}, "", cleanUrl);

    id = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const clickedProc = activeProcedures.find((x) => String(x._id) === id);

      // Se já estava selecionado, apenas remove
      if (next.has(id)) {
        next.delete(id);
        evaluateRestriction(next);
        return next;
      }

      const isRestricted = Array.isArray(clickedProc?.restrictions) && clickedProc.restrictions.length > 0;
      const alreadyHasRestricted = Array.from(next).some((sid) => {
        const proc = activeProcedures.find((p) => String(p._id) === sid);
        return Array.isArray(proc?.restrictions) && proc.restrictions.length > 0;
      });

      // Se clicar em restrito → limpa e deixa só ele
      if (isRestricted) {
        const onlyThis = new Set([id]);
        evaluateRestriction(onlyThis);
        return onlyThis;
      }

      // Se já há restrito selecionado → não faz nada
      if (alreadyHasRestricted) {
        evaluateRestriction(next);
        return next;
      }

      // Seleção normal
      next.add(id);
      evaluateRestriction(next);
      return next;
    });
  }

  function clearSelection() {
    const empty = new Set<string>();
    setSelectedIds(empty);
    setRestrictionInfo(null);
  }

  // reavalia se completedIds ou lista de procedimentos mudar
  useEffect(() => {
    evaluateRestriction(selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedIds, activeProcedures]);

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
    // limpa query params ao sair
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("restrictName");
    cleanUrl.searchParams.delete("restrictDays");
    window.history.replaceState({}, "", cleanUrl);
    router.push(`/${tenantId}/home`);
  }

  if (loading) return <div>Carregando procedimentos...</div>;

  const prevInfo =
    editId && editingAppt
      ? `${String(editingAppt.date).split("-").reverse().join("/")} às ${editingAppt.time}`
      : "";

  const renderItem = (p: Proc) => {
    const id = String(p._id);
    const selected = selectedIds.has(id);

    // verifica se há algum restrito selecionado
    const hasRestrictedSelected = Array.from(selectedIds).some((sid) => {
      const proc = activeProcedures.find((x) => String(x._id) === sid);
      return Array.isArray(proc?.restrictions) && proc.restrictions.length > 0;
    });

    // se há restrito selecionado e este NÃO for ele → desativa
    const isRestrictedSelected = hasRestrictedSelected && !selected;

    // 🔒 verifica se o procedimento atual possui restrições
    const isRestrictedProc = Array.isArray(p.restrictions) && p.restrictions.length > 0;

    // 🔍 verifica se o cliente tem algum procedimento concluído que libera este
    const hasCompletedMatch = isRestrictedProc
      ? p.restrictions.some((rid) => completedIds.has(String(rid)))
      : true; // se não é restrito, sempre true

    // 🚫 Bloqueia visualmente se for restrito mas o cliente não tem histórico compatível
    const disabledByRestriction = isRestrictedProc && !hasCompletedMatch;

    const disabled = isRestrictedSelected || disabledByRestriction;

    
    return (
      <button
        key={id}
        type="button"
        onClick={() => !disabled && toggle(id)} // bloqueia clique
        disabled={disabled}
        className={`w-full text-left p-3 border rounded-lg transition ${
          selected ? "bg-rose-50 border-rose-200" : "bg-white hover:bg-gray-50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{
          borderColor: selected ? "#e6cfc9" : "#e5e7eb",
        }}
        title={
          disabledByRestriction
            ? "Disponível apenas após concluir o procedimento anterior."
            : undefined
        }
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
              className="inline-flex items-center justify-center rounded-full text-xs px-2 py-[2px]"
              style={{ background: "#f3e8e5", color: "#9d8983" }}
            >
              Selecionado
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 pb-28">
      <StepProgress current={1} canGoNext={selectedList.length > 0} onGo={() => goStep(2)} />

      {/* Aviso de edição */}
      {editId && editingAppt && (
        <div className="rounded-lg border p-3 bg-amber-50/40 text-sm" style={{ borderColor: "#fde68a" }}>
          <div className="font-medium">Editando agendamento</div>
          <div className="text-gray-700">Agendado originalmente para <b>{prevInfo}</b>.</div>
        </div>
      )}

      <h2 className="font-medium">Selecione os procedimentos:</h2>

      {/* Aviso de retorno quando o selecionado é compatível com algum concluído */}
      {restrictionInfo && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{ borderColor: "#e6cfc9", background: "#fff8f6", color: "#9d8983" }}
        >
          <div className="font-medium mb-1">Retorno programado para “{restrictionInfo.name}”.</div>
          <div className="text-xs leading-relaxed text-gray-700">
            Encontramos um procedimento anterior compatível. Na próxima etapa (calendário), as datas disponíveis serão
            limitadas conforme a política de retorno de <b>{restrictionInfo.days || 0} dia(s)</b>.
          </div>
        </div>
      )}

      {/* Grupo: com restrição */}
      {restrictedList.length > 0 && (
        <>
          <div className="text-sm font-medium text-amber-700 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" />
            Procedimentos com restrição
          </div>
          <div className="space-y-3">
            {restrictedList.map(renderItem)}
          </div>

          {/* Divider */}
          {otherList.length > 0 && (
            <div className="relative my-4 text-center text-xs text-gray-400">
              <span className="bg-white px-2">Outros procedimentos</span>
              <div className="absolute left-0 right-0 top-1/2 -z-10 border-t border-gray-200" />
            </div>
          )}
        </>
      )}

      {/* Grupo: sem restrição */}
      {otherList.length > 0 && (
        <div className="space-y-3">
          {otherList.map(renderItem)}
        </div>
      )}

      {/* Barra fixa inferior com resumo + ações */}
      <div className={`fixed inset-x-0 bottom-0 transition-all duration-500 transform ${
          isIdle ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        } bg-white/95 backdrop-blur border-t`}>
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
