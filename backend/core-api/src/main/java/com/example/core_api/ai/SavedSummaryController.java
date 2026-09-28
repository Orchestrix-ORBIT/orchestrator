package com.example.core_api.ai;

import com.example.core_api.auth.User;
import com.example.core_api.project.ProjectAccess;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai/summaries")
@RequiredArgsConstructor
public class SavedSummaryController {
    private final SavedSummaryRepository repository;
    private final ProjectAccess projectAccess;

    @GetMapping
    public List<SavedSummaryResponse> list(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) throw new AccessDeniedException("Authentication required");
        return repository.findAllByOrderByProcessedAtDesc().stream()
                .filter(saved -> projectAccess.canAccess(currentUser, saved.getProjectId()))
                .map(SavedSummaryResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavedSummaryResponse save(@AuthenticationPrincipal User currentUser,
                                     @Valid @RequestBody SaveSummaryRequest request) {
        if (!projectAccess.canAccess(currentUser, request.projectId())) {
            throw new AccessDeniedException("Project access required");
        }
        SavedSummary saved = new SavedSummary();
        saved.setProjectId(request.projectId());
        saved.setTranscriptHash(UUID.randomUUID().toString());
        saved.setTitle(request.title());
        saved.setSummary(request.summary());
        saved.setKeyPoints(request.keyPoints());
        saved.setActionItems(request.actionItems());
        saved.setMessageCount(request.messageCount());
        saved.setStrategy(request.strategy());
        return SavedSummaryResponse.from(repository.save(saved));
    }
}
