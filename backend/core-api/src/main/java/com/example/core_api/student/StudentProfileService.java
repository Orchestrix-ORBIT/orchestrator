package com.example.core_api.student;

import com.example.core_api.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class StudentProfileService {

    private final StudentProfileRepository profileRepository;

    public StudentProfileService(StudentProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public StudentProfileResponse createOrUpdateProfile(UUID userId, CreateStudentProfileRequest request) {
        StudentProfile profile = profileRepository.findByUserId(userId).orElse(new StudentProfile());
        
        profile.setUserId(userId);
        profile.setStudentIdCode(request.getStudentIdCode());
        profile.setDepartment(request.getDepartment());
        profile.setDegreeProgram(request.getDegreeProgram());
        profile.setAcademicYear(request.getAcademicYear());
        
        profile = profileRepository.save(profile);
        return mapToResponse(profile);
    }

    @Transactional(readOnly = true)
    public StudentProfileResponse getProfileByUserId(UUID userId) {
        StudentProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + userId));
        return mapToResponse(profile);
    }

    private StudentProfileResponse mapToResponse(StudentProfile profile) {
        return StudentProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUserId())
                .studentIdCode(profile.getStudentIdCode())
                .department(profile.getDepartment())
                .degreeProgram(profile.getDegreeProgram())
                .academicYear(profile.getAcademicYear())
                .build();
    }
}
