import SaveTenant from "./SaveTenant";

export const metadata = {
  title: "Portal do Cliente • Estety Cloud",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

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
      {children}
    </>
  );
}

