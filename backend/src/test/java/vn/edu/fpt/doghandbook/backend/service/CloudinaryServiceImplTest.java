package vn.edu.fpt.doghandbook.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.service.impl.CloudinaryServiceImpl;

import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CloudinaryServiceImplTest {

    @Mock private Cloudinary cloudinary;
    @Mock private Uploader uploader;
    @Mock private MultipartFile file;

    @InjectMocks private CloudinaryServiceImpl service;

    @BeforeEach
    void setUp() {
        lenient().when(cloudinary.uploader()).thenReturn(uploader);
    }

    // ──────────────────── upload ────────────────────

    @Test
    void upload_success_returnsUploadResult() throws Exception {
        when(file.getBytes()).thenReturn("data".getBytes());
        when(uploader.upload(any(byte[].class), any(Map.class)))
                .thenReturn(Map.of("secure_url", "https://cdn.example.com/img.jpg", "public_id", "folder/abc"));

        CloudinaryService.UploadResult result = service.upload(file, "image");

        assertThat(result.secureUrl()).isEqualTo("https://cdn.example.com/img.jpg");
        assertThat(result.publicId()).isEqualTo("folder/abc");
    }

    @Test
    void upload_callsCloudinaryUploader() throws Exception {
        when(file.getBytes()).thenReturn("data".getBytes());
        when(uploader.upload(any(byte[].class), any(Map.class)))
                .thenReturn(Map.of("secure_url", "url", "public_id", "id"));

        service.upload(file, "image");

        verify(uploader).upload(any(byte[].class), any(Map.class));
    }

    @Test
    void upload_ioException_throwsBadRequest() throws Exception {
        when(file.getBytes()).thenThrow(new IOException("disk error"));

        assertThatThrownBy(() -> service.upload(file, "image"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("disk error");
    }

    @Test
    void upload_videoResourceType_passedToCloudinary() throws Exception {
        when(file.getBytes()).thenReturn("video".getBytes());
        when(uploader.upload(any(byte[].class), any(Map.class)))
                .thenReturn(Map.of("secure_url", "url", "public_id", "id"));

        service.upload(file, "video");

        verify(uploader).upload(any(byte[].class), argThat(map ->
                ((Map<String, Object>) map).get("resource_type").equals("video")));
    }

    @Test
    void upload_returnsNonNullResult() throws Exception {
        when(file.getBytes()).thenReturn("data".getBytes());
        when(uploader.upload(any(byte[].class), any(Map.class)))
                .thenReturn(Map.of("secure_url", "u", "public_id", "p"));

        CloudinaryService.UploadResult result = service.upload(file, "image");

        assertThat(result).isNotNull();
    }

    // ──────────────────── delete ────────────────────

    @Test
    void delete_success_callsDestroy() throws Exception {
        service.delete("folder/abc", "image");

        verify(uploader).destroy(eq("folder/abc"), any(Map.class));
    }

    @Test
    void delete_nullPublicId_skips() throws Exception {
        service.delete(null, "image");

        verify(uploader, never()).destroy(any(), any());
    }

    @Test
    void delete_blankPublicId_skips() throws Exception {
        service.delete("   ", "image");

        verify(uploader, never()).destroy(any(), any());
    }

    @Test
    void delete_ioException_swallowed() throws Exception {
        doThrow(new IOException("fail")).when(uploader).destroy(any(), any());

        service.delete("folder/abc", "image");
        // no exception thrown
    }

    @Test
    void delete_emptyStringPublicId_skips() throws Exception {
        service.delete("", "image");

        verify(uploader, never()).destroy(any(), any());
    }
}
