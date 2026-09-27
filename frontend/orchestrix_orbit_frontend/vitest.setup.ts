// vitest.setup.ts
// Global test setup — runs before every test file

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// ── Mock next/navigation globally ─────────────────────────────────────────────
// Both Sidebar.tsx and AdminSidebar.tsx import usePathname / useRouter.
// We provide a stable mock so component tests don't need Next.js internals.
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// ── Mock next/link globally ───────────────────────────────────────────────────
// Renders <a> tags instead of the Next.js Link component so JSDOM can follow hrefs.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const React = require("react");
    return React.createElement("a", { href, ...props }, children);
  },
}));

// ── Silence console.warn / console.error in tests unless overridden ──────────
// Uncomment if you want cleaner test output:
// vi.spyOn(console, "warn").mockImplementation(() => {});
// vi.spyOn(console, "error").mockImplementation(() => {});
