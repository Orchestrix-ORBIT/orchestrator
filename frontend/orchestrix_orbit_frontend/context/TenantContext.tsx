// context/TenantContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface TenantContextType {
  tenantSlug: string;
  setTenantSlug: (slug: string) => void;
}

const TenantContext = createContext<TenantContextType>({
  tenantSlug: "",
  setTenantSlug: () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantSlug, setTenantSlugState] = useState<string>("");

  // On mount: restore slug from localStorage (persists across page refreshes)
  useEffect(() => {
    const stored = localStorage.getItem("tenantSlug") ?? "";
    setTenantSlugState(stored);
  }, []);

  const setTenantSlug = (slug: string) => {
    localStorage.setItem("tenantSlug", slug);
    setTenantSlugState(slug);
  };

  return (
    <TenantContext.Provider value={{ tenantSlug, setTenantSlug }}>
      {children}
    </TenantContext.Provider>
  );
}

// Custom hook — use this in any page: const { tenantSlug } = useTenant();
export const useTenant = () => useContext(TenantContext);
