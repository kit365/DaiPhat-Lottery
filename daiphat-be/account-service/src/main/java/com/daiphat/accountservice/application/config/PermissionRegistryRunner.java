package com.daiphat.accountservice.application.config;

import com.daiphat.accountservice.application.dto.request.PermissionItemDTO;
import com.daiphat.accountservice.application.dto.request.PermissionRegistrationRequestDTO;
import com.daiphat.accountservice.application.port.in.RoleServicePort;
import com.daiphat.accountservice.domain.model.enums.AppPermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Reference Implementation: Tự động đăng ký quyền của service khi khởi chạy.
 * Sử dụng ApplicationReadyEvent để đảm bảo toàn bộ hệ thống đã sẵn sàng.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PermissionRegistryRunner {

    private final RoleServicePort roleServicePort;

    @Value("${spring.application.name:ACCOUNT_SERVICE}")
    private String serviceName;

    @EventListener(ApplicationReadyEvent.class)
    public void registerPermissions() {
        log.info("System: Starting automatic permission registration for [{}]...", serviceName);

        List<PermissionItemDTO> items = Arrays.stream(AppPermission.values())
                .map(p -> PermissionItemDTO.builder()
                        .code(p.getCode())
                        .name(p.getName())
                        .description(p.getDescription())
                        .module(p.getModule())
                        .position(p.getPosition())
                        .build())
                .toList();

        PermissionRegistrationRequestDTO request = PermissionRegistrationRequestDTO.builder()
                .permissions(items)
                .build();

        roleServicePort.registerPermissions(request);
        roleServicePort.syncAdminPermissions();
        log.info("System: Successfully registered permissions and synchronized admin roles.");
    }
}
