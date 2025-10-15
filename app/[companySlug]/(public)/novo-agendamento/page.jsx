"use client";

import { useState } from "react";
import Step1 from "../../(protected)/novo-agendamento/Step1Procedures";   // reaproveita
import Step2 from "../../(protected)/novo-agendamento/Step2Schedule";    // reaproveita

export default function NovoAgendamentoPage() {
  const [step, setStep] = useState(1);
  const [selProcedures, setSelProcedures] = useState([]);
  const [when, setWhen] = useState({ date: "", time: "" });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-5">
      {step === 1 && (
        <Step1
          cart={selProcedures}
          onNext={(list) => {
            setSelProcedures(list);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <Step2
          selectedProcedures={selProcedures}
          onBack={() => setStep(1)}
          onNext={({ date, time }) => {
            setWhen({ date, time });
            // aqui você já pode ir para o Step3 (confirmação)
            // setStep(3);
            console.log("Escolhido:", date, time);
          }}
        />
      )}
    </div>
  );
}
