package com.example.core_api.resource;

import com.example.core_api.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceResponse createResource(@Valid @RequestBody CreateResourceRequest request) {
        UUID ownerId = getAuthenticatedUserId();
        return resourceService.createResource(request, ownerId);
    }

    @GetMapping
    public List<ResourceResponse> getAllResources(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) ResourceStatus status) {
        return resourceService.getAllResources(type, status);
    }

    @GetMapping("/{id}")
    public ResourceResponse getResourceById(@PathVariable UUID id) {
        return resourceService.getResourceById(id);
    }

    private UUID getAuthenticatedUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}
