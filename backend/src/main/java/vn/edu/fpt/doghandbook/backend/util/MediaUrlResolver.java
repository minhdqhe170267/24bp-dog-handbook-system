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

        int uploadsSegmentIndex = normalized.lastIndexOf("/uploads/");
        if (uploadsSegmentIndex >= 0) {
            String uploadsPath = normalized.substring(uploadsSegmentIndex + 1);
            return contextPath + "/" + uploadsPath;
        }

        if (normalized.matches("^[A-Za-z]:/.*")) {
            int lastSlash = normalized.lastIndexOf('/');
            String fileName = lastSlash >= 0 ? normalized.substring(lastSlash + 1) : normalized;
            return contextPath + "/uploads/" + fileName;
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
