package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.coreapi.application.dto.request.user.UpdateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.UpdateFcmTokenRequest;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.user.UserStatusResponse;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.port.in.user.UserServicePort;
import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.shared.util.SearchConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.fasterxml.jackson.annotation.JsonView;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {
    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";
    private static final String ME_PATH = "/me";

    private final UserServicePort userServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('admin:create', 'member:create')")
    @JsonView(Views.Admin.class)
    public ApiResponse<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.success("Tạo người dùng thành công.", userServicePort.create(request));
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('admin:edit', 'member:edit') or #id.toString().equals(principal.id.toString())")
    @JsonView(Views.Admin.class)
    public ApiResponse<Void> update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        userServicePort.update(id, request);
        return ApiResponse.success("Cập nhật người dùng thành công.");
    }

    @GetMapping(ME_PATH)
    @JsonView(Views.Me.class)
    public ApiResponse<UserResponse> getCurrentUser(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        
        log.debug("REST request to get profile for: {}", principal.getUsername());
        UserResponse response = userServicePort.getMyProfile(principal.getUsername());
        return ApiResponse.success(null, response);
    }

    @PostMapping(value = ME_PATH + "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @JsonView(Views.Me.class)
    public ApiResponse<UserResponse> uploadMyAvatar(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success("Cập nhật ảnh đại diện thành công.",
                userServicePort.uploadAvatar(principal.getId(), StorageUtils.toUploadRequest(file)));
    }

    @DeleteMapping(ME_PATH + "/avatar")
    @PreAuthorize("isAuthenticated()")
    @JsonView(Views.Me.class)
    public ApiResponse<UserResponse> deleteMyAvatar(@AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã xóa ảnh đại diện.",
                userServicePort.deleteAvatar(principal.getId()));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('member:view', 'admin:view') or #id.toString().equals(principal.id.toString())")
    @JsonView(Views.Admin.class)
    public ApiResponse<UserResponse> getById(@PathVariable UUID id) {
        return ApiResponse.success(null, userServicePort.getById(id));
    }

    @PostMapping(value = ID_PATH + "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('admin:edit', 'member:edit') or #id.toString().equals(principal.id.toString())")
    @JsonView(Views.Admin.class)
    public ApiResponse<UserResponse> uploadAvatar(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success("Cập nhật ảnh đại diện thành công.",
                userServicePort.uploadAvatar(id, StorageUtils.toUploadRequest(file)));
    }

    @DeleteMapping(ID_PATH + "/avatar")
    @PreAuthorize("hasAnyAuthority('admin:edit', 'member:edit') or #id.toString().equals(principal.id.toString())")
    @JsonView(Views.Admin.class)
    public ApiResponse<UserResponse> deleteAvatar(@PathVariable UUID id) {
        return ApiResponse.success("Đã xóa ảnh đại diện.",
                userServicePort.deleteAvatar(id));
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasAnyAuthority('member:view', 'admin:view') or #username == principal.username")
    @JsonView(Views.Admin.class)
    public ApiResponse<UserResponse> getByUsername(@PathVariable String username) {
        log.info("REST request to get user by username: {}", username);
        return ApiResponse.success(null, userServicePort.getByUsername(username));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('member:view', 'admin:view')")
    @JsonView(Views.Admin.class)
    public ApiResponse<PageResponse<UserResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) List<String> roleIds,
            @RequestParam(defaultValue = SearchConstants.DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = SearchConstants.DEFAULT_SORT_DIRECTION) String direction) {
        
        log.info("REST request to get users - page: {}, limit: {}, query: {}, status: {}, roles: {}, sort: {} {}", 
                page, limit, q, status, roleIds, sortBy, direction);
                
        return ApiResponse.success(null, userServicePort.getAll(page, limit, q, status, roleIds, sortBy, direction));
    }

    @GetMapping("/customers/search")
    @PreAuthorize("hasAnyAuthority('member:view', 'order:create', 'order:view')")
    @JsonView(Views.Admin.class)
    public ApiResponse<List<UserResponse>> searchCustomers(
            @RequestParam String q,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ApiResponse.success(null, userServicePort.searchCustomers(q, limit));
    }

    @PostMapping("/setup-profile")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> setupProfile(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody ProfileSetupRequest request) {
        
        userServicePort.setupFirstTimeProfile(principal.getUsername(), request);
        return ApiResponse.success("Thiết lập hồ sơ thành công.");
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('member:delete', 'admin:delete')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        userServicePort.delete(id);
        return ApiResponse.success("Đã xóa người dùng thành công.");
    }

    @GetMapping("/statuses")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<UserStatusResponse>> getStatuses() {
        return ApiResponse.success(null, userServicePort.getStatuses());
    }

    @PostMapping(ME_PATH + "/fcm-token")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Update FCM Token", description = "Update the Firebase Cloud Messaging registration token for the authenticated user")
    public ApiResponse<Void> updateFcmToken(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @Valid @RequestBody UpdateFcmTokenRequest request
    ) {
        userServicePort.updateFcmToken(principal.getId(), request.getFcmToken());
        return ApiResponse.success("FCM token updated successfully");
    }

}
