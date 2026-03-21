package vn.edu.fpt.doghandbook.backend.service.impl;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.doghandbook.backend.dto.response.SystemSettingResponse;
import vn.edu.fpt.doghandbook.backend.entity.SystemSetting;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.SystemSettingRepository;
import vn.edu.fpt.doghandbook.backend.service.AuditLogService;
import vn.edu.fpt.doghandbook.backend.service.SystemSettingService;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemSettingServiceImpl implements SystemSettingService {

    private static final Logger log = LoggerFactory.getLogger(SystemSettingServiceImpl.class);

    private final SystemSettingRepository settingRepository;
    private final AuditLogService auditLogService;

    // ==================== Default settings definition ====================

    private static final List<SettingDef> DEFAULT_SETTINGS = List.of(
            // Security
            new SettingDef("security.max_login_attempts", "5", "SECURITY", "INTEGER",
                    "Số lần đăng nhập sai tối đa trước khi khóa tài khoản"),
            new SettingDef("security.session_timeout_minutes", "30", "SECURITY", "INTEGER",
                    "Thời gian timeout session (phút)"),
            new SettingDef("security.password_min_length", "8", "SECURITY", "INTEGER",
                    "Độ dài tối thiểu mật khẩu"),

            // Sync
            new SettingDef("sync.auto_interval_minutes", "30", "SYNC", "INTEGER",
                    "Khoảng cách sync tự động (phút)"),
            new SettingDef("sync.max_retry_count", "3", "SYNC", "INTEGER",
                    "Số lần retry khi sync thất bại"),

            // Upload
            new SettingDef("upload.max_image_size_mb", "10", "UPLOAD", "INTEGER",
                    "Dung lượng tối đa ảnh (MB)"),
            new SettingDef("upload.max_video_size_mb", "100", "UPLOAD", "INTEGER",
                    "Dung lượng tối đa video (MB)"),
            new SettingDef("upload.allowed_image_types", "jpg,png,webp", "UPLOAD", "STRING",
                    "Định dạng ảnh cho phép (phân cách bởi dấu phẩy)"),

            // Content
            new SettingDef("content.require_approval", "true", "CONTENT", "BOOLEAN",
                    "Bắt buộc duyệt nội dung trước khi publish"),
            new SettingDef("content.auto_publish_on_approve", "false", "CONTENT", "BOOLEAN",
                    "Tự động publish khi nội dung được approve"),

            // System
            new SettingDef("system.app_name", "24BP Dog Handbook", "SYSTEM", "STRING",
                    "Tên ứng dụng hiển thị"),
            new SettingDef("system.maintenance_mode", "false", "SYSTEM", "BOOLEAN",
                    "Bật chế độ bảo trì hệ thống")
    );

    private record SettingDef(String key, String defaultValue, String group, String dataType, String description) {}

    // ==================== Init default settings on startup ====================

    @PostConstruct
    @Transactional
    public void initDefaultSettings() {
        int created = 0;
        for (SettingDef def : DEFAULT_SETTINGS) {
            if (!settingRepository.existsBySettingKey(def.key())) {
                SystemSetting setting = SystemSetting.builder()
                        .settingKey(def.key())
                        .settingValue(def.defaultValue())
                        .defaultValue(def.defaultValue())
                        .settingGroup(def.group())
                        .dataType(def.dataType())
                        .description(def.description())
                        .build();
                settingRepository.save(setting);
                created++;
            }
        }
        if (created > 0) {
            log.info("Initialized {} default system settings", created);
        }
    }

    // ==================== Read operations ====================

    @Override
    @Transactional(readOnly = true)
    public List<SystemSettingResponse> getAll() {
        return settingRepository.findAllByOrderBySettingGroupAscSettingKeyAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, List<SystemSettingResponse>> getAllGrouped() {
        List<SystemSetting> all = settingRepository.findAllByOrderBySettingGroupAscSettingKeyAsc();
        Map<String, List<SystemSettingResponse>> grouped = new LinkedHashMap<>();
        for (SystemSetting s : all) {
            grouped.computeIfAbsent(s.getSettingGroup(), k -> new ArrayList<>())
                    .add(toResponse(s));
        }
        return grouped;
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSettingResponse getByKey(String key) {
        SystemSetting setting = settingRepository.findBySettingKey(key)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy cài đặt: " + key));
        return toResponse(setting);
    }

    // ==================== Write operations ====================

    @Override
    @Transactional
    public SystemSettingResponse update(String key, String value) {
        SystemSetting setting = settingRepository.findBySettingKey(key)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy cài đặt: " + key));

        validateValue(setting, value);

        String oldValue = setting.getSettingValue();
        setting.setSettingValue(value);
        settingRepository.save(setting);

        auditLogService.log(AuditActionType.UPDATE, "SYSTEM_SETTING", setting.getSettingId(),
                "Setting '" + key + "' changed from '" + oldValue + "' to '" + value + "'");

        return toResponse(setting);
    }

    @Override
    @Transactional
    public List<SystemSettingResponse> updateBatch(Map<String, String> settings) {
        List<SystemSettingResponse> results = new ArrayList<>();
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            results.add(update(entry.getKey(), entry.getValue()));
        }
        return results;
    }

    @Override
    @Transactional
    public List<SystemSettingResponse> resetDefaults() {
        List<SystemSetting> all = settingRepository.findAll();
        for (SystemSetting setting : all) {
            setting.setSettingValue(setting.getDefaultValue());
        }
        settingRepository.saveAll(all);

        auditLogService.log(AuditActionType.UPDATE, "SYSTEM_SETTING", null,
                "All settings reset to default values");

        return all.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ==================== Typed getters for other services ====================

    @Override
    @Transactional(readOnly = true)
    public String getString(String key) {
        return settingRepository.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .orElseGet(() -> getDefaultFromDefinition(key));
    }

    @Override
    @Transactional(readOnly = true)
    public int getInt(String key) {
        String value = getString(key);
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            log.warn("Setting '{}' value '{}' is not a valid integer, returning 0", key, value);
            return 0;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean getBoolean(String key) {
        return Boolean.parseBoolean(getString(key));
    }

    // ==================== Private helpers ====================

    private void validateValue(SystemSetting setting, String value) {
        switch (setting.getDataType()) {
            case "INTEGER" -> {
                try {
                    int intVal = Integer.parseInt(value);
                    if (intVal < 0) {
                        throw new BadRequestException("Giá trị của '" + setting.getSettingKey()
                                + "' phải là số nguyên không âm");
                    }
                } catch (NumberFormatException e) {
                    throw new BadRequestException("Giá trị của '" + setting.getSettingKey()
                            + "' phải là số nguyên hợp lệ");
                }
            }
            case "BOOLEAN" -> {
                if (!"true".equalsIgnoreCase(value) && !"false".equalsIgnoreCase(value)) {
                    throw new BadRequestException("Giá trị của '" + setting.getSettingKey()
                            + "' phải là 'true' hoặc 'false'");
                }
            }
            // STRING -> no special validation
        }
    }

    private String getDefaultFromDefinition(String key) {
        return DEFAULT_SETTINGS.stream()
                .filter(d -> d.key().equals(key))
                .map(SettingDef::defaultValue)
                .findFirst()
                .orElse(null);
    }

    private SystemSettingResponse toResponse(SystemSetting setting) {
        return SystemSettingResponse.builder()
                .settingId(setting.getSettingId())
                .settingKey(setting.getSettingKey())
                .settingValue(setting.getSettingValue())
                .defaultValue(setting.getDefaultValue())
                .settingGroup(setting.getSettingGroup())
                .dataType(setting.getDataType())
                .description(setting.getDescription())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }
}
