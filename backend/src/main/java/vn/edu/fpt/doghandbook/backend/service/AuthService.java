package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.LoginRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.LoginResponse;

public interface AuthService {

    LoginResponse login(LoginRequest request, String ipAddress);

    void changePassword(Integer userId, String newPassword);

    void logout(Integer userId, String ipAddress);
}
