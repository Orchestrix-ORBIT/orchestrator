// components/ui/__tests__/LoadingState.test.tsx
// Unit tests for the LoadingState UI component

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LoadingState from "../LoadingState";

describe("LoadingState", () => {
  it("renders only skeleton placeholders (no heading) when no props are provided", () => {
    const { container } = render(<LoadingState />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(container.querySelector(".skeleton-line")).toBeInTheDocument();
  });

  it("renders a custom title passed via the title prop", () => {
    render(<LoadingState title="Initialising Dashboard" />);
    expect(screen.getByText("Initialising Dashboard")).toBeInTheDocument();
  });

  it("renders a custom subtitle passed via the subtitle prop", () => {
    render(<LoadingState subtitle="Please wait a moment…" />);
    expect(screen.getByText("Please wait a moment…")).toBeInTheDocument();
  });

  it("does not render a subtitle paragraph when subtitle is an empty string", () => {
    render(<LoadingState subtitle="" />);
    // subtitle is conditionally rendered: `{subtitle && (<p>...</p>)}`
    // An empty string is falsy so the paragraph should not appear.
    expect(
      screen.queryByText("Fetching latest updates and workspace state")
    ).not.toBeInTheDocument();
  });
});
