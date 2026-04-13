package vn.edu.fpt.doghandbook.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.fpt.doghandbook.backend.config.JwtAuthenticationFilter;
import vn.edu.fpt.doghandbook.backend.config.SecurityConfig;
import vn.edu.fpt.doghandbook.backend.dto.response.SystemSettingResponse;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.SystemSettingService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(SystemSettingController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class SystemSettingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SystemSettingService systemSettingService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void getAll_adminReturnsGroupedSettings() throws Exception {
        when(systemSettingService.getAllGrouped()).thenReturn(Map.of(
                "SECURITY", List.of(sampleResponse("security.max_login_attempts", "5", "SECURITY", "INTEGER"))
        ));

        mockMvc.perform(get("/system-settings")
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.SECURITY[0].settingKey").value("security.max_login_attempts"));
    }

    @Test
    void getAll_trainerReturns403() throws Exception {
        mockMvc.perform(get("/system-settings")
                        .with(authenticatedUser(7, UserRole.TRAINER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCESS_DENIED"));

        verifyNoInteractions(systemSettingService);
    }

    @Test
    void update_adminReturnsUpdatedSetting() throws Exception {
        when(systemSettingService.update("security.max_login_attempts", "7"))
                .thenReturn(sampleResponse("security.max_login_attempts", "7", "SECURITY", "INTEGER"));

        mockMvc.perform(put("/system-settings/{key}", "security.max_login_attempts")
                        .with(csrf())
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("value", "7"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.settingValue").value("7"))
                .andExpect(jsonPath("$.message").exists());

        verify(systemSettingService).update("security.max_login_attempts", "7");
    }

    @Test
    void update_blankValueReturns400() throws Exception {
        mockMvc.perform(put("/system-settings/{key}", "security.max_login_attempts")
                        .with(csrf())
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("value", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void updateBatch_adminUsesDedicatedEndpointMapping() throws Exception {
        when(systemSettingService.updateBatch(Map.of("system.app_name", "DHS")))
                .thenReturn(List.of(sampleResponse("system.app_name", "DHS", "SYSTEM", "STRING")));

        mockMvc.perform(put("/system-settings/batch")
                        .with(csrf())
                        .with(authenticatedUser(1, UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "settings", Map.of("system.app_name", "DHS")
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].settingKey").value("system.app_name"))
                .andExpect(jsonPath("$.data[0].settingValue").value("DHS"));
    }

    @Test
    void resetDefaults_adminReturnsAllResetValues() throws Exception {
        when(systemSettingService.resetDefaults())
                .thenReturn(List.of(sampleResponse("system.maintenance_mode", "false", "SYSTEM", "BOOLEAN")));

        mockMvc.perform(post("/system-settings/reset-defaults")
                        .with(csrf())
                        .with(authenticatedUser(1, UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].settingKey").value("system.maintenance_mode"))
                .andExpect(jsonPath("$.data[0].settingValue").value("false"));
    }

    private SystemSettingResponse sampleResponse(String key, String value, String group, String dataType) {
        return SystemSettingResponse.builder()
                .settingId(1)
                .settingKey(key)
                .settingValue(value)
                .defaultValue(value)
                .settingGroup(group)
                .dataType(dataType)
                .description("desc")
                .build();
    }
}
