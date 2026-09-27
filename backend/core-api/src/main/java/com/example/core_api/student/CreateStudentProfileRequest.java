package com.example.core_api.student;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateStudentProfileRequest {
    @NotBlank(message = "Student ID Code is required")
    private String studentIdCode;
    
    @NotBlank(message = "Department is required")
    private String department;
    
    @NotBlank(message = "Degree program is required")
    private String degreeProgram;
    
    @NotNull(message = "Academic year is required")
    private Integer academicYear;
}
