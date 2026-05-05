package com.taskmanager.taskmanager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecentActivity {
    private Long id;
    private Long taskId;
    private String taskTitle;
    private String action;
    private String oldValue;
    private String newValue;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
