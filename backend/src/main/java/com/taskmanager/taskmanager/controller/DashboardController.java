package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.dto.DashboardResponse;
import com.taskmanager.taskmanager.service.DashboardService;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping({"/dashboard", "/api/dashboard"})
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardResponse dashboard(Principal principal) {
        return dashboardService.getDashboard(principal);
    }
}
