package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.edu.fpt.doghandbook.backend.dto.response.MedicationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.exception.GlobalExceptionHandler;
import vn.edu.fpt.doghandbook.backend.service.MedicationService;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MedicationControllerTest {

    @Mock
    private MedicationService medicationService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new MedicationController(medicationService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @SuppressWarnings("unchecked")
    private PageResponse<MedicationResponse> samplePage() {
        return PageResponse.<MedicationResponse>builder()
                .content(List.of(MedicationResponse.builder().medicationId(1).status("PUBLISHED").build()))
                .page(0)
                .size(10)
                .totalElements(1)
                .totalPages(1)
                .build();
    }

    @Test
    void getAll_trainerRole_forcesPublishedStatus() throws Exception {
        when(medicationService.getAll(0, 10, null, "PUBLISHED")).thenReturn(samplePage());

        mockMvc.perform(get("/medications")
                        .principal(authentication("trainer", "ROLE_TRAINER")))
                .andExpect(status().isOk());

        verify(medicationService).getAll(0, 10, null, "PUBLISHED");
    }

    @Test
    void getById_trainerCannotSeeDraft_returns404() throws Exception {
        when(medicationService.getById(4)).thenReturn(MedicationResponse.builder()
                .medicationId(4)
                .status("DRAFT")
                .build());

        mockMvc.perform(get("/medications/4")
                        .principal(authentication("trainer", "ROLE_TRAINER")))
                .andExpect(status().isNotFound());
    }

    private Authentication authentication(Object principal, String... authorities) {
        return new UsernamePasswordAuthenticationToken(
                principal,
                "n/a",
                AuthorityUtils.createAuthorityList(authorities)
        );
    }
}
