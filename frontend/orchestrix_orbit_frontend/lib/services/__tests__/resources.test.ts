// lib/services/__tests__/resources.test.ts
// Unit tests for ResourcesService — resources, bookings, and maintenance

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ResourcesService } from "../resources";
import * as apiModule from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const RID = "resource-001";
const BID = "booking-999";

// ── Resources ─────────────────────────────────────────────────────────────────
describe("ResourcesService.getAll", () => {
  it("calls api.get with /api/resources when no filters provided", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getAll();
    expect(apiModule.api.get).toHaveBeenCalledWith("/api/resources");
  });

  it("appends type query parameter when type is provided", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getAll("GPU");
    expect(apiModule.api.get).toHaveBeenCalledWith("/api/resources?type=GPU");
  });

  it("appends status query parameter when status is provided", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getAll(undefined, "AVAILABLE");
    expect(apiModule.api.get).toHaveBeenCalledWith(
      "/api/resources?status=AVAILABLE"
    );
  });

  it("appends both type and status when both are provided", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getAll("COMPUTE", "IN_USE");
    expect(apiModule.api.get).toHaveBeenCalledWith(
      "/api/resources?type=COMPUTE&status=IN_USE"
    );
  });
});

describe("ResourcesService.getById", () => {
  it("calls api.get with /api/resources/{id}", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue({});
    await ResourcesService.getById(RID);
    expect(apiModule.api.get).toHaveBeenCalledWith(`/api/resources/${RID}`);
  });
});

describe("ResourcesService.create", () => {
  it("transforms body to include metadata field with location and maxDurationHours", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    await ResourcesService.create({
      name: "GPU Node A",
      type: "GPU",
      description: "High-performance GPU",
      location: "Lab B",
      maxDurationHours: 8,
    });

    expect(apiModule.api.post).toHaveBeenCalledWith("/api/resources", {
      name: "GPU Node A",
      type: "GPU",
      description: "High-performance GPU",
      metadata: JSON.stringify({ location: "Lab B", maxDurationHours: 8 }),
    });
  });

  it("uses default location and maxDurationHours when not provided", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    await ResourcesService.create({ name: "Room X", type: "ROOM" });

    expect(apiModule.api.post).toHaveBeenCalledWith("/api/resources", {
      name: "Room X",
      type: "ROOM",
      description: undefined,
      metadata: JSON.stringify({
        location: "Core Lab Facility",
        maxDurationHours: 4,
      }),
    });
  });
});

describe("ResourcesService.updateStatus", () => {
  it("calls api.patch with the status endpoint and status payload", async () => {
    vi.mocked(apiModule.api.patch).mockResolvedValue({});
    await ResourcesService.updateStatus(RID, "MAINTENANCE");
    expect(apiModule.api.patch).toHaveBeenCalledWith(
      `/api/resources/${RID}/status`,
      { status: "MAINTENANCE" }
    );
  });
});

// ── Bookings ──────────────────────────────────────────────────────────────────
describe("ResourcesService.getBookings", () => {
  it("calls api.get with /api/resources/{id}/bookings", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getBookings(RID);
    expect(apiModule.api.get).toHaveBeenCalledWith(
      `/api/resources/${RID}/bookings`
    );
  });
});

describe("ResourcesService.getMyBookings", () => {
  it("calls api.get with /api/resources/bookings/me", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getMyBookings();
    expect(apiModule.api.get).toHaveBeenCalledWith(
      "/api/resources/bookings/me"
    );
  });
});

describe("ResourcesService.createBooking", () => {
  it("calls api.post with resource booking URL and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    const body = {
      startTime: "2026-09-01T09:00:00Z",
      endTime: "2026-09-01T11:00:00Z",
      purpose: "Experiment run",
    };
    await ResourcesService.createBooking(RID, body);
    expect(apiModule.api.post).toHaveBeenCalledWith(
      `/api/resources/${RID}/bookings`,
      body
    );
  });
});

describe("ResourcesService.updateBookingStatus", () => {
  it("calls api.patch with the booking status URL and payload", async () => {
    vi.mocked(apiModule.api.patch).mockResolvedValue({});
    await ResourcesService.updateBookingStatus(BID, "APPROVED");
    expect(apiModule.api.patch).toHaveBeenCalledWith(
      `/api/resources/bookings/${BID}/status`,
      { status: "APPROVED" }
    );
  });
});

// ── Maintenance ───────────────────────────────────────────────────────────────
describe("ResourcesService.getMaintenance", () => {
  it("calls api.get with /api/resources/maintenance", async () => {
    vi.mocked(apiModule.api.get).mockResolvedValue([]);
    await ResourcesService.getMaintenance();
    expect(apiModule.api.get).toHaveBeenCalledWith(
      "/api/resources/maintenance"
    );
  });
});

describe("ResourcesService.createMaintenance", () => {
  it("calls api.post with /api/resources/maintenance and body", async () => {
    vi.mocked(apiModule.api.post).mockResolvedValue({});
    const body = { resourceId: RID, reason: "Scheduled maintenance" };
    await ResourcesService.createMaintenance(body);
    expect(apiModule.api.post).toHaveBeenCalledWith(
      "/api/resources/maintenance",
      body
    );
  });
});
