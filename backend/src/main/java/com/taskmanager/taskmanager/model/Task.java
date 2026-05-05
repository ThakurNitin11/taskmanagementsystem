package com.taskmanager.taskmanager.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;

    private String description;

    private String status; // TODO, IN_PROGRESS, DONE

    @Enumerated(EnumType.STRING)
    private Priority priority = Priority.MEDIUM;

    private String assignedTo; // member email

    @Transient
    private Long assignedToId;

    private Long projectId;

    private LocalDate dueDate;

    @PrePersist
    public void prePersist() {
        if (priority == null) {
            priority = Priority.MEDIUM;
        }
        if (status == null || status.isEmpty()) {
            status = "TODO";
        }
    }
}
