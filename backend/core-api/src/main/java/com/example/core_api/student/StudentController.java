package com.example.core_api.student;

import com.example.core_api.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentProfileService profileService;

    public StudentController(StudentProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping("/profile")
    public ResponseEntity<StudentProfileResponse> createOrUpdateProfile(@Valid @RequestBody CreateStudentProfileRequest request) {
        UUID userId = getAuthenticatedUserId();
        StudentProfileResponse response = profileService.createOrUpdateProfile(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile/me")
    public StudentProfileResponse getMyProfile() {
        UUID userId = getAuthenticatedUserId();
        return profileService.getProfileByUserId(userId);
    }

    @GetMapping("/profile/{userId}")
    public StudentProfileResponse getProfileByUserId(@PathVariable UUID userId) {
        return profileService.getProfileByUserId(userId);
    }

    private UUID getAuthenticatedUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}
