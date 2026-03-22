package vn.edu.fpt.doghandbook.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.NotificationResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.service.NotificationService;
import vn.edu.fpt.doghandbook.backend.util.AuthenticationUtils;

import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<PageResponse<NotificationResponse>> getNotifications(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            Authentication authentication
    ) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        return ApiResponse.success(notificationService.getNotifications(userId, page, size));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> getUnreadCount(Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        long count = notificationService.getUnreadCount(userId);
        return ApiResponse.success(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(
            @PathVariable("id") Long notificationId,
            Authentication authentication
    ) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        notificationService.markAsRead(notificationId, userId);
        return ApiResponse.success(null, "Đã đánh dấu đã đọc");
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(Authentication authentication) {
        Integer userId = AuthenticationUtils.extractUserId(authentication);
        notificationService.markAllAsRead(userId);
        return ApiResponse.success(null, "Đã đánh dấu tất cả đã đọc");
    }
}
