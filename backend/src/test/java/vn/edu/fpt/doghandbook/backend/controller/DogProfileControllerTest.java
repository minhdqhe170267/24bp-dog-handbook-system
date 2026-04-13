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
import vn.edu.fpt.doghandbook.backend.dto.request.DogProfileRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.DogProfileResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.service.CustomUserDetailsService;
import vn.edu.fpt.doghandbook.backend.service.DogProfileService;
import vn.edu.fpt.doghandbook.backend.util.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static vn.edu.fpt.doghandbook.backend.controller.ControllerTestSupport.authenticatedUser;

@WebMvcTest(DogProfileController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class DogProfileControllerTest {

    @Autowired MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean DogProfileService dogProfileService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService customUserDetailsService;

    // ──────────────────── test data helpers ────────────────────

    private DogProfileResponse sampleResponse() {
        return DogProfileResponse.builder()
                .dogId(1)
                .dogCode("DK001")
                .dogName("Rex")
                .breedId(1)
                .breedName("Berger Đức")
                .gender("MALE")
                .dateOfBirth(LocalDate.of(2022, 3, 15))
                .ageMonths(24)
                .currentWeightKg(new BigDecimal("34.5"))
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @SuppressWarnings("unchecked")
    private PageResponse<DogProfileResponse> samplePage() {
        return PageResponse.<DogProfileResponse>builder()
                .content(List.of(sampleResponse()))
                .page(0).size(10).totalElements(1).totalPages(1)
                .build();
    }

    // ──────────────────── GET /dogs ────────────────────

    @Test
    void getAll_authenticated_returns200() throws Exception {
        when(dogProfileService.getAll(0, 10, null)).thenReturn(samplePage());

        mockMvc.perform(get("/dogs")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].dogCode").value("DK001"));
    }

    @Test
    void getAll_withSearch_passesSearchParam() throws Exception {
        when(dogProfileService.getAll(0, 10, "Rex")).thenReturn(samplePage());

        mockMvc.perform(get("/dogs")
                        .with(authenticatedUser(7, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER))
                        .param("search", "Rex"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].dogName").value("Rex"));

        verify(dogProfileService).getAll(0, 10, "Rex");
    }

    @Test
    void getAll_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/dogs"))
                .andExpect(status().isUnauthorized());
    }

    // ──────────────────── GET /dogs/{id} ────────────────────

    @Test
    void getById_found_returns200() throws Exception {
        when(dogProfileService.getById(1)).thenReturn(sampleResponse());

        mockMvc.perform(get("/dogs/1")
                        .with(authenticatedUser(7, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dogId").value(1))
                .andExpect(jsonPath("$.data.dogCode").value("DK001"))
                .andExpect(jsonPath("$.data.breedName").value("Berger Đức"))
                .andExpect(jsonPath("$.data.ageMonths").value(24));
    }

    @Test
    void getById_notFound_returns404() throws Exception {
        when(dogProfileService.getById(99))
                .thenThrow(new ResourceNotFoundException("Dog not found with id: 99"));

        mockMvc.perform(get("/dogs/99")
                        .with(authenticatedUser(7, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER)))
                .andExpect(status().isNotFound());
    }

    // ──────────────────── POST /dogs ────────────────────

    @Test
    void create_adminRole_returns201() throws Exception {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(1);
        request.setDogName("Bruno");
        request.setGender("MALE");

        DogProfileResponse created = DogProfileResponse.builder()
                .dogId(7).dogCode("DK007").dogName("Bruno")
                .breedId(1).breedName("Berger Đức").gender("MALE")
                .status("ACTIVE").createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();

        when(dogProfileService.create(any(DogProfileRequest.class), isNull())).thenReturn(created);

        mockMvc.perform(post("/dogs")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.dogCode").value("DK007"))
                .andExpect(jsonPath("$.data.dogName").value("Bruno"));
    }

    @Test
    void create_nonAdminRole_returns403() throws Exception {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(1);

        mockMvc.perform(post("/dogs")
                        .with(authenticatedUser(7, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(dogProfileService, never()).create(any(DogProfileRequest.class), any());
    }

    @Test
    void create_unauthenticated_returns401() throws Exception {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(1);

        mockMvc.perform(post("/dogs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_missingBreedId_returns400() throws Exception {
        DogProfileRequest request = new DogProfileRequest();
        // breedId is @NotNull but left null

        mockMvc.perform(post("/dogs")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ──────────────────── PUT /dogs/{id} ────────────────────

    @Test
    void update_adminRole_returns200() throws Exception {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(1);
        request.setDogName("Rex Updated");
        request.setStatus("INACTIVE");

        DogProfileResponse updated = sampleResponse();
        updated.setDogName("Rex Updated");
        updated.setStatus("INACTIVE");

        when(dogProfileService.update(eq(1), any(DogProfileRequest.class), isNull())).thenReturn(updated);

        mockMvc.perform(put("/dogs/1")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.dogName").value("Rex Updated"))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    void update_nonAdminRole_returns403() throws Exception {
        mockMvc.perform(put("/dogs/1")
                        .with(authenticatedUser(7, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new DogProfileRequest())))
                .andExpect(status().isForbidden());
    }

    @Test
    void update_notFound_returns404() throws Exception {
        DogProfileRequest request = new DogProfileRequest();
        request.setBreedId(1);
        request.setDogName("Missing Dog");

        when(dogProfileService.update(eq(99), any(DogProfileRequest.class), isNull()))
                .thenThrow(new ResourceNotFoundException("Dog not found with id: 99"));

        mockMvc.perform(put("/dogs/99")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    // ──────────────────── DELETE /dogs/{id} ────────────────────

    @Test
    void delete_adminRole_returns200() throws Exception {
        doNothing().when(dogProfileService).delete(1);

        mockMvc.perform(delete("/dogs/1")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(dogProfileService).delete(1);
    }

    @Test
    void delete_nonAdminRole_returns403() throws Exception {
        mockMvc.perform(delete("/dogs/1")
                        .with(authenticatedUser(7, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.TRAINER)))
                .andExpect(status().isForbidden());

        verify(dogProfileService, never()).delete(any());
    }

    @Test
    void delete_notFound_returns404() throws Exception {
        doThrow(new ResourceNotFoundException("Dog not found with id: 99"))
                .when(dogProfileService).delete(99);

        mockMvc.perform(delete("/dogs/99")
                        .with(authenticatedUser(1, vn.edu.fpt.doghandbook.backend.entity.enums.UserRole.ADMIN)))
                .andExpect(status().isNotFound());
    }
}
