package com.daiphat.accountservice.infrastructure.config.data;

import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
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
        // Optimization: Run-Once Check
        // If the 'admin' account already exists, we skip the bulk Keycloak sync check
        // to keep startup fast and silent.
        if (userRepositoryPort.existsByUsername("admin")) {
            log.debug("Initial admin exists. Skipping Keycloak synchronization.");
            return;
        }

        log.info("Performing first-time identity synchronization...");
        
        try {
            List<UserModel> keycloakUsers = identityManagementPort.getAllUsers();
            
            RoleModel adminRole = roleRepositoryPort.findByCode(UserRole.ADMIN.getCode())
                    .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
            RoleModel userRole = roleRepositoryPort.findByCode(UserRole.MEMBER.getCode())
                    .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));

            int createdCount = 0;
            for (UserModel kcUser : keycloakUsers) {
                // The prompt for simplicity: Just check existence and skip
                if (userRepositoryPort.existsById(kcUser.getId())) {
                    continue; 
                }

                log.debug("Synchronizing new user: {}", kcUser.getUsername());

                // Assign role based on username
                if (kcUser.getUsername().equalsIgnoreCase("admin")) {
                    kcUser.setRole(adminRole);
                } else {
                    kcUser.setRole(userRole);
                }
                
                kcUser.setStatus(UserStatus.ACTIVE);
                kcUser.setEmailVerified(true);
                kcUser.setHasPassword(true);
                kcUser.setAgreedToTerms(true);
                
                userRepositoryPort.save(kcUser);
                createdCount++;
            }
            
            if (createdCount > 0) {
                log.info("First-time synchronization completed: {} accounts provisioned.", createdCount);
            }
        } catch (Exception e) {
            log.error("Silent Warning: Keycloak sync skipped (Identity Provider not ready or unreachable).");
        }
    }
}
