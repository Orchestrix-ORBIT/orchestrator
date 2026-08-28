package com.example.core_api.auth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @Valid @RequestBody RegisterRequest request
    ) {
        String tenant = (tenantId != null && !tenantId.isBlank()) ? tenantId : "myorg";
        String schemaName = "org_" + tenant.toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @Valid @RequestBody LoginRequest request
    ) {
        String tenant = (tenantId != null && !tenantId.isBlank()) ? tenantId : "myorg";
        String schemaName = "org_" + tenant.toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return ResponseEntity.ok(authService.login(request));
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }
}
