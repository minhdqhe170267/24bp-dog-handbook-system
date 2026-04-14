package vn.edu.fpt.doghandbook.backend.service;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportPreviewResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportRowErrorResponse;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.DocumentImportServiceImpl;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentImportServiceImplTest {

    @Mock BreedService breedService;
    @Mock DiseaseService diseaseService;
    @Mock MedicationService medicationService;
    @Mock NutritionService nutritionService;
    @Mock TrainingService trainingService;
    @Mock FirstAidGuideService firstAidGuideService;
    @Mock DogProfileService dogProfileService;
    @Mock DogBreedRepository dogBreedRepository;
    @Mock TrainingMethodRepository trainingMethodRepository;
    @Mock MedicationRepository medicationRepository;
    @Mock NutritionStandardRepository nutritionStandardRepository;
    @Mock FirstAidGuideRepository firstAidGuideRepository;

    @InjectMocks
    DocumentImportServiceImpl service;

    @Test
    void downloadTemplate_newScopes_generateWorkbookStructure() throws Exception {
        Map<String, List<String>> expectations = Map.of(
                "TRAINING_METHOD", List.of("Tên phương pháp", "Mô tả"),
                "TRAINING_ROADMAP", List.of("Tên lộ trình", "Tên giai đoạn"),
                "FIRST_AID_GUIDE", List.of("Tiêu đề hướng dẫn", "Loại tình huống"),
                "DOG_PROFILE", List.of("Tên chó", "ID giống chó")
        );

        for (Map.Entry<String, List<String>> entry : expectations.entrySet()) {
            ByteArrayInputStream stream = service.downloadTemplate(entry.getKey());
            try (Workbook workbook = WorkbookFactory.create(stream)) {
                assertThat(workbook.getNumberOfSheets()).isGreaterThanOrEqualTo(2);
                Row headerRow = workbook.getSheetAt(0).getRow(0);
                assertThat(headerRow.getCell(0).getStringCellValue()).isEqualTo(entry.getValue().get(0));
                assertThat(headerRow.getCell(1).getStringCellValue()).isEqualTo(entry.getValue().get(1));
            }
        }
    }

    @Test
    void downloadTemplate_guideSheet_usesVietnameseLabelsAndExamples() throws Exception {
        ByteArrayInputStream stream = service.downloadTemplate("BREED");

        try (Workbook workbook = WorkbookFactory.create(stream)) {
            Row guideRow = workbook.getSheetAt(1).getRow(3);

            assertThat(guideRow.getCell(0).getStringCellValue()).isEqualTo("Phân loại kích thước");
            assertThat(guideRow.getCell(2).getStringCellValue()).isEqualTo("Danh mục chọn sẵn");
            assertThat(guideRow.getCell(3).getStringCellValue()).contains("Nhỏ", "Trung bình", "Lớn");
            assertThat(guideRow.getCell(5).getStringCellValue()).isEqualTo("Lớn");
        }
    }

    @Test
    void downloadTemplate_medication_usesVietnameseHeadersAndGuideTitles() throws Exception {
        ByteArrayInputStream stream = service.downloadTemplate("MEDICATION");

        try (Workbook workbook = WorkbookFactory.create(stream)) {
            Row dataHeader = workbook.getSheetAt(0).getRow(0);
            Row guideHeader = workbook.getSheetAt(1).getRow(0);
            Row firstGuideRow = workbook.getSheetAt(1).getRow(1);

            assertThat(dataHeader.getCell(0).getStringCellValue()).isEqualTo("Tên thuốc");
            assertThat(dataHeader.getCell(1).getStringCellValue()).isEqualTo("Mô tả");
            assertThat(dataHeader.getCell(2).getStringCellValue()).isEqualTo("Hướng dẫn liều dùng");
            assertThat(dataHeader.getCell(3).getStringCellValue()).isEqualTo("Đường dùng");
            assertThat(dataHeader.getCell(4).getStringCellValue()).isEqualTo("Tác dụng phụ");
            assertThat(dataHeader.getCell(5).getStringCellValue()).isEqualTo("Chống chỉ định");
            assertThat(dataHeader.getCell(6).getStringCellValue()).isEqualTo("Bảo quản");

            assertThat(guideHeader.getCell(0).getStringCellValue()).isEqualTo("Cột trong mẫu");
            assertThat(guideHeader.getCell(1).getStringCellValue()).isEqualTo("Bắt buộc");
            assertThat(guideHeader.getCell(2).getStringCellValue()).isEqualTo("Kiểu dữ liệu");
            assertThat(guideHeader.getCell(3).getStringCellValue()).isEqualTo("Giá trị hợp lệ");
            assertThat(guideHeader.getCell(4).getStringCellValue()).isEqualTo("Mô tả");
            assertThat(guideHeader.getCell(5).getStringCellValue()).isEqualTo("Ví dụ");

            assertThat(firstGuideRow.getCell(0).getStringCellValue()).isEqualTo("Tên thuốc");
            assertThat(firstGuideRow.getCell(1).getStringCellValue()).isEqualTo("Có");
            assertThat(firstGuideRow.getCell(2).getStringCellValue()).isEqualTo("Văn bản");
            assertThat(firstGuideRow.getCell(4).getStringCellValue()).isEqualTo("Tên thuốc");
            assertThat(firstGuideRow.getCell(5).getStringCellValue()).isEqualTo("Amoxicillin");
        }
    }

    @Test
    void getTemplates_medication_usesVietnameseMetadata() {
        var medicationTemplate = service.getTemplates().stream()
                .filter(template -> "MEDICATION".equals(template.getEntityType()))
                .findFirst()
                .orElseThrow();

        assertThat(medicationTemplate.getTemplateName()).isEqualTo("Thuốc");
        assertThat(medicationTemplate.getDescription()).isEqualTo("Nhập danh sách thuốc.");
        assertThat(medicationTemplate.getInstructions())
                .contains("Tên thuốc phải duy nhất theo quy tắc nghiệp vụ hiện tại.");
        assertThat(medicationTemplate.getColumns())
                .extracting("fieldName", "label", "dataType", "example")
                .contains(tuple("medicationName", "Tên thuốc", "Văn bản", "Amoxicillin"));
    }

    @Test
    void preview_acceptsVietnameseHeadersFromDownloadedTemplate() {
        MockMultipartFile file = csvFile("""
                Tên phương pháp,Mô tả
                Clicker,Thưởng khi làm đúng
                """);

        ImportPreviewResponse response = service.preview("TRAINING_METHOD", file);

        assertThat(response.getCanConfirm()).isTrue();
        assertThat(response.getValidRows()).isEqualTo(1);
        assertThat(response.getPreviewData())
                .singleElement()
                .extracting(row -> row.get("methodName"))
                .isEqualTo("Clicker");
    }

    @Test
    void preview_acceptsVietnameseEnumValuesFromDownloadedTemplate() {
        MockMultipartFile file = csvFile("""
                Tên bài tập,Mức độ khó
                Đánh hơi,Trung bình
                """);

        ImportPreviewResponse response = service.preview("EXERCISE", file);

        assertThat(response.getCanConfirm()).isTrue();
        assertThat(response.getValidRows()).isEqualTo(1);
        assertThat(response.getPreviewData())
                .singleElement()
                .extracting(row -> row.get("difficultyLevel"))
                .isEqualTo("INTERMEDIATE");
    }

    @Test
    void preview_trainingMethod_validFile_returnsStructuredPreview() {
        MockMultipartFile file = csvFile("""
                methodName,description
                Clicker,"Reward based training"
                """);

        ImportPreviewResponse response = service.preview("TRAINING_METHOD", file);

        assertThat(response.getCanConfirm()).isTrue();
        assertThat(response.getValidRows()).isEqualTo(1);
        assertThat(response.getErrorRows()).isZero();
        assertThat(response.getPreviewData())
                .singleElement()
                .extracting(row -> row.get("methodName"))
                .isEqualTo("Clicker");
    }

    @Test
    void preview_trainingRoadmap_missingPhaseOrderHeader_rejectsWholeFile() {
        MockMultipartFile file = csvFile("""
                roadmapName,phaseName,breedId
                Canh khuyen,Lam quen,1
                """);

        ImportPreviewResponse response = service.preview("TRAINING_ROADMAP", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getValidRows()).isZero();
        assertThat(response.getErrorRows()).isEqualTo(1);
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(1);
                    assertThat(error.getColumn()).isEqualTo("phaseOrder");
                    assertThat(error.getCode()).isEqualTo("MISSING_HEADER");
                });
    }

    @Test
    void preview_trainingRoadmap_invalidBreedId_reportsReferenceError() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());

        MockMultipartFile file = csvFile("""
                roadmapName,phaseName,phaseOrder,breedId
                Canh khuyen,Lam quen,1,999
                """);

        ImportPreviewResponse response = service.preview("TRAINING_ROADMAP", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(2);
                    assertThat(error.getColumn()).isEqualTo("breedId");
                    assertThat(error.getCode()).isEqualTo("REFERENCE_NOT_FOUND");
                });
    }

    @Test
    void preview_firstAidGuide_duplicateTitleInDb_reportsDuplicate() {
        when(firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndIsDeletedFalse("Heatstroke")).thenReturn(true);

        MockMultipartFile file = csvFile("""
                guideTitle,emergencyType,immediateSteps
                Heatstroke,Environment,Cool down immediately
                """);

        ImportPreviewResponse response = service.preview("FIRST_AID_GUIDE", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(2);
                    assertThat(error.getColumn()).isEqualTo("guideTitle");
                    assertThat(error.getCode()).isEqualTo("DUPLICATE_IN_DB");
                });
    }

    @Test
    void confirm_trainingMethod_withInvalidRow_isAtomicAndDoesNotPersist() {
        MockMultipartFile file = csvFile("""
                methodName,description
                Clicker,Reward based training
                ,Missing name
                """);

        assertThatThrownBy(() -> service.confirm("TRAINING_METHOD", file, 1))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("dòng lỗi");

        verify(trainingService, never()).createMethod(any(), eq(1));
    }

    @Test
    void confirm_dogProfile_validFile_mapsExtendedFieldsAndPersists() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1))
                .thenReturn(Optional.of(DogBreed.builder().breedId(1).breedName("Malinois").build()));
        when(dogProfileService.create(any(DogProfileRequest.class), isNull())).thenReturn(null);

        MockMultipartFile file = csvFile("""
                dogName,breedId,status,assignmentDate,isSterilized
                Rex,1,RETIRED,2024-05-20,true
                """);

        ImportPreviewResponse response = service.confirm("DOG_PROFILE", file, 1);

        ArgumentCaptor<DogProfileRequest> captor = ArgumentCaptor.forClass(DogProfileRequest.class);
        verify(dogProfileService).create(captor.capture(), isNull());
        DogProfileRequest request = captor.getValue();

        assertThat(request.getDogName()).isEqualTo("Rex");
        assertThat(request.getBreedId()).isEqualTo(1);
        assertThat(request.getStatus()).isEqualTo("RETIRED");
        assertThat(request.getAssignmentDate()).isEqualTo(LocalDate.of(2024, 5, 20));
        assertThat(request.getIsSterilized()).isTrue();
        assertThat(response.getErrorRows()).isZero();
        assertThat(response.getCanConfirm()).isFalse();
    }

    @Test
    void preview_dogProfile_invalidStatus_reportsEnumError() {
        MockMultipartFile file = csvFile("""
                dogName,breedId,status
                Rex,1,UNKNOWN_STATUS
                """);

        ImportPreviewResponse response = service.preview("DOG_PROFILE", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(2);
                    assertThat(error.getColumn()).isEqualTo("status");
                    assertThat(error.getCode()).isEqualTo("INVALID_VALUE");
                });
    }

    @Test
    void preview_emptyFile_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "import.csv", "text/csv", new byte[0]);

        assertThatThrownBy(() -> service.preview("BREED", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File");
    }

    @Test
    void preview_fileWithoutExtension_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import",
                "text/csv",
                "breedName\nMalinois\n".getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> service.preview("BREED", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("extension");
    }

    @Test
    void preview_unsupportedExtension_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import.txt",
                "text/plain",
                "breedName\nMalinois\n".getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> service.preview("BREED", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining(".txt");
    }

    @Test
    void preview_unsupportedMimeType_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "import.csv",
                "application/json",
                "breedName\nMalinois\n".getBytes(StandardCharsets.UTF_8)
        );

        assertThatThrownBy(() -> service.preview("BREED", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("MIME type");
    }

    @Test
    void preview_blankEntityType_throwsBadRequest() {
        MockMultipartFile file = csvFile("breedName\nMalinois\n");

        assertThatThrownBy(() -> service.preview("   ", file))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("entityType");
    }

    @Test
    void confirm_invalidUserId_throwsBadRequest() {
        MockMultipartFile file = csvFile("""
                methodName,description
                Clicker,Reward based training
                """);

        assertThatThrownBy(() -> service.confirm("TRAINING_METHOD", file, 0))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("userId");
    }

    @Test
    void preview_duplicateHeader_reportsHeaderError() {
        MockMultipartFile file = csvFile("""
                methodName,methodName
                Clicker,Reward based training
                """);

        ImportPreviewResponse response = service.preview("TRAINING_METHOD", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(1);
                    assertThat(error.getCode()).isEqualTo("DUPLICATE_HEADER");
                });
    }

    @Test
    void preview_unknownHeader_reportsHeaderError() {
        MockMultipartFile file = csvFile("""
                methodName,unknownColumn
                Clicker,Reward based training
                """);

        ImportPreviewResponse response = service.preview("TRAINING_METHOD", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(1);
                    assertThat(error.getCode()).isEqualTo("UNKNOWN_HEADER");
                });
    }

    @Test
    void preview_medication_duplicateWithinFile_reportsDuplicateInFile() {
        MockMultipartFile file = csvFile("""
                medicationName
                Amoxicillin
                Amoxicillin
                """);

        ImportPreviewResponse response = service.preview("MEDICATION", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .filteredOn(error -> "DUPLICATE_IN_FILE".equals(error.getCode()))
                .hasSize(2);
    }

    @Test
    void preview_breed_duplicateInDb_reportsDuplicateInDb() {
        when(dogBreedRepository.existsByBreedNameAndIsDeletedFalse("Malinois")).thenReturn(true);

        MockMultipartFile file = csvFile("""
                breedName,origin,sizeClassification
                Malinois,Germany,LARGE
                """);

        ImportPreviewResponse response = service.preview("BREED", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(2);
                    assertThat(error.getColumn()).isEqualTo("breedName");
                    assertThat(error.getCode()).isEqualTo("DUPLICATE_IN_DB");
                });
    }

    @Test
    void preview_exercise_missingMethodReference_reportsReferenceNotFound() {
        when(trainingMethodRepository.findByMethodIdAndIsDeletedFalse(99)).thenReturn(Optional.empty());

        MockMultipartFile file = csvFile("""
                exerciseName,difficultyLevel,methodId
                Heel,BASIC,99
                """);

        ImportPreviewResponse response = service.preview("EXERCISE", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .anySatisfy(error -> {
                    assertThat(error.getRowNumber()).isEqualTo(2);
                    assertThat(error.getColumn()).isEqualTo("methodId");
                    assertThat(error.getCode()).isEqualTo("REFERENCE_NOT_FOUND");
                });
    }

    @Test
    void preview_nutrition_duplicateCodeAndMissingBreed_reportsBothErrors() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(999)).thenReturn(Optional.empty());
        when(nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse("R001")).thenReturn(true);

        MockMultipartFile file = csvFile("""
                rationCode,rationName,activityLevel,breedId
                R001,Puppy Diet,HIGH,999
                """);

        ImportPreviewResponse response = service.preview("NUTRITION", file);

        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getRowErrors())
                .extracting(ImportRowErrorResponse::getCode)
                .contains("REFERENCE_NOT_FOUND", "DUPLICATE_IN_DB");
    }

    @Test
    void preview_excelDogProfile_parsesDateBooleanAndEnums() throws Exception {
        MockMultipartFile file = xlsxFile(
                new String[]{"dogName", "breedId", "gender", "dateOfBirth", "status", "isSterilized"},
                new Object[]{"Rex", 1, "MALE", LocalDate.of(2024, 1, 15), "RETIRED", true}
        );

        ImportPreviewResponse response = service.preview("DOG_PROFILE", file);

        assertThat(response.getPreviewData()).hasSize(1);
        assertThat(response.getPreviewData())
                .singleElement()
                .satisfies(row -> {
                    assertThat(row).containsEntry("gender", "MALE");
                    assertThat(row).containsEntry("status", "RETIRED");
                    assertThat(row).containsEntry("isSterilized", true);
                });
    }

    @Test
    void confirm_breed_validFile_invokesBreedService() {
        MockMultipartFile file = csvFile("""
                breedName,origin,sizeClassification
                Malinois,Germany,LARGE
                """);

        ImportPreviewResponse response = service.confirm("BREED", file, 5);

        verify(breedService).create(any(), eq(5), isNull());
        assertThat(response.getCanConfirm()).isFalse();
        assertThat(response.getWarnings()).isNotEmpty();
    }

    @Test
    void confirm_disease_validFile_invokesDiseaseService() {
        MockMultipartFile file = csvFile("""
                diseaseName,severityLevel
                Kennel Cough,LOW
                """);

        ImportPreviewResponse response = service.confirm("DISEASE", file, 5);

        verify(diseaseService).create(any(), eq(5));
        assertThat(response.getCanConfirm()).isFalse();
    }

    @Test
    void confirm_medication_validFile_invokesMedicationService() {
        MockMultipartFile file = csvFile("""
                medicationName
                Amoxicillin
                """);

        ImportPreviewResponse response = service.confirm("MEDICATION", file, 5);

        verify(medicationService).create(any(), eq(5), isNull());
        assertThat(response.getCanConfirm()).isFalse();
    }

    @Test
    void confirm_exercise_validFile_invokesTrainingServiceCreateExercise() {
        MockMultipartFile file = csvFile("""
                exerciseName,difficultyLevel
                Heel,BASIC
                """);

        ImportPreviewResponse response = service.confirm("EXERCISE", file, 5);

        verify(trainingService).createExercise(any(), eq(5));
        assertThat(response.getCanConfirm()).isFalse();
    }

    @Test
    void confirm_nutrition_validFile_invokesNutritionService() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1))
                .thenReturn(Optional.of(DogBreed.builder().breedId(1).breedName("Malinois").build()));

        MockMultipartFile file = csvFile("""
                rationCode,rationName,activityLevel,breedId
                R001,Puppy Diet,HIGH,1
                """);

        ImportPreviewResponse response = service.confirm("NUTRITION", file, 5);

        verify(nutritionService).create(any(), eq(5));
        assertThat(response.getCanConfirm()).isFalse();
    }

    @Test
    void confirm_trainingRoadmap_validFile_invokesTrainingServiceCreateRoadmap() {
        when(dogBreedRepository.findByBreedIdAndIsDeletedFalse(1))
                .thenReturn(Optional.of(DogBreed.builder().breedId(1).breedName("Malinois").build()));

        MockMultipartFile file = csvFile("""
                roadmapName,phaseName,phaseOrder,breedId
                Guard Roadmap,Basic Phase,1,1
                """);

        ImportPreviewResponse response = service.confirm("TRAINING_ROADMAP", file, 5);

        verify(trainingService).createRoadmap(any(), eq(5));
        assertThat(response.getCanConfirm()).isFalse();
    }

    @Test
    void confirm_firstAidGuide_validFile_invokesFirstAidGuideService() {
        MockMultipartFile file = csvFile("""
                guideTitle,emergencyType,immediateSteps
                Heatstroke,Environment,Cool down immediately
                """);

        ImportPreviewResponse response = service.confirm("FIRST_AID_GUIDE", file, 5);

        verify(firstAidGuideService).create(any(), eq(5), isNull());
        assertThat(response.getCanConfirm()).isFalse();
    }

    private MockMultipartFile csvFile(String content) {
        return new MockMultipartFile(
                "file",
                "import.csv",
                "text/csv",
                content.getBytes(StandardCharsets.UTF_8)
        );
    }

    private MockMultipartFile xlsxFile(String[] headers, Object[] values) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Data");
            Row headerRow = sheet.createRow(0);
            Row dataRow = sheet.createRow(1);

            for (int index = 0; index < headers.length; index++) {
                headerRow.createCell(index).setCellValue(headers[index]);
                Object value = values[index];
                if (value instanceof String text) {
                    dataRow.createCell(index).setCellValue(text);
                } else if (value instanceof Integer integer) {
                    dataRow.createCell(index).setCellValue(integer);
                } else if (value instanceof Boolean bool) {
                    dataRow.createCell(index).setCellValue(bool);
                } else if (value instanceof LocalDate date) {
                    dataRow.createCell(index).setCellValue(date);
                }
            }

            workbook.write(outputStream);
            return new MockMultipartFile(
                    "file",
                    "import.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    outputStream.toByteArray()
            );
        }
    }
}
