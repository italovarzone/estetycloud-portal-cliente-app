"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

/** Fogos bem leves via canvas (sem dependência externa) */
function Fireworks({ duration = 2500 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    let raf = 0, start = performance.now();
    let w = (c.width = window.innerWidth);
    let h = (c.height = window.innerHeight);

    const onResize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener("resize", onResize);

    const particles = [];
    function burst(x, y) {
      const n = 45 + Math.floor(Math.random() * 25);
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 60 + Math.random() * 30,
          color: `hsl(${Math.floor(Math.random()*360)},90%,60%)`
        });
      }
    }

    // 3 explosões
    burst(w * 0.3, h * 0.4);
    setTimeout(()=>burst(w * 0.7, h * 0.35), 400);
    setTimeout(()=>burst(w * 0.5, h * 0.55), 900);

    function tick(t) {
      const elapsed = t - start;
      ctx.clearRect(0,0,w,h);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // gravidade
        p.life -= 1;
        ctx.globalAlpha = Math.max(p.life/90, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      for (let i = particles.length-1; i>=0; i--) if (particles[i].life <= 0) particles.splice(i,1);
      if (elapsed < duration) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [duration]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
}

export default function SuccessPage() {
  const { tenantId } = useParams();
  const router = useRouter();

  // tenta ler o último agendamento salvo para mostrar um resuminho
  let info = null;
  try { info = JSON.parse(sessionStorage.getItem("lastCreatedAppointment") || "null"); } catch(e){}

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-white relative">
      <Fireworks />

      <div className="mx-auto w-full max-w-md p-6 text-center space-y-4">
        <div className="text-2xl font-bold">Agendamento Efetuado! 🎉</div>
        {info && (
          <div className="text-sm text-gray-600">
            <div><span className="font-medium">Data:</span> {new Date(info.date).toLocaleDateString("pt-BR")}</div>
            <div><span className="font-medium">Hora:</span> {info.time}</div>
            <div><span className="font-medium">Procedimentos:</span> {info.procs.join(", ")}</div>
            <div><span className="font-medium">Total:</span> {info.total}</div>
          </div>
        )}
        <div className="pt-2">
          <button
            onClick={() => router.push(`/${tenantId}/meus-agendamentos`)}
            className="w-full rounded-xl border py-3 font-medium bg-white hover:bg-gray-50"
            style={{ borderColor: "#bca49d", color: "#9d8983" }}
          >
            Ver meus agendamentos
          </button>
        </div>
      </div>
    </div>
  );
}
