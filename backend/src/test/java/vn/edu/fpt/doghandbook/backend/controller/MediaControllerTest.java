package vn.edu.fpt.doghandbook.backend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import vn.edu.fpt.doghandbook.backend.dto.response.MediaResponse;
import vn.edu.fpt.doghandbook.backend.exception.GlobalExceptionHandler;
import vn.edu.fpt.doghandbook.backend.service.MediaService;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MediaControllerTest {

    @Mock
    private MediaService mediaService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new MediaController(mediaService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getFile_withExistingMedia_redirectsToPublicFileUrl() throws Exception {
        when(mediaService.getById(9)).thenReturn(
                MediaResponse.builder()
                        .mediaId(9)
                        .fileUrl("/api/v1/uploads/example.png")
                        .build()
        );

        mockMvc.perform(get("/media/9/file"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "/api/v1/uploads/example.png"));
    }

    @Test
    void getFile_withBlankFileUrl_returns404() throws Exception {
        when(mediaService.getById(10)).thenReturn(
                MediaResponse.builder()
                        .mediaId(10)
                        .fileUrl(" ")
                        .build()
        );

        mockMvc.perform(get("/media/10/file"))
                .andExpect(status().isNotFound());
    }
}
