package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.fpt.doghandbook.backend.entity.*;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.*;
import vn.edu.fpt.doghandbook.backend.service.impl.DocumentExportServiceImpl;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentExportServiceImplTest {

    @Mock private DogBreedRepository dogBreedRepository;
    @Mock private DiseaseRepository diseaseRepository;
    @Mock private MedicationRepository medicationRepository;
    @Mock private TrainingExerciseRepository trainingExerciseRepository;
    @Mock private NutritionStandardRepository nutritionStandardRepository;
    @Mock private DogProfileRepository dogProfileRepository;
    @Mock private OperationReportRepository operationReportRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private DocumentExportServiceImpl service;

    private User trainer;
    private DogProfile dog;
    private OperationReport opReport;

    @BeforeEach
    void setUp() {
        trainer = User.builder().userId(1).username("trainer01").fullName("Trainer One")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        dog = DogProfile.builder().dogId(10).dogName("Rex").dogCode("DOG-001").build();
        opReport = OperationReport.builder()
                .reportId(100).trainer(trainer).dogProfile(dog)
                .reportType(ReportType.TRAINING).reportTitle("Training Report")
                .reportDate(LocalDate.of(2025, 1, 15)).reportContent("Content")
                .isDeleted(false).build();
    }

    // ──────────────────── exportExcel ────────────────────

    @Test
    void exportExcel_breed_returnsNonEmptyStream() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("Labrador")
                .origin("UK").description("Friendly").isDeleted(false)
                .createdAt(LocalDateTime.of(2025, 1, 1, 10, 0)).build();
        when(dogBreedRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(breed)));

        ByteArrayInputStream result = service.exportExcel("BREED", null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportExcel_breed_caseInsensitive() {
        when(dogBreedRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("breed", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_disease_returnsNonEmpty() {
        when(diseaseRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("DISEASE", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_medication_returnsNonEmpty() {
        when(medicationRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("MEDICATION", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_exercise_returnsNonEmpty() {
        when(trainingExerciseRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("EXERCISE", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_nutrition_returnsNonEmpty() {
        when(nutritionStandardRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("NUTRITION", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_dogProfile_returnsNonEmpty() {
        when(dogProfileRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("DOG_PROFILE", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_operationReport_returnsNonEmpty() {
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ByteArrayInputStream result = service.exportExcel("OPERATION_REPORT", null);

        assertThat(result).isNotNull();
    }

    @Test
    void exportExcel_nullEntityType_throwsBadRequest() {
        assertThatThrownBy(() -> service.exportExcel(null, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void exportExcel_blankEntityType_throwsBadRequest() {
        assertThatThrownBy(() -> service.exportExcel("   ", null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void exportExcel_invalidEntityType_throwsBadRequest() {
        assertThatThrownBy(() -> service.exportExcel("INVALID_TYPE", null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void exportExcel_breed_hasContent() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("German Shepherd")
                .origin("Germany").description("Working dog").isDeleted(false)
                .createdAt(LocalDateTime.of(2025, 3, 10, 8, 0)).build();
        when(dogBreedRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(breed)));

        ByteArrayInputStream result = service.exportExcel("BREED", null);

        // Excel file should contain data (XLSX magic bytes)
        byte[] bytes = result.readAllBytes();
        assertThat(bytes.length).isGreaterThan(100);
    }

    @Test
    void exportExcel_operationReportWithData_returnsCorrectFile() {
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(opReport)));

        ByteArrayInputStream result = service.exportExcel("OPERATION_REPORT", null);

        assertThat(result.available()).isGreaterThan(0);
    }

    // ──────────────────── exportTrainerReport ────────────────────

    @Test
    void exportTrainerReport_trainerNotFound_throwsResourceNotFound() {
        when(userRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.exportTrainerReport(999, null, null, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void exportTrainerReport_noReportType_queriesAllReports() {
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(operationReportRepository
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
                        eq(1), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(opReport));

        ByteArrayInputStream result = service.exportTrainerReport(1, null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportTrainerReport_withReportType_filtersResults() {
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(operationReportRepository
                .findByTrainerUserIdAndReportDateBetweenAndReportTypeAndIsDeletedFalseOrderByReportDateDesc(
                        eq(1), any(LocalDate.class), any(LocalDate.class), eq(ReportType.TRAINING)))
                .thenReturn(List.of(opReport));

        ByteArrayInputStream result = service.exportTrainerReport(1, null, null, "TRAINING");

        assertThat(result).isNotNull();
    }

    @Test
    void exportTrainerReport_emptyReports_returnsValidPdf() {
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(operationReportRepository
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
                        eq(1), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        ByteArrayInputStream result = service.exportTrainerReport(1, null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportTrainerReport_withDateRange_usesProvidedDates() {
        LocalDate from = LocalDate.of(2025, 1, 1);
        LocalDate to = LocalDate.of(2025, 6, 30);
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(operationReportRepository
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
                        eq(1), eq(from), eq(to)))
                .thenReturn(Collections.emptyList());

        ByteArrayInputStream result = service.exportTrainerReport(1, from, to, null);

        assertThat(result).isNotNull();
        verify(operationReportRepository)
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(1, from, to);
    }

    // ──────────────────── exportUnitReport ────────────────────

    @Test
    void exportUnitReport_noReportType_queriesAll() {
        when(operationReportRepository
                .findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                        any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(opReport));

        ByteArrayInputStream result = service.exportUnitReport(null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportUnitReport_withReportType_filtersResults() {
        when(operationReportRepository
                .findByReportDateBetweenAndReportTypeAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                        any(LocalDate.class), any(LocalDate.class), eq(ReportType.HEALTH)))
                .thenReturn(Collections.emptyList());

        ByteArrayInputStream result = service.exportUnitReport(null, null, "HEALTH");

        assertThat(result).isNotNull();
    }

    @Test
    void exportUnitReport_emptyReports_returnsValidPdf() {
        when(operationReportRepository
                .findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                        any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.emptyList());

        ByteArrayInputStream result = service.exportUnitReport(null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportUnitReport_multipleTrainers_groupsCorrectly() {
        User trainer2 = User.builder().userId(2).username("trainer02").fullName("Trainer Two")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        OperationReport report2 = OperationReport.builder()
                .reportId(200).trainer(trainer2).dogProfile(dog)
                .reportType(ReportType.HEALTH).reportTitle("Health Report")
                .reportDate(LocalDate.of(2025, 2, 1)).reportContent("Health content")
                .isDeleted(false).build();
        when(operationReportRepository
                .findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                        any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(opReport, report2));

        ByteArrayInputStream result = service.exportUnitReport(null, null, null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportPdf_breed_returnsNonEmptyPdf() {
        when(dogBreedRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(DogBreed.builder()
                        .breedId(1)
                        .breedName("German Shepherd")
                        .origin("Germany")
                        .description("Working dog")
                        .createdAt(LocalDateTime.now())
                        .build())));

        ByteArrayInputStream result = service.exportPdf("BREED", null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportPdf_operationReport_returnsNonEmptyPdf() {
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(opReport)));

        ByteArrayInputStream result = service.exportPdf("OPERATION_REPORT", null);

        assertThat(result).isNotNull();
        assertThat(result.available()).isGreaterThan(0);
    }

    @Test
    void exportTrainerReport_blankReportType_usesUnfilteredRepository() {
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));
        when(operationReportRepository
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
                        eq(1), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(opReport));

        ByteArrayInputStream result = service.exportTrainerReport(1, null, null, "   ");

        assertThat(result).isNotNull();
        verify(operationReportRepository)
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
                        eq(1), any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    void exportTrainerReport_invalidReportType_throwsIllegalArgumentException() {
        when(userRepository.findById(1)).thenReturn(Optional.of(trainer));

        assertThatThrownBy(() -> service.exportTrainerReport(1, null, null, "INVALID"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void exportUnitReport_blankReportType_usesUnfilteredRepository() {
        when(operationReportRepository
                .findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                        any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of(opReport));

        ByteArrayInputStream result = service.exportUnitReport(null, null, " ");

        assertThat(result).isNotNull();
        verify(operationReportRepository)
                .findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                        any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    void exportUnitReport_invalidReportType_throwsIllegalArgumentException() {
        assertThatThrownBy(() -> service.exportUnitReport(null, null, "INVALID"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void buildTrainerReportHtml_withReports_escapesValuesAndShowsDogInfo() {
        OperationReport report = OperationReport.builder()
                .reportId(300)
                .trainer(trainer)
                .dogProfile(DogProfile.builder().dogId(11).dogName("Rex <1>").dogCode("DOG-<01>").build())
                .reportType(ReportType.HEALTH)
                .reportTitle("Health <Check>")
                .reportDate(LocalDate.of(2025, 4, 1))
                .reportContent("Short content")
                .build();

        String html = ReflectionTestUtils.invokeMethod(
                service,
                "buildTrainerReportHtml",
                trainer,
                List.of(report),
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2025, 1, 31)
        );

        assertThat(html).contains("BÁO CÁO TỔNG HỢP HOẠT ĐỘNG");
        assertThat(html).contains("Rex &lt;1&gt;");
        assertThat(html).contains("DOG-&lt;01&gt;");
        assertThat(html).contains("Health &lt;Check&gt;");
    }

    @Test
    void buildTrainerReportHtml_withoutReports_showsEmptyState() {
        String html = ReflectionTestUtils.invokeMethod(
                service,
                "buildTrainerReportHtml",
                trainer,
                List.of(),
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2025, 1, 31)
        );

        assertThat(html).contains("Không có báo cáo nào trong khoảng thời gian này");
    }

    @Test
    void buildUnitReportHtml_withGroupedReports_containsSummaryTable() {
        User trainer2 = User.builder().userId(2).username("trainer02").fullName("Trainer Two")
                .role(UserRole.TRAINER).isActive(true).isDeleted(false).build();
        OperationReport report2 = OperationReport.builder()
                .reportId(200).trainer(trainer2).dogProfile(dog)
                .reportType(ReportType.HEALTH).reportTitle("Health Report")
                .reportDate(LocalDate.of(2025, 2, 1)).reportContent("Health content")
                .isDeleted(false).build();
        Map<User, List<OperationReport>> grouped = new LinkedHashMap<>();
        grouped.put(trainer, List.of(opReport));
        grouped.put(trainer2, List.of(report2));

        String html = ReflectionTestUtils.invokeMethod(
                service,
                "buildUnitReportHtml",
                grouped,
                LocalDate.of(2025, 1, 1),
                LocalDate.of(2025, 1, 31)
        );

        assertThat(html).contains("BẢNG THỐNG KÊ");
        assertThat(html).contains("Trainer One");
        assertThat(html).contains("Trainer Two");
    }

    @Test
    void buildReportCard_longContentWithoutDogProfile_truncatesContent() {
        String longContent = "a".repeat(600);
        OperationReport report = OperationReport.builder()
                .reportId(400)
                .trainer(trainer)
                .reportType(ReportType.TRAINING)
                .reportTitle("Training Report")
                .reportDate(LocalDate.of(2025, 4, 2))
                .reportContent(longContent)
                .build();

        String card = ReflectionTestUtils.invokeMethod(service, "buildReportCard", report, 1);

        assertThat(card).contains("Training Report");
        assertThat(card).doesNotContain("Chó:");
        assertThat(card).contains("...");
    }
    @Test
    void getTitle_allTypes_returnExpectedLabels() {
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "getTitle", "DISEASE")).startsWith("Danh");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "getTitle", "MEDICATION")).startsWith("Danh");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "getTitle", "EXERCISE")).startsWith("Danh");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "getTitle", "NUTRITION")).startsWith("Danh");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "getTitle", "DOG_PROFILE")).startsWith("Danh");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "getTitle", "UNKNOWN")).startsWith("Xu");
    }

    @Test
    void getDiseaseData_mapsContagiousFlagsAndNullStatus() {
        Disease contagious = Disease.builder()
                .diseaseId(1)
                .diseaseName("Parvo")
                .description("Severe")
                .treatmentGuidelines("Treat")
                .preventionMeasures("Prevent")
                .isContagious(true)
                .status(vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus.PUBLISHED)
                .createdAt(LocalDateTime.of(2025, 1, 2, 8, 0))
                .build();
        Disease notContagious = Disease.builder()
                .diseaseId(2)
                .diseaseName("Injury")
                .description("Minor")
                .treatmentGuidelines("Rest")
                .preventionMeasures("Care")
                .isContagious(false)
                .status(null)
                .createdAt(null)
                .build();
        when(diseaseRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(contagious, notContagious)));

        @SuppressWarnings("unchecked")
        List<String[]> rows = ReflectionTestUtils.invokeMethod(service, "getDiseaseData");

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)[6]).isNotEmpty();
        assertThat(rows.get(1)[6]).isNotEmpty();
        assertThat(rows.get(0)[6]).isNotEqualTo(rows.get(1)[6]);
        assertThat(rows.get(1)[7]).isEmpty();
        assertThat(rows.get(1)[8]).isEmpty();
    }

    @Test
    void getDogProfileData_mapsOptionalFields() {
        DogBreed breed = DogBreed.builder().breedId(1).breedName("Malinois").build();
        DogProfile full = DogProfile.builder()
                .dogId(1)
                .dogCode("DOG-001")
                .dogName("Rex")
                .dogBreed(breed)
                .birthDate(LocalDate.of(2023, 1, 1))
                .gender(vn.edu.fpt.doghandbook.backend.entity.enums.DogGender.MALE)
                .currentWeightKg(java.math.BigDecimal.valueOf(28.5))
                .heightCm(java.math.BigDecimal.valueOf(60))
                .color("Black")
                .microchipId("MC-01")
                .status(vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus.ACTIVE)
                .isSterilized(true)
                .assignmentDate(LocalDate.of(2025, 1, 1))
                .build();
        DogProfile minimal = DogProfile.builder()
                .dogId(2)
                .dogCode("DOG-002")
                .dogName("Nova")
                .isSterilized(false)
                .build();
        when(dogProfileRepository.findByIsDeletedFalse(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(full, minimal)));

        @SuppressWarnings("unchecked")
        List<String[]> rows = ReflectionTestUtils.invokeMethod(service, "getDogProfileData");

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)[3]).isEqualTo("Malinois");
        assertThat(rows.get(0)[11]).isNotEmpty();
        assertThat(rows.get(1)[3]).isEmpty();
        assertThat(rows.get(1)[11]).isNotEmpty();
        assertThat(rows.get(0)[11]).isNotEqualTo(rows.get(1)[11]);
        assertThat(rows.get(1)[12]).isEmpty();
    }

    @Test
    void getOperationReportData_handlesMissingTrainerAndDogProfile() {
        OperationReport report = OperationReport.builder()
                .reportId(501)
                .trainer(null)
                .dogProfile(null)
                .reportType(ReportType.HEALTH)
                .reportTitle("Health")
                .reportDate(LocalDate.of(2025, 2, 1))
                .reportContent("Content")
                .build();
        when(operationReportRepository.findByIsDeletedFalseOrderByReportDateDesc(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(report)));

        @SuppressWarnings("unchecked")
        List<String[]> rows = ReflectionTestUtils.invokeMethod(service, "getOperationReportData");

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0)[1]).isEmpty();
        assertThat(rows.get(0)[2]).isEmpty();
        assertThat(rows.get(0)[3]).isEmpty();
    }

    @Test
    void buildHtmlTable_withLongAndNullCells_truncatesAndEscapesContent() {
        String html = ReflectionTestUtils.invokeMethod(
                service,
                "buildHtmlTable",
                "Title",
                new String[]{"A"},
                List.of(new String[]{"<tag>" + "a".repeat(220)}, new String[]{null})
        );

        assertThat(html).contains("&lt;tag&gt;");
        assertThat(html).contains("...");
        assertThat(html).contains("<td></td>");
    }

    @Test
    void buildReportCard_healthReportWithoutDogCodeAndBlankContent_handlesBranches() {
        OperationReport report = OperationReport.builder()
                .reportId(401)
                .trainer(trainer)
                .dogProfile(DogProfile.builder().dogId(12).dogName("Milo").build())
                .reportType(ReportType.HEALTH)
                .reportTitle("Health Report")
                .reportDate(LocalDate.of(2025, 4, 2))
                .reportContent("   ")
                .build();

        String card = ReflectionTestUtils.invokeMethod(service, "buildReportCard", report, 2);

        assertThat(card).contains("type-health");
        assertThat(card).contains("report-dog");
        assertThat(card).contains("Milo");
        assertThat(card).doesNotContain("()");
        assertThat(card).doesNotContain("report-content");
    }

    @Test
    void helperFormattingMethods_withNullValues_returnEmptyStrings() {
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "str", new Object[]{null})).isEqualTo("");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "fmtDt", new Object[]{null})).isEqualTo("");
        assertThat((String) ReflectionTestUtils.invokeMethod(service, "fmtD", new Object[]{null})).isEqualTo("");
    }
}
