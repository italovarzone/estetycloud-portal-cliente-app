"use client";
import Image from "next/image";

export default function Brand({
  subtitle = "Portal do Cliente",
}: {
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center mb-6 select-none">
      <div className="relative h-14 w-14 mb-3">
        <Image
          src="/assets/images/logo_fundo_transp.png"
          alt="Logo Estety Cloud"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
          priority
        />
      </div>
      <h1 className="text-lg font-semibold" style={{ color: "#9d8983" }}>
        Estety Cloud
      </h1>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
