"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StepProgress from "../components/StepProgress";

/* ===== helpers ===== */
const STEP_MIN = 30;
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DH_NAMES = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

type DayCfg = { enabled: boolean; start: string | null; end: string | null };

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseYMD(ymd: string) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function minutesFromHHMM(hhmm?: string | null) {
  const [h, m] = String(hhmm || "00:00").split(":").map((n) => Number(n || 0));
  return (h || 0) * 60 + (m || 0);
}
function hhmmFromMinutes(total: number) {
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
function overlaps(aS: number, aE: number, bS: number, bE: number) {
  return aS < bE && aE > bS;
}
function isPastDay(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d);  day.setHours(0, 0, 0, 0);
  return day < today;
}
function isTodayYMD(ymd: string) {
  return ymd === toYMD(new Date());
}
function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}
function defaultWeek(): DayCfg[] {
  return Array.from({ length: 7 }).map(() => ({ enabled: true, start: "07:00", end: "19:00" }));
}


/** normaliza (ordena + une sobreposições) */
function normalize(segs: { s: number; e: number }[]) {
  const a = segs.filter((x) => x.e > x.s).sort((x, y) => x.s - y.s);
  const out: { s: number; e: number }[] = [];
  for (const cur of a) {
    if (!out.length || cur.s > out[out.length - 1].e) out.push({ ...cur });
    else out[out.length - 1].e = Math.max(out[out.length - 1].e, cur.e);
  }
  return out;
}
/** base ∪ add */
function union(base: { s: number; e: number }[], add: { s: number; e: number }[]) {
  return normalize([...base, ...add]);
}
/** base − remove[] */
function subtract(base: { s: number; e: number }[], remove: { s: number; e: number }[]) {
  let cur = normalize(base);
  const rem = normalize(remove);
  for (const r of rem) {
    const next: { s: number; e: number }[] = [];
    for (const b of cur) {
      if (!overlaps(b.s, b.e, r.s, r.e)) {
        next.push(b);
        continue;
      }
      if (r.s <= b.s && r.e >= b.e) {
        // remove tudo
      } else if (r.s <= b.s && r.e < b.e) {
        next.push({ s: r.e, e: b.e });
      } else if (r.s > b.s && r.e >= b.e) {
        next.push({ s: b.s, e: r.s });
      } else {
        next.push({ s: b.s, e: r.s }, { s: r.e, e: b.e });
      }
    }
    cur = next;
  }
  return cur;
}

/* ===== tipos ===== */
type ProcPick = { _id: string; name: string; price: number; duration?: number };
type ExceptionRaw = { type?: string; kind?: string; start?: string; end?: string; reason?: string };

export default function Step2Schedule({
  selectedProcedures = [],
  onBack,
}: {
  selectedProcedures: ProcPick[];
  onBack: () => void;
}) {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();

  // calendário
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));

  // dados
  const [allProcedures, setAllProcedures] = useState<any[]>([]);
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [defaultHoursByDay, setDefaultHoursByDay] = useState<DayCfg[] | null>(null);
  const [dayBaseCfg, setDayBaseCfg] = useState<DayCfg>({ enabled: true, start: "07:00", end: "19:00" });
  const [exceptions, setExceptions] = useState<ExceptionRaw[]>([]);
  const [dayOffSet, setDayOffSet] = useState<Set<string>>(new Set());

  // ui
  const [pickedTime, setPickedTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false); // <- painel de informação

  /* catálogo de procedimentos */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("clientPortalToken") || "";
        const r = await fetch(`${apiBase()}/api/client-portal/procedures`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
        });
        const data = await r.json();
        if (!cancel) setAllProcedures(Array.isArray(data.procedures) ? data.procedures : []);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [tenantId]);

  /* ausências do mês (calendário) */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const token = localStorage.getItem("clientPortalToken") || "";
        const headers: any = { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId };
        const year = monthCursor.getFullYear();
        const month = String(monthCursor.getMonth() + 1).padStart(2, "0");

        const r = await fetch(`${apiBase()}/api/client-portal/schedule/month?year=${year}&month=${month}`, { headers });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Erro ao carregar ausências do mês.");

        const list: string[] = Array.isArray(j.dayOff) ? j.dayOff.map((x: string) => String(x).slice(0, 10)) : [];
        if (!cancel) setDayOffSet(new Set(list));
      } catch {
        if (!cancel) setDayOffSet(new Set());
      }
    })();
    return () => { cancel = true; };
  }, [tenantId, monthCursor]);

  /* dados do dia: base (por dia) + exceções + agendamentos */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoadingDay(true);
        setPickedTime("");

        const token = localStorage.getItem("clientPortalToken") || "";
        const headers = { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId } as any;

        const [sched, apps] = await Promise.all([
          fetch(`${apiBase()}/api/client-portal/schedule/detailed?date=${encodeURIComponent(selectedDate)}`, { headers })
            .then(async (r) => {
              const j = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(j?.error || "Erro ao carregar expediente.");
              return j;
            }),
          fetch(`${apiBase()}/api/client-portal/appointments/day?date=${encodeURIComponent(selectedDate)}`, { headers })
            .then(async (r) => {
              const j = await r.json().catch(() => ({}));
              if (!r.ok) throw new Error(j?.error || "Erro ao carregar agendamentos.");
              return j;
            }),
        ]);

        if (cancel) return;

        const byDay: DayCfg[] | null = Array.isArray(sched?.defaultHoursByDay)
          ? (sched.defaultHoursByDay as DayCfg[])
          : null;

        if (byDay) {
          setDefaultHoursByDay(byDay);
          const fd = sched?.forDate as DayCfg | undefined;
          if (fd && typeof fd.enabled === "boolean") setDayBaseCfg(fd);
          else {
            const idx = parseYMD(selectedDate).getDay();
            setDayBaseCfg(byDay[idx] || { enabled: true, start: "07:00", end: "19:00" });
          }
        } else {
          // legado
          const legacy = sched?.defaultHours || { start: "07:00", end: "19:00" };
          const replicated: DayCfg[] = Array.from({ length: 7 }).map(() => ({
            enabled: true, start: legacy.start, end: legacy.end
          }));
          setDefaultHoursByDay(replicated);
          setDayBaseCfg({ enabled: true, start: legacy.start, end: legacy.end });
        }

        setExceptions(Array.isArray(sched?.exceptions) ? sched.exceptions : []);
        setDayAppointments(Array.isArray(apps?.appointments) ? apps.appointments : []);
      } catch {
        const replicated: DayCfg[] = Array.from({ length: 7 }).map(() => ({
          enabled: true, start: "07:00", end: "19:00"
        }));
        if (!cancel) {
          setDefaultHoursByDay(replicated);
          setDayBaseCfg({ enabled: true, start: "07:00", end: "19:00" });
          setExceptions([]); setDayAppointments([]);
        }
      } finally {
        if (!cancel) setLoadingDay(false);
      }
    })();
    return () => { cancel = true; };
  }, [selectedDate, tenantId]);

  /* normaliza exceções */
  const exceptionsNorm = useMemo(
    () =>
      (exceptions || []).map((e: any) => {
        const rawType = String(e.type || "").toUpperCase();
        const rawKind = String(e.kind || "").toLowerCase();
        const isDayOff = rawType === "DAY_OFF" || rawKind === "absent";
        const isAdd = rawType === "ADD" || rawKind === "add";
        return {
          type: isDayOff ? "DAY_OFF" : isAdd ? "ADD" : "REMOVE",
          start: e.start || undefined,
          end: e.end || undefined,
          reason: e.reason,
        };
      }),
    [exceptions]
  );

  /* mapas/durações */
  const durationByName = useMemo(() => {
    const map = new Map<string, number>();
    allProcedures.forEach((p) => map.set(p.name, Number(p.duration || 0)));
    return map;
  }, [allProcedures]);

  const requestedMinutes = useMemo(
    () => selectedProcedures.reduce((acc, p) => acc + Number(p.duration ?? (p as any)["duration"] ?? 0), 0),
    [selectedProcedures]
  );

  /* blocos ocupados pelos agendamentos existentes */
  const busyBlocks = useMemo(() => {
    return (dayAppointments || [])
      .map((ap) => {
        let dur = 0;
        if (Array.isArray(ap.procedures) && ap.procedures.length) {
          dur = ap.procedures.reduce((s: number, x: any) => s + (durationByName.get(x.name) || 0), 0);
        } else if (ap.procedure) {
          dur = durationByName.get(ap.procedure) || 0;
        }
        const s = minutesFromHHMM(ap.time);
        return { s, e: s + dur };
      })
      .filter((b) => b.e > b.s)
      .sort((a, b) => a.s - b.s);
  }, [dayAppointments, durationByName]);

  /* janelas válidas */
  const hasDayOffException = useMemo(
    () => (exceptionsNorm || []).some((e) => e.type === "DAY_OFF"),
    [exceptionsNorm]
  );
  const baseClosed = !dayBaseCfg?.enabled;

  const allowedWindows = useMemo(() => {
    if (hasDayOffException) return [];

    const base: { s: number; e: number }[] =
      dayBaseCfg?.enabled && dayBaseCfg.start && dayBaseCfg.end
        ? [{ s: minutesFromHHMM(dayBaseCfg.start), e: minutesFromHHMM(dayBaseCfg.end) }]
        : [];

    const adds = (exceptionsNorm || [])
      .filter((e) => e.type === "ADD" && e.start && e.end)
      .map((e) => ({ s: minutesFromHHMM(e.start!), e: minutesFromHHMM(e.end!) }));

    const rems = (exceptionsNorm || [])
      .filter((e) => e.type === "REMOVE" && e.start && e.end)
      .map((e) => ({ s: minutesFromHHMM(e.start!), e: minutesFromHHMM(e.end!) }));

    return subtract(union(base, adds), rems);
  }, [dayBaseCfg, exceptionsNorm, hasDayOffException]);

  const isPastSelectedDay = useMemo(() => isPastDay(parseYMD(selectedDate)), [selectedDate]);

  /* slots */
  const slots = useMemo(() => {
    if (!requestedMinutes || !allowedWindows.length) return [];

    const minStartToday = isTodayYMD(selectedDate)
      ? Math.ceil(nowMinutes() / STEP_MIN) * STEP_MIN
      : 0;

    const result: string[] = [];
    for (const w of allowedWindows) {
      const startBase = Math.ceil(w.s / STEP_MIN) * STEP_MIN;
      const start = Math.max(startBase, minStartToday);
      const lastStart = w.e - requestedMinutes;
      for (let s = start; s <= lastStart; s += STEP_MIN) {
        const e = s + requestedMinutes;
        if (e > w.e) break;
        const hasConflict = busyBlocks.some((b) => overlaps(s, e, b.s, b.e));
        if (!hasConflict) result.push(hhmmFromMinutes(s));
      }
    }
    return result;
  }, [allowedWindows, requestedMinutes, busyBlocks, selectedDate]);

  const isSelectedDayFullyBooked = useMemo(
    () =>
      !hasDayOffException &&
      !isPastSelectedDay &&
      requestedMinutes > 0 &&
      slots.length === 0 &&
      (baseClosed ? true : allowedWindows.length > 0),
    [hasDayOffException, isPastSelectedDay, requestedMinutes, slots, baseClosed, allowedWindows.length]
  );

  /* calendário helpers */
  function monthLabel(d: Date) {
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }
  function daysInMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }
  function firstWeekday(d: Date) {
    return (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7;
  }
  const totalDays = daysInMonth(monthCursor);
  const padStart = firstWeekday(monthCursor);
  const grid = [...Array(padStart).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  function goPrevMonth() {
    const d = new Date(monthCursor);
    d.setMonth(d.getMonth() - 1);
    setMonthCursor(d);
  }
  function goNextMonth() {
    const d = new Date(monthCursor);
    d.setMonth(d.getMonth() + 1);
    setMonthCursor(d);
  }
  function pickDay(dayNum: number) {
    const d = new Date(monthCursor);
    d.setDate(dayNum);
    setSelectedDate(toYMD(d));
  }

  const selectedSummary = useMemo(() => {
    const price = selectedProcedures.reduce((s, p) => s + Number(p.price || 0), 0);
    const h = Math.floor((requestedMinutes || 0) / 60);
    const m = (requestedMinutes || 0) % 60;
    return { count: selectedProcedures.length, durationTxt: `${h}h ${m}m`, priceTxt: BRL.format(price) };
  }, [selectedProcedures, requestedMinutes]);

  const goStep = (n: number) => { if (n === 1) onBack?.(); };

  function askConfirm() {
    if (!pickedTime || saving) return;
    setConfirmOpen(true);
  }

  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("clientPortalToken") || "";
      const payload = {
        date: selectedDate,
        time: pickedTime,
        procedures: selectedProcedures.map((p) => ({ _id: p._id, name: p.name, price: p.price })),
      };

      const r = await fetch(`${apiBase()}/api/client-portal/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha ao salvar agendamento.");

      sessionStorage.setItem("lastCreatedAppointment", JSON.stringify({
        id: data.id, date: selectedDate, time: pickedTime,
        total: selectedSummary.priceTxt, procs: selectedProcedures.map((p) => p.name),
      }));
      router.push(`/${tenantId}/novo-agendamento/sucesso`);
    } catch (e: any) {
      setSaveError(e.message || "Erro ao salvar agendamento.");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

    const weeklyLines = useMemo(() => {
    const src = defaultHoursByDay && defaultHoursByDay.length === 7
      ? defaultHoursByDay
      : defaultWeek();

    const order = [1,2,3,4,5,6,0]; // Seg..Dom
    return order.map((idx) => {
      const d = src[idx] || { enabled: true, start: "07:00", end: "19:00" };
      const label = d.enabled && d.start && d.end ? `${d.start}–${d.end}` : "Sem expediente";
      return { name: DH_NAMES[idx], short: DH_NAMES[idx].slice(0,3), label };
    });
  }, [defaultHoursByDay]);

  if (loading) return <div>Carregando…</div>;
  const selDateObj = parseYMD(selectedDate);

  const baseLabel =
    dayBaseCfg?.enabled && dayBaseCfg.start && dayBaseCfg.end ? `${dayBaseCfg.start}–${dayBaseCfg.end}` : "Sem expediente";

  const labelWindow =
    hasDayOffException || isPastSelectedDay || isSelectedDayFullyBooked
      ? "Fechado"
      : allowedWindows.length === 0
      ? baseLabel
      : allowedWindows.map((w) => `${hhmmFromMinutes(w.s)}–${hhmmFromMinutes(w.e)}`).join(" • ");

  return (
    <div className="space-y-5 pb-28">
      <StepProgress current={2} onGo={() => goStep(2)} />

      {/* botão (i) no topo */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-label="Horários disponíveis"
          className="w-7 h-7 rounded-full border flex items-center justify-center text-xs hover:bg-gray-50"
          title="Horários disponíveis"
        >
          i
        </button>
      </div>

      {/* painel colapsável com os horários por dia */}
      {showInfo && (
        <div className="rounded-xl border p-3 bg-amber-50/40">
          <div className="font-medium text-sm mb-2">Horários disponíveis</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-gray-700">
            {weeklyLines.map((l) => (
              <div key={l.name} className="flex justify-between gap-2">
                <span className="text-gray-600">{l.short}</span>
                <span className="font-medium">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            * Pode haver exceções em dias específicos (ausências ou janelas extras).
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold">Escolha o dia e o horário</h2>

      {/* Calendário */}
      <div className="rounded-xl border p-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={goPrevMonth} className="px-2 py-1 rounded border">‹</button>
          <div className="font-medium text-sm capitalize">{monthLabel(monthCursor)}</div>
          <button onClick={goNextMonth} className="px-2 py-1 rounded border">›</button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
          <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((n, idx) =>
            n === null ? (
              <div key={`pad-${idx}`} />
            ) : (
              (() => {
                const d = new Date(monthCursor);
                d.setDate(n);
                const ymd = toYMD(d);
                const isSelected =
                  selDateObj.getFullYear() === monthCursor.getFullYear() &&
                  selDateObj.getMonth() === monthCursor.getMonth() &&
                  selDateObj.getDate() === n;

                  const isDayOffFromMonth = dayOffSet.has(ymd);
                  const past = isPastDay(d);

                  // verifica se o dia da semana no defaultHoursByDay está desativado
                  let isDefaultClosed = false;
                  if (defaultHoursByDay && defaultHoursByDay.length === 7) {
                    const idx = d.getDay(); // 0=Dom ... 6=Sáb
                    isDefaultClosed = defaultHoursByDay[idx]?.enabled === false;
                  }

                  const isAbsentException = exceptionsNorm.some(
                    (e) => e.type === "DAY_OFF" && ymd === selectedDate
                  );

                  const isDayOff = past || isDayOffFromMonth || isDefaultClosed || isAbsentException;


                return (
                  <button
                    key={n}
                    onClick={() => !isDayOff && pickDay(n)}
                    disabled={isDayOff}
                    title={
                      past
                        ? "Dia no passado"
                        : isDayOffFromMonth || isAbsentException
                        ? "Dia indisponível (ausência)"
                        : ""
                    }
                    className={[
                      "py-2 rounded-lg text-sm border",
                      isDayOff
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : isSelected
                        ? "bg-rose-50 border-rose-200"
                        : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                    style={{ borderColor: "#e5e7eb" }}
                  >
                    {n}
                  </button>
                );
              })()
            )
          )}
        </div>
      </div>

      {/* Slots do dia */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            {selDateObj.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
          </div>
          <div className="text-xs text-gray-500">Janela: {labelWindow}</div>
          {loadingDay && <div className="text-xs text-gray-400">carregando…</div>}
        </div>

        {isPastSelectedDay ? (
          <div className="text-sm text-gray-500">Dia no passado — agendamentos não permitidos.</div>
        ) : hasDayOffException ? (
          <div className="text-sm text-gray-500">Dia indisponível para agendamentos (ausência).</div>
        ) : requestedMinutes === 0 ? (
          <div className="text-sm text-gray-500">Selecione pelo menos um procedimento no passo anterior.</div>
        ) : slots.length ? (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((t) => (
              <button
                key={t}
                onClick={() => setPickedTime(t)}
                className={[
                  "py-2 rounded-lg border text-sm",
                  pickedTime === t ? "bg-rose-50 border-rose-300" : "bg-white hover:bg-gray-50",
                ].join(" ")}
                style={{ borderColor: pickedTime === t ? "#e6cfc9" : "#e5e7eb", color: "#222" }}
              >
                {t}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {allowedWindows.length === 0
              ? baseClosed
                ? "Sem expediente neste dia."
                : "Dia indisponível para agendamentos."
              : `Sem horários livres para a duração selecionada nas janelas: ${labelWindow}.`}
          </div>
        )}
      </div>

      {saveError && <div className="text-sm text-red-600">{saveError}</div>}

      {/* Barra fixa inferior */}
      <div className="fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur border-t">
        <div className="mx-auto w-full max-w-md p-4 space-y-2">
          <div className="text-xs text-gray-600">
            <span className="font-medium">{selectedSummary.count}</span> procedimento(s) •{" "}
            <span className="font-medium">{selectedSummary.durationTxt}</span> •{" "}
            <span className="font-medium">{selectedSummary.priceTxt}</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-1/3 rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
              style={{ borderColor: "#bca49d", color: "#9d8983" }}
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!pickedTime || saving}
              onClick={askConfirm}
              className={`flex-1 rounded-xl border py-3 font-medium ${
                pickedTime && !saving ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400"
              }`}
              style={{ borderColor: pickedTime && !saving ? "#bca49d" : "#e5e7eb", color: pickedTime && !saving ? "#9d8983" : undefined }}
            >
              {saving ? "Salvando..." : "Avançar"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg mx-4">
            <h3 className="font-semibold mb-3">Confirmar agendamento?</h3>
            <div className="text-sm text-gray-700 space-y-1 mb-4">
              <div><span className="font-medium">Data:</span> {selDateObj.toLocaleDateString("pt-BR")}</div>
              <div><span className="font-medium">Horário:</span> {pickedTime}</div>
              <div><span className="font-medium">Procedimentos:</span> {selectedProcedures.map((p) => p.name).join(", ")}</div>
              <div><span className="font-medium">Total:</span> {selectedSummary.priceTxt}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
                Revisar
              </button>
              <button onClick={handleSave} className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50 font-medium" style={{ borderColor: "#bca49d", color: "#9d8983" }}>
                Confirmar & agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
