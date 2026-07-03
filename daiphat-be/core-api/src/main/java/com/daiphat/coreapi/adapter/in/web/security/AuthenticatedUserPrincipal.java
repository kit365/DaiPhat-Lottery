package com.daiphat.coreapi.adapter.in.web.security;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.security.Principal;
import java.util.UUID;

@Getter
@RequiredArgsConstructor
public class AuthenticatedUserPrincipal implements Principal {

    private final UUID id;
    private final String username;

    @Override
    public String getName() {
        return id.toString();
    }
}
