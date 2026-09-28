import { api } from "@/lib/api";
import type { SummaryResult } from "@/lib/services/summarize";

export interface SavedSummary {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  messageCount: number;
  strategy: string;
  processedAt: string;
}

export const SavedSummariesService = {
  list: () => api.get<SavedSummary[]>("/api/ai/summaries"),
  save: (projectId: string, title: string, result: SummaryResult) =>
    api.post<SavedSummary>("/api/ai/summaries", {
      projectId,
      title,
      summary: result.summary,
      keyPoints: result.key_points,
      actionItems: result.action_items,
      messageCount: result.message_count,
      strategy: result.strategy,
    }),
};
