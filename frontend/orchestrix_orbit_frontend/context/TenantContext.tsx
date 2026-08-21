"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TenantContextType {
  tenantSlug: string;
  tenantId?: string;
  setTenantSlug: (slug: string) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantSlug: "orchestrix-mrt",
  tenantId: "00000000-0000-0000-0000-000000000001",
  setTenantSlug: () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantSlug, setTenantSlugState] = useState<string>("orchestrix-mrt");

  useEffect(() => {
    const stored = localStorage.getItem("tenantSlug");
    if (stored) {
      setTenantSlugState(stored);
    }
  }, []);

  const setTenantSlug = (slug: string) => {
    localStorage.setItem("tenantSlug", slug);
    setTenantSlugState(slug);
  };

  return (
    <TenantContext.Provider
      value={{
        tenantSlug,
        tenantId: "00000000-0000-0000-0000-000000000001",
        setTenantSlug,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
