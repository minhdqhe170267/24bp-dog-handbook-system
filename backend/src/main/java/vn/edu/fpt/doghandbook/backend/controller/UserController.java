package vn.edu.fpt.doghandbook.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import vn.edu.fpt.doghandbook.backend.dto.request.UserRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.ApiResponse;
import vn.edu.fpt.doghandbook.backend.service.UserManagementService;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserManagementService userManagementService;

    @GetMapping
    public ApiResponse<?> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return ApiResponse.success(userManagementService.getAll(page, size, search));
    }

    @GetMapping("/{id}")
    public ApiResponse<?> getUserById(@PathVariable Integer id) {
        return ApiResponse.success(userManagementService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<?> createUser(@Valid @RequestBody UserRequest request) {
        return ApiResponse.success(userManagementService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<?> updateUser(@PathVariable Integer id, @Valid @RequestBody UserRequest request) {
        return ApiResponse.success(userManagementService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<?> deleteUser(@PathVariable Integer id) {
        userManagementService.delete(id);
        return ApiResponse.success("Xóa người dùng thành công");
    }

    @PutMapping("/{id}/toggle-lock")
    public ApiResponse<?> toggleLock(@PathVariable Integer id) {
        return ApiResponse.success(userManagementService.toggleLock(id));
    }
}
