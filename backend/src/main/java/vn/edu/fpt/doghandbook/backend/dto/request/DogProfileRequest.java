package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class DogProfileRequest {

    private String dogName;

    @NotNull
    private Integer breedId;

    private String gender; // MALE / FEMALE

    private LocalDate dateOfBirth;

    private BigDecimal currentWeightKg;

    private BigDecimal heightCm;

    private String color;

    private String microchipId;

    private String status; // ACTIVE / INACTIVE / RETIRED / DECEASED / TRANSFERRED

    private String imageUrl;

    private String notes;
}
