package com.daiphat.coreapi.infrastructure.config;

import com.daiphat.coreapi.domain.model.UserModel;
import org.springframework.data.domain.AuditorAware;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AuditorAwareImpl implements AuditorAware<String> {

    @Override
    @NonNull
    public Optional<String> getCurrentAuditor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() 
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.of("SYSTEM");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof UserModel userModel) {
            return Optional.ofNullable(userModel.getUsername());
        }

        return Optional.ofNullable(authentication.getName());
    }
}
