package com.daiphat.accountservice.presentation.controller;
import com.daiphat.accountservice.application.dto.response.base.ApiResponse;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.application.dto.response.base.Views;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonView;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.presentation.constants.ApiConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.daiphat.accountservice.infrastructure.config.security.SecurityUser;
import com.daiphat.accountservice.application.dto.request.user.CreateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.accountservice.application.dto.request.user.OtpConfirmationRequest;
import com.daiphat.accountservice.infrastructure.util.SearchConstants;
import jakarta.validation.Valid;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.USERS)
@RequiredArgsConstructor
@Slf4j
public class UserController {
    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    
    private String message; // WARNING: Not thread-safe in singleton controller

    private final UserServicePort userServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('admin:create', 'member:create')")
    @JsonView(Views.Admin.class)
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        message = "Tạo người dùng thành công.";
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .data(userServicePort.create(request))
                .message(message)
                .build());
    }

    @GetMapping("/me")
    @JsonView(Views.Me.class)
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal SecurityUser principal) {
        
        log.debug("REST request to get profile for: {}", principal.username());
        UserResponse response = userServicePort.getMyProfile(principal.username());
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .data(response)
                .build());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('member:view', 'admin:view') or #id.toString().equals(principal.id.toString())")
    @JsonView(Views.Admin.class)
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .data(userServicePort.getById(id))
                .build());
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasAnyAuthority('member:view', 'admin:view') or #username == principal.username")
    @JsonView(Views.Admin.class)
    public ResponseEntity<ApiResponse<UserResponse>> getByUsername(@PathVariable String username) {
        log.info("REST request to get user by username: {}", username);
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .data(userServicePort.getByUsername(username))
                .build());
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('member:view', 'admin:view')")
    @JsonView(Views.Admin.class)
    public ResponseEntity<ApiResponse<Object>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) List<String> roleIds,
            @RequestParam(defaultValue = SearchConstants.DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = SearchConstants.DEFAULT_SORT_DIRECTION) String direction) {
        
        log.info("REST request to get users - page: {}, limit: {}, query: {}, status: {}, roles: {}, sort: {} {}", 
                page, limit, q, status, roleIds, sortBy, direction);
                
        return ResponseEntity.ok(ApiResponse.builder()
                .data(userServicePort.getAll(page, limit, q, status, roleIds, sortBy, direction))
                .build());
    }

    @PostMapping("/setup-profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> setupProfile(
            @AuthenticationPrincipal SecurityUser principal,
            @Valid @RequestBody ProfileSetupRequest request) {
        
        message = "Thiết lập hồ sơ thành công.";
        userServicePort.setupFirstTimeProfile(principal.username(), request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(message)
                .build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('member:delete', 'admin:delete')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        message = "Đã xóa người dùng thành công.";
        userServicePort.delete(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(message)
                .build());
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<UserStatus>>> getStatuses() {
        return ResponseEntity.ok(ApiResponse.<List<com.daiphat.accountservice.domain.model.enums.UserStatus>>builder()
                .data(Arrays.asList(UserStatus.values()))
                .build());
    }
}
