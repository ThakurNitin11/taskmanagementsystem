package com.taskmanager.taskmanager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectSummary {
    private Long id;
    private String name;
    private String description;
    private long membersCount;
    private long totalTasks;
    private long completedTasks;
    private long progress;
}
