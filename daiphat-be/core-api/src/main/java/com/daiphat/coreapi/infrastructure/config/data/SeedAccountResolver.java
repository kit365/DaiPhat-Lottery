package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Resolves canonical demo/bootstrap accounts for local fixture seeders.
 * Prefers configured usernames so fixtures never attach to an arbitrary ROLE_MEMBER.
 */
@Component
public class SeedAccountResolver {

    private final UserRepository userRepository;

    @Value("${daiphat.auth.seed.member.username:member}")
    private String memberUsername;

    @Value("${daiphat.auth.seed.operator.username:operator}")
    private String operatorUsername;

    @Value("${daiphat.auth.seed.street-agent.username:street_agent}")
    private String streetAgentUsername;

    public SeedAccountResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserEntity findMember() {
        return userRepository.findByUsername(memberUsername)
                .or(() -> userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_MEMBER)).stream().findFirst())
                .orElse(null);
    }

    public UserEntity findOperator() {
        return userRepository.findByUsername(operatorUsername)
                .or(() -> userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR)).stream().findFirst())
                .or(() -> userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ADMIN)).stream().findFirst())
                .orElse(null);
    }

    public UserEntity findStreetAgent() {
        return userRepository.findByUsername(streetAgentUsername)
                .or(() -> userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STREET_AGENT)).stream().findFirst())
                .orElse(null);
    }
}
