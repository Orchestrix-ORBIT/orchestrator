package com.example.core_api.student;

import com.example.core_api.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentProfileServiceTest {

    @Mock private StudentProfileRepository profileRepository;
    @InjectMocks private StudentProfileService studentProfileService;

    private UUID userId, profileId;
    private StudentProfile sampleProfile;

    @BeforeEach
    void setUp() {
        userId    = UUID.randomUUID();
        profileId = UUID.randomUUID();
        sampleProfile = StudentProfile.builder().id(profileId).userId(userId)
                .studentIdCode("230328T").department("Computer Science and Engineering")
                .degreeProgram("BSc Hons in Computer Science").academicYear(3).build();
    }

    @Test
    void createOrUpdateProfile_whenProfileDoesNotExist_createsNewProfile() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(profileRepository.save(any(StudentProfile.class))).thenReturn(sampleProfile);
        CreateStudentProfileRequest req = new CreateStudentProfileRequest();
        req.setStudentIdCode("230328T");
        req.setDepartment("Computer Science and Engineering");
        req.setDegreeProgram("BSc Hons in Computer Science");
        req.setAcademicYear(3);
        StudentProfileResponse response = studentProfileService.createOrUpdateProfile(userId, req);
        assertThat(response.getId()).isEqualTo(profileId);
        assertThat(response.getStudentIdCode()).isEqualTo("230328T");
        assertThat(response.getAcademicYear()).isEqualTo(3);
        verify(profileRepository).save(any(StudentProfile.class));
    }

    @Test
    void createOrUpdateProfile_whenProfileExists_updatesExistingProfile() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(sampleProfile));
        StudentProfile updated = StudentProfile.builder().id(profileId).userId(userId)
                .studentIdCode("230328T").department("Computer Science and Engineering")
                .degreeProgram("BSc Hons in Computer Science").academicYear(4).build();
        when(profileRepository.save(any())).thenReturn(updated);
        CreateStudentProfileRequest req = new CreateStudentProfileRequest();
        req.setStudentIdCode("230328T"); req.setDepartment("Computer Science and Engineering");
        req.setDegreeProgram("BSc Hons in Computer Science"); req.setAcademicYear(4);
        assertThat(studentProfileService.createOrUpdateProfile(userId, req).getAcademicYear()).isEqualTo(4);
    }

    @Test
    void createOrUpdateProfile_callsFindByUserIdFirst() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(profileRepository.save(any())).thenReturn(sampleProfile);
        studentProfileService.createOrUpdateProfile(userId, new CreateStudentProfileRequest());
        verify(profileRepository).findByUserId(userId);
    }

    @Test
    void getProfileByUserId_whenFound_returnsMappedResponse() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(sampleProfile));
        StudentProfileResponse response = studentProfileService.getProfileByUserId(userId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getStudentIdCode()).isEqualTo("230328T");
    }

    @Test
    void getProfileByUserId_whenNotFound_throwsResourceNotFoundException() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> studentProfileService.getProfileByUserId(userId))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(userId.toString());
    }

    @Test
    void getProfileByUserId_doesNotCallSave() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(sampleProfile));
        studentProfileService.getProfileByUserId(userId);
        verify(profileRepository, never()).save(any());
    }
}
