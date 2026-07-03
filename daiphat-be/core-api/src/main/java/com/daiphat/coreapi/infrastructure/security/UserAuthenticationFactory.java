package com.daiphat.coreapi.infrastructure.security;

import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.domain.model.UserModel;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class UserAuthenticationFactory {

    public UsernamePasswordAuthenticationToken create(UserModel user) {
        return new UsernamePasswordAuthenticationToken(
                new AuthenticatedUserPrincipal(user.getId(), user.getUsername()),
                null,
                authorities(user)
        );
    }

    private List<SimpleGrantedAuthority> authorities(UserModel user) {
        if (user.getRole() == null || user.getRole().getCode() == null || user.getRole().getCode().isBlank()) {
            return List.of();
        }

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority(user.getRole().getCode()));

        if (user.getRole().getPermissions() != null) {
            user.getRole().getPermissions().forEach(permission -> {
                if (permission.getCode() != null && !permission.getCode().isBlank()) {
                    authorities.add(new SimpleGrantedAuthority(permission.getCode()));
                }
            });
        }

        return authorities;
    }
}
