package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.port.in.RoleServicePort;
import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.enums.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class RoleService implements RoleServicePort {

    private final RoleRepositoryPort roleRepositoryPort;

    @Override
    public RoleModel getDefaultRole() {
        log.debug("Fetching default user role with code: {}", UserRole.USER.getCode());
        return roleRepositoryPort.findByCode(UserRole.USER.getCode())
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
    }
}
