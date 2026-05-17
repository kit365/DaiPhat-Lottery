package com.daiphat.accountservice.presentation.controller;

import com.daiphat.accountservice.application.dto.request.permission.PermissionItem;
import com.daiphat.accountservice.application.dto.request.permission.PermissionRegistrationRequest;
import com.daiphat.accountservice.application.dto.response.auth.RoleResponse;
import com.daiphat.accountservice.application.dto.response.base.ApiResponse;
import com.daiphat.accountservice.application.port.in.auth.RoleServicePort;
import com.daiphat.accountservice.application.port.in.user.UserLookupServicePort;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.domain.model.PermissionModel;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.presentation.constants.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiConstants.PERMISSIONS)
@RequiredArgsConstructor
public class PermissionController {

    private final RoleServicePort roleServicePort;
    private final UserLookupServicePort userLookupService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('role:view', 'admin:view')")
    public ResponseEntity<ApiResponse<List<PermissionItem>>> getAllPermissions() {
        String msg = "Lấy danh sách quyền hạn hệ thống thành công";
        return ResponseEntity.ok(ApiResponse
                .<List<PermissionItem>>builder()
                .data(roleServicePort.getAllPermissions())
                .message(msg)
                .build());
    }

    @GetMapping("/roles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        String msg = "Lấy danh sách vai trò thành công";
        List<RoleResponse> roles = roleServicePort.getAllRoles();

        return ResponseEntity.ok(ApiResponse.<List<RoleResponse>>builder()
                .data(roles)
                .message(msg)
                .build());
    }

    @PatchMapping("/roles/{roleId}")
    @PreAuthorize("hasAuthority('role:edit')")
    public ResponseEntity<ApiResponse<RoleResponse>> updateRolePermissions(
            @PathVariable UUID roleId,
            @RequestBody Set<String> permissionCodes) {

        String msg = "Cập nhật quyền cho vai trò thành công";
        RoleResponse updatedRole = roleServicePort.updatePermissions(roleId, permissionCodes);

        return ResponseEntity.ok(ApiResponse.<RoleResponse>builder()
                .data(updatedRole)
                .message(msg)
                .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> registerPermissions(
            @RequestBody PermissionRegistrationRequest request) {
        String msg = "Tự động đăng ký quyền thành công";
        roleServicePort.registerPermissions(request);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(msg)
                .build());
    }

    @PatchMapping("/reorder")
    @PreAuthorize("hasAuthority('role:edit')")
    public ResponseEntity<ApiResponse<Void>> reorderPermissions(
            @RequestBody Map<String, Integer> positionMap) {
        String msg = "Cập nhật thứ tự quyền hạn thành công";
        roleServicePort.reorderPermissions(positionMap);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message(msg)
                .build());
    }

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<Set<String>>> getUserPermissions(@PathVariable UUID userId) {
        String msg = "Lấy quyền hạn người dùng thành công";
        UserModel user = userLookupService.findActiveByIdOrThrow(userId);

        if (user.getRole() == null || user.getRole().getPermissions() == null) {
            return ResponseEntity.ok(ApiResponse.<Set<String>>builder()
                    .data(Collections.emptySet())
                    .message(msg)
                    .build());
        }

        Set<String> permissions = user.getRole().getPermissions().stream()
                .filter(Objects::nonNull)
                .map(PermissionModel::getCode)
                .collect(Collectors.toSet());

        return ResponseEntity.ok(ApiResponse.<Set<String>>builder()
                .data(permissions)
                .message(msg)
                .build());
    }
}
