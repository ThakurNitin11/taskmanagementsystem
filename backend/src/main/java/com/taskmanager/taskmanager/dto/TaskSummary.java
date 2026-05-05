package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.model.Priority;
import com.taskmanager.taskmanager.model.Task;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskSummary {
    private Long id;
    private String title;
    private String description;
    private String status;
    private Priority priority;
    private LocalDate dueDate;
    private Long projectId;
    private String projectName;

    public static TaskSummary fromTask(Task task, String projectName) {
        return new TaskSummary(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getPriority(),
                task.getDueDate(),
                task.getProjectId(),
                projectName
        );
    }
}
