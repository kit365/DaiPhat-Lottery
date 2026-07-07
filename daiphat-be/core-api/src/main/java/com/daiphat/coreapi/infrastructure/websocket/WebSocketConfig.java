package com.daiphat.coreapi.infrastructure.websocket;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.application.config.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.net.URI;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String WS_ENDPOINT = ApiConstants.API_V1 + "/ws";

    private final AuthProperties authProperties;
    private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker(
                WebSocketDestinationConstants.TOPIC_PREFIX,
                WebSocketDestinationConstants.QUEUE_PREFIX,
                WebSocketDestinationConstants.USER_PREFIX
        );
        registry.setApplicationDestinationPrefixes(WebSocketDestinationConstants.APP_PREFIX);
        registry.setUserDestinationPrefix(WebSocketDestinationConstants.USER_PREFIX);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint(WS_ENDPOINT)
                .setAllowedOrigins(resolveAllowedOrigins().toArray(String[]::new))
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthChannelInterceptor);
    }

    private List<String> resolveAllowedOrigins() {
        List<String> configuredOrigins = authProperties.getCors().getAllowedOrigins();
        if (configuredOrigins != null && !configuredOrigins.isEmpty()) {
            return configuredOrigins;
        }

        String frontendUrl = authProperties.getFrontendUrl();
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return List.of("http://localhost:5173");
        }

        try {
            URI uri = URI.create(frontendUrl);
            if (uri.getScheme() != null && uri.getHost() != null) {
                String origin = uri.getScheme() + "://" + uri.getHost()
                        + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
                return List.of(origin);
            }
        } catch (IllegalArgumentException ignored) {
            // Fallback below if frontendUrl is not a valid URI.
        }

        return List.of(frontendUrl);
    }
}
