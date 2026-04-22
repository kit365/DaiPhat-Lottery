package com.daiphat.apigatewayservice;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

@SpringBootTest
class ApiGatewayServiceApplicationTests {

    @MockBean
    ReactiveJwtDecoder reactiveJwtDecoder;

    @Test
    void contextLoads() {
    }

}
