package com.smartlotto.accountservice.infrastructure.adapter.auth;

import com.smartlotto.accountservice.application.port.out.RoleRepositoryPort;
import com.smartlotto.accountservice.domain.model.RoleModel;
import com.smartlotto.accountservice.infrastructure.persistence.mapper.RolePersistenceMapper;
import com.smartlotto.accountservice.infrastructure.persistence.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RoleRepositoryAdapter implements RoleRepositoryPort {

    private final RoleRepository roleRepository;
    private final RolePersistenceMapper rolePersistenceMapper;

    @Override
    public Optional<RoleModel> findByCode(String code) {
        return roleRepository.findByCode(code)
                .map(rolePersistenceMapper::toDomain);
    }
}
