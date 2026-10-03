"use client";

/**
 * useTasksRealtime.ts
 *
 * Polls TasksService.getByProject() every `intervalMs` milliseconds
 * and fires `onUpdate(tasks)` whenever the task list has changed
 * (detected by comparing the last-seen JSON snapshot).
 *
 * The backend does not broadcast task-update events via WebSocket,
 * so polling is the only way to keep all collaborators' boards in sync.
 *
 * Usage:
 *   useTasksRealtime(projectIds, intervalMs, onUpdate);
 */

import { useEffect, useRef } from "react";
import { TasksService, type Task } from "@/lib/services/tasks";

/**
 * @param projectIds  – Array of project IDs to poll. Pass empty array to disable.
 * @param intervalMs  – Polling interval in milliseconds. Default 8 000 ms.
 * @param onUpdate    – Called with the full refreshed task array whenever a change is detected.
 */
export function useTasksRealtime(
  projectIds: string[],
  onUpdate: (tasks: Task[]) => void,
  intervalMs = 3000
) {
  const snapshotRef = useRef<string>("");
  const onUpdateRef = useRef(onUpdate);

  // Keep the callback ref up-to-date without restarting the interval
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!projectIds.length) return;

    async function poll() {
      try {
        const results = await Promise.all(
          projectIds.map(id => TasksService.getByProject(id).catch(() => [] as Task[]))
        );
        const fresh = results.flat();
        const snapshot = JSON.stringify(
          fresh.map(t => ({ id: t.id, status: t.status, assigneeId: t.assigneeId }))
        );
        if (snapshot !== snapshotRef.current) {
          snapshotRef.current = snapshot;
          onUpdateRef.current(fresh);
        }
      } catch {
        // Silently ignore transient network errors — the UI keeps its current state
      }
    }

    const handle = setInterval(poll, intervalMs);
    return () => clearInterval(handle);
  }, [JSON.stringify(projectIds), intervalMs]); // eslint-disable-line react-hooks/exhaustive-deps
}
