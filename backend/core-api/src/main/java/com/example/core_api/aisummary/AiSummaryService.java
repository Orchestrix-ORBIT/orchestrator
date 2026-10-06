package com.example.core_api.aisummary;

import com.example.core_api.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;

import com.example.core_api.project.Project;
import com.example.core_api.project.ProjectRepository;
import com.example.core_api.notification.NotificationService;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiSummaryService {

    private static final Logger log = LoggerFactory.getLogger(AiSummaryService.class);
    private static final Pattern QUOTED_STRING_PATTERN = Pattern.compile("\"((?:\\\\\"|[^\"])*)\"");

    private final AiSummaryRepository repository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;

    public AiSummaryService(AiSummaryRepository repository, ProjectRepository projectRepository, NotificationService notificationService) {
        this.repository = repository;
        this.projectRepository = projectRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public AiSummaryResponse createSummary(CreateAiSummaryRequest req, UUID createdBy) {
        String actionItemsJson = toJson(req.getActionItems());
        String keyFindingsJson = toJson(req.getKeyFindings());
        String deadlineSuggestionsJson = toJson(req.getDeadlineSuggestions());

        AiSummary entity = AiSummary.builder()
                .projectId(req.getProjectId())
                .createdBy(createdBy)
                .topic(req.getTopic() != null && !req.getTopic().isBlank() ? req.getTopic() : "Chat Discussion Summary")
                .summaryText(req.getSummaryText())
                .actionItems(actionItemsJson)
                .keyFindings(keyFindingsJson)
                .deadlineSuggestions(deadlineSuggestionsJson)
                .confidence(req.getConfidence() != null ? req.getConfidence() : 100)
                .model(req.getModel() != null ? req.getModel() : "LangChain Context Engine")
                .status(req.getStatus() != null ? req.getStatus() : "Pending Approval")
                .transcriptHash(req.getTranscriptHash() != null && !req.getTranscriptHash().isBlank() ? req.getTranscriptHash() : UUID.randomUUID().toString())
                .processedAt(OffsetDateTime.now())
                .build();

        AiSummary saved = repository.save(entity);

        // Notify project owner
        projectRepository.findById(req.getProjectId()).ifPresent(project -> {
            notificationService.notify(
                project.getOwnerId(),
                "AI_SUMMARY_CREATED",
                "New AI Action Items",
                "The Context Engine has suggested new tasks for project: " + project.getName()
            );
        });

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AiSummaryResponse> getAllSummaries() {
        return repository.findAllByOrderByProcessedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AiSummaryResponse> getSummariesByUser(UUID createdBy) {
        return repository.findByCreatedByOrderByProcessedAtDesc(createdBy)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AiSummaryResponse> getSummariesByUserAndProject(UUID createdBy, UUID projectId) {
        return repository.findByCreatedByAndProjectIdOrderByProcessedAtDesc(createdBy, projectId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AiSummaryResponse> getSummariesByProject(UUID projectId) {
        return repository.findByProjectIdOrderByProcessedAtDesc(projectId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AiSummaryResponse getSummaryById(UUID id) {
        AiSummary entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI Summary not found with id: " + id));
        return mapToResponse(entity);
    }

    @Transactional
    public AiSummaryResponse updateStatus(UUID id, String status) {
        AiSummary entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI Summary not found with id: " + id));
        entity.setStatus(status);
        AiSummary saved = repository.save(entity);
        return mapToResponse(saved);
    }

    @Transactional
    public AiSummaryResponse updateActionItems(UUID id, List<String> actionItems) {
        AiSummary entity = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AI Summary not found with id: " + id));
        entity.setActionItems(toJson(actionItems));
        AiSummary saved = repository.save(entity);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteSummary(UUID id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("AI Summary not found with id: " + id);
        }
        repository.deleteById(id);
    }

    private AiSummaryResponse mapToResponse(AiSummary s) {
        return AiSummaryResponse.builder()
                .id(s.getId())
                .projectId(s.getProjectId())
                .createdBy(s.getCreatedBy())
                .topic(s.getTopic() != null ? s.getTopic() : "Chat Discussion Summary")
                .summaryText(s.getSummaryText())
                .actionItems(fromJson(s.getActionItems()))
                .keyFindings(fromJson(s.getKeyFindings()))
                .deadlineSuggestions(fromJson(s.getDeadlineSuggestions()))
                .confidence(s.getConfidence() != null ? s.getConfidence() : 100)
                .model(s.getModel() != null ? s.getModel() : "LangChain Context Engine")
                .status(s.getStatus() != null ? s.getStatus() : "Pending Approval")
                .transcriptHash(s.getTranscriptHash())
                .processedAt(s.getProcessedAt())
                .build();
    }

    private String toJson(List<String> list) {
        if (list == null || list.isEmpty()) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(escapeJson(list.get(i))).append("\"");
        }
        sb.append("]");
        return sb.toString();
    }

    private List<String> fromJson(String json) {
        if (json == null || json.isBlank() || json.trim().equals("[]")) {
            return Collections.emptyList();
        }
        List<String> result = new ArrayList<>();
        String trimmed = json.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            trimmed = trimmed.substring(1, trimmed.length() - 1).trim();
        }
        if (trimmed.isEmpty()) {
            return result;
        }
        Matcher m = QUOTED_STRING_PATTERN.matcher(trimmed);
        while (m.find()) {
            result.add(unescapeJson(m.group(1)));
        }
        return result;
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String unescapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\\"", "\"")
                .replace("\\\\", "\\")
                .replace("\\n", "\n")
                .replace("\\r", "\r")
                .replace("\\t", "\t");
    }
}
