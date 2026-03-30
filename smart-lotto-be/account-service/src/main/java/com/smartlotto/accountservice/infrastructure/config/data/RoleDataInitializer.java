package com.smartlotto.accountservice.infrastructure.config.data;

import com.smartlotto.accountservice.domain.model.enums.UserRole;
import com.smartlotto.accountservice.infrastructure.persistence.entity.RoleEntity;
import com.smartlotto.accountservice.infrastructure.persistence.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Trình khởi tạo dữ liệu Role - Chạy ngay khi ứng dụng khởi động.
 * Đảm bảo Database luôn có sẵn các Role mặc định (USER, ADMIN).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RoleDataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        log.info("Initializing default roles if they do not exist...");
        
        initializeRole(UserRole.USER.getCode(), "User Role", "Default role for end users");
        initializeRole(UserRole.ADMIN.getCode(), "Admin Role", "Role for system administrators");
        
        log.info("Role initialization completed.");
    }

    private void initializeRole(String code, String name, String description) {
        if (roleRepository.findByCode(code).isEmpty()) {
            log.info("Creating role: {}", code);
            RoleEntity role = RoleEntity.builder()
                    .id(UUID.randomUUID())
                    .code(code)
                    .name(name)
                    .description(description)
                    .build();
            roleRepository.save(role);
        } else {
            log.debug("Role {} already exists.", code);
        }
    }
}
