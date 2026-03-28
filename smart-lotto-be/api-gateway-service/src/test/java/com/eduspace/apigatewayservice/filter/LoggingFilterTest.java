package com.eduspace.apigatewayservice.filter;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LoggingFilterTest {

    private final LoggingFilter loggingFilter = new LoggingFilter();

    @Test
    void filter_LogsRequestAndContinues() {
        // Arrange
        MockServerHttpRequest request = MockServerHttpRequest.get("/api/test")
                .remoteAddress(new java.net.InetSocketAddress(8080))
                .build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any(ServerWebExchange.class))).thenReturn(Mono.empty());

        // Act
        Mono<Void> result = loggingFilter.filter(exchange, chain);

        // Assert
        assertThat(result).isNotNull();
        verify(chain).filter(exchange);
    }

    @Test
    void getOrder_ReturnsLowestPrecedence() {
        assertThat(loggingFilter.getOrder()).isEqualTo(org.springframework.core.Ordered.LOWEST_PRECEDENCE);
    }
}
