package vn.edu.fpt.doghandbook.backend.service;

import vn.edu.fpt.doghandbook.backend.dto.request.UserRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UserResponse;

public interface UserManagementService {

    PageResponse getAll(int page, int size, String search);

    UserResponse getById(Integer id);

    UserResponse create(UserRequest request);

    UserResponse update(Integer id, UserRequest request);

    void delete(Integer id);

    UserResponse toggleLock(Integer id);
}
