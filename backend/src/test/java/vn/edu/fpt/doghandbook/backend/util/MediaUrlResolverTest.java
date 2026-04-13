package vn.edu.fpt.doghandbook.backend.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MediaUrlResolverTest {

    @Test
    void toPublicUrl_withNullOrBlankValue_returnsInput() {
        MediaUrlResolver resolver = new MediaUrlResolver("/api/v1");

        assertThat(resolver.toPublicUrl(null)).isNull();
        assertThat(resolver.toPublicUrl("   ")).isEqualTo("   ");
    }

    @Test
    void toPublicUrl_withHttpOrHttpsUrl_returnsNormalizedExternalUrl() {
        MediaUrlResolver resolver = new MediaUrlResolver("/api/v1");

        assertThat(resolver.toPublicUrl(" https://cdn.example.com/file.png "))
                .isEqualTo("https://cdn.example.com/file.png");
        assertThat(resolver.toPublicUrl("http://cdn.example.com/file.png"))
                .isEqualTo("http://cdn.example.com/file.png");
    }

    @Test
    void toPublicUrl_withRelativeUploadsPath_prefixesContextPath() {
        MediaUrlResolver resolver = new MediaUrlResolver("/api/v1");

        String result = resolver.toPublicUrl("uploads/example.png");

        assertThat(result).isEqualTo("/api/v1/uploads/example.png");
    }

    @Test
    void toPublicUrl_withAbsoluteWindowsPathContainingUploads_normalizesToUploadsUrl() {
        MediaUrlResolver resolver = new MediaUrlResolver("/api/v1");

        String result = resolver.toPublicUrl("E:/data/app/uploads/example.png");

        assertThat(result).isEqualTo("/api/v1/uploads/example.png");
    }

    @Test
    void toPublicUrl_withAbsoluteWindowsPathWithoutUploads_fallsBackToUploadsFilename() {
        MediaUrlResolver resolver = new MediaUrlResolver("/api/v1");

        String result = resolver.toPublicUrl("D:/files/example.png");

        assertThat(result).isEqualTo("/api/v1/uploads/example.png");
    }

    @Test
    void toPublicUrl_withLeadingSlashOrExistingContextPath_preservesExpectedPrefix() {
        MediaUrlResolver resolver = new MediaUrlResolver("/api/v1");

        assertThat(resolver.toPublicUrl("/uploads/example.png")).isEqualTo("/api/v1/uploads/example.png");
        assertThat(resolver.toPublicUrl("/api/v1/uploads/example.png")).isEqualTo("/api/v1/uploads/example.png");
    }

    @Test
    void toPublicUrl_withRootContextPath_normalizesWithoutDuplicateSlashes() {
        MediaUrlResolver resolver = new MediaUrlResolver("/");

        assertThat(resolver.toPublicUrl("uploads/example.png")).isEqualTo("/uploads/example.png");
        assertThat(resolver.toPublicUrl("/uploads/example.png")).isEqualTo("/uploads/example.png");
    }

    @Test
    void toPublicUrl_withContextPathWithoutLeadingSlash_addsLeadingSlash() {
        MediaUrlResolver resolver = new MediaUrlResolver("api");

        String result = resolver.toPublicUrl("file.png");

        assertThat(result).isEqualTo("/api/file.png");
    }
}
