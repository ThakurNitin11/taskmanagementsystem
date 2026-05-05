package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.dto.SuggestionResponse;
import com.taskmanager.taskmanager.service.SuggestionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping({"/api/suggestions", "/suggestions"})
public class SuggestionController {

    private final SuggestionService suggestionService;

    public SuggestionController(SuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    @GetMapping
    public List<SuggestionResponse> getSuggestions(Principal principal) {
        return suggestionService.getSuggestions(principal);
    }
}
