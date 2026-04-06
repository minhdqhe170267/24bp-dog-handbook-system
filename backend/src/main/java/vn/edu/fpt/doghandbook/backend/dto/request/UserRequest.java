package vn.edu.fpt.doghandbook.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.validation.ValidEnum;

@Getter
@Setter
public class UserRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập từ 3-50 ký tự")
    private String username;

    @Size(min = 6, max = 100, message = "Mật khẩu từ 6-100 ký tự")
    private String password;

    @NotBlank(message = "Họ tên không được để trống")
    @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
    private String fullName;

    @Email(message = "Email không hợp lệ")
    @Size(max = 150, message = "Email tối đa 150 ký tự")
    private String email;

    @Pattern(regexp = "^(\\+84|0)[0-9]{9,10}$", message = "Số điện thoại VN không hợp lệ")
    private String phone;

    @NotBlank(message = "Vai trò không được để trống")
    @ValidEnum(enumClass = UserRole.class, message = "Vai trò không hợp lệ")
    private String role;

    @Size(max = 50, message = "Cấp bậc tối đa 50 ký tự")
    private String militaryRank;

    @Size(max = 100, message = "Đơn vị tối đa 100 ký tự")
    private String unit;

    private Integer specialtyId;
}
