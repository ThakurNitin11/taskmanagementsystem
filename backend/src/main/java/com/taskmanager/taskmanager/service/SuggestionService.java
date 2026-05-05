package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.dto.SuggestionResponse;
import com.taskmanager.taskmanager.model.Priority;
import com.taskmanager.taskmanager.model.Project;
import com.taskmanager.taskmanager.model.Task;
import com.taskmanager.taskmanager.model.User;
import com.taskmanager.taskmanager.repository.ProjectRepository;
import com.taskmanager.taskmanager.repository.TaskRepository;
import com.taskmanager.taskmanager.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;

@Service
public class SuggestionService {

    private static final String ADMIN_ROLE = "ROLE_ADMIN";
    private static final String MANAGER_ROLE = "ROLE_MANAGER";
    private static final String STATUS_DONE = "DONE";

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public SuggestionService(
            TaskRepository taskRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository
    ) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public List<SuggestionResponse> getSuggestions(Principal principal) {
        User user = userRepository.findByEmailIgnoreCase(principal.getName())
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        List<Task> tasks = findVisibleTasks(user);
        return buildSuggestions(tasks);
    }

    private List<Task> findVisibleTasks(User user) {
        if (ADMIN_ROLE.equals(user.getRole())) {
            return taskRepository.findAll();
        }

        if (MANAGER_ROLE.equals(user.getRole())) {
            List<Long> projectIds = projectRepository.findByManagerIdOrCreatedBy(user.getId(), user.getEmail())
                    .stream()
                    .map(Project::getId)
                    .filter(Objects::nonNull)
                    .toList();

            if (projectIds.isEmpty()) {
                return List.of();
            }

            return taskRepository.findByProjectIdIn(projectIds);
        }

        return taskRepository.findByAssignedTo(user.getEmail());
    }

    private List<SuggestionResponse> buildSuggestions(List<Task> tasks) {
        List<SuggestionResponse> suggestions = new ArrayList<>();
        LocalDate today = LocalDate.now();
        LocalDate nextTwoDays = today.plusDays(2);

        long totalTasks = tasks.size();
        if (totalTasks == 0) {
            suggestions.add(new SuggestionResponse(
                    "NO_TASKS",
                    "No tasks assigned",
                    "You do not have any tasks right now.",
                    "info",
                    0
            ));
            return suggestions;
        }

        long completedTasks = tasks.stream()
                .filter(task -> STATUS_DONE.equalsIgnoreCase(nullSafe(task.getStatus())))
                .count();
        long highPriorityPending = tasks.stream()
                .filter(task -> Priority.HIGH.equals(task.getPriority()))
                .filter(this::isPending)
                .count();
        long dueSoon = tasks.stream()
                .filter(task -> task.getDueDate() != null)
                .filter(task -> !task.getDueDate().isBefore(today))
                .filter(task -> !task.getDueDate().isAfter(nextTwoDays))
                .filter(this::isPending)
                .count();
        long overdue = tasks.stream()
                .filter(task -> task.getDueDate() != null)
                .filter(task -> task.getDueDate().isBefore(today))
                .filter(this::isPending)
                .count();

        if (highPriorityPending > 0) {
            suggestions.add(new SuggestionResponse(
                    "HIGH_PRIORITY_PENDING",
                    "High priority tasks need attention",
                    "You have " + highPriorityPending + " high priority pending tasks. Complete them first.",
                    "warning",
                    highPriorityPending
            ));
        }

        if (dueSoon > 0) {
            suggestions.add(new SuggestionResponse(
                    "DUE_SOON",
                    "Tasks due soon",
                    dueSoon + " tasks may become overdue soon.",
                    "info",
                    dueSoon
            ));
        }

        if (overdue > 0) {
            suggestions.add(new SuggestionResponse(
                    "OVERDUE",
                    "Overdue tasks",
                    "You have " + overdue + " overdue tasks. Review them as soon as possible.",
                    "danger",
                    overdue
            ));
        }

        long progress = (completedTasks * 100) / totalTasks;
        if (progress >= 70) {
            suggestions.add(new SuggestionResponse(
                    "GOOD_PROGRESS",
                    "Good progress",
                    "You completed " + progress + "% of your tasks. Great progress.",
                    "success",
                    completedTasks
            ));
        }

        return suggestions;
    }

    private boolean isPending(Task task) {
        return !STATUS_DONE.equalsIgnoreCase(nullSafe(task.getStatus()));
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
