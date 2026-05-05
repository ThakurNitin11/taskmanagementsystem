package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.model.Priority;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpcomingTask {
    private Long id;
    private String title;
    private Priority priority;
    private String status;
    private LocalDate dueDate;
    private String projectName;
    private String assignedTo;
}
