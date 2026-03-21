package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.entity.Disease;
import vn.edu.fpt.doghandbook.backend.entity.DogBreed;
import vn.edu.fpt.doghandbook.backend.entity.DogProfile;
import vn.edu.fpt.doghandbook.backend.entity.Medication;
import vn.edu.fpt.doghandbook.backend.entity.NutritionStandard;
import vn.edu.fpt.doghandbook.backend.entity.OperationReport;
import vn.edu.fpt.doghandbook.backend.entity.TrainingExercise;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.ReportType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.DiseaseRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogBreedRepository;
import vn.edu.fpt.doghandbook.backend.repository.DogProfileRepository;
import vn.edu.fpt.doghandbook.backend.repository.MedicationRepository;
import vn.edu.fpt.doghandbook.backend.repository.NutritionStandardRepository;
import vn.edu.fpt.doghandbook.backend.repository.OperationReportRepository;
import vn.edu.fpt.doghandbook.backend.repository.TrainingExerciseRepository;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.DocumentExportService;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DocumentExportServiceImpl implements DocumentExportService {

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter D_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final DogBreedRepository dogBreedRepository;
    private final DiseaseRepository diseaseRepository;
    private final MedicationRepository medicationRepository;
    private final TrainingExerciseRepository trainingExerciseRepository;
    private final NutritionStandardRepository nutritionStandardRepository;
    private final DogProfileRepository dogProfileRepository;
    private final OperationReportRepository operationReportRepository;
    private final UserRepository userRepository;

    // ── Excel Export ──────────────────────────────────────────────────

    @Override
    public ByteArrayInputStream exportExcel(String entityType, String search) {
        String type = normalizeType(entityType);
        String[] columns = getColumns(type);
        List<String[]> rows = getData(type);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet(type);

            // Header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            // Date format style
            CellStyle dateStyle = workbook.createCellStyle();
            CreationHelper helper = workbook.getCreationHelper();
            dateStyle.setDataFormat(helper.createDataFormat().getFormat("dd/MM/yyyy HH:mm"));

            // Header row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data rows
            int rowIdx = 1;
            for (String[] rowData : rows) {
                Row row = sheet.createRow(rowIdx++);
                for (int j = 0; j < rowData.length; j++) {
                    Cell cell = row.createCell(j);
                    cell.setCellValue(rowData[j] != null ? rowData[j] : "");
                }
            }

            // Auto-size columns
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        } catch (Exception e) {
            throw new BadRequestException("Không thể tạo file Excel: " + e.getMessage());
        }
    }

    // ── PDF Export ────────────────────────────────────────────────────

    @Override
    public ByteArrayInputStream exportPdf(String entityType, String search) {
        String type = normalizeType(entityType);
        String[] columns = getColumns(type);
        List<String[]> rows = getData(type);
        String title = getTitle(type);

        String html = buildHtmlTable(title, columns, rows);
        return htmlToPdf(html);
    }

    private ByteArrayInputStream htmlToPdf(String htmlContent) {
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(htmlContent, null);

            // Load font from classpath
            try (InputStream fontStream = new ClassPathResource("fonts/NotoSans-Regular.ttf").getInputStream()) {
                byte[] fontBytes = fontStream.readAllBytes();
                builder.useFont(() -> new ByteArrayInputStream(fontBytes), "Noto Sans");
            }

            builder.toStream(os);
            builder.run();
            return new ByteArrayInputStream(os.toByteArray());
        } catch (Exception e) {
            throw new BadRequestException("Không thể tạo file PDF: " + e.getMessage());
        }
    }

    private String buildHtmlTable(String title, String[] columns, List<String[]> rows) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><head>");
        html.append("<style>");
        html.append("body { font-family: 'Noto Sans', sans-serif; font-size: 11px; margin: 20px; }");
        html.append("h1 { text-align: center; color: #2c3e50; font-size: 18px; }");
        html.append(".meta { text-align: center; color: #666; font-size: 10px; margin-bottom: 15px; }");
        html.append("table { width: 100%; border-collapse: collapse; margin-top: 10px; }");
        html.append("th { background-color: #3498db; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }");
        html.append("td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 10px; word-wrap: break-word; }");
        html.append("tr:nth-child(even) { background-color: #f2f2f2; }");
        html.append(".footer { text-align: center; margin-top: 20px; font-size: 9px; color: #999; }");
        html.append("</style></head><body>");
        html.append("<h1>").append(escapeHtml(title)).append("</h1>");
        html.append("<div class='meta'>Ngày xuất: ")
                .append(LocalDateTime.now().format(DT_FMT))
                .append(" | Tổng: ").append(rows.size()).append(" bản ghi</div>");
        html.append("<table><thead><tr>");
        for (String col : columns) {
            html.append("<th>").append(escapeHtml(col)).append("</th>");
        }
        html.append("</tr></thead><tbody>");
        for (String[] row : rows) {
            html.append("<tr>");
            for (String cell : row) {
                String val = cell != null ? cell : "";
                // Truncate long content in PDF
                if (val.length() > 200) {
                    val = val.substring(0, 200) + "...";
                }
                html.append("<td>").append(escapeHtml(val)).append("</td>");
            }
            html.append("</tr>");
        }
        html.append("</tbody></table>");
        html.append("<div class='footer'>Dog Handbook System — Hệ thống sổ tay chó nghiệp vụ</div>");
        html.append("</body></html>");
        return html.toString();
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace("\"", "&quot;");
    }

    // ── Data Fetching ────────────────────────────────────────────────

    private String normalizeType(String entityType) {
        if (entityType == null || entityType.isBlank()) {
            throw new BadRequestException("entityType không được để trống");
        }
        String type = entityType.trim().toUpperCase();
        if (!List.of("BREED", "DISEASE", "MEDICATION", "EXERCISE", "NUTRITION",
                "DOG_PROFILE", "OPERATION_REPORT").contains(type)) {
            throw new BadRequestException("entityType không hỗ trợ export: " + entityType);
        }
        return type;
    }

    private String[] getColumns(String type) {
        return switch (type) {
            case "BREED" -> new String[]{
                    "ID", "Tên giống", "Xuất xứ", "Phân loại kích thước",
                    "Mức huấn luyện", "Mô tả", "Trạng thái", "Ngày tạo"};
            case "DISEASE" -> new String[]{
                    "ID", "Tên bệnh", "Mức độ nghiêm trọng", "Mô tả",
                    "Hướng dẫn điều trị", "Biện pháp phòng ngừa", "Lây nhiễm",
                    "Trạng thái", "Ngày tạo"};
            case "MEDICATION" -> new String[]{
                    "ID", "Tên thuốc", "Hướng dẫn liều lượng", "Phương pháp dùng",
                    "Tác dụng phụ", "Chống chỉ định", "Trạng thái", "Ngày tạo"};
            case "EXERCISE" -> new String[]{
                    "ID", "Tên bài tập", "Mức độ khó", "Thời lượng (phút)",
                    "Hướng dẫn", "Lưu ý an toàn", "Trạng thái", "Ngày tạo"};
            case "NUTRITION" -> new String[]{
                    "ID", "Mã khẩu phần", "Tên khẩu phần", "Mức hoạt động",
                    "Mô tả", "Ghi chú đặc biệt", "Trạng thái", "Ngày tạo"};
            case "DOG_PROFILE" -> new String[]{
                    "ID", "Mã chó", "Tên chó", "Giống", "Ngày sinh", "Giới tính",
                    "Cân nặng (kg)", "Chiều cao (cm)", "Màu lông", "Microchip ID",
                    "Trạng thái", "Đã triệt sản", "Ngày phân công"};
            case "OPERATION_REPORT" -> new String[]{
                    "ID", "Huấn luyện viên", "Tên chó", "Mã chó", "Loại báo cáo",
                    "Tiêu đề", "Ngày báo cáo", "Nội dung"};
            default -> throw new BadRequestException("entityType không hỗ trợ: " + type);
        };
    }

    private String getTitle(String type) {
        return switch (type) {
            case "BREED" -> "Danh sách Giống chó";
            case "DISEASE" -> "Danh sách Bệnh";
            case "MEDICATION" -> "Danh sách Thuốc";
            case "EXERCISE" -> "Danh sách Bài tập huấn luyện";
            case "NUTRITION" -> "Danh sách Tiêu chuẩn dinh dưỡng";
            case "DOG_PROFILE" -> "Danh sách Hồ sơ chó";
            case "OPERATION_REPORT" -> "Danh sách Báo cáo hoạt động";
            default -> "Xuất dữ liệu";
        };
    }

    @SuppressWarnings("unchecked")
    private List<String[]> getData(String type) {
        return switch (type) {
            case "BREED" -> getBreedData();
            case "DISEASE" -> getDiseaseData();
            case "MEDICATION" -> getMedicationData();
            case "EXERCISE" -> getExerciseData();
            case "NUTRITION" -> getNutritionData();
            case "DOG_PROFILE" -> getDogProfileData();
            case "OPERATION_REPORT" -> getOperationReportData();
            default -> List.of();
        };
    }

    private List<String[]> getBreedData() {
        List<DogBreed> entities = dogBreedRepository
                .findByIsDeletedFalse(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (DogBreed e : entities) {
            rows.add(new String[]{
                    str(e.getBreedId()),
                    e.getBreedName(),
                    e.getOrigin(),
                    enumStr(e.getSizeClassification()),
                    enumStr(e.getTrainabilityLevel()),
                    e.getDescription(),
                    enumStr(e.getStatus()),
                    fmtDt(e.getCreatedAt())
            });
        }
        return rows;
    }

    private List<String[]> getDiseaseData() {
        // Disease entity uses @SQLRestriction("is_deleted = 0"), so findAll already filters
        List<Disease> entities = diseaseRepository
                .findAll(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (Disease e : entities) {
            rows.add(new String[]{
                    str(e.getDiseaseId()),
                    e.getDiseaseName(),
                    enumStr(e.getSeverityLevel()),
                    e.getDescription(),
                    e.getTreatmentGuidelines(),
                    e.getPreventionMeasures(),
                    e.getIsContagious() != null && e.getIsContagious() ? "Có" : "Không",
                    enumStr(e.getStatus()),
                    fmtDt(e.getCreatedAt())
            });
        }
        return rows;
    }

    private List<String[]> getMedicationData() {
        List<Medication> entities = medicationRepository
                .findByIsDeletedFalse(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (Medication e : entities) {
            rows.add(new String[]{
                    str(e.getMedicationId()),
                    e.getMedicationName(),
                    e.getDosageInstructions(),
                    e.getAdministrationMethod(),
                    e.getSideEffects(),
                    e.getContraindications(),
                    enumStr(e.getStatus()),
                    fmtDt(e.getCreatedAt())
            });
        }
        return rows;
    }

    private List<String[]> getExerciseData() {
        List<TrainingExercise> entities = trainingExerciseRepository
                .findByIsDeletedFalse(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (TrainingExercise e : entities) {
            rows.add(new String[]{
                    str(e.getExerciseId()),
                    e.getExerciseName(),
                    enumStr(e.getDifficultyLevel()),
                    str(e.getDurationMinutes()),
                    e.getInstructions(),
                    e.getSafetyPrecautions(),
                    enumStr(e.getStatus()),
                    fmtDt(e.getCreatedAt())
            });
        }
        return rows;
    }

    private List<String[]> getNutritionData() {
        List<NutritionStandard> entities = nutritionStandardRepository
                .findByIsDeletedFalse(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (NutritionStandard e : entities) {
            rows.add(new String[]{
                    str(e.getStandardId()),
                    e.getRationCode(),
                    e.getRationName(),
                    e.getActivityLevel(),
                    e.getDescription(),
                    e.getSpecialNotes(),
                    e.getStatus(),
                    fmtDt(e.getCreatedAt())
            });
        }
        return rows;
    }

    private List<String[]> getDogProfileData() {
        List<DogProfile> entities = dogProfileRepository
                .findByIsDeletedFalse(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (DogProfile e : entities) {
            rows.add(new String[]{
                    str(e.getDogId()),
                    e.getDogCode(),
                    e.getDogName(),
                    e.getDogBreed() != null ? e.getDogBreed().getBreedName() : "",
                    fmtD(e.getBirthDate()),
                    enumStr(e.getGender()),
                    str(e.getCurrentWeightKg()),
                    str(e.getHeightCm()),
                    e.getColor(),
                    e.getMicrochipId(),
                    enumStr(e.getStatus()),
                    e.getIsSterilized() != null && e.getIsSterilized() ? "Có" : "Không",
                    fmtD(e.getAssignmentDate())
            });
        }
        return rows;
    }

    private List<String[]> getOperationReportData() {
        List<OperationReport> entities = operationReportRepository
                .findByIsDeletedFalseOrderByReportDateDesc(Pageable.unpaged()).getContent();
        List<String[]> rows = new ArrayList<>();
        for (OperationReport e : entities) {
            rows.add(new String[]{
                    str(e.getReportId()),
                    e.getTrainer() != null ? e.getTrainer().getFullName() : "",
                    e.getDogProfile() != null ? e.getDogProfile().getDogName() : "",
                    e.getDogProfile() != null ? e.getDogProfile().getDogCode() : "",
                    enumStr(e.getReportType()),
                    e.getReportTitle(),
                    fmtD(e.getReportDate()),
                    e.getReportContent()
            });
        }
        return rows;
    }

    // ══════════════════════════════════════════════════════════════════
    // ══  BÁO CÁO TỔNG HỢP — TRAINER + UNIT  ═════════════════════════
    // ══════════════════════════════════════════════════════════════════

    @Override
    public ByteArrayInputStream exportTrainerReport(Integer trainerId, LocalDate from, LocalDate to, String reportType) {
        User trainer = userRepository.findById(trainerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy trainer với ID: " + trainerId));

        LocalDate fromDate = (from != null) ? from : LocalDate.of(2000, 1, 1);
        LocalDate toDate = (to != null) ? to : LocalDate.now();

        List<OperationReport> reports = queryReports(trainerId, fromDate, toDate, reportType);

        String html = buildTrainerReportHtml(trainer, reports, fromDate, toDate);
        return htmlToPdf(html);
    }

    @Override
    public ByteArrayInputStream exportUnitReport(LocalDate from, LocalDate to, String reportType) {
        LocalDate fromDate = (from != null) ? from : LocalDate.of(2000, 1, 1);
        LocalDate toDate = (to != null) ? to : LocalDate.now();

        List<OperationReport> allReports = queryAllReports(fromDate, toDate, reportType);

        // Group by trainer
        Map<User, List<OperationReport>> grouped = new LinkedHashMap<>();
        for (OperationReport r : allReports) {
            grouped.computeIfAbsent(r.getTrainer(), k -> new ArrayList<>()).add(r);
        }

        String html = buildUnitReportHtml(grouped, fromDate, toDate);
        return htmlToPdf(html);
    }

    // ── Query helpers ────────────────────────────────────────────────

    private List<OperationReport> queryReports(Integer trainerId, LocalDate from, LocalDate to, String reportType) {
        if (reportType != null && !reportType.isBlank()) {
            ReportType type = ReportType.valueOf(reportType.trim().toUpperCase());
            return operationReportRepository
                    .findByTrainerUserIdAndReportDateBetweenAndReportTypeAndIsDeletedFalseOrderByReportDateDesc(
                            trainerId, from, to, type);
        }
        return operationReportRepository
                .findByTrainerUserIdAndReportDateBetweenAndIsDeletedFalseOrderByReportDateDesc(
                        trainerId, from, to);
    }

    private List<OperationReport> queryAllReports(LocalDate from, LocalDate to, String reportType) {
        if (reportType != null && !reportType.isBlank()) {
            ReportType type = ReportType.valueOf(reportType.trim().toUpperCase());
            return operationReportRepository
                    .findByReportDateBetweenAndReportTypeAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(
                            from, to, type);
        }
        return operationReportRepository
                .findByReportDateBetweenAndIsDeletedFalseOrderByTrainerUserIdAscReportDateDesc(from, to);
    }

    // ── HTML Builder: Trainer Report ─────────────────────────────────

    private String buildTrainerReportHtml(User trainer, List<OperationReport> reports,
                                          LocalDate from, LocalDate to) {
        long trainingCount = reports.stream().filter(r -> r.getReportType() == ReportType.TRAINING).count();
        long healthCount = reports.stream().filter(r -> r.getReportType() == ReportType.HEALTH).count();

        StringBuilder html = new StringBuilder();
        html.append(reportHtmlHead());
        html.append("<body>");

        // Header
        html.append("<div class='header'>");
        html.append("<h1>BÁO CÁO TỔNG HỢP HOẠT ĐỘNG</h1>");
        html.append("<div class='info'>");
        html.append("<p><strong>Huấn luyện viên:</strong> ").append(esc(trainer.getFullName()));
        if (trainer.getMilitaryRank() != null) {
            html.append(" | <strong>Cấp bậc:</strong> ").append(esc(trainer.getMilitaryRank()));
        }
        html.append("</p>");
        if (trainer.getUnit() != null) {
            html.append("<p><strong>Đơn vị:</strong> ").append(esc(trainer.getUnit())).append("</p>");
        }
        html.append("<p><strong>Thời gian:</strong> ").append(fmtD(from))
                .append(" — ").append(fmtD(to)).append("</p>");
        html.append("<p><strong>Tổng báo cáo:</strong> ").append(reports.size())
                .append(" (Huấn luyện: ").append(trainingCount)
                .append(" | Sức khỏe: ").append(healthCount).append(")</p>");
        html.append("</div></div>");

        // Reports
        if (reports.isEmpty()) {
            html.append("<div class='empty'>Không có báo cáo nào trong khoảng thời gian này.</div>");
        } else {
            int idx = 1;
            for (OperationReport r : reports) {
                html.append(buildReportCard(r, idx++));
            }
        }

        html.append(reportHtmlFooter());
        html.append("</body></html>");
        return html.toString();
    }

    // ── HTML Builder: Unit Report ────────────────────────────────────

    private String buildUnitReportHtml(Map<User, List<OperationReport>> grouped,
                                       LocalDate from, LocalDate to) {
        int totalReports = grouped.values().stream().mapToInt(List::size).sum();

        StringBuilder html = new StringBuilder();
        html.append(reportHtmlHead());
        html.append("<body>");

        // Header
        html.append("<div class='header'>");
        html.append("<h1>BÁO CÁO TỔNG HỢP TOÀN ĐƠN VỊ</h1>");
        html.append("<div class='info'>");
        html.append("<p><strong>Thời gian:</strong> ").append(fmtD(from))
                .append(" — ").append(fmtD(to)).append("</p>");
        html.append("<p><strong>Tổng huấn luyện viên:</strong> ").append(grouped.size())
                .append(" | <strong>Tổng báo cáo:</strong> ").append(totalReports).append("</p>");
        html.append("</div></div>");

        // Summary table
        if (!grouped.isEmpty()) {
            html.append("<h2 class='section-title'>BẢNG THỐNG KÊ</h2>");
            html.append("<table class='summary'><thead><tr>");
            html.append("<th>STT</th><th>Huấn luyện viên</th><th>Cấp bậc</th>");
            html.append("<th>Đơn vị</th><th>Huấn luyện</th><th>Sức khỏe</th><th>Tổng</th>");
            html.append("</tr></thead><tbody>");

            int stt = 1;
            for (Map.Entry<User, List<OperationReport>> entry : grouped.entrySet()) {
                User t = entry.getKey();
                List<OperationReport> reps = entry.getValue();
                long training = reps.stream().filter(r -> r.getReportType() == ReportType.TRAINING).count();
                long health = reps.stream().filter(r -> r.getReportType() == ReportType.HEALTH).count();

                html.append("<tr>");
                html.append("<td>").append(stt++).append("</td>");
                html.append("<td>").append(esc(t.getFullName())).append("</td>");
                html.append("<td>").append(esc(t.getMilitaryRank())).append("</td>");
                html.append("<td>").append(esc(t.getUnit())).append("</td>");
                html.append("<td style='text-align:center'>").append(training).append("</td>");
                html.append("<td style='text-align:center'>").append(health).append("</td>");
                html.append("<td style='text-align:center'><strong>").append(reps.size()).append("</strong></td>");
                html.append("</tr>");
            }
            html.append("</tbody></table>");
        }

        // Detail by trainer
        for (Map.Entry<User, List<OperationReport>> entry : grouped.entrySet()) {
            User t = entry.getKey();
            List<OperationReport> reps = entry.getValue();

            html.append("<div class='trainer-section'>");
            html.append("<h2 class='trainer-name'>").append(esc(t.getFullName()));
            if (t.getMilitaryRank() != null) {
                html.append(" — ").append(esc(t.getMilitaryRank()));
            }
            html.append(" (").append(reps.size()).append(" báo cáo)</h2>");

            int idx = 1;
            for (OperationReport r : reps) {
                html.append(buildReportCard(r, idx++));
            }
            html.append("</div>");
        }

        html.append(reportHtmlFooter());
        html.append("</body></html>");
        return html.toString();
    }

    // ── Shared HTML components ───────────────────────────────────────

    private String buildReportCard(OperationReport r, int index) {
        StringBuilder card = new StringBuilder();
        String typeLabel = r.getReportType() == ReportType.TRAINING ? "Huấn luyện" : "Sức khỏe";
        String typeClass = r.getReportType() == ReportType.TRAINING ? "type-training" : "type-health";

        card.append("<div class='report-card'>");
        card.append("<div class='report-header'>");
        card.append("<span class='report-index'>#").append(index).append("</span>");
        card.append("<span class='report-date'>").append(fmtD(r.getReportDate())).append("</span>");
        card.append("<span class='").append(typeClass).append("'>").append(typeLabel).append("</span>");
        if (r.getDogProfile() != null) {
            card.append("<span class='report-dog'>Chó: ").append(esc(r.getDogProfile().getDogName()));
            if (r.getDogProfile().getDogCode() != null) {
                card.append(" (").append(esc(r.getDogProfile().getDogCode())).append(")");
            }
            card.append("</span>");
        }
        card.append("</div>");
        card.append("<div class='report-title'>").append(esc(r.getReportTitle())).append("</div>");
        if (r.getReportContent() != null && !r.getReportContent().isBlank()) {
            String content = r.getReportContent();
            if (content.length() > 500) {
                content = content.substring(0, 500) + "...";
            }
            card.append("<div class='report-content'>").append(esc(content)).append("</div>");
        }
        card.append("</div>");
        return card.toString();
    }

    private String reportHtmlHead() {
        return "<!DOCTYPE html><html><head><style>"
                + "body { font-family: 'Noto Sans', sans-serif; font-size: 11px; margin: 0; padding: 20px; color: #333; }"
                + "h1 { text-align: center; color: #1a3c5e; font-size: 20px; margin-bottom: 5px; }"
                + "h2 { color: #2c5282; font-size: 14px; }"
                + ".header { background: #f0f4f8; border-bottom: 3px solid #2c5282; padding: 15px 20px; margin: -20px -20px 20px -20px; }"
                + ".info { text-align: center; font-size: 11px; color: #555; }"
                + ".info p { margin: 3px 0; }"
                + ".section-title { background: #edf2f7; padding: 6px 12px; border-left: 4px solid #2c5282; margin-top: 20px; }"
                + ".summary { width: 100%; border-collapse: collapse; margin: 10px 0 25px 0; font-size: 10px; }"
                + ".summary th { background: #2c5282; color: white; padding: 6px 10px; text-align: left; }"
                + ".summary td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; }"
                + ".summary tr:nth-child(even) { background: #f7fafc; }"
                + ".trainer-section { margin-top: 25px; page-break-inside: avoid; }"
                + ".trainer-name { background: #ebf4ff; padding: 8px 12px; border-left: 4px solid #3182ce; margin-bottom: 10px; }"
                + ".report-card { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 12px; margin-bottom: 8px; page-break-inside: avoid; }"
                + ".report-header { display: flex; gap: 10px; align-items: center; margin-bottom: 5px; font-size: 10px; }"
                + ".report-index { font-weight: bold; color: #2c5282; }"
                + ".report-date { color: #718096; }"
                + ".type-training { background: #ebf8ff; color: #2b6cb0; padding: 2px 8px; border-radius: 10px; font-size: 9px; }"
                + ".type-health { background: #fff5f5; color: #c53030; padding: 2px 8px; border-radius: 10px; font-size: 9px; }"
                + ".report-dog { color: #4a5568; font-style: italic; }"
                + ".report-title { font-weight: bold; font-size: 11px; margin-bottom: 4px; }"
                + ".report-content { color: #4a5568; font-size: 10px; line-height: 1.5; white-space: pre-wrap; }"
                + ".empty { text-align: center; color: #a0aec0; padding: 40px; font-size: 13px; }"
                + ".footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #a0aec0; }"
                + "</style></head>";
    }

    private String reportHtmlFooter() {
        return "<div class='footer'>Dog Handbook System — Hệ thống sổ tay chó nghiệp vụ | Xuất ngày: "
                + LocalDateTime.now().format(DT_FMT) + "</div>";
    }

    private String esc(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private String str(Object value) {
        return value == null ? "" : value.toString();
    }

    private String enumStr(Enum<?> value) {
        return value == null ? "" : value.name();
    }

    private String fmtDt(LocalDateTime dt) {
        return dt == null ? "" : dt.format(DT_FMT);
    }

    private String fmtD(LocalDate d) {
        return d == null ? "" : d.format(D_FMT);
    }
}
