package vn.edu.fpt.doghandbook.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {

    private Integer userId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private String militaryRank;
    private String unit;
    private Integer specialtyId;
    private String specialtyName;
    private Boolean isActive;
    private Boolean isLocked;
    private Integer failedLoginCount;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
}
