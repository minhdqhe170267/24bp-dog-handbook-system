package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserRequest {

    @NotBlank
    private String username;

    private String password;

    @NotBlank
    private String fullName;

    private String email;

    private String phone;

    @NotBlank
    private String role;

    private String militaryRank;

    private String unit;
}
