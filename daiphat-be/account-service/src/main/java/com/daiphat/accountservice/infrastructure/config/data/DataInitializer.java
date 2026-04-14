package com.daiphat.accountservice.infrastructure.config.data;

import com.daiphat.accountservice.application.port.out.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.application.port.out.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.enums.UserRole;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
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
                    .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
            RoleModel userRole = roleRepositoryPort.findByCode(UserRole.MEMBER.getCode())
                    .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));

            for (UserModel kcUser : keycloakUsers) {
                // Progressive Sync & Self-Healing:
                // 1. First, check if ID already exists (fast path)
                if (userRepositoryPort.existsById(kcUser.getId())) {
                    log.debug("User with ID {} already exists in DB, skipping sync.", kcUser.getId());
                    continue;
                }

                log.info("Synchronizing user from Keycloak: {} (ID: {})", kcUser.getUsername(), kcUser.getId());

                // 2. Resilience check: If ID is missing but username or email exists, we must RECONCILE (Update ID)
                // This prevents unique constraint violations from legacy or manually inserted data.
                userRepositoryPort.findByUsername(kcUser.getUsername())
                        .or(() -> userRepositoryPort.findByEmail(kcUser.getEmail()))
                        .ifPresentOrElse(
                            existingUser -> {
                                log.warn("Sync Conflict: User {} exists with different ID (Local: {}, KC: {}). Reconciling...", 
                                        kcUser.getUsername(), existingUser.getId(), kcUser.getId());
                                userRepositoryPort.updateUserId(existingUser.getId(), kcUser.getId());
                                log.info("Reconciliation SUCCESS: ID {} updated to {} for user {}", 
                                        existingUser.getId(), kcUser.getId(), kcUser.getUsername());
                            },
                            () -> log.debug("No existing record found for {}. Proceeding with fresh insert.", kcUser.getUsername())
                        );

                // 3. Prepare and Save (Upsert pattern)
                // Assign role based on username (basic logic for init)
                if (kcUser.getUsername().equalsIgnoreCase("admin")) {
                    kcUser.setRole(adminRole);
                } else {
                    kcUser.setRole(userRole);
                }
                
                kcUser.setStatus(UserStatus.ACTIVE);
                kcUser.setEmailVerified(true);
                
                userRepositoryPort.save(kcUser);
                log.info("User {} synchronized successfully.", kcUser.getUsername());
            }
            
            log.info("Data synchronization completed.");
        } catch (Exception e) {
            log.error("Failed to synchronize data from Keycloak", e);
        }
    }
}
