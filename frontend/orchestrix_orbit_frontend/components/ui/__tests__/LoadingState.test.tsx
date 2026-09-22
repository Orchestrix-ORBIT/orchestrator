// components/ui/__tests__/LoadingState.test.tsx
// Unit tests for the LoadingState UI component

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import LoadingState from "../LoadingState";

describe("LoadingState", () => {
  it("renders the default title when no props are provided", () => {
    render(<LoadingState />);
    expect(
      screen.getByText("Loading Workspace Data…")
    ).toBeInTheDocument();
  });

  it("renders the default subtitle when no props are provided", () => {
    render(<LoadingState />);
    expect(
      screen.getByText("Fetching latest updates and workspace state")
    ).toBeInTheDocument();
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
