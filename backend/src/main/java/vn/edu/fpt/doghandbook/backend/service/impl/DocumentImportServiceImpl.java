package vn.edu.fpt.doghandbook.backend.service.impl;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.request.BreedRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.DiseaseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.FirstAidGuideRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.MedicationRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.NutritionStandardRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingExerciseRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingMethodRequest;
import vn.edu.fpt.doghandbook.backend.dto.request.TrainingRoadmapRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportColumnSpecResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportPreviewResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportRowErrorResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportTemplateResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.ActivityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.ContentStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.DifficultyLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogGender;
import vn.edu.fpt.doghandbook.backend.entity.enums.DogStatus;
import vn.edu.fpt.doghandbook.backend.entity.enums.HealthCondition;
import vn.edu.fpt.doghandbook.backend.entity.enums.SeverityLevel;
import vn.edu.fpt.doghandbook.backend.entity.enums.SizeClassification;
import vn.edu.fpt.doghandbook.backend.entity.enums.TrainabilityLevel;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.FirstAidGuideRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingMethodRepository;
import vn.edu.fpt.doghandbook.backend.service.BreedService;
import vn.edu.fpt.doghandbook.backend.service.DiseaseService;
import vn.edu.fpt.doghandbook.backend.service.DocumentImportService;
import vn.edu.fpt.doghandbook.backend.service.DogProfileService;
import vn.edu.fpt.doghandbook.backend.service.FirstAidGuideService;
import vn.edu.fpt.doghandbook.backend.service.MedicationService;
import vn.edu.fpt.doghandbook.backend.service.NutritionService;
import vn.edu.fpt.doghandbook.backend.service.TrainingService;
import vn.edu.fpt.doghandbook.backend.service.impl.imports.ImportFieldDefinition;
import vn.edu.fpt.doghandbook.backend.service.impl.imports.ImportFieldType;
import vn.edu.fpt.doghandbook.backend.service.impl.imports.ImportTemplateDefinition;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentImportServiceImpl implements DocumentImportService {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    private static final List<String> SUPPORTED_FILE_TYPES = List.of("XLSX", "XLS", "CSV");

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
            "application/csv",
            "application/octet-stream"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("xlsx", "xls", "csv");

    private static final int MAX_PREVIEW_ROWS = 10;
    private static final int TEMPLATE_DATA_VALIDATION_LAST_ROW = 999;
    private static final Map<String, ImportTemplateDefinition> DEFINITIONS = buildDefinitions();

    private final BreedService breedService;
    private final DiseaseService diseaseService;
    private final MedicationService medicationService;
    private final NutritionService nutritionService;
    private final TrainingService trainingService;
    private final FirstAidGuideService firstAidGuideService;
    private final DogProfileService dogProfileService;
    private final DogBreedRepository dogBreedRepository;
    private final TrainingMethodRepository trainingMethodRepository;
    private final MedicationRepository medicationRepository;
    private final NutritionStandardRepository nutritionStandardRepository;
    private final FirstAidGuideRepository firstAidGuideRepository;

    @Override
    public List<ImportTemplateResponse> getTemplates() {
        return definitions().values().stream()
                .map(this::toTemplateResponse)
                .toList();
    }

    @Override
    public ByteArrayInputStream downloadTemplate(String entityType) {
        ImportTemplateDefinition definition = getDefinition(entityType);
        try (Workbook workbook = buildTemplateWorkbook(definition);
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            workbook.write(outputStream);
            return new ByteArrayInputStream(outputStream.toByteArray());
        } catch (IOException ex) {
            throw new BadRequestException("Không thể tạo tệp mẫu nhập: " + ex.getMessage());
        }
    }

    @Override
    public ImportPreviewResponse preview(String entityType, MultipartFile file) {
        validateFile(file);
        AnalyzedImport analyzedImport = analyzeImport(entityType, file);
        return analyzedImport.previewResponse();
    }

    @Override
    @Transactional
    public ImportPreviewResponse confirm(String entityType, MultipartFile file, Integer userId) {
        validateUserId(userId);
        validateFile(file);

        AnalyzedImport analyzedImport = analyzeImport(entityType, file);
        if (!Boolean.TRUE.equals(analyzedImport.previewResponse().getCanConfirm())) {
            throw new BadRequestException(buildValidationSummary(analyzedImport.previewResponse()));
        }

        for (ValidatedRow validatedRow : analyzedImport.validRows()) {
            persistRow(analyzedImport.definition().entityType(), validatedRow.request(), userId);
        }

        return ImportPreviewResponse.builder()
                .fileName(analyzedImport.previewResponse().getFileName())
                .fileType(analyzedImport.previewResponse().getFileType())
                .totalRows(analyzedImport.previewResponse().getTotalRows())
                .validRows(analyzedImport.previewResponse().getValidRows())
                .errorRows(0)
                .previewData(List.of())
                .columns(analyzedImport.previewResponse().getColumns())
                .errors(List.of())
                .rowErrors(List.of())
                .warnings(buildWarnings(analyzedImport.definition().entityType(), true))
                .canConfirm(false)
                .build();
    }

    private ImportTemplateResponse toTemplateResponse(ImportTemplateDefinition definition) {
        List<String> requiredColumns = definition.columns().stream()
                .filter(ImportFieldDefinition::required)
                .map(ImportFieldDefinition::name)
                .toList();
        List<String> optionalColumns = definition.columns().stream()
                .filter(column -> !column.required())
                .map(ImportFieldDefinition::name)
                .toList();

        return ImportTemplateResponse.builder()
                .templateName(definition.templateName())
                .entityType(definition.entityType())
                .description(definition.description())
                .requiredColumns(requiredColumns)
                .optionalColumns(optionalColumns)
                .supportedFileTypes(SUPPORTED_FILE_TYPES)
                .downloadUrl("/import/templates/" + definition.entityType() + "/file")
                .instructions(definition.instructions())
                .columns(definition.columns().stream()
                        .map(this::toColumnSpecResponse)
                        .toList())
                .build();
    }

    private Workbook buildTemplateWorkbook(ImportTemplateDefinition definition) {
        Workbook workbook = new XSSFWorkbook();
        Sheet dataSheet = workbook.createSheet("Dữ liệu");
        Sheet guideSheet = workbook.createSheet("Hướng dẫn");

        CellStyle requiredHeaderStyle = createHeaderStyle(workbook, IndexedColors.LIGHT_CORNFLOWER_BLUE);
        CellStyle optionalHeaderStyle = createHeaderStyle(workbook, IndexedColors.GREY_25_PERCENT);

        Row headerRow = dataSheet.createRow(0);
        List<ImportFieldDefinition> columns = definition.columns();
        for (int index = 0; index < columns.size(); index++) {
            ImportFieldDefinition column = columns.get(index);
            Cell cell = headerRow.createCell(index);
            cell.setCellValue(templateHeader(column));
            cell.setCellStyle(column.required() ? requiredHeaderStyle : optionalHeaderStyle);
            dataSheet.autoSizeColumn(index);

            if (column.dataType() == ImportFieldType.ENUM && !column.allowedValues().isEmpty()) {
                addExplicitListValidation(dataSheet, index, templateAllowedValues(column).toArray(String[]::new));
            }
            if (column.dataType() == ImportFieldType.BOOLEAN) {
                addExplicitListValidation(dataSheet, index, new String[]{"Có", "Không"});
            }
        }
        dataSheet.createFreezePane(0, 1);

        Row guideHeader = guideSheet.createRow(0);
        List<String> guideTitles = List.of(
                "Cột trong mẫu",
                "Bắt buộc",
                "Kiểu dữ liệu",
                "Giá trị hợp lệ",
                "Mô tả",
                "Ví dụ"
        );
        for (int index = 0; index < guideTitles.size(); index++) {
            Cell cell = guideHeader.createCell(index);
            cell.setCellValue(guideTitles.get(index));
            cell.setCellStyle(requiredHeaderStyle);
        }

        int guideRowIndex = 1;
        for (ImportFieldDefinition column : columns) {
            Row guideRow = guideSheet.createRow(guideRowIndex++);
            guideRow.createCell(0).setCellValue(templateHeader(column));
            guideRow.createCell(1).setCellValue(column.required() ? "Có" : "Không");
            guideRow.createCell(2).setCellValue(templateDataTypeLabel(column));
            guideRow.createCell(3).setCellValue(String.join(", ", templateAllowedValues(column)));
            guideRow.createCell(4).setCellValue(defaultString(column.description()));
            guideRow.createCell(5).setCellValue(templateExample(column));
        }

        int instructionRowIndex = guideRowIndex + 1;
        for (String instruction : definition.instructions()) {
            Row row = guideSheet.createRow(instructionRowIndex++);
            row.createCell(0).setCellValue(instruction);
        }

        for (int index = 0; index < guideTitles.size(); index++) {
            guideSheet.autoSizeColumn(index);
        }
        workbook.setActiveSheet(0);
        return workbook;
    }

    private AnalyzedImport analyzeImport(String entityType, MultipartFile file) {
        ImportTemplateDefinition definition = getDefinition(entityType);
        ParsedFile parsedFile = parseFile(file);
        HeaderResolution headerResolution = resolveHeaders(definition, parsedFile.headers());
        Map<Integer, List<ImportRowErrorResponse>> errorsByRow = new TreeMap<>();

        for (ImportRowErrorResponse error : headerResolution.errors()) {
            addError(errorsByRow, error.getRowNumber(), error.getColumn(), error.getCode(), error.getMessage());
        }

        List<Map<String, Object>> previewRows = new ArrayList<>();
        List<ValidatedRow> candidateRows = new ArrayList<>();

        for (RawFileRow rawRow : parsedFile.rows()) {
            RowParseResult rowParseResult = parseRow(definition, rawRow, headerResolution.columnIndexes());
            previewRows.add(rowParseResult.previewValues());

            for (ImportRowErrorResponse error : rowParseResult.errors()) {
                addError(errorsByRow, error.getRowNumber(), error.getColumn(), error.getCode(), error.getMessage());
            }

            if (headerResolution.blocking() || !rowParseResult.errors().isEmpty()) {
                continue;
            }

            Object request = mapToRequest(definition.entityType(), rowParseResult.typedValues());
            validateBeanConstraints(request, rawRow.rowNumber(), errorsByRow);
            if (!errorsByRow.containsKey(rawRow.rowNumber())) {
                candidateRows.add(new ValidatedRow(rawRow.rowNumber(), rowParseResult.previewValues(), request));
            }
        }

        if (!headerResolution.blocking()) {
            applyBusinessValidations(definition.entityType(), candidateRows, errorsByRow);
        }

        List<ValidatedRow> validRows = headerResolution.blocking()
                ? List.of()
                : candidateRows.stream()
                .filter(row -> !errorsByRow.containsKey(row.rowNumber()))
                .toList();

        List<ImportRowErrorResponse> rowErrors = errorsByRow.values().stream()
                .flatMap(Collection::stream)
                .sorted(Comparator
                        .comparing(ImportRowErrorResponse::getRowNumber, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(error -> defaultString(error.getColumn())))
                .toList();

        Set<Integer> dataRowErrors = rowErrors.stream()
                .map(ImportRowErrorResponse::getRowNumber)
                .filter(Objects::nonNull)
                .filter(rowNumber -> rowNumber > 1)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        int totalRows = parsedFile.rows().size();
        int errorRows = headerResolution.blocking()
                ? Math.max(totalRows, rowErrors.isEmpty() ? 0 : 1)
                : dataRowErrors.size();
        int validRowCount = headerResolution.blocking() ? 0 : validRows.size();

        ImportPreviewResponse previewResponse = ImportPreviewResponse.builder()
                .fileName(file.getOriginalFilename())
                .fileType(getFileExtension(file.getOriginalFilename()).toUpperCase(Locale.ROOT))
                .totalRows(totalRows)
                .validRows(validRowCount)
                .errorRows(errorRows)
                .previewData(previewRows.stream().limit(MAX_PREVIEW_ROWS).toList())
                .columns(definition.columns().stream().map(ImportFieldDefinition::name).toList())
                .errors(flattenErrors(rowErrors))
                .rowErrors(rowErrors)
                .warnings(buildWarnings(definition.entityType(), false))
                .canConfirm(!headerResolution.blocking() && rowErrors.isEmpty())
                .build();

        return new AnalyzedImport(definition, previewResponse, validRows);
    }

    private void persistRow(String entityType, Object request, Integer userId) {
        switch (entityType.toUpperCase(Locale.ROOT)) {
            case "BREED" -> breedService.create((BreedRequest) request, userId, null);
            case "DISEASE" -> diseaseService.create((DiseaseRequest) request, userId);
            case "MEDICATION" -> medicationService.create((MedicationRequest) request, userId, null);
            case "EXERCISE" -> trainingService.createExercise((TrainingExerciseRequest) request, userId);
            case "NUTRITION" -> nutritionService.create((NutritionStandardRequest) request, userId);
            case "TRAINING_METHOD" -> trainingService.createMethod((TrainingMethodRequest) request, userId);
            case "TRAINING_ROADMAP" -> trainingService.createRoadmap((TrainingRoadmapRequest) request, userId);
            case "FIRST_AID_GUIDE" -> firstAidGuideService.create((FirstAidGuideRequest) request, userId, null);
            case "DOG_PROFILE" -> dogProfileService.create((DogProfileRequest) request, null);
            default -> throw new BadRequestException("Loại dữ liệu không hỗ trợ nhập: " + entityType);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File không được để trống");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new BadRequestException("File không hợp lệ: thiếu extension");
        }

        String extension = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException(
                    "Định dạng file không được hỗ trợ: ." + extension + ". Chỉ chấp nhận: .xlsx, .xls, .csv");
        }

        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new BadRequestException("MIME type không được hỗ trợ: " + contentType);
        }
    }

    private void validateUserId(Integer userId) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("userId không hợp lệ");
        }
    }

    private ImportTemplateDefinition getDefinition(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            throw new BadRequestException("entityType không được để trống");
        }

        ImportTemplateDefinition definition = definitions().get(entityType.trim().toUpperCase(Locale.ROOT));
        if (definition == null) {
            throw new BadRequestException("Loại dữ liệu không hỗ trợ nhập: " + entityType);
        }
        return definition;
    }

    private Map<String, ImportTemplateDefinition> definitions() {
        return DEFINITIONS;
    }

    private String buildValidationSummary(ImportPreviewResponse previewResponse) {
        int errorRows = previewResponse.getErrorRows() == null ? 0 : previewResponse.getErrorRows();
        if (errorRows <= 0) {
            return "Tệp nhập không hợp lệ";
        }
        return "File chứa " + errorRows + " dòng lỗi. Vui lòng sửa và thử lại.";
    }

    private List<String> buildWarnings(String entityType, boolean afterImport) {
        if ("DOG_PROFILE".equalsIgnoreCase(entityType)) {
            return List.of(afterImport
                    ? "Hồ sơ chó đã được tạo với trạng thái từ tệp hoặc mặc định là hoạt động (ACTIVE)."
                    : "Hồ sơ chó sẽ dùng trạng thái từ tệp; nếu bỏ trống thì mặc định là hoạt động (ACTIVE).");
        }

        return List.of(afterImport
                ? "Nội dung đã được nhập thành công và tạo ở trạng thái nháp (DRAFT)."
                : "Nội dung nhập sẽ được tạo ở trạng thái nháp (DRAFT).");
    }

    private ImportColumnSpecResponse toColumnSpecResponse(ImportFieldDefinition column) {
        return ImportColumnSpecResponse.builder()
                .fieldName(column.name())
                .name(column.name())
                .label(templateHeader(column))
                .required(column.required())
                .dataType(templateDataTypeLabel(column))
                .allowedValues(templateAllowedValues(column))
                .description(columnHelpText(column))
                .example(templateExample(column))
                .build();
    }

    private static Map<String, ImportTemplateDefinition> buildDefinitions() {
        Map<String, ImportTemplateDefinition> definitions = new LinkedHashMap<>();

        definitions.put("BREED", new ImportTemplateDefinition(
                "BREED",
                "Giống chó",
                "Nhập danh sách giống chó vào kho nội dung.",
                List.of(
                        "File mẫu chỉ chấp nhận header đúng theo dòng đầu tiên.",
                        "Giá trị danh mục có thể nhập theo nhãn tiếng Việt trong mẫu hoặc mã hệ thống, không phân biệt hoa thường.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("breedName", true, ImportFieldType.STRING, "Tên giống chó", "Béc-giê Đức"),
                        field("origin", true, ImportFieldType.STRING, "Xuất xứ", "Đức"),
                        enumField("sizeClassification", true, SizeClassification.class, "Phân loại kích thước", "LARGE"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Giống chó nghiệp vụ phổ biến"),
                        enumField("trainabilityLevel", false, TrainabilityLevel.class, "Mức độ dễ huấn luyện", "HIGH"),
                        field("weightMaleMinKg", false, ImportFieldType.DECIMAL, "Cân nặng đực tối thiểu", "30"),
                        field("weightMaleMaxKg", false, ImportFieldType.DECIMAL, "Cân nặng đực tối đa", "40"),
                        field("weightFemaleMinKg", false, ImportFieldType.DECIMAL, "Cân nặng cái tối thiểu", "22"),
                        field("weightFemaleMaxKg", false, ImportFieldType.DECIMAL, "Cân nặng cái tối đa", "32"),
                        field("avgHeightCm", false, ImportFieldType.DECIMAL, "Chiều cao trung bình", "62"),
                        field("lifespanYears", false, ImportFieldType.STRING, "Tuổi thọ", "10-13"),
                        field("operationalCapabilities", false, ImportFieldType.STRING, "Năng lực tác chiến", "Bảo vệ, truy tìm"),
                        field("metadata", false, ImportFieldType.STRING, "Dữ liệu bổ sung", "{\"source\":\"import\"}")
                )
        ));

        definitions.put("DISEASE", new ImportTemplateDefinition(
                "DISEASE",
                "Bệnh",
                "Nhập danh sách bệnh.",
                List.of(
                        "Có thể dùng header treatmentGuidelines hoặc treatment.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("diseaseName", true, ImportFieldType.STRING, "Tên bệnh", "Parvo"),
                        enumField("severityLevel", true, SeverityLevel.class, "Mức độ nghiêm trọng", "HIGH"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Bệnh truyền nhiễm đường ruột"),
                        field("symptomSummary", false, ImportFieldType.STRING, "Tóm tắt triệu chứng", "Nôn, tiêu chảy"),
                        field("treatmentGuidelines", false, ImportFieldType.STRING, List.of("treatment"), List.of(), "Hướng dẫn điều trị", "Bù nước, chăm sóc hỗ trợ"),
                        field("preventionMeasures", false, ImportFieldType.STRING, "Biện pháp phòng ngừa", "Tiêm vaccine đầy đủ"),
                        field("isContagious", false, ImportFieldType.BOOLEAN, "Có lây lan hay không", "true"),
                        field("incubationPeriod", false, ImportFieldType.STRING, "Thời gian ủ bệnh", "3-7 ngày")
                )
        ));

        definitions.put("MEDICATION", new ImportTemplateDefinition(
                "MEDICATION",
                "Thuốc",
                "Nhập danh sách thuốc.",
                List.of(
                        "Tên thuốc phải duy nhất theo quy tắc nghiệp vụ hiện tại.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("medicationName", true, ImportFieldType.STRING, "Tên thuốc", "Amoxicillin"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Kháng sinh phổ rộng"),
                        field("dosageInstructions", false, ImportFieldType.STRING, "Hướng dẫn liều dùng", "10mg/kg"),
                        field("administrationMethod", false, ImportFieldType.STRING, "Đường dùng", "Đường uống"),
                        field("sideEffects", false, ImportFieldType.STRING, "Tác dụng phụ", "Buồn nôn"),
                        field("contraindications", false, ImportFieldType.STRING, "Chống chỉ định", "Dị ứng penicillin"),
                        field("storageRequirements", false, ImportFieldType.STRING, "Bảo quản", "Nơi khô mát")
                )
        ));

        definitions.put("EXERCISE", new ImportTemplateDefinition(
                "EXERCISE",
                "Bài tập",
                "Nhập danh sách bài tập huấn luyện.",
                List.of(
                        "Loại dữ liệu EXERCISE được giữ để tương thích với luồng nhập cũ.",
                        "ID phương pháp huấn luyện nếu có phải tồn tại trong hệ thống.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("exerciseName", true, ImportFieldType.STRING, "Tên bài tập", "Tìm đồ vật"),
                        enumField("difficultyLevel", true, DifficultyLevel.class, "Mức độ khó", "INTERMEDIATE"),
                        field("methodId", false, ImportFieldType.INTEGER, "ID phương pháp huấn luyện", "1"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Bài tập đánh hơi mùi"),
                        field("instructions", false, ImportFieldType.STRING, "Hướng dẫn", "Cho chiến thuật tìm mùi hương"),
                        field("durationMinutes", false, ImportFieldType.INTEGER, "Thời lượng phút", "20"),
                        field("safetyPrecautions", false, ImportFieldType.STRING, "Lưu ý an toàn", "Không tập khi thời tiết quá nóng"),
                        field("requiredEquipment", false, ImportFieldType.STRING, "Dụng cụ cần thiết", "Mùi hương, cone"),
                        field("mediaUrls", false, ImportFieldType.STRING, "Danh sách URL media", "https://example.com/video")
                )
        ));

        definitions.put("NUTRITION", new ImportTemplateDefinition(
                "NUTRITION",
                "Dinh dưỡng",
                "Nhập tiêu chuẩn dinh dưỡng.",
                List.of(
                        "Cột ID giống chó và mức độ hoạt động là bắt buộc.",
                        "Mã khẩu phần phải duy nhất theo quy tắc nghiệp vụ hiện tại.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("rationCode", true, ImportFieldType.STRING, "Mã khẩu phần", "R001"),
                        field("rationName", true, ImportFieldType.STRING, "Tên khẩu phần", "Khẩu phần cơ bản"),
                        enumField("activityLevel", true, ActivityLevel.class, "Mức độ hoạt động", "HIGH"),
                        field("breedId", true, ImportFieldType.INTEGER, "ID giống chó", "1"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Khẩu phần cho chó vận động cao"),
                        field("targetAgeMinMonths", false, ImportFieldType.INTEGER, "Tuổi tối thiểu", "12"),
                        field("targetAgeMaxMonths", false, ImportFieldType.INTEGER, "Tuổi tối đa", "60"),
                        enumField("healthCondition", false, HealthCondition.class, "Tình trạng sức khỏe", "NORMAL"),
                        field("metadata", false, ImportFieldType.STRING, "Dữ liệu bổ sung", "{\"source\":\"import\"}"),
                        field("specialNotes", false, ImportFieldType.STRING, "Ghi chú đặc biệt", "Tăng nước uống")
                )
        ));

        definitions.put("TRAINING_METHOD", new ImportTemplateDefinition(
                "TRAINING_METHOD",
                "Phương pháp huấn luyện",
                "Nhập phương pháp huấn luyện.",
                List.of("Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."),
                List.of(
                        field("methodName", true, ImportFieldType.STRING, "Tên phương pháp", "Tăng cường tích cực"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Thưởng khi chiến sĩ thực hiện đúng"),
                        field("advantages", false, ImportFieldType.STRING, "Ưu điểm", "Tăng động lực"),
                        field("disadvantages", false, ImportFieldType.STRING, "Nhược điểm", "Cần tính nhất quán"),
                        field("instructions", false, ImportFieldType.STRING, "Hướng dẫn", "Thưởng ngay sau hành vi đúng")
                )
        ));

        definitions.put("TRAINING_ROADMAP", new ImportTemplateDefinition(
                "TRAINING_ROADMAP",
                "Lộ trình huấn luyện",
                "Nhập lộ trình huấn luyện.",
                List.of(
                        "Cột ID giống chó là tùy chọn nhưng nếu có phải tồn tại.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("roadmapName", true, ImportFieldType.STRING, "Tên lộ trình", "Cảnh khuyển cơ bản"),
                        field("phaseName", true, ImportFieldType.STRING, "Tên giai đoạn", "Làm quen"),
                        field("phaseOrder", true, ImportFieldType.INTEGER, "Thứ tự giai đoạn", "1"),
                        field("breedId", false, ImportFieldType.INTEGER, "ID giống chó", "1"),
                        field("targetRole", false, ImportFieldType.STRING, "Vai trò mục tiêu", "Canh gác"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Lộ trình 12 tuần"),
                        field("totalDurationWeeks", false, ImportFieldType.INTEGER, "Tổng số tuần", "12"),
                        field("phaseDurationWeeks", false, ImportFieldType.INTEGER, "Số tuần của giai đoạn", "2"),
                        field("phaseObjectives", false, ImportFieldType.STRING, "Mục tiêu giai đoạn", "Ổn định lệnh cơ bản"),
                        field("assessmentCriteria", false, ImportFieldType.STRING, "Tiêu chí đánh giá", "Đạt 8/10 bài tập")
                )
        ));

        definitions.put("FIRST_AID_GUIDE", new ImportTemplateDefinition(
                "FIRST_AID_GUIDE",
                "Sơ cứu",
                "Nhập hướng dẫn sơ cứu.",
                List.of(
                        "Tiêu đề hướng dẫn phải duy nhất theo quy tắc nghiệp vụ hiện tại.",
                        "Bản ghi nhập thành công sẽ được tạo ở trạng thái nháp (DRAFT)."
                ),
                List.of(
                        field("guideTitle", true, ImportFieldType.STRING, "Tiêu đề hướng dẫn", "Sốc nhiệt"),
                        field("emergencyType", true, ImportFieldType.STRING, "Loại tình huống", "Môi trường"),
                        field("immediateSteps", true, ImportFieldType.STRING, "Bước xử lý ngay", "Đưa chó vào nơi mát"),
                        field("description", false, ImportFieldType.STRING, "Mô tả", "Tình huống thường gặp vào mùa hè"),
                        field("requiredMaterials", false, ImportFieldType.STRING, "Vật tư cần có", "Nước mát, khăn"),
                        field("doNotActions", false, ImportFieldType.STRING, "Không được làm", "Không dùng nước đá trực tiếp"),
                        field("whenToSeekVet", false, ImportFieldType.STRING, "Khi nào cần đến thú y", "Nhiệt độ không hạ")
                )
        ));

        definitions.put("DOG_PROFILE", new ImportTemplateDefinition(
                "DOG_PROFILE",
                "Hồ sơ chó",
                "Nhập hồ sơ chó nghiệp vụ.",
                List.of(
                        "Mã chó được sinh phía máy chủ, không nhập trong file.",
                        "Trạng thái của hồ sơ chó dùng từ tệp; nếu bỏ trống thì mặc định là hoạt động (ACTIVE)."
                ),
                List.of(
                        field("dogName", true, ImportFieldType.STRING, "Tên chó", "Rex"),
                        field("breedId", true, ImportFieldType.INTEGER, "ID giống chó", "1"),
                        enumField("gender", false, DogGender.class, "Giới tính", "MALE"),
                        field("dateOfBirth", false, ImportFieldType.DATE, "Ngày sinh yyyy-MM-dd", "2023-01-10"),
                        field("currentWeightKg", false, ImportFieldType.DECIMAL, "Cân nặng hiện tại", "28.5"),
                        field("heightCm", false, ImportFieldType.DECIMAL, "Chiều cao", "60"),
                        field("color", false, ImportFieldType.STRING, "Màu lông", "Đen vàng"),
                        field("microchipId", false, ImportFieldType.STRING, "Mã microchip", "MC-001"),
                        enumField("status", false, DogStatus.class, "Trạng thái chó", "ACTIVE"),
                        field("assignmentDate", false, ImportFieldType.DATE, "Ngày phân công yyyy-MM-dd", "2024-05-20"),
                        field("isSterilized", false, ImportFieldType.BOOLEAN, "Đã triệt sản hay chưa", "false"),
                        field("notes", false, ImportFieldType.STRING, "Ghi chú", "Đã hoàn thành kiểm tra sức khỏe")
                )
        ));

        return java.util.Collections.unmodifiableMap(new LinkedHashMap<>(definitions));
    }

    private static ImportFieldDefinition field(
            String name,
            boolean required,
            ImportFieldType dataType,
            String description,
            String example
    ) {
        return new ImportFieldDefinition(name, required, dataType, List.of(), List.of(), description, example);
    }

    private static ImportFieldDefinition field(
            String name,
            boolean required,
            ImportFieldType dataType,
            List<String> aliases,
            List<String> allowedValues,
            String description,
            String example
    ) {
        return new ImportFieldDefinition(name, required, dataType, aliases, allowedValues, description, example);
    }

    private static ImportFieldDefinition enumField(
            String name,
            boolean required,
            Class<? extends Enum<?>> enumClass,
            String description,
            String example
    ) {
        return new ImportFieldDefinition(
                name,
                required,
                ImportFieldType.ENUM,
                List.of(),
                Arrays.stream(enumClass.getEnumConstants()).map(Enum::name).toList(),
                description,
                example
        );
    }

    private record AnalyzedImport(
            ImportTemplateDefinition definition,
            ImportPreviewResponse previewResponse,
            List<ValidatedRow> validRows
    ) {
    }

    private record ValidatedRow(
            int rowNumber,
            Map<String, Object> previewValues,
            Object request
    ) {
    }

    private Object mapToRequest(String entityType, Map<String, Object> values) {
        return switch (entityType.toUpperCase(Locale.ROOT)) {
            case "BREED" -> mapBreedRequest(values);
            case "DISEASE" -> mapDiseaseRequest(values);
            case "MEDICATION" -> mapMedicationRequest(values);
            case "EXERCISE" -> mapExerciseRequest(values);
            case "NUTRITION" -> mapNutritionRequest(values);
            case "TRAINING_METHOD" -> mapTrainingMethodRequest(values);
            case "TRAINING_ROADMAP" -> mapTrainingRoadmapRequest(values);
            case "FIRST_AID_GUIDE" -> mapFirstAidGuideRequest(values);
            case "DOG_PROFILE" -> mapDogProfileRequest(values);
            default -> throw new BadRequestException("Loại dữ liệu không hỗ trợ nhập: " + entityType);
        };
    }

    private BreedRequest mapBreedRequest(Map<String, Object> values) {
        BreedRequest request = new BreedRequest();
        request.setBreedName(asString(values.get("breedName")));
        request.setOrigin(asString(values.get("origin")));
        request.setSizeClassification(asString(values.get("sizeClassification")));
        request.setDescription(asString(values.get("description")));
        request.setTrainabilityLevel(asString(values.get("trainabilityLevel")));
        request.setWeightMaleMinKg(asBigDecimal(values.get("weightMaleMinKg")));
        request.setWeightMaleMaxKg(asBigDecimal(values.get("weightMaleMaxKg")));
        request.setWeightFemaleMinKg(asBigDecimal(values.get("weightFemaleMinKg")));
        request.setWeightFemaleMaxKg(asBigDecimal(values.get("weightFemaleMaxKg")));
        request.setAvgHeightCm(asBigDecimal(values.get("avgHeightCm")));
        request.setLifespanYears(asString(values.get("lifespanYears")));
        request.setOperationalCapabilities(asString(values.get("operationalCapabilities")));
        request.setMetadata(asString(values.get("metadata")));
        return request;
    }

    private DiseaseRequest mapDiseaseRequest(Map<String, Object> values) {
        DiseaseRequest request = new DiseaseRequest();
        request.setDiseaseName(asString(values.get("diseaseName")));
        request.setSeverityLevel(asString(values.get("severityLevel")));
        request.setDescription(asString(values.get("description")));
        request.setSymptomSummary(asString(values.get("symptomSummary")));
        request.setTreatmentGuidelines(asString(values.get("treatmentGuidelines")));
        request.setPreventionMeasures(asString(values.get("preventionMeasures")));
        request.setIsContagious((Boolean) values.get("isContagious"));
        request.setIncubationPeriod(asString(values.get("incubationPeriod")));
        return request;
    }

    private MedicationRequest mapMedicationRequest(Map<String, Object> values) {
        MedicationRequest request = new MedicationRequest();
        request.setMedicationName(asString(values.get("medicationName")));
        request.setDescription(asString(values.get("description")));
        request.setDosageInstructions(asString(values.get("dosageInstructions")));
        request.setAdministrationMethod(asString(values.get("administrationMethod")));
        request.setSideEffects(asString(values.get("sideEffects")));
        request.setContraindications(asString(values.get("contraindications")));
        request.setStorageRequirements(asString(values.get("storageRequirements")));
        return request;
    }

    private TrainingExerciseRequest mapExerciseRequest(Map<String, Object> values) {
        TrainingExerciseRequest request = new TrainingExerciseRequest();
        request.setExerciseName(asString(values.get("exerciseName")));
        request.setDifficultyLevel(asString(values.get("difficultyLevel")));
        request.setMethodId((Integer) values.get("methodId"));
        request.setDescription(asString(values.get("description")));
        request.setInstructions(asString(values.get("instructions")));
        request.setDurationMinutes((Integer) values.get("durationMinutes"));
        request.setSafetyPrecautions(asString(values.get("safetyPrecautions")));
        request.setRequiredEquipment(asString(values.get("requiredEquipment")));
        request.setMediaUrls(asString(values.get("mediaUrls")));
        return request;
    }

    private NutritionStandardRequest mapNutritionRequest(Map<String, Object> values) {
        NutritionStandardRequest request = new NutritionStandardRequest();
        request.setRationCode(asString(values.get("rationCode")));
        request.setRationName(asString(values.get("rationName")));
        request.setActivityLevel(asString(values.get("activityLevel")));
        request.setBreedId((Integer) values.get("breedId"));
        request.setDescription(asString(values.get("description")));
        request.setTargetAgeMinMonths((Integer) values.get("targetAgeMinMonths"));
        request.setTargetAgeMaxMonths((Integer) values.get("targetAgeMaxMonths"));
        request.setHealthCondition(asString(values.get("healthCondition")));
        request.setMetadata(asString(values.get("metadata")));
        request.setSpecialNotes(asString(values.get("specialNotes")));
        return request;
    }

    private TrainingMethodRequest mapTrainingMethodRequest(Map<String, Object> values) {
        TrainingMethodRequest request = new TrainingMethodRequest();
        request.setMethodName(asString(values.get("methodName")));
        request.setDescription(asString(values.get("description")));
        request.setAdvantages(asString(values.get("advantages")));
        request.setDisadvantages(asString(values.get("disadvantages")));
        request.setInstructions(asString(values.get("instructions")));
        return request;
    }

    private TrainingRoadmapRequest mapTrainingRoadmapRequest(Map<String, Object> values) {
        TrainingRoadmapRequest request = new TrainingRoadmapRequest();
        request.setRoadmapName(asString(values.get("roadmapName")));
        request.setPhaseName(asString(values.get("phaseName")));
        request.setPhaseOrder((Integer) values.get("phaseOrder"));
        request.setBreedId((Integer) values.get("breedId"));
        request.setTargetRole(asString(values.get("targetRole")));
        request.setDescription(asString(values.get("description")));
        request.setTotalDurationWeeks((Integer) values.get("totalDurationWeeks"));
        request.setPhaseDurationWeeks((Integer) values.get("phaseDurationWeeks"));
        request.setPhaseObjectives(asString(values.get("phaseObjectives")));
        request.setAssessmentCriteria(asString(values.get("assessmentCriteria")));
        return request;
    }

    private FirstAidGuideRequest mapFirstAidGuideRequest(Map<String, Object> values) {
        FirstAidGuideRequest request = new FirstAidGuideRequest();
        request.setGuideTitle(asString(values.get("guideTitle")));
        request.setEmergencyType(asString(values.get("emergencyType")));
        request.setImmediateSteps(asString(values.get("immediateSteps")));
        request.setDescription(asString(values.get("description")));
        request.setRequiredMaterials(asString(values.get("requiredMaterials")));
        request.setDoNotActions(asString(values.get("doNotActions")));
        request.setWhenToSeekVet(asString(values.get("whenToSeekVet")));
        return request;
    }

    private DogProfileRequest mapDogProfileRequest(Map<String, Object> values) {
        DogProfileRequest request = new DogProfileRequest();
        request.setDogName(asString(values.get("dogName")));
        request.setBreedId((Integer) values.get("breedId"));
        request.setGender(asString(values.get("gender")));
        request.setDateOfBirth((LocalDate) values.get("dateOfBirth"));
        request.setCurrentWeightKg(asBigDecimal(values.get("currentWeightKg")));
        request.setHeightCm(asBigDecimal(values.get("heightCm")));
        request.setColor(asString(values.get("color")));
        request.setMicrochipId(asString(values.get("microchipId")));
        request.setStatus(asString(values.get("status")));
        request.setAssignmentDate((LocalDate) values.get("assignmentDate"));
        request.setIsSterilized((Boolean) values.get("isSterilized"));
        request.setNotes(asString(values.get("notes")));
        return request;
    }

    private void validateBeanConstraints(Object request, int rowNumber, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        Set<ConstraintViolation<Object>> violations = VALIDATOR.validate(request);
        for (ConstraintViolation<Object> violation : violations) {
            String property = violation.getPropertyPath() == null ? null : violation.getPropertyPath().toString();
            addError(errorsByRow, rowNumber, property, "VALIDATION_ERROR", violation.getMessage());
        }
    }

    private void applyBusinessValidations(
            String entityType,
            List<ValidatedRow> rows,
            Map<Integer, List<ImportRowErrorResponse>> errorsByRow
    ) {
        validateDuplicateWithinFile(entityType, rows, errorsByRow);

        for (ValidatedRow row : rows) {
            if (errorsByRow.containsKey(row.rowNumber())) {
                continue;
            }
            switch (entityType.toUpperCase(Locale.ROOT)) {
                case "BREED" -> validateBreedBusinessRules(row, errorsByRow);
                case "MEDICATION" -> validateMedicationBusinessRules(row, errorsByRow);
                case "EXERCISE" -> validateExerciseBusinessRules(row, errorsByRow);
                case "NUTRITION" -> validateNutritionBusinessRules(row, errorsByRow);
                case "TRAINING_ROADMAP" -> validateRoadmapBusinessRules(row, errorsByRow);
                case "FIRST_AID_GUIDE" -> validateFirstAidBusinessRules(row, errorsByRow);
                case "DOG_PROFILE" -> validateDogProfileBusinessRules(row, errorsByRow);
                default -> {
                }
            }
        }
    }

    private void validateDuplicateWithinFile(
            String entityType,
            List<ValidatedRow> rows,
            Map<Integer, List<ImportRowErrorResponse>> errorsByRow
    ) {
        Function<ValidatedRow, String> keyExtractor;
        String columnName;

        switch (entityType.toUpperCase(Locale.ROOT)) {
            case "BREED" -> {
                keyExtractor = row -> normalizeKey(((BreedRequest) row.request()).getBreedName());
                columnName = "breedName";
            }
            case "MEDICATION" -> {
                keyExtractor = row -> normalizeKey(((MedicationRequest) row.request()).getMedicationName());
                columnName = "medicationName";
            }
            case "NUTRITION" -> {
                keyExtractor = row -> normalizeKey(((NutritionStandardRequest) row.request()).getRationCode());
                columnName = "rationCode";
            }
            case "FIRST_AID_GUIDE" -> {
                keyExtractor = row -> normalizeKey(((FirstAidGuideRequest) row.request()).getGuideTitle());
                columnName = "guideTitle";
            }
            default -> {
                return;
            }
        }

        Map<String, List<ValidatedRow>> duplicateGroups = rows.stream()
                .filter(row -> !errorsByRow.containsKey(row.rowNumber()))
                .filter(row -> keyExtractor.apply(row) != null)
                .collect(Collectors.groupingBy(keyExtractor, LinkedHashMap::new, Collectors.toList()));

        duplicateGroups.values().stream()
                .filter(group -> group.size() > 1)
                .forEach(group -> group.forEach(row ->
                        addError(errorsByRow, row.rowNumber(), columnName, "DUPLICATE_IN_FILE",
                                "Giá trị bị trùng trong tệp nhập")));
    }

    private void validateBreedBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        BreedRequest request = (BreedRequest) row.request();
        String breedName = request.getBreedName();
        if (breedName != null && dogBreedRepository.existsByBreedNameAndIsDeletedFalse(breedName)) {
            addError(errorsByRow, row.rowNumber(), "breedName", "DUPLICATE_IN_DB", "Tên giống chó đã tồn tại");
        }
    }

    private void validateMedicationBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        MedicationRequest request = (MedicationRequest) row.request();
        String medicationName = request.getMedicationName();
        if (medicationName != null && medicationRepository.existsByMedicationNameIgnoreCaseAndIsDeletedFalse(medicationName)) {
            addError(errorsByRow, row.rowNumber(), "medicationName", "DUPLICATE_IN_DB", "Tên thuốc đã tồn tại");
        }
    }

    private void validateExerciseBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        TrainingExerciseRequest request = (TrainingExerciseRequest) row.request();
        if (request.getMethodId() != null
                && trainingMethodRepository.findByMethodIdAndIsDeletedFalse(request.getMethodId()).isEmpty()) {
            addError(errorsByRow, row.rowNumber(), "methodId", "REFERENCE_NOT_FOUND", "Phương pháp huấn luyện không tồn tại");
        }
    }

    private void validateNutritionBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        NutritionStandardRequest request = (NutritionStandardRequest) row.request();
        if (request.getBreedId() != null
                && dogBreedRepository.findByBreedIdAndIsDeletedFalse(request.getBreedId()).isEmpty()) {
            addError(errorsByRow, row.rowNumber(), "breedId", "REFERENCE_NOT_FOUND", "Giống chó không tồn tại");
        }
        if (request.getRationCode() != null
                && nutritionStandardRepository.existsByRationCodeAndIsDeletedFalse(request.getRationCode())) {
            addError(errorsByRow, row.rowNumber(), "rationCode", "DUPLICATE_IN_DB", "Mã khẩu phần đã tồn tại");
        }
    }

    private void validateRoadmapBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        TrainingRoadmapRequest request = (TrainingRoadmapRequest) row.request();
        if (request.getBreedId() != null
                && dogBreedRepository.findByBreedIdAndIsDeletedFalse(request.getBreedId()).isEmpty()) {
            addError(errorsByRow, row.rowNumber(), "breedId", "REFERENCE_NOT_FOUND", "Giống chó không tồn tại");
        }
    }

    private void validateFirstAidBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        FirstAidGuideRequest request = (FirstAidGuideRequest) row.request();
        if (request.getGuideTitle() != null
                && firstAidGuideRepository.existsByGuideTitleIgnoreCaseAndIsDeletedFalse(request.getGuideTitle())) {
            addError(errorsByRow, row.rowNumber(), "guideTitle", "DUPLICATE_IN_DB", "Tiêu đề hướng dẫn đã tồn tại");
        }
    }

    private void validateDogProfileBusinessRules(ValidatedRow row, Map<Integer, List<ImportRowErrorResponse>> errorsByRow) {
        DogProfileRequest request = (DogProfileRequest) row.request();
        if (request.getBreedId() != null
                && dogBreedRepository.findByBreedIdAndIsDeletedFalse(request.getBreedId()).isEmpty()) {
            addError(errorsByRow, row.rowNumber(), "breedId", "REFERENCE_NOT_FOUND", "Giống chó không tồn tại");
        }
    }

    private void addError(
            Map<Integer, List<ImportRowErrorResponse>> errorsByRow,
            int rowNumber,
            String column,
            String code,
            String message
    ) {
        errorsByRow.computeIfAbsent(rowNumber, ignored -> new ArrayList<>())
                .add(ImportRowErrorResponse.builder()
                        .rowNumber(rowNumber)
                        .column(column)
                        .code(code)
                        .message(message)
                        .build());
    }

    private String normalizeKey(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private BigDecimal asBigDecimal(Object value) {
        return value instanceof BigDecimal decimal ? decimal : null;
    }

    private CellStyle createHeaderStyle(Workbook workbook, IndexedColors color) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(color.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }

    private void addExplicitListValidation(Sheet sheet, int columnIndex, String[] values) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        DataValidationConstraint constraint = helper.createExplicitListConstraint(values);
        CellRangeAddressList addressList = new CellRangeAddressList(1, TEMPLATE_DATA_VALIDATION_LAST_ROW, columnIndex, columnIndex);
        DataValidation validation = helper.createValidation(constraint, addressList);
        validation.setShowErrorBox(true);
        sheet.addValidationData(validation);
    }

    private String templateHeader(ImportFieldDefinition column) {
        String label = sanitizeText(column.description());
        return label != null ? label : column.name();
    }

    private String templateDataTypeLabel(ImportFieldDefinition column) {
        return switch (column.dataType()) {
            case STRING -> "Văn bản";
            case INTEGER -> "Số nguyên";
            case DECIMAL -> "Số thập phân";
            case BOOLEAN -> "Có/Không";
            case DATE -> "Ngày (yyyy-MM-dd)";
            case ENUM -> "Danh mục chọn sẵn";
        };
    }

    private String columnHelpText(ImportFieldDefinition column) {
        return switch (column.dataType()) {
            case STRING -> "Nhập nội dung văn bản.";
            case INTEGER -> "Nhập số nguyên.";
            case DECIMAL -> "Nhập số thập phân.";
            case BOOLEAN -> "Nhập Có hoặc Không.";
            case DATE -> "Nhập ngày theo định dạng yyyy-MM-dd.";
            case ENUM -> "Chọn hoặc nhập một giá trị hợp lệ trong danh sách.";
        };
    }

    private List<String> templateAllowedValues(ImportFieldDefinition column) {
        if (column.dataType() == ImportFieldType.BOOLEAN) {
            return List.of("Có", "Không");
        }
        if (column.dataType() != ImportFieldType.ENUM) {
            return column.allowedValues();
        }
        return column.allowedValues().stream()
                .map(value -> localizedTemplateValue(column.name(), value))
                .toList();
    }

    private String templateExample(ImportFieldDefinition column) {
        String example = sanitizeText(column.example());
        if (example == null) {
            return "";
        }
        if (column.dataType() == ImportFieldType.BOOLEAN) {
            return parseBoolean(example) ? "Có" : "Không";
        }
        if (column.dataType() == ImportFieldType.ENUM) {
            return localizedTemplateValue(column.name(), example);
        }
        return example;
    }

    private String localizedTemplateValue(String columnName, String value) {
        return switch (columnName) {
            case "sizeClassification" -> switch (value) {
                case "SMALL" -> "Nhỏ";
                case "MEDIUM" -> "Trung bình";
                case "LARGE" -> "Lớn";
                case "GIANT" -> "Khổng lồ";
                default -> value;
            };
            case "trainabilityLevel" -> switch (value) {
                case "LOW" -> "Thấp";
                case "MEDIUM" -> "Trung bình";
                case "HIGH" -> "Cao";
                default -> value;
            };
            case "severityLevel" -> switch (value) {
                case "LOW" -> "Nhẹ";
                case "MEDIUM" -> "Trung bình";
                case "HIGH" -> "Nặng";
                case "CRITICAL" -> "Nguy kịch";
                default -> value;
            };
            case "difficultyLevel" -> switch (value) {
                case "BASIC" -> "Cơ bản";
                case "INTERMEDIATE" -> "Trung bình";
                case "ADVANCED" -> "Nâng cao";
                default -> value;
            };
            case "activityLevel" -> switch (value) {
                case "LOW" -> "Thấp";
                case "MEDIUM" -> "Trung bình";
                case "HIGH" -> "Cao";
                case "VERY_HIGH" -> "Rất cao";
                default -> value;
            };
            case "healthCondition" -> switch (value) {
                case "NORMAL" -> "Bình thường";
                case "SENSITIVE_DIGESTION" -> "Tiêu hóa nhạy cảm";
                case "ALLERGY_PRONE" -> "Dễ dị ứng";
                case "WEIGHT_CONTROL" -> "Kiểm soát cân nặng";
                case "RECOVERY" -> "Phục hồi";
                default -> value;
            };
            case "gender" -> switch (value) {
                case "MALE" -> "Đực";
                case "FEMALE" -> "Cái";
                default -> value;
            };
            case "status" -> switch (value) {
                case "ACTIVE" -> "Hoạt động";
                case "INACTIVE" -> "Không hoạt động";
                case "RETIRED" -> "Nghỉ hưu";
                case "DECEASED" -> "Đã chết";
                case "TRANSFERRED" -> "Đã điều chuyển";
                default -> value;
            };
            default -> value;
        };
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private ParsedFile parseFile(MultipartFile file) {
        String extension = getFileExtension(file.getOriginalFilename());
        return "csv".equalsIgnoreCase(extension) ? parseCsv(file) : parseExcel(file);
    }

    private ParsedFile parseExcel(MultipartFile file) {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getPhysicalNumberOfRows() == 0) {
                throw new BadRequestException("File Excel trống");
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new BadRequestException("File Excel không có dòng header");
            }

            int headerCellCount = Math.max(headerRow.getLastCellNum(), (short) 0);
            List<String> headers = new ArrayList<>();
            for (int index = 0; index < headerCellCount; index++) {
                Cell cell = headerRow.getCell(index);
                headers.add(cell == null ? "" : sanitizeHeader(cell.toString()));
            }

            List<RawFileRow> rows = new ArrayList<>();
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) {
                    continue;
                }

                List<Object> cells = new ArrayList<>();
                boolean hasData = false;
                for (int cellIndex = 0; cellIndex < headers.size(); cellIndex++) {
                    Object value = extractCellValue(row.getCell(cellIndex));
                    cells.add(value);
                    if (value != null && !String.valueOf(value).isBlank()) {
                        hasData = true;
                    }
                }
                if (hasData) {
                    rows.add(new RawFileRow(rowIndex + 1, cells));
                }
            }

            return new ParsedFile(headers, rows);
        } catch (IOException ex) {
            throw new BadRequestException("Không thể đọc file Excel: " + ex.getMessage());
        }
    }

    private ParsedFile parseCsv(MultipartFile file) {
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<String[]> records = reader.readAll();
            if (records.isEmpty()) {
                throw new BadRequestException("File CSV trống");
            }

            List<String> headers = Arrays.stream(records.get(0))
                    .map(this::sanitizeHeader)
                    .toList();

            List<RawFileRow> rows = new ArrayList<>();
            for (int index = 1; index < records.size(); index++) {
                String[] record = records.get(index);
                List<Object> cells = new ArrayList<>();
                boolean hasData = false;
                for (int columnIndex = 0; columnIndex < headers.size(); columnIndex++) {
                    String value = columnIndex < record.length ? sanitizeText(record[columnIndex]) : null;
                    cells.add(value);
                    if (value != null) {
                        hasData = true;
                    }
                }
                if (hasData) {
                    rows.add(new RawFileRow(index + 1, cells));
                }
            }

            return new ParsedFile(headers, rows);
        } catch (IOException | CsvException ex) {
            throw new BadRequestException("Không thể đọc file CSV: " + ex.getMessage());
        }
    }

    private HeaderResolution resolveHeaders(ImportTemplateDefinition definition, List<String> headers) {
        Map<String, String> normalizedLookup = new LinkedHashMap<>();
        for (ImportFieldDefinition column : definition.columns()) {
            normalizedLookup.put(normalizeHeader(column.name()), column.name());
            String templateHeader = normalizeHeader(templateHeader(column));
            if (templateHeader != null) {
                normalizedLookup.put(templateHeader, column.name());
            }
            for (String alias : column.aliases()) {
                normalizedLookup.put(normalizeHeader(alias), column.name());
            }
        }

        Map<String, Integer> columnIndexes = new LinkedHashMap<>();
        List<ImportRowErrorResponse> errors = new ArrayList<>();

        for (int index = 0; index < headers.size(); index++) {
            String header = headers.get(index);
            String normalized = normalizeHeader(header);
            if (normalized == null) {
                errors.add(rowError(1, "cột_" + (index + 1), "BLANK_HEADER", "Header cột không được để trống"));
                continue;
            }

            String canonicalName = normalizedLookup.get(normalized);
            if (canonicalName == null) {
                errors.add(rowError(1, header, "UNKNOWN_HEADER", "Cột không được hỗ trợ trong mẫu nhập"));
                continue;
            }

            if (columnIndexes.containsKey(canonicalName)) {
                errors.add(rowError(1, canonicalName, "DUPLICATE_HEADER", "Header bị lặp lại"));
                continue;
            }
            columnIndexes.put(canonicalName, index);
        }

        for (ImportFieldDefinition column : definition.columns()) {
            if (column.required() && !columnIndexes.containsKey(column.name())) {
                errors.add(rowError(1, column.name(), "MISSING_HEADER", "Thiếu cột bắt buộc"));
            }
        }

        return new HeaderResolution(columnIndexes, errors, !errors.isEmpty());
    }

    private RowParseResult parseRow(
            ImportTemplateDefinition definition,
            RawFileRow rawRow,
            Map<String, Integer> columnIndexes
    ) {
        Map<String, Object> previewValues = new LinkedHashMap<>();
        Map<String, Object> typedValues = new LinkedHashMap<>();
        List<ImportRowErrorResponse> errors = new ArrayList<>();

        for (ImportFieldDefinition column : definition.columns()) {
            Integer columnIndex = columnIndexes.get(column.name());
            if (columnIndex == null) {
                previewValues.put(column.name(), null);
                typedValues.put(column.name(), null);
                continue;
            }

            Object rawValue = columnIndex < rawRow.cells().size() ? rawRow.cells().get(columnIndex) : null;
            Object parsedValue = parseValue(column, rawValue, rawRow.rowNumber(), errors);
            previewValues.put(column.name(), parsedValue);
            typedValues.put(column.name(), parsedValue);
        }

        return new RowParseResult(previewValues, typedValues, errors);
    }

    private Object parseValue(
            ImportFieldDefinition column,
            Object rawValue,
            int rowNumber,
            List<ImportRowErrorResponse> errors
    ) {
        Object normalizedValue = normalizeRawValue(rawValue);
        if (normalizedValue == null) {
            return null;
        }

        try {
            return switch (column.dataType()) {
                case STRING -> String.valueOf(normalizedValue);
                case INTEGER -> parseInteger(normalizedValue);
                case DECIMAL -> parseDecimal(normalizedValue);
                case BOOLEAN -> parseBoolean(normalizedValue);
                case DATE -> parseDate(normalizedValue);
                case ENUM -> parseEnumValue(column.name(), column.allowedValues(), normalizedValue);
            };
        } catch (IllegalArgumentException ex) {
            errors.add(rowError(rowNumber, column.name(), "INVALID_VALUE", ex.getMessage()));
            return normalizedValue;
        }
    }

    private Object normalizeRawValue(Object rawValue) {
        if (rawValue == null) {
            return null;
        }
        if (rawValue instanceof String value) {
            return sanitizeText(value);
        }
        return rawValue;
    }

    private Integer parseInteger(Object value) {
        BigDecimal decimal = value instanceof BigDecimal current ? current : parseDecimal(value);
        try {
            return decimal.intValueExact();
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Giá trị phải là số nguyên");
        }
    }

    private BigDecimal parseDecimal(Object value) {
        try {
            if (value instanceof BigDecimal decimal) {
                return decimal.stripTrailingZeros();
            }
            if (value instanceof Number number) {
                return BigDecimal.valueOf(number.doubleValue()).stripTrailingZeros();
            }
            return new BigDecimal(String.valueOf(value).trim()).stripTrailingZeros();
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Giá trị phải là số hợp lệ");
        }
    }

    private Boolean parseBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }

        String normalized = String.valueOf(value).trim().toLowerCase(Locale.ROOT);
        if (Set.of("true", "có", "co", "yes", "1").contains(normalized)) {
            return true;
        }
        if (Set.of("false", "không", "khong", "no", "0").contains(normalized)) {
            return false;
        }
        throw new IllegalArgumentException("Giá trị kiểu Có/Không chỉ chấp nhận Có, Không, true hoặc false");
    }

    private LocalDate parseDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toLocalDate();
        }
        try {
            return LocalDate.parse(String.valueOf(value).trim());
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Ngày phải theo định dạng yyyy-MM-dd");
        }
    }

    private String parseEnumValue(String columnName, List<String> allowedValues, Object value) {
        String normalized = String.valueOf(value).trim();
        for (String allowedValue : allowedValues) {
            if (allowedValue.equalsIgnoreCase(normalized)
                    || localizedTemplateValue(columnName, allowedValue).equalsIgnoreCase(normalized)) {
                return allowedValue;
            }
        }
        List<String> acceptedValues = allowedValues.stream()
                .map(allowedValue -> localizedTemplateValue(columnName, allowedValue))
                .toList();
        throw new IllegalArgumentException("Giá trị không hợp lệ. Chấp nhận: " + String.join(", ", acceptedValues));
    }

    private Object extractCellValue(Cell cell) {
        if (cell == null) {
            return null;
        }

        CellType cellType = cell.getCellType() == CellType.FORMULA
                ? cell.getCachedFormulaResultType()
                : cell.getCellType();

        return switch (cellType) {
            case STRING -> sanitizeText(cell.getStringCellValue());
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate()
                    : BigDecimal.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> cell.getBooleanCellValue();
            case BLANK -> null;
            default -> sanitizeText(cell.toString());
        };
    }

    private String sanitizeHeader(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\uFEFF", "").trim();
    }

    private String sanitizeText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.replace("\uFEFF", "").trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeHeader(String value) {
        String sanitized = sanitizeText(value);
        return sanitized == null ? null : sanitized.toLowerCase(Locale.ROOT);
    }

    private String getFileExtension(String filename) {
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private ImportRowErrorResponse rowError(int rowNumber, String column, String code, String message) {
        return ImportRowErrorResponse.builder()
                .rowNumber(rowNumber)
                .column(column)
                .code(code)
                .message(message)
                .build();
    }

    private List<String> flattenErrors(List<ImportRowErrorResponse> rowErrors) {
        return rowErrors.stream()
                .map(error -> {
                    String prefix = error.getRowNumber() == null ? "Lỗi" : "Dòng " + error.getRowNumber();
                    if (error.getColumn() != null && !error.getColumn().isBlank()) {
                        return prefix + " [" + error.getColumn() + "]: " + error.getMessage();
                    }
                    return prefix + ": " + error.getMessage();
                })
                .toList();
    }

    private record ParsedFile(List<String> headers, List<RawFileRow> rows) {
    }

    private record RawFileRow(int rowNumber, List<Object> cells) {
    }

    private record HeaderResolution(
            Map<String, Integer> columnIndexes,
            List<ImportRowErrorResponse> errors,
            boolean blocking
    ) {
    }

    private record RowParseResult(
            Map<String, Object> previewValues,
            Map<String, Object> typedValues,
            List<ImportRowErrorResponse> errors
    ) {
    }
}
