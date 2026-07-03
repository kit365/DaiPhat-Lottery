package com.daiphat.coreapi.infrastructure.websocket;

import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.auth.TokenProviderPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.infrastructure.security.UserAuthenticationFactory;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.NoSuchElementException;

@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final String AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final TokenProviderPort tokenProviderPort;
    private final UserLookupServicePort userLookupServicePort;
    private final UserAuthenticationFactory userAuthenticationFactory;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            UsernamePasswordAuthenticationToken authentication = authenticate(accessor);
            accessor.setUser(authentication);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        return message;
    }

    private UsernamePasswordAuthenticationToken authenticate(StompHeaderAccessor accessor) {
        String header = resolveAuthorizationHeader(accessor);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            throw new IllegalArgumentException("Missing or invalid Authorization header for WebSocket CONNECT.");
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        try {
            String username = tokenProviderPort.extractUsernameFromAccessToken(token);
            UserModel user = userLookupServicePort.findByUsername(username)
                    .orElseThrow(() -> new NoSuchElementException("Token user not found"));
            return userAuthenticationFactory.create(user);
        } catch (JwtException | IllegalArgumentException | NoSuchElementException ex) {
            throw new IllegalArgumentException("Invalid or expired WebSocket token.", ex);
        }
    }

    private String resolveAuthorizationHeader(StompHeaderAccessor accessor) {
        List<String> values = accessor.getNativeHeader(AUTHORIZATION);
        if (values == null || values.isEmpty()) {
            values = accessor.getNativeHeader(AUTHORIZATION.toLowerCase());
        }
        if (values == null || values.isEmpty()) {
            return null;
        }
        return values.getFirst();
    }
}
