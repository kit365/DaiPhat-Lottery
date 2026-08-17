package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.UserModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatOperatorPresencePort {

    Optional<UserModel> findOnlineOperator();

    List<UserModel> findOnlineOperators();

    boolean isOperatorOnline(UUID operatorId);
}
