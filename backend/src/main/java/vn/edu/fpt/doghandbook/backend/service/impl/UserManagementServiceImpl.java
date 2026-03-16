package vn.edu.fpt.doghandbook.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import vn.edu.fpt.doghandbook.backend.dto.request.UserRequest;
import vn.edu.fpt.doghandbook.backend.dto.response.PageResponse;
import vn.edu.fpt.doghandbook.backend.dto.response.UserResponse;
import vn.edu.fpt.doghandbook.backend.entity.User;
import vn.edu.fpt.doghandbook.backend.entity.enums.UserRole;
import vn.edu.fpt.doghandbook.backend.exception.BadRequestException;
import vn.edu.fpt.doghandbook.backend.exception.ConflictException;
import vn.edu.fpt.doghandbook.backend.exception.ResourceNotFoundException;
import vn.edu.fpt.doghandbook.backend.repository.UserRepository;
import vn.edu.fpt.doghandbook.backend.service.UserManagementService;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserManagementServiceImpl implements UserManagementService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public PageResponse getAll(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("userId").descending());

        Page<User> userPage;
        if (search != null && !search.isBlank()) {
            userPage = userRepository.findByFullNameContainingIgnoreCaseAndIsDeletedFalse(search, pageable);
        } else {
            userPage = userRepository.findByIsDeletedFalse(pageable);
        }

        return PageResponse.builder()
                .content(userPage.getContent().stream().map(this::toResponse).toList())
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();
    }

    @Override
    public UserResponse getById(Integer id) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));
        return toResponse(user);
    }

    @Override
    public UserResponse create(UserRequest request) {
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new BadRequestException("Mật khẩu không được để trống khi tạo người dùng");
        }

        if (Boolean.TRUE.equals(userRepository.existsByUsername(request.getUsername()))) {
            throw new ConflictException("Tên đăng nhập đã tồn tại: " + request.getUsername());
        }

        User user = User.builder()
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .role(UserRole.valueOf(request.getRole()))
                .militaryRank(request.getMilitaryRank())
                .unit(request.getUnit())
                .build();

        return toResponse(userRepository.save(user));
    }

    @Override
    public UserResponse update(Integer id, UserRequest request) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));

        if (!user.getUsername().equals(request.getUsername())
                && Boolean.TRUE.equals(userRepository.existsByUsername(request.getUsername()))) {
            throw new ConflictException("Tên đăng nhập đã tồn tại: " + request.getUsername());
        }

        user.setUsername(request.getUsername());
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(UserRole.valueOf(request.getRole()));
        user.setMilitaryRank(request.getMilitaryRank());
        user.setUnit(request.getUnit());

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        return toResponse(userRepository.save(user));
    }

    @Override
    public void delete(Integer id) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));

        user.setIsDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Override
    public UserResponse toggleLock(Integer id) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với id: " + id));

        user.setIsLocked(!Boolean.TRUE.equals(user.getIsLocked()));

        if (!Boolean.TRUE.equals(user.getIsLocked())) {
            user.setFailedLoginCount(0);
        }

        return toResponse(userRepository.save(user));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .militaryRank(user.getMilitaryRank())
                .unit(user.getUnit())
                .isActive(user.getIsActive())
                .isLocked(user.getIsLocked())
                .failedLoginCount(user.getFailedLoginCount())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
