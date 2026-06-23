package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.dto.response.auth.RoleResponse;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final RoleServicePort roleServicePort;

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
    @PreAuthorize("hasAuthority('role:view')")
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
    @PreAuthorize("hasAuthority('role:view')")
    public ResponseEntity<ApiResponse<Set<String>>> getUserPermissions(@PathVariable UUID userId) {
        String msg = "Lấy quyền hạn người dùng thành công";
        return ResponseEntity.ok(ApiResponse.<Set<String>>builder()
                .data(roleServicePort.getUserPermissionCodes(userId))
                .message(msg)
                .build());
    }
}
