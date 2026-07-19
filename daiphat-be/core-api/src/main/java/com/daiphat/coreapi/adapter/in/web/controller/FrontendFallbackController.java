package com.daiphat.coreapi.adapter.in.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class FrontendFallbackController {

    @GetMapping({
            "/",
            "/{path:[^\\.]*}",
            "/admin/**",
            "/auth/**",
            "/blogs/**",
            "/checkout/**",
            "/payment/**",
            "/profile/**"
    })
    public String forwardClientRoute() {
        return "forward:/index.html";
    }
}
