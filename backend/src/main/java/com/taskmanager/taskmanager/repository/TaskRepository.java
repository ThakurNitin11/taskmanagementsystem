package com.taskmanager.taskmanager.repository;

import com.taskmanager.taskmanager.model.Task;
import com.taskmanager.taskmanager.model.Priority;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByAssignedTo(String email);

    List<Task> findByProjectId(Long projectId);

    List<Task> findByProjectIdIn(List<Long> projectIds);

    long countByAssignedTo(String email);

    long countByStatus(String status);

    long countByAssignedToAndStatus(String email, String status);

    long countByStatusIn(List<String> statuses);

    long countByAssignedToAndStatusIn(String email, List<String> statuses);

    long countByAssignedToAndPriority(String email, Priority priority);

    long countByDueDateBeforeAndStatusNot(LocalDate dueDate, String status);

    long countByAssignedToAndDueDateBeforeAndStatusNot(String email, LocalDate dueDate, String status);

    List<Task> findByAssignedToAndDueDateBetweenAndStatusNot(
            String email,
            LocalDate startDate,
            LocalDate endDate,
            String status
    );

    boolean existsByProjectId(Long projectId);
}
