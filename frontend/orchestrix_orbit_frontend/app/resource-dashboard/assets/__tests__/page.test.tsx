import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResourceAssetsPage from "../page";
import { ResourcesService } from "@/lib/services/resources";

vi.mock("@/lib/services/resources", () => ({
  ResourcesService: { getAll: vi.fn(), getMaintenance: vi.fn(), create: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ResourcesService.getAll).mockResolvedValue([]);
  vi.mocked(ResourcesService.getMaintenance).mockResolvedValue([]);
});

describe("resource asset page", () => {
  it("displays an empty state then adds an asset with the selected options", async () => {
    vi.mocked(ResourcesService.create).mockResolvedValue({
      id: "r1", name: "Lab GPU", type: "GPU", status: "AVAILABLE", createdAt: "2026-01-01",
    } as Awaited<ReturnType<typeof ResourcesService.create>>);
    render(<ResourceAssetsPage />);
    const user = userEvent.setup();
    expect(await screen.findByText("No assets registered yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add Asset/i }));
    await user.type(screen.getByPlaceholderText("e.g. High-Resolution TEM Microscope"), " Lab GPU ");
    await user.type(screen.getByPlaceholderText("e.g. Server Room B, Rack 04"), "Room B");
    await user.click(screen.getByRole("button", { name: "Add Asset" }));
    await waitFor(() => expect(screen.getByText("Lab GPU")).toBeInTheDocument());
    expect(ResourcesService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: "Lab GPU", type: "GPU", location: "Room B", maxDurationHours: 4,
    }));
  });

  it("keeps the form open and shows an API error", async () => {
    vi.mocked(ResourcesService.create).mockRejectedValue(new Error("Not allowed"));
    render(<ResourceAssetsPage />);
    const user = userEvent.setup();
    await screen.findByText("No assets registered yet.");
    await user.click(screen.getByRole("button", { name: /Add Asset/i }));
    await user.type(screen.getByPlaceholderText("e.g. High-Resolution TEM Microscope"), "Lab GPU");
    await user.click(screen.getByRole("button", { name: "Add Asset" }));
    expect(await screen.findByText("Not allowed")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. High-Resolution TEM Microscope")).toHaveValue("Lab GPU");
  });
});
