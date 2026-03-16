package vn.edu.fpt.doghandbook.backend.service.impl;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportPreviewResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.ImportTemplateResponse;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.DocumentImportService;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DocumentImportServiceImpl implements DocumentImportService {

    private static final List<String> SUPPORTED_FILE_TYPES = List.of("XLSX", "XLS", "CSV");

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  // xlsx
            "application/vnd.ms-excel",                                            // xls
            "text/csv",                                                            // csv
            "application/csv",
            "application/octet-stream"
    );

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("xlsx", "xls", "csv");

    private static final int MAX_PREVIEW_ROWS = 10;

    @Override
    public List<ImportTemplateResponse> getTemplates() {
        List<ImportTemplateResponse> templates = new ArrayList<>();

        templates.add(ImportTemplateResponse.builder()
                .templateName("Giống chó")
                .entityType("BREED")
                .description("Import danh sách giống chó")
                .requiredColumns(List.of("breedName", "origin", "sizeClassification"))
                .optionalColumns(List.of("description", "trainabilityLevel"))
                .supportedFileTypes(SUPPORTED_FILE_TYPES)
                .build());

        templates.add(ImportTemplateResponse.builder()
                .templateName("Bệnh")
                .entityType("DISEASE")
                .description("Import danh sách bệnh")
                .requiredColumns(List.of("diseaseName", "severityLevel"))
                .optionalColumns(List.of("description", "treatment"))
                .supportedFileTypes(SUPPORTED_FILE_TYPES)
                .build());

        templates.add(ImportTemplateResponse.builder()
                .templateName("Thuốc")
                .entityType("MEDICATION")
                .description("Import danh sách thuốc")
                .requiredColumns(List.of("medicationName"))
                .optionalColumns(List.of("dosageInstructions", "sideEffects"))
                .supportedFileTypes(SUPPORTED_FILE_TYPES)
                .build());

        templates.add(ImportTemplateResponse.builder()
                .templateName("Bài tập")
                .entityType("EXERCISE")
                .description("Import danh sách bài tập huấn luyện")
                .requiredColumns(List.of("exerciseName", "difficultyLevel"))
                .optionalColumns(List.of("instructions", "durationMinutes"))
                .supportedFileTypes(SUPPORTED_FILE_TYPES)
                .build());

        templates.add(ImportTemplateResponse.builder()
                .templateName("Dinh dưỡng")
                .entityType("NUTRITION")
                .description("Import tiêu chuẩn dinh dưỡng")
                .requiredColumns(List.of("rationCode", "rationName"))
                .optionalColumns(List.of("description", "activityLevel"))
                .supportedFileTypes(SUPPORTED_FILE_TYPES)
                .build());

        return templates;
    }

    @Override
    public ImportPreviewResponse preview(String entityType, MultipartFile file) {
        validateFile(file);
        ImportTemplateResponse template = findTemplate(entityType);
        String fileType = getFileExtension(file.getOriginalFilename()).toUpperCase();

        List<String> columns;
        List<Map<String, Object>> rows;
        if ("CSV".equals(fileType)) {
            var parsed = parseCsv(file);
            columns = parsed.columns;
            rows = parsed.rows;
        } else {
            var parsed = parseExcel(file);
            columns = parsed.columns;
            rows = parsed.rows;
        }

        List<String> errors = validateRows(rows, template);
        int errorRows = (int) errors.stream().map(e -> e.split(":")[0]).distinct().count();
        int validRows = rows.size() - errorRows;

        List<Map<String, Object>> previewData = rows.size() > MAX_PREVIEW_ROWS
                ? rows.subList(0, MAX_PREVIEW_ROWS)
                : rows;

        return ImportPreviewResponse.builder()
                .fileName(file.getOriginalFilename())
                .fileType(fileType)
                .totalRows(rows.size())
                .validRows(validRows)
                .errorRows(errorRows)
                .previewData(previewData)
                .columns(columns)
                .errors(errors)
                .build();
    }

    @Override
    public ImportPreviewResponse confirm(String entityType, MultipartFile file) {
        ImportPreviewResponse previewResult = preview(entityType, file);
        if (previewResult.getErrorRows() > 0) {
            throw new BadRequestException(
                    "File chứa " + previewResult.getErrorRows() + " dòng lỗi. Vui lòng sửa và thử lại.");
        }
        // TODO: Persist entities to database based on entityType
        return previewResult;
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
                    "Định dạng file không được hỗ trợ: ." + extension
                            + ". Chỉ chấp nhận: .xlsx, .xls, .csv");
        }

        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new BadRequestException(
                    "MIME type không được hỗ trợ: " + contentType);
        }
    }

    private ImportTemplateResponse findTemplate(String entityType) {
        return getTemplates().stream()
                .filter(t -> t.getEntityType().equalsIgnoreCase(entityType))
                .findFirst()
                .orElseThrow(() -> new BadRequestException(
                        "Entity type không hợp lệ: " + entityType));
    }

    private List<String> validateRows(List<Map<String, Object>> rows, ImportTemplateResponse template) {
        List<String> errors = new ArrayList<>();
        List<String> required = template.getRequiredColumns();

        for (int i = 0; i < rows.size(); i++) {
            Map<String, Object> row = rows.get(i);
            for (String col : required) {
                Object value = row.get(col);
                if (value == null || value.toString().isBlank()) {
                    errors.add("Dòng " + (i + 1) + ": thiếu giá trị bắt buộc '" + col + "'");
                }
            }
        }
        return errors;
    }

    private ParsedData parseExcel(MultipartFile file) {
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getPhysicalNumberOfRows() == 0) {
                throw new BadRequestException("File Excel trống");
            }

            Row headerRow = sheet.getRow(0);
            List<String> columns = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                columns.add(cell != null ? cell.getStringCellValue().trim() : "column_" + i);
            }

            List<Map<String, Object>> rows = new ArrayList<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, Object> rowData = new LinkedHashMap<>();
                boolean hasData = false;
                for (int j = 0; j < columns.size(); j++) {
                    Cell cell = row.getCell(j);
                    Object value = getCellValue(cell);
                    rowData.put(columns.get(j), value);
                    if (value != null && !value.toString().isBlank()) {
                        hasData = true;
                    }
                }
                if (hasData) {
                    rows.add(rowData);
                }
            }

            return new ParsedData(columns, rows);
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException e) {
            throw new BadRequestException("Không thể đọc file Excel: " + e.getMessage());
        }
    }

    private ParsedData parseCsv(MultipartFile file) {
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            List<String[]> allRows = reader.readAll();
            if (allRows.isEmpty()) {
                throw new BadRequestException("File CSV trống");
            }

            List<String> columns = List.of(allRows.get(0));

            List<Map<String, Object>> rows = new ArrayList<>();
            for (int i = 1; i < allRows.size(); i++) {
                String[] line = allRows.get(i);
                Map<String, Object> rowData = new LinkedHashMap<>();
                boolean hasData = false;
                for (int j = 0; j < columns.size(); j++) {
                    String value = j < line.length ? line[j].trim() : "";
                    rowData.put(columns.get(j), value);
                    if (!value.isBlank()) {
                        hasData = true;
                    }
                }
                if (hasData) {
                    rows.add(rowData);
                }
            }

            return new ParsedData(columns, rows);
        } catch (BadRequestException e) {
            throw e;
        } catch (IOException | CsvException e) {
            throw new BadRequestException("Không thể đọc file CSV: " + e.getMessage());
        }
    }

    private Object getCellValue(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toString()
                    : cell.getNumericCellValue();
            case BOOLEAN -> cell.getBooleanCellValue();
            case FORMULA -> cell.getCellType() == CellType.FORMULA
                    ? cell.getStringCellValue() : null;
            default -> null;
        };
    }

    private String getFileExtension(String filename) {
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private record ParsedData(List<String> columns, List<Map<String, Object>> rows) {}
}
