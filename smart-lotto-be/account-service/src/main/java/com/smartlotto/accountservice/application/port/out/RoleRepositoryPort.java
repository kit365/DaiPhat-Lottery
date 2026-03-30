package com.smartlotto.accountservice.application.port.out;

import com.smartlotto.accountservice.domain.model.RoleModel;

import java.util.Optional;

public interface RoleRepositoryPort {
    Optional<RoleModel> findByCode(String code);
}
