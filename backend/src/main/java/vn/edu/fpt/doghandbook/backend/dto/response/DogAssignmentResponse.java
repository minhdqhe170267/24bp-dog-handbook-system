package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DogAssignmentResponse {

    private Integer assignmentId;
    private Integer dogId;
    private String dogName;
    private String dogCode;
    private Integer trainerId;
    private String trainerName;
    private String trainerUsername;
    private Integer specialtyId;
    private String specialtyName;
    private String assignmentType;
    private String assignmentScope;
    private Integer coveredAssignmentId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
