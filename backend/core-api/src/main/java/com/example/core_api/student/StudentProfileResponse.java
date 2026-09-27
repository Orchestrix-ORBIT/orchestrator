package com.example.core_api.student;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class StudentProfileResponse {
    private UUID id;
    private UUID userId;
    private String studentIdCode;
    private String department;
    private String degreeProgram;
    private Integer academicYear;
}
