import SaveTenant from "./SaveTenant";
import AuthGate from "./AuthGate";

export const metadata = {
  title: "Portal do Cliente • Estety Cloud",
};

// (opcional, se quiser controlar viewport por layout)
// export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { tenantId: string };
}) {
  return (
    <>
      {/* salva/atualiza o tenantId assim que a página renderiza */}
      <SaveTenant tenantId={params.tenantId} />
      {/* protege tudo do grupo (protected) */}
      <AuthGate>{children}</AuthGate>
    </>
  );
}
