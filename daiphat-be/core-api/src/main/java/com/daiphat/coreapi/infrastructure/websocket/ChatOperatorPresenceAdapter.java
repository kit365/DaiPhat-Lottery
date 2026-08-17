package com.daiphat.coreapi.infrastructure.websocket;

import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.chat.ChatOperatorPresencePort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ChatOperatorPresenceAdapter implements ChatOperatorPresencePort {

    private final SimpUserRegistry simpUserRegistry;
    private final UserLookupServicePort userLookupServicePort;

    @Override
    public Optional<UserModel> findOnlineOperator() {
        return findOnlineOperators().stream().findFirst();
    }

    @Override
    public List<UserModel> findOnlineOperators() {
        return simpUserRegistry.getUsers().stream()
                .map(SimpUser::getName)
                .map(userLookupServicePort::findByUsername)
                .flatMap(Optional::stream)
                .filter(this::isEligibleOperator)
                .sorted(Comparator.comparing(
                        user -> user.getUsername() == null ? "" : user.getUsername(),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .toList();
    }

    @Override
    public boolean isOperatorOnline(UUID operatorId) {
        if (operatorId == null) {
            return false;
        }
        return userLookupServicePort.findById(operatorId)
                .map(this::isConnected)
                .orElse(false);
    }

    private boolean isConnected(UserModel user) {
        String username = user.getUsername();
        if (username != null && !username.isBlank() && simpUserRegistry.getUser(username) != null) {
            return true;
        }
        return simpUserRegistry.getUsers().stream()
                .map(SimpUser::getName)
                .anyMatch(name -> name != null && username != null && name.equalsIgnoreCase(username));
    }

    private boolean isEligibleOperator(UserModel user) {
        return user.getRole() != null
                && RoleConstants.ROLE_STAFF_OPERATOR.equals(user.getRole().getCode())
                && user.getStatus() == UserStatus.ACTIVE;
    }
}
