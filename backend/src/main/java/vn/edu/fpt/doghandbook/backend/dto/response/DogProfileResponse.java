package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DogProfileResponse {

    private Integer dogId;
    private String dogCode;
    private String dogName;

    private Integer breedId;
    private String breedName;

    private String gender;
    private LocalDate dateOfBirth;
    private Integer ageMonths;

    private BigDecimal currentWeightKg;
    private BigDecimal heightCm;
    private String color;
    private String microchipId;
    private String status;
    private String imageUrl;
    private String notes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
