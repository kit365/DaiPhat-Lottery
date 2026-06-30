package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.UserModel;

import java.util.Optional;

public interface ChatOperatorPresencePort {

    Optional<UserModel> findOnlineOperator();
}
