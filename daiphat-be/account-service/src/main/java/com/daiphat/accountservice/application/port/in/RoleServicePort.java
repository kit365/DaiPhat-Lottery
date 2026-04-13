package com.daiphat.accountservice.application.port.in;

import com.daiphat.accountservice.domain.model.RoleModel;

public interface RoleServicePort {
    RoleModel getDefaultRole();
}
