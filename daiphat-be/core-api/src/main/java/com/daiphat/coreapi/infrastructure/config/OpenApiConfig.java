package com.daiphat.coreapi.infrastructure.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI coreApiOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("DaiPhat Core API")
                        .version("1.0.0")
                        .description("API tai lieu cho backend chinh cua he thong DaiPhat.")
                        .contact(new Contact()
                                .name("DaiPhat Platform")
                                .email("admin@daiphat.com"))
                        .license(new License()
                                .name("Private")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                                .name("Authorization")
                                .description("Nhap JWT theo dang: Bearer <token>")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
