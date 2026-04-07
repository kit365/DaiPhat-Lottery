package com.daiphat.accountservice.application.port.out;

import com.daiphat.accountservice.domain.model.RoleModel;

import java.util.Optional;

public interface RoleRepositoryPort {
    Optional<RoleModel> findByCode(String code);
}
