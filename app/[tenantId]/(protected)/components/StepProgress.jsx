"use client";

export default function StepProgress({
  current = 1,                 // 1 ou 2
  onGo = () => {},             // (step:number) => void
  canGoNext = false            // habilita clicar na etapa 2 a partir da 1
}) {
  const steps = [
    { id: 1, label: "Procedimentos" },
    { id: 2, label: "Dia & horário" },
  ];

  return (
    <div className="mb-4">
      <ol className="flex items-center">
        {steps.map((s, i) => {
          const completed = s.id < current;
          const active    = s.id === current;
          const clickable =
            (s.id < current) || (s.id === 2 && current === 1 && canGoNext);

          return (
            <li key={s.id} className="flex items-center w-full">
              {/* bolinha */}
              <button
                type="button"
                onClick={() => clickable && onGo(s.id)}
                className={[
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm transition",
                  completed
                    ? "bg-green-600 border-green-600 text-white"
                    : active
                    ? "border-rose-300 text-rose-700 bg-white"
                    : "bg-gray-100 border-gray-200 text-gray-500",
                  clickable ? "cursor-pointer" : "cursor-default"
                ].join(" ")}
                aria-current={active ? "step" : undefined}
                title={s.label}
              >
                {s.id}
              </button>

              {/* label (mobile-first) */}
              <span
                className={[
                  "ml-2 text-xs",
                  completed ? "text-green-700" : active ? "text-rose-700" : "text-gray-500"
                ].join(" ")}
              >
                {s.label}
              </span>

              {/* linha até a próxima bolinha (exceto na última) */}
              {i < steps.length - 1 && (
                <div
                  className={[
                    "mx-2 h-0.5 flex-1",
                    completed ? "bg-green-600" : "bg-gray-200"
                  ].join(" ")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
