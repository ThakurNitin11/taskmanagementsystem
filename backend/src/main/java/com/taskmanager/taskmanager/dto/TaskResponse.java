package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.model.Priority;
import com.taskmanager.taskmanager.model.Project;
import com.taskmanager.taskmanager.model.Task;
import com.taskmanager.taskmanager.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {

    private Long id;
    private String title;
    private String description;
    private String status;
    private Priority priority;
    private String assignedTo;

    private Long projectId;
    private String projectName;
    private String projectDescription;

    private Long managerId;
    private String managerName;
    private String managerEmail;

    private LocalDate dueDate;

    public static TaskResponse fromTask(Task task, Project project) {
        User manager = project == null ? null : project.getManager();

        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getPriority(),
                task.getAssignedTo(),

                task.getProjectId(),
                project == null ? null : project.getName(),
                project == null ? null : project.getDescription(),

                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getName(),
                manager == null ? null : manager.getEmail(),

                task.getDueDate()
        );
    }
}