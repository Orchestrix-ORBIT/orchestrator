package com.example.core_api.team;

import com.example.core_api.auth.UserRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRoleRequest {
    @NotNull(message = "Role is required")
    private UserRole role;
}
