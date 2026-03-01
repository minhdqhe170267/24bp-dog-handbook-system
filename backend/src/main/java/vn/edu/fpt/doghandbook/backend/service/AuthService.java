package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request);

    void changePassword(Integer userId, String currentPassword, String newPassword);
}
