package com.example.core_api.team;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.UserRole;
import com.example.core_api.auth.UserStatus;
import com.example.core_api.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TeamService {

    private final UserRepository userRepository;

    public TeamService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getAllMembers() {
        return userRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TeamMemberResponse getMemberById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + id));
        return mapToResponse(user);
    }

    public TeamMemberResponse updateMemberRole(UUID id, UserRole newRole) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + id));
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.OWNER) {
            throw new IllegalArgumentException("Cannot modify the role of an Admin or Owner account.");
        }
        user.setRole(newRole);
        user = userRepository.save(user);
        return mapToResponse(user);
    }

    public void removeMember(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + id));
        user.setStatus(UserStatus.SUSPENDED);
        userRepository.save(user);
    }

    private TeamMemberResponse mapToResponse(User user) {
        return TeamMemberResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
