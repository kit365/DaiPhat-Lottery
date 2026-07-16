package com.daiphat.coreapi.application.config;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.dto.request.permission.PermissionRegistrationRequest;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.AppPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Tự động đăng ký toàn bộ quyền (Permissions) hiện có từ AppPermission khi ứng dụng khởi chạy.
 * Đồng thời tự động đồng bộ hóa toàn bộ các quyền này cho vai trò ADMIN.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionRegistryRunner {

    private final RoleServicePort roleServicePort;

    @Value("${spring.application.name}")
    private String serviceName;

    @EventListener(ApplicationReadyEvent.class)
    public void registerPermissions() {
        log.info("System: Starting automatic permission registration for [{}]...", serviceName);

        List<PermissionItem> items = Arrays.stream(AppPermission.values())
                .map(p -> PermissionItem.builder()
                        .code(p.getCode())
                        .name(p.getName())
                        .description(p.getDescription())
                        .module(p.getModule())
                        .position(p.getPosition())
                        .build())
                .toList();

        PermissionRegistrationRequest request = PermissionRegistrationRequest.builder()
                .permissions(items)
                .build();

        roleServicePort.registerPermissions(request);
        roleServicePort.syncAdminPermissions();
        roleServicePort.syncOperatorStaffPermissions();
        log.info("System: Successfully registered {} permissions and synchronized admin and operator roles.", items.size());
    }
}
