package com.smartlotto.accountservice.infrastructure.config.data;

import com.smartlotto.accountservice.application.port.out.IdentityManagementPort;
import com.smartlotto.accountservice.application.port.out.RoleRepositoryPort;
import com.smartlotto.accountservice.application.port.out.UserRepositoryPort;
import com.smartlotto.accountservice.domain.model.RoleModel;
import com.smartlotto.accountservice.domain.model.UserModel;
import com.smartlotto.accountservice.domain.model.enums.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final IdentityManagementPort identityManagementPort;
    private final UserRepositoryPort userRepositoryPort;
    private final RoleRepositoryPort roleRepositoryPort;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initData() {
        log.info("Starting data synchronization from Keycloak...");
        
        try {
            List<UserModel> keycloakUsers = identityManagementPort.getAllUsers();
            
            RoleModel adminRole = roleRepositoryPort.findByCode(UserRole.ADMIN.getCode())
                    .orElse(null);
            RoleModel userRole = roleRepositoryPort.findByCode(UserRole.USER.getCode())
                    .orElse(null);

            for (UserModel kcUser : keycloakUsers) {
                if (!userRepositoryPort.existsByUsername(kcUser.getUsername())) {
                    log.info("Synchronizing user from Keycloak: {}", kcUser.getUsername());
                    
                    // Assign role based on username (basic logic for init)
                    if (kcUser.getUsername().equalsIgnoreCase("admin")) {
                        kcUser.setRole(adminRole);
                    } else {
                        kcUser.setRole(userRole);
                    }
                    
                    kcUser.setStatus("ACTIVE");
                    kcUser.setEmailVerified(true);
                    
                    userRepositoryPort.save(kcUser);
                    log.info("User {} synchronized successfully with ID: {}", kcUser.getUsername(), kcUser.getId());
                } else {
                    log.debug("User {} already exists in DB, skipping sync.", kcUser.getUsername());
                }
            }
            
            log.info("Data synchronization completed.");
        } catch (Exception e) {
            log.error("Failed to synchronize data from Keycloak", e);
        }
    }
}
