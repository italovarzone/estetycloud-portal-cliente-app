"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StepProgress from "../components/StepProgress";

/* Helpers */
const dayStart = 7 * 60, dayEnd = 19 * 60, step = 30;
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:10000").replace(/\/$/, "");
}
function toYMD(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseYMD(ymd){ const [y,m,d]=String(ymd).split("-").map(Number); return new Date(y,(m||1)-1,d||1); }
function minutesFromHHMM(hhmm){ const [h,m]=String(hhmm).split(":").map(Number); return h*60+(m||0); }
function hhmmFromMinutes(total){ const hh=String(Math.floor(total/60)).padStart(2,"0"); const mm=String(total%60).padStart(2,"0"); return `${hh}:${mm}`; }
function overlaps(aStart,aEnd,bStart,bEnd){ return aStart < bEnd && aEnd > bStart; }

export default function Step2Schedule({ selectedProcedures = [], onBack }) {
  const { tenantId } = useParams();
  const router = useRouter();

  // calendario
  const [monthCursor, setMonthCursor] = useState(() => { const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [selectedDate, setSelectedDate] = useState(() => toYMD(new Date()));

  // data carregada
  const [dayAppointments, setDayAppointments] = useState([]);
  const [allProcedures, setAllProcedures] = useState([]);
  const [pickedTime, setPickedTime] = useState("");

  // ui state
  const [loading, setLoading] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);   // MODAL

  /* load catalog */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("clientPortalToken");
        const r = await fetch(`${apiBase()}/api/client-portal/procedures`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId }
        });
        const data = await r.json();
        if (!cancelled) setAllProcedures(Array.isArray(data.procedures) ? data.procedures : []);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  /* load day */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingDay(true);
        setPickedTime("");
        const token = localStorage.getItem("clientPortalToken");
        const r = await fetch(`${apiBase()}/api/client-portal/appointments/day?date=${encodeURIComponent(selectedDate)}`, {
          headers: { Authorization: `Bearer ${token}`, "x-tenant-id": tenantId }
        });
        const data = await r.json();
        if (!cancelled) setDayAppointments(Array.isArray(data.appointments) ? data.appointments : []);
      } finally { if (!cancelled) setLoadingDay(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedDate, tenantId]);

  const durationByName = useMemo(() => {
    const map = new Map(); allProcedures.forEach(p => map.set(p.name, Number(p.duration || 0))); return map;
  }, [allProcedures]);

  const requestedMinutes = useMemo(
    () => selectedProcedures.reduce((acc,p)=>acc+Number(p.duration||0),0),
    [selectedProcedures]
  );

  const busyBlocks = useMemo(() => {
    return dayAppointments.map(ap => {
      let dur = 0;
      if (Array.isArray(ap.procedures) && ap.procedures.length) {
        dur = ap.procedures.reduce((s,x)=>s+(durationByName.get(x.name)||0),0);
      } else if (ap.procedure) { dur = durationByName.get(ap.procedure) || 0; }
      const s = minutesFromHHMM(ap.time), e = s + dur;
      return { s, e };
    }).filter(b => b.e > b.s);
  }, [dayAppointments, durationByName]);

  const slots = useMemo(() => {
    if (!requestedMinutes) return [];
    const lastStart = dayEnd - requestedMinutes;
    const arr = [];
    for (let s = dayStart; s <= lastStart; s += step) {
      const e = s + requestedMinutes;
      const conflicts = busyBlocks.some(b => overlaps(s,e,b.s,b.e));
      if (!conflicts) arr.push(hhmmFromMinutes(s));
    }
    return arr;
  }, [busyBlocks, requestedMinutes]);

  // calendario helpers
  function monthLabel(d){ return d.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}); }
  function daysInMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); }
  function firstWeekday(d){ return (new Date(d.getFullYear(), d.getMonth(), 1).getDay() + 6) % 7; }
  const totalDays = daysInMonth(monthCursor);
  const padStart = firstWeekday(monthCursor);
  const grid = [...Array(padStart).fill(null), ...Array.from({length:totalDays},(_,i)=>i+1)];

  function goPrevMonth(){ const d=new Date(monthCursor); d.setMonth(d.getMonth()-1); setMonthCursor(d); }
  function goNextMonth(){ const d=new Date(monthCursor); d.setMonth(d.getMonth()+1); setMonthCursor(d); }
  function pickDay(dayNum){ const d=new Date(monthCursor); d.setDate(dayNum); setSelectedDate(toYMD(d)); }

  const selectedSummary = useMemo(() => {
    const price = selectedProcedures.reduce((s,p)=>s+Number(p.price||0),0);
    return {
      count: selectedProcedures.length,
      durationTxt: `${Math.floor(requestedMinutes/60)}h ${requestedMinutes%60}m`,
      priceTxt: BRL.format(price)
    };
  }, [selectedProcedures, requestedMinutes]);

  // Stepper: clicar etapa 1 volta
  const goStep = (n) => { if (n === 1) onBack?.(); };

  // Avançar -> abre modal
  function askConfirm() {
    if (!pickedTime || saving) return;
    setConfirmOpen(true);
  }

  // Confirmar no modal -> salvar
  async function handleSave() {
    setSaveError("");
    setSaving(true);
    try {
      const token = localStorage.getItem("clientPortalToken");
      const payload = {
        date: selectedDate,
        time: pickedTime,
        procedures: selectedProcedures.map(p => ({ _id: p._id, name: p.name, price: p.price }))
      };
      const r = await fetch(`${apiBase()}/api/client-portal/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-tenant-id": tenantId },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha ao salvar agendamento.");

      sessionStorage.setItem("lastCreatedAppointment", JSON.stringify({
        id: data.id, date: selectedDate, time: pickedTime,
        total: selectedSummary.priceTxt, procs: selectedProcedures.map(p=>p.name)
      }));
      router.push(`/${tenantId}/novo-agendamento/sucesso`);
    } catch (e) {
      setSaveError(e.message || "Erro ao salvar agendamento.");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  if (loading) return <div>Carregando…</div>;
  const selDateObj = parseYMD(selectedDate);

  return (
    <div className="space-y-5 pb-28">
      <StepProgress current={2} onGo={goStep} />

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
            n === null ? <div key={`pad-${idx}`} /> : (
              <button
                key={n}
                onClick={() => pickDay(n)}
                className={[
                  "py-2 rounded-lg text-sm border",
                  (selDateObj.getFullYear()===monthCursor.getFullYear() &&
                   selDateObj.getMonth()===monthCursor.getMonth() &&
                   selDateObj.getDate()===n)
                    ? "bg-rose-50 border-rose-200"
                    : "bg-white hover:bg-gray-50"
                ].join(" ")}
                style={{ borderColor:"#e5e7eb" }}
              >
                {n}
              </button>
            )
          )}
        </div>
      </div>

      {/* Slots do dia */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            {selDateObj.toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"2-digit" })}
          </div>
          {loadingDay && <div className="text-xs text-gray-400">carregando…</div>}
        </div>

        {requestedMinutes === 0 ? (
          <div className="text-sm text-gray-500">Selecione pelo menos um procedimento no passo anterior.</div>
        ) : slots.length ? (
          <div className="grid grid-cols-3 gap-2">
            {slots.map((t) => (
              <button
                key={t}
                onClick={() => setPickedTime(t)}
                className={[
                  "py-2 rounded-lg border text-sm",
                  pickedTime === t ? "bg-rose-50 border-rose-300" : "bg-white hover:bg-gray-50"
                ].join(" ")}
                style={{ borderColor: pickedTime===t ? "#e6cfc9" : "#e5e7eb", color:"#222" }}
              >
                {t}
              </button>
            ))}
          </div>
        ) : <div className="text-sm text-gray-500">Sem horários livres entre 07:00 e 19:00 para a duração selecionada.</div>}
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
              onClick={askConfirm}         // abre modal
              className={`flex-1 rounded-xl border py-3 font-medium ${
                pickedTime && !saving ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400"}`}
              style={{ borderColor: pickedTime && !saving ? "#bca49d" : "#e5e7eb",
                       color: pickedTime && !saving ? "#9d8983" : undefined }}
            >
              {saving ? "Salvando..." : "Avançar"}
            </button>
          </div>
        </div>
      </div>

    {/* Modal de confirmação */}
    {confirmOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* backdrop */}
        <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setConfirmOpen(false)}
        />
        {/* caixa do modal */}
        <div className="relative w-full max-w-md rounded-xl bg-white p-5 shadow-lg mx-4">
        <h3 className="font-semibold mb-3">Confirmar agendamento?</h3>
        <div className="text-sm text-gray-700 space-y-1 mb-4">
            <div>
            <span className="font-medium">Data:</span>{" "}
            {selDateObj.toLocaleDateString("pt-BR")}
            </div>
            <div>
            <span className="font-medium">Horário:</span> {pickedTime}
            </div>
            <div>
            <span className="font-medium">Procedimentos:</span>{" "}
            {selectedProcedures.map((p) => p.name).join(", ")}
            </div>
            <div>
            <span className="font-medium">Total:</span> {selectedSummary.priceTxt}
            </div>
        </div>
        <div className="flex gap-3">
            <button
            onClick={() => setConfirmOpen(false)}
            className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb" }}
            >
            Revisar
            </button>
            <button
            onClick={handleSave}
            className="flex-1 rounded-lg border py-2 bg-white hover:bg-gray-50 font-medium"
            style={{ borderColor: "#bca49d", color: "#9d8983" }}
            >
            Confirmar & agendar
            </button>
        </div>
        </div>
    </div>
    )}
    </div>
  );
}
