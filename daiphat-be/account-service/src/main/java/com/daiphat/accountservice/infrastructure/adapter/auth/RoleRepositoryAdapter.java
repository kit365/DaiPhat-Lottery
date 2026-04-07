package com.daiphat.accountservice.infrastructure.adapter.auth;

import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.infrastructure.persistence.mapper.RolePersistenceMapper;
import com.daiphat.accountservice.infrastructure.persistence.repository.RoleRepository;
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
