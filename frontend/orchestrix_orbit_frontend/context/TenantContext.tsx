"use client";

import { createContext, useContext, ReactNode } from "react";

interface TenantContextValue {
  tenantSlug: string;
  tenantId: string;
}

const TenantContext = createContext<TenantContextValue>({
  tenantSlug: "default",
  tenantId: "00000000-0000-0000-0000-000000000000",
});

export function TenantProvider({ children }: { children: ReactNode }) {
  // In production this would be derived from the JWT / subdomain
  const value: TenantContextValue = {
    tenantSlug: "orchestrix-mrt",
    tenantId: "00000000-0000-0000-0000-000000000001",
  };
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
