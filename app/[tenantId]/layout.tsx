import Link from "next/link";
import TenantBoot from "./TenantBoot";

export default function Layout({
  children,
  params: { tenantId },
}: { children: React.ReactNode; params: { tenantId: string } }) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-[#f8f9fa] text-[#1D1411]">
        {children}
      </body>
    </html>
  );
}
