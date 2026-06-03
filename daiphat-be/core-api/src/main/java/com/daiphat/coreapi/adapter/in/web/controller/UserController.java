package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.application.dto.request.AcceptInviteRequest;
import com.daiphat.coreapi.application.dto.request.InviteStaffRequest;
import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.coreapi.application.dto.request.user.UpdateUserRequest;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.user.UserStatusResponse;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.in.user.UserServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.shared.util.SearchConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.fasterxml.jackson.annotation.JsonView;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
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

    private final UserServicePort userServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('admin:create', 'member:create')")
    @JsonView(Views.Admin.class)
    public ApiResponse<Void> create(@Valid @RequestBody CreateUserRequest request) {
        userServicePort.create(request);
        return ApiResponse.success("Tạo người dùng thành công.");
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('admin:edit', 'member:edit') or #id.toString().equals(principal.id.toString())")
    @JsonView(Views.Admin.class)
    public ApiResponse<Void> update(@PathVariable UUID id, @Valid @RequestBody UpdateUserRequest request) {
        userServicePort.update(id, request);
        return ApiResponse.success("Cập nhật người dùng thành công.");
    }

    @GetMapping("/me")
    @JsonView(Views.Me.class)
    public ApiResponse<UserResponse> getCurrentUser(
            @AuthenticationPrincipal UserModel principal) {
        
        log.debug("REST request to get profile for: {}", principal.getUsername());
        UserResponse response = userServicePort.getMyProfile(principal.getUsername());
        return ApiResponse.success(null, response);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @JsonView(Views.Me.class)
    public ApiResponse<UserResponse> uploadMyAvatar(
            @AuthenticationPrincipal UserModel principal,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success("Cập nhật ảnh đại diện thành công.",
                userServicePort.uploadAvatar(principal.getId(), StorageUtils.toUploadRequest(file)));
    }

    @DeleteMapping("/me/avatar")
    @PreAuthorize("isAuthenticated()")
    @JsonView(Views.Me.class)
    public ApiResponse<UserResponse> deleteMyAvatar(@AuthenticationPrincipal UserModel principal) {
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

    @PostMapping("/setup-profile")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> setupProfile(
            @AuthenticationPrincipal UserModel principal,
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
        List<UserStatusResponse> statuses = Arrays.stream(UserStatus.values())
                .map(status -> UserStatusResponse.builder()
                        .code(status.getCode())
                        .name(status.getLabel())
                        .build())
                .toList();
        return ApiResponse.success(null, statuses);
    }

    @PostMapping(ID_PATH + "/invite-staff")
    @PreAuthorize("hasAnyAuthority('admin:create', 'admin:edit')")
    public ApiResponse<Void> inviteStaff(
            @PathVariable String id,
            @Valid @RequestBody InviteStaffRequest request) {
        userServicePort.inviteStaff(id, request);
        return ApiResponse.success("Đã gửi lời mời nhân viên thành công.");
    }

    @PostMapping("/accept-invite")
    @PreAuthorize("permitAll()")
    public ApiResponse<Void> acceptInvite(
            @Valid @RequestBody AcceptInviteRequest request) {
        userServicePort.acceptInvite(request);
        return ApiResponse.success("Kích hoạt tài khoản nhân sự thành công.");
    }

}
