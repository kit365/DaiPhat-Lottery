package com.daiphat.accountservice.application.service.auth;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.RoleServicePort;
import com.daiphat.accountservice.application.port.in.auth.OAuthProvisioningPort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.UserImageModel;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.OAuthUserInfo;
import com.daiphat.accountservice.domain.model.enums.InviteStatus;
import com.daiphat.accountservice.infrastructure.persistence.repository.StaffInviteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;



@Service
@RequiredArgsConstructor
@Slf4j
public class KeycloakProvisioningStrategy implements OAuthProvisioningPort {

    private final UserRepositoryPort userRepositoryPort;
    private final RoleServicePort roleServicePort;
    private final StaffInviteRepository staffInviteRepository;
    private final UserApplicationMapper userApplicationMapper;

    @Override
    @Transactional
    public UserModel provision(OAuthUserInfo userInfo) {
        log.info("Provisioning JIT user from {} context: {}", userInfo.provider(), userInfo.username());

        RoleModel role = resolveRole(userInfo.email());

        UserModel user = userApplicationMapper.toUserModel(userInfo);
        user.setRole(role);
        user.setImages(new ArrayList<>());


        if (userInfo.avatarUrl() != null && !userInfo.avatarUrl().isBlank()) {
            UserImageModel avatar = userApplicationMapper.toUserImageModel(userInfo.avatarUrl(), user.getId());
            user.getImages().add(avatar);
            log.debug("Avatar synchronized for user: {}", userInfo.username());
        }

        log.info("Persisting new user account mirror (Local DB): {}", user.getUsername());
        return userRepositoryPort.save(user);
    }

    private RoleModel resolveRole(String email) {
        return staffInviteRepository.findByEmailAndStatus(email, InviteStatus.APPROVED)
                .map(invite -> {
                    log.info("Staff invite hit for {}. Assigning role: {}", email, invite.getRole().getName());
                    try {
                        return roleServicePort.getRoleByCode(invite.getRole().getCode());
                    } catch (DomainException e) {
                        log.warn("Invited role not found in system. Falling back to default.");
                        return roleServicePort.getDefaultRole();
                    }
                })
                .orElseGet(() -> {
                    log.debug("No staff invite found for {}. Assigning default member role.", email);
                    return roleServicePort.getDefaultRole();
                });
    }
}
