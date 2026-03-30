package com.smartlotto.apigatewayservice.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.OAuthFlow;
import io.swagger.v3.oas.models.security.OAuthFlows;
import io.swagger.v3.oas.models.security.Scopes;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Value("${smartlotto.auth.keycloak.auth-server-url:http://localhost:8180}")
    private String authServerUrl;

    @Value("${smartlotto.auth.keycloak.realm:smartlotto}")
    private String realm;

    @Bean
    public OpenAPI customOpenAPI() {
        String tokenUrl = String.format("%s/realms/%s/protocol/openid-connect/token", authServerUrl, realm);

        return new OpenAPI()
                .info(new Info()
                        .title("SmartLotto API Gateway")
                        .version("1.0.0")
                        .description("Tài liệu API tổng hợp cho hệ thống SmartLotto")
                        .license(new License().name("Apache 2.0").url("http://springdoc.org")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth").addList("keycloakAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT"))
                        .addSecuritySchemes("keycloakAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.OAUTH2)
                                .description("Login using Keycloak")
                                .flows(new OAuthFlows()
                                        .password(new OAuthFlow()
                                                .tokenUrl(tokenUrl)
                                                .scopes(new Scopes().addString("openid", "OpenID Connect scope"))))));
    }
}
