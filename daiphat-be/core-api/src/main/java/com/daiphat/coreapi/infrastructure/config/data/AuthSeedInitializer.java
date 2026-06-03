package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.RoleConstants;
import com.daiphat.coreapi.infrastructure.persistence.entity.RoleEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.RoleRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AuthSeedInitializer implements ApplicationRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${daiphat.auth.seed.admin.username:}")
    private String adminUsername;

    @Value("${daiphat.auth.seed.admin.password:}")
    private String adminPassword;

    @Value("${daiphat.auth.seed.admin.email:}")
    private String adminEmail;

    @Value("${daiphat.auth.seed.admin.first-name:}")
    private String adminFirstName;

    @Value("${daiphat.auth.seed.admin.last-name:}")
    private String adminLastName;

    @Value("${daiphat.auth.seed.member.username:}")
    private String memberUsername;

    @Value("${daiphat.auth.seed.member.password:}")
    private String memberPassword;

    @Value("${daiphat.auth.seed.member.email:}")
    private String memberEmail;

    @Value("${daiphat.auth.seed.member.first-name:}")
    private String memberFirstName;

    @Value("${daiphat.auth.seed.member.last-name:}")
    private String memberLastName;

    @Value("${daiphat.auth.seed.street-agent.username:}")
    private String streetAgentUsername;

    @Value("${daiphat.auth.seed.street-agent.password:}")
    private String streetAgentPassword;

    @Value("${daiphat.auth.seed.street-agent.email:}")
    private String streetAgentEmail;

    @Value("${daiphat.auth.seed.street-agent.first-name:}")
    private String streetAgentFirstName;

    @Value("${daiphat.auth.seed.street-agent.last-name:}")
    private String streetAgentLastName;

    @Value("${daiphat.auth.seed.operator.username:}")
    private String operatorUsername;

    @Value("${daiphat.auth.seed.operator.password:}")
    private String operatorPassword;

    @Value("${daiphat.auth.seed.operator.email:}")
    private String operatorEmail;

    @Value("${daiphat.auth.seed.operator.first-name:}")
    private String operatorFirstName;

    @Value("${daiphat.auth.seed.operator.last-name:}")
    private String operatorLastName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedAccount(RoleConstants.ADMIN, adminUsername, adminPassword, adminEmail, adminFirstName, adminLastName);
        seedAccount(RoleConstants.ROLE_MEMBER, memberUsername, memberPassword, memberEmail, memberFirstName, memberLastName);
        seedAccount(
                RoleConstants.ROLE_STREET_AGENT,
                streetAgentUsername,
                streetAgentPassword,
                streetAgentEmail,
                streetAgentFirstName,
                streetAgentLastName
        );
        seedAccount(
                RoleConstants.ROLE_STAFF_OPERATOR,
                operatorUsername,
                operatorPassword,
                operatorEmail,
                operatorFirstName,
                operatorLastName
        );
    }

    private void seedAccount(
            String roleCode,
            String username,
            String password,
            String email,
            String firstName,
            String lastName
    ) {
        if (username == null || username.isBlank() || email == null || email.isBlank()) {
            return;
        }

        if (userRepository.existsByUsername(username) || userRepository.existsByEmail(email)) {
            return;
        }

        RoleEntity role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new IllegalStateException("Missing seed role: " + roleCode));

        String encodedPassword = passwordEncoder.encode(password);
        LocalDateTime now = LocalDateTime.now();

        UserEntity user = UserEntity.builder()
                .role(role)
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .status("ACTIVE")
                .emailVerified(true)
                .agreedToTerms(true)
                .hasPassword(true)
                .password(encodedPassword)
                .failedLoginAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .createdBy("SYSTEM")
                .lastModifiedBy("SYSTEM")
                .build();

        userRepository.save(user);
    }
}
