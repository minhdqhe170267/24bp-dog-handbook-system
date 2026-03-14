package vn.edu.fpt.doghandbook.backend.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MediaUrlResolver {

    private final String contextPath;

    public MediaUrlResolver(@Value("${server.servlet.context-path:}") String contextPath) {
        this.contextPath = normalizeContextPath(contextPath);
    }

    public String toPublicUrl(String storedFileUrl) {
        if (storedFileUrl == null || storedFileUrl.isBlank()) {
            return storedFileUrl;
        }

        String normalized = storedFileUrl.replace("\\", "/").trim();
        if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
            return normalized;
        }

        if (!contextPath.isEmpty() && normalized.startsWith(contextPath + "/")) {
            return normalized;
        }

        if (normalized.startsWith("/")) {
            return contextPath + normalized;
        }

        return contextPath + "/" + normalized;
    }

    private String normalizeContextPath(String value) {
        if (value == null || value.isBlank() || "/".equals(value.trim())) {
            return "";
        }

        String normalized = value.trim().replace("\\", "/");
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        if (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }
}
