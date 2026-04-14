package vn.edu.fpt.doghandbook.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.fpt.doghandbook.backend.dto.response.SystemSettingResponse;
import vn.edu.fpt.doghandbook.backend.entity.SystemSetting;
import vn.edu.fpt.doghandbook.backend.entity.enums.AuditActionType;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.repository.SystemSettingRepository;
import vn.edu.fpt.doghandbook.backend.service.impl.SystemSettingServiceImpl;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemSettingServiceImplTest {

    @Mock
    private SystemSettingRepository settingRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private SystemSettingServiceImpl systemSettingService;

    @Test
    void initDefaultSettings_createsAllMissingDefinitions() {
        when(settingRepository.existsBySettingKey(anyString())).thenReturn(false);

        systemSettingService.initDefaultSettings();

        verify(settingRepository, times(12)).save(any(SystemSetting.class));
    }

    @Test
    void getAllGrouped_groupsBySettingGroup() {
        when(settingRepository.findAllByOrderBySettingGroupAscSettingKeyAsc()).thenReturn(List.of(
                sampleSetting(1, "content.require_approval", "true", "CONTENT", "BOOLEAN"),
                sampleSetting(2, "security.max_login_attempts", "5", "SECURITY", "INTEGER"),
                sampleSetting(3, "system.app_name", "24BP Dog Handbook", "SYSTEM", "STRING")
        ));

        Map<String, List<SystemSettingResponse>> grouped = systemSettingService.getAllGrouped();

        assertThat(grouped).containsKeys("CONTENT", "SECURITY", "SYSTEM");
        assertThat(grouped.get("SECURITY")).hasSize(1);
        assertThat(grouped.get("SECURITY").get(0).getSettingKey()).isEqualTo("security.max_login_attempts");
    }

    @Test
    void update_withValidInteger_savesAndWritesAuditLog() {
        SystemSetting setting = sampleSetting(1, "security.max_login_attempts", "5", "SECURITY", "INTEGER");
        when(settingRepository.findBySettingKey("security.max_login_attempts")).thenReturn(Optional.of(setting));
        when(settingRepository.save(any(SystemSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SystemSettingResponse response = systemSettingService.update("security.max_login_attempts", "7");

        assertThat(response.getSettingValue()).isEqualTo("7");
        verify(auditLogService).log(
                eq(AuditActionType.UPDATE),
                eq("SYSTEM_SETTING"),
                eq(1),
                contains("changed from '5' to '7'")
        );
    }

    @Test
    void update_withInvalidBoolean_throwsBadRequest() {
        SystemSetting setting = sampleSetting(2, "system.maintenance_mode", "false", "SYSTEM", "BOOLEAN");
        when(settingRepository.findBySettingKey("system.maintenance_mode")).thenReturn(Optional.of(setting));

        assertThatThrownBy(() -> systemSettingService.update("system.maintenance_mode", "maybe"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("true")
                .hasMessageContaining("false");
    }

    @Test
    void resetDefaults_restoresEverySettingAndWritesAuditLog() {
        List<SystemSetting> settings = List.of(
                sampleSetting(1, "system.app_name", "Custom Name", "SYSTEM", "STRING"),
                sampleSetting(2, "system.maintenance_mode", "true", "SYSTEM", "BOOLEAN")
        );
        settings.get(0).setDefaultValue("24BP Dog Handbook");
        settings.get(1).setDefaultValue("false");
        when(settingRepository.findAll()).thenReturn(settings);

        List<SystemSettingResponse> response = systemSettingService.resetDefaults();

        assertThat(response).hasSize(2);
        assertThat(response).extracting(SystemSettingResponse::getSettingValue)
                .containsExactly("24BP Dog Handbook", "false");
        verify(settingRepository).saveAll(settings);
        verify(auditLogService).log(
                AuditActionType.UPDATE,
                "SYSTEM_SETTING",
                null,
                "All settings reset to default values"
        );
    }

    @Test
    void getString_returnsBuiltInDefaultWhenDatabaseValueIsMissing() {
        when(settingRepository.findBySettingKey("system.app_name")).thenReturn(Optional.empty());

        String value = systemSettingService.getString("system.app_name");

        assertThat(value).isEqualTo("24BP Dog Handbook");
    }

    @Test
    void updateBatch_updatesEachProvidedEntry() {
        SystemSetting first = sampleSetting(1, "system.app_name", "24BP Dog Handbook", "SYSTEM", "STRING");
        SystemSetting second = sampleSetting(2, "system.maintenance_mode", "false", "SYSTEM", "BOOLEAN");
        when(settingRepository.findBySettingKey("system.app_name")).thenReturn(Optional.of(first));
        when(settingRepository.findBySettingKey("system.maintenance_mode")).thenReturn(Optional.of(second));
        when(settingRepository.save(any(SystemSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("system.app_name", "DHS");
        payload.put("system.maintenance_mode", "true");

        List<SystemSettingResponse> response = systemSettingService.updateBatch(payload);

        assertThat(response).hasSize(2);
        assertThat(response).extracting(SystemSettingResponse::getSettingValue)
                .containsExactly("DHS", "true");
    }

    private SystemSetting sampleSetting(Integer id, String key, String value, String group, String dataType) {
        return SystemSetting.builder()
                .settingId(id)
                .settingKey(key)
                .settingValue(value)
                .defaultValue(value)
                .settingGroup(group)
                .dataType(dataType)
                .description("desc")
                .build();
    }
}
