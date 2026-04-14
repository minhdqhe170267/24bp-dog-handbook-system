package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.SeverityLevel;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

import java.util.List;

@Getter
@Setter
public class DiseaseRequest {

    @NotBlank(message = "Tên bệnh không được để trống")
    @Size(max = 200, message = "Tên bệnh tối đa 200 ký tự")
    private String diseaseName;

    @ValidEnum(enumClass = SeverityLevel.class, message = "Mức nghiêm trọng không hợp lệ")
    private String severityLevel;

    @Size(max = 5000, message = "Mô tả tối đa 5000 ký tự")
    private String description;

    @Size(max = 5000, message = "Tóm tắt triệu chứng tối đa 5000 ký tự")
    private String symptomSummary;

    @Size(max = 5000, message = "Hướng dẫn điều trị tối đa 5000 ký tự")
    private String treatmentGuidelines;

    @Size(max = 5000, message = "Biện pháp phòng ngừa tối đa 5000 ký tự")
    private String preventionMeasures;

    private Boolean isContagious;

    @Size(max = 100, message = "Thời gian ủ bệnh tối đa 100 ký tự")
    private String incubationPeriod;

    @Valid
    private List<SymptomMappingItem> symptomMappings;

    @Valid
    private List<MedicationMappingItem> medicationMappings;

    @Valid
    private List<FirstAidGuideMappingItem> firstAidGuideMappings;

    @Getter
    @Setter
    public static class SymptomMappingItem {
        @NotNull(message = "symptomId không được null")
        private Integer symptomId;

        @DecimalMin(value = "0", message = "Trọng số phải >= 0")
        @DecimalMax(value = "1", message = "Trọng số phải <= 1")
        private Double weight;

        private Boolean isPrimary;

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        private String notes;
    }

    @Getter
    @Setter
    public static class MedicationMappingItem {
        @NotNull(message = "medicationId không được null")
        private Integer medicationId;

        private Integer priority;

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        private String notes;
    }

    @Getter
    @Setter
    public static class FirstAidGuideMappingItem {
        @NotNull(message = "guideId không được null")
        private Integer guideId;

        private Integer priority;

        @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
        private String notes;
    }
}
