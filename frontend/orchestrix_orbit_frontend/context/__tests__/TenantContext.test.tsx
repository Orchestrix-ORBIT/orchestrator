// context/__tests__/TenantContext.test.tsx
// Tests for TenantProvider and useTenant hook

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { TenantProvider, useTenant } from "../TenantContext";

// ── Helper: consumer component to surface hook values ────────────────────────
function TenantConsumer() {
  const { tenantSlug, tenantId, setTenantSlug } = useTenant();
  return (
    <div>
      <span data-testid="slug">{tenantSlug}</span>
      <span data-testid="id">{tenantId}</span>
      <button onClick={() => setTenantSlug("new-tenant")}>Change</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("TenantProvider", () => {
  it("provides default tenantSlug of 'orchestrix-mrt' when localStorage is empty", () => {
    render(
      <TenantProvider>
        <TenantConsumer />
      </TenantProvider>
    );
    expect(screen.getByTestId("slug").textContent).toBe("orchestrix-mrt");
  });

  it("reads tenantSlug from localStorage on mount", async () => {
    localStorage.setItem("tenantSlug", "lab-acme");

    await act(async () => {
      render(
        <TenantProvider>
          <TenantConsumer />
        </TenantProvider>
      );
    });

    expect(screen.getByTestId("slug").textContent).toBe("lab-acme");
  });

  it("provides the fixed tenantId UUID constant", () => {
    render(
      <TenantProvider>
        <TenantConsumer />
      </TenantProvider>
    );
    expect(screen.getByTestId("id").textContent).toBe(
      "00000000-0000-0000-0000-000000000001"
    );
  });

  it("setTenantSlug updates the displayed slug and persists to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <TenantProvider>
        <TenantConsumer />
      </TenantProvider>
    );

    await user.click(screen.getByRole("button", { name: /change/i }));

    expect(screen.getByTestId("slug").textContent).toBe("new-tenant");
    expect(localStorage.getItem("tenantSlug")).toBe("new-tenant");
  });
});
