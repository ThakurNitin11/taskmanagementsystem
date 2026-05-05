package com.taskmanager.taskmanager.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
public class TestController {

    @GetMapping("/test-secure")
    public String test() {
        return "Secure API working 🔒";
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String admin() {
        return "Admin only 👑";
    }

    @GetMapping("/member")
    @PreAuthorize("hasAnyRole('ADMIN','MEMBER')")
    public String member() {
        return "Member access ✅";
    }
}