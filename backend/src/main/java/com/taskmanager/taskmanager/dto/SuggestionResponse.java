package com.taskmanager.taskmanager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuggestionResponse {
    private String type;
    private String title;
    private String message;
    private String severity;
    private long count;
}
