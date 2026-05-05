package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.dto.DashboardResponse;
import com.taskmanager.taskmanager.dto.ProjectSummary;
import com.taskmanager.taskmanager.dto.RecentActivity;
import com.taskmanager.taskmanager.dto.TeamMemberSummary;
import com.taskmanager.taskmanager.dto.TaskSummary;
import com.taskmanager.taskmanager.dto.UpcomingTask;
import com.taskmanager.taskmanager.model.Priority;
import com.taskmanager.taskmanager.model.Project;
import com.taskmanager.taskmanager.model.Task;
import com.taskmanager.taskmanager.model.TaskHistory;
import com.taskmanager.taskmanager.model.User;
import com.taskmanager.taskmanager.repository.ProjectRepository;
import com.taskmanager.taskmanager.repository.TaskHistoryRepository;
import com.taskmanager.taskmanager.repository.TaskRepository;
import com.taskmanager.taskmanager.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private static final String ADMIN_ROLE = "ROLE_ADMIN";
    private static final String MANAGER_ROLE = "ROLE_MANAGER";
    private static final String MEMBER_ROLE = "ROLE_MEMBER";
    private static final String STATUS_DONE = "DONE";
    private static final String STATUS_TODO = "TODO";
    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TaskHistoryRepository taskHistoryRepository;
    private final UserRepository userRepository;

    public DashboardService(
            ProjectRepository projectRepository,
            TaskRepository taskRepository,
            TaskHistoryRepository taskHistoryRepository,
            UserRepository userRepository
    ) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.taskHistoryRepository = taskHistoryRepository;
        this.userRepository = userRepository;
    }

    public DashboardResponse getDashboard(Principal principal) {
        User user = userRepository.findByEmailIgnoreCase(principal.getName())
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        if (ADMIN_ROLE.equals(user.getRole())) {
            return buildResponse(
                    projectRepository.findAll(),
                    taskRepository.findAll(),
                    taskHistoryRepository.findTop5ByOrderByUpdatedAtDesc(),
                    true
            );
        }

        if (MANAGER_ROLE.equals(user.getRole())) {
            List<Project> projects = projectRepository.findByManagerIdOrCreatedBy(user.getId(), user.getEmail());
            List<Task> tasks = findTasksForProjects(projects);
            List<Long> projectIds = projectIds(projects);
            List<TaskHistory> recentActivity = projectIds.isEmpty()
                    ? List.of()
                    : taskHistoryRepository.findTop5ByTaskProjectIdInOrderByUpdatedAtDesc(projectIds);
            return buildResponse(projects, tasks, recentActivity, true);
        }

        if (MEMBER_ROLE.equals(user.getRole())) {
            return buildMemberResponse(user);
        }

        List<Project> projects = projectRepository.findByMembersEmail(user.getEmail());
        List<Task> tasks = taskRepository.findByAssignedTo(user.getEmail());
        List<TaskHistory> recentActivity = taskHistoryRepository.findTop5ByTaskAssignedToOrderByUpdatedAtDesc(user.getEmail());
        return buildResponse(projects, tasks, recentActivity, false);
    }

    private DashboardResponse buildMemberResponse(User user) {
        String email = user.getEmail();
        LocalDate today = LocalDate.now();
        LocalDate nextSevenDays = today.plusDays(7);

        List<Task> tasks = taskRepository.findByAssignedTo(email);
        List<Task> upcomingTasks = taskRepository.findByAssignedToAndDueDateBetweenAndStatusNot(
                email,
                today,
                nextSevenDays,
                STATUS_DONE
        );
        List<TaskHistory> recentActivities = taskHistoryRepository.findTop5ByTaskAssignedToOrderByUpdatedAtDesc(email);
        Map<Long, String> projectNamesById = findProjectNames(tasks, upcomingTasks);

        long totalTasks = taskRepository.countByAssignedTo(email);
        long completedTasks = taskRepository.countByAssignedToAndStatus(email, STATUS_DONE);
        long todoTasks = taskRepository.countByAssignedToAndStatus(email, STATUS_TODO);
        long inProgressTasks = taskRepository.countByAssignedToAndStatus(email, STATUS_IN_PROGRESS);
        long pendingTasks = todoTasks + inProgressTasks;
        long overdueTasks = taskRepository.countByAssignedToAndDueDateBeforeAndStatusNot(email, today, STATUS_DONE);
        long highPriorityTasks = taskRepository.countByAssignedToAndPriority(email, Priority.HIGH);
        long mediumPriorityTasks = taskRepository.countByAssignedToAndPriority(email, Priority.MEDIUM);
        long lowPriorityTasks = taskRepository.countByAssignedToAndPriority(email, Priority.LOW);
        long overallProgress = totalTasks > 0 ? (completedTasks * 100) / totalTasks : 0;

        DashboardResponse response = new DashboardResponse();
        response.setTotalProjects(projectRepository.countByMembersEmail(email));
        response.setTotalTasks(totalTasks);
        response.setCompletedTasks(completedTasks);
        response.setTodoTasks(todoTasks);
        response.setInProgressTasks(inProgressTasks);
        response.setPendingTasks(pendingTasks);
        response.setOverdueTasks(overdueTasks);
        response.setHighPriorityTasks(highPriorityTasks);
        response.setMediumPriorityTasks(mediumPriorityTasks);
        response.setLowPriorityTasks(lowPriorityTasks);
        response.setOverallProgress(overallProgress);
        response.setCompletedThisWeek(countCompletedThisWeek(email));
        response.setMyProjects(buildProjectSummaries(projectRepository.findByMembersEmail(email), tasks));
        response.setMyTeam(List.of());
        response.setMyTasks(buildTaskSummaries(tasks, projectNamesById));
        response.setUpcomingDeadlines(buildMemberUpcomingDeadlines(upcomingTasks, projectNamesById));
        response.setTodaysFocus(buildTodaysFocus(tasks, projectNamesById, today));
        response.setRecentActivity(buildRecentActivity(recentActivities));
        return response;
    }

    private DashboardResponse buildResponse(
            List<Project> projects,
            List<Task> tasks,
            List<TaskHistory> recentActivities,
            boolean includeTeam
    ) {
        LocalDate today = LocalDate.now();
        long totalTasks = tasks.size();
        long completedTasks = countByStatus(tasks, STATUS_DONE);
        long todoTasks = countByStatus(tasks, STATUS_TODO);
        long inProgressTasks = countByStatus(tasks, STATUS_IN_PROGRESS);
        long pendingTasks = todoTasks + inProgressTasks;
        long overdueTasks = tasks.stream()
                .filter(task -> task.getDueDate() != null)
                .filter(task -> task.getDueDate().isBefore(today))
                .filter(task -> !STATUS_DONE.equalsIgnoreCase(nullSafe(task.getStatus())))
                .count();
        long highPriorityTasks = tasks.stream()
                .filter(task -> Priority.HIGH.equals(task.getPriority()))
                .count();
        long mediumPriorityTasks = tasks.stream()
                .filter(task -> Priority.MEDIUM.equals(task.getPriority()))
                .count();
        long lowPriorityTasks = tasks.stream()
                .filter(task -> Priority.LOW.equals(task.getPriority()))
                .count();
        long overallProgress = totalTasks > 0 ? (completedTasks * 100) / totalTasks : 0;

        DashboardResponse response = new DashboardResponse();
        response.setTotalProjects(projects.size());
        response.setTotalTasks(totalTasks);
        response.setCompletedTasks(completedTasks);
        response.setPendingTasks(pendingTasks);
        response.setTodoTasks(todoTasks);
        response.setInProgressTasks(inProgressTasks);
        response.setOverdueTasks(overdueTasks);
        response.setHighPriorityTasks(highPriorityTasks);
        response.setMediumPriorityTasks(mediumPriorityTasks);
        response.setLowPriorityTasks(lowPriorityTasks);
        response.setOverallProgress(overallProgress);
        response.setMyProjects(buildProjectSummaries(projects, tasks));
        response.setMyTeam(includeTeam ? buildTeamSummaries(projects, tasks) : List.of());
        response.setUpcomingDeadlines(buildUpcomingDeadlines(projects, tasks, today));
        response.setRecentActivity(buildRecentActivity(recentActivities));
        return response;
    }

    private List<Task> findTasksForProjects(List<Project> projects) {
        List<Long> ids = projectIds(projects);
        if (ids.isEmpty()) {
            return List.of();
        }
        return taskRepository.findByProjectIdIn(ids);
    }

    private List<Long> projectIds(List<Project> projects) {
        return projects.stream()
                .map(Project::getId)
                .filter(Objects::nonNull)
                .toList();
    }

    private List<ProjectSummary> buildProjectSummaries(List<Project> projects, List<Task> tasks) {
        Map<Long, List<Task>> tasksByProject = tasks.stream()
                .filter(task -> task.getProjectId() != null)
                .collect(Collectors.groupingBy(Task::getProjectId));

        return projects.stream()
                .map(project -> {
                    List<Task> projectTasks = tasksByProject.getOrDefault(project.getId(), List.of());
                    long total = projectTasks.size();
                    long completed = countByStatus(projectTasks, STATUS_DONE);
                    long progress = total > 0 ? (completed * 100) / total : 0;
                    long membersCount = project.getMembers() == null ? 0 : project.getMembers().size();
                    return new ProjectSummary(
                            project.getId(),
                            project.getName(),
                            project.getDescription(),
                            membersCount,
                            total,
                            completed,
                            progress
                    );
                })
                .toList();
    }

    private List<TeamMemberSummary> buildTeamSummaries(List<Project> projects, List<Task> tasks) {
        Map<String, List<Task>> tasksByAssignee = tasks.stream()
                .filter(task -> task.getAssignedTo() != null)
                .collect(Collectors.groupingBy(task -> task.getAssignedTo().trim().toLowerCase()));

        Map<Long, User> membersById = new LinkedHashMap<>();
        for (Project project : projects) {
            Set<User> members = project.getMembers();
            if (members == null) {
                continue;
            }
            for (User member : members) {
                if (member.getId() != null) {
                    membersById.putIfAbsent(member.getId(), member);
                }
            }
        }

        return membersById.values().stream()
                .map(member -> {
                    String email = nullSafe(member.getEmail()).trim().toLowerCase();
                    List<Task> assignedTasks = tasksByAssignee.getOrDefault(email, List.of());
                    long completed = countByStatus(assignedTasks, STATUS_DONE);
                    return new TeamMemberSummary(
                            member.getId(),
                            member.getName(),
                            member.getEmail(),
                            member.getRole(),
                            assignedTasks.size(),
                            completed
                    );
                })
                .toList();
    }

    private Map<Long, String> findProjectNames(List<Task> tasks, List<Task> upcomingTasks) {
        Set<Long> projectIds = new java.util.HashSet<>();
        for (List<Task> taskList : List.of(tasks, upcomingTasks)) {
            taskList.stream()
                    .map(Task::getProjectId)
                    .filter(Objects::nonNull)
                    .forEach(projectIds::add);
        }

        if (projectIds.isEmpty()) {
            return Map.of();
        }

        return projectRepository.findAllById(projectIds).stream()
                .filter(project -> project.getId() != null)
                .collect(Collectors.toMap(Project::getId, Project::getName, (first, second) -> first));
    }

    private List<TaskSummary> buildTaskSummaries(List<Task> tasks, Map<Long, String> projectNamesById) {
        return tasks.stream()
                .sorted(Comparator
                        .comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(task -> TaskSummary.fromTask(task, projectNamesById.get(task.getProjectId())))
                .toList();
    }

    private List<TaskSummary> buildTodaysFocus(List<Task> tasks, Map<Long, String> projectNamesById, LocalDate today) {
        return tasks.stream()
                .filter(task -> !STATUS_DONE.equalsIgnoreCase(nullSafe(task.getStatus())))
                .filter(task -> today.equals(task.getDueDate()) || Priority.HIGH.equals(task.getPriority()))
                .sorted(Comparator
                        .comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Task::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(task -> TaskSummary.fromTask(task, projectNamesById.get(task.getProjectId())))
                .toList();
    }

    private List<UpcomingTask> buildMemberUpcomingDeadlines(List<Task> tasks, Map<Long, String> projectNamesById) {
        return tasks.stream()
                .sorted(Comparator.comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(task -> new UpcomingTask(
                        task.getId(),
                        task.getTitle(),
                        task.getPriority(),
                        task.getStatus(),
                        task.getDueDate(),
                        projectNamesById.get(task.getProjectId()),
                        task.getAssignedTo()
                ))
                .toList();
    }

    private long countCompletedThisWeek(String email) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        return taskHistoryRepository.countCompletedTasksForAssignedUserBetween(
                email,
                weekStart.atStartOfDay(),
                weekEnd.atTime(23, 59, 59)
        );
    }

    private List<UpcomingTask> buildUpcomingDeadlines(List<Project> projects, List<Task> tasks, LocalDate today) {
        LocalDate nextSevenDays = today.plusDays(7);
        Map<Long, Project> projectsById = projects.stream()
                .filter(project -> project.getId() != null)
                .collect(Collectors.toMap(Project::getId, Function.identity(), (first, second) -> first));

        return tasks.stream()
                .filter(task -> task.getDueDate() != null)
                .filter(task -> !task.getDueDate().isBefore(today))
                .filter(task -> !task.getDueDate().isAfter(nextSevenDays))
                .filter(task -> !STATUS_DONE.equalsIgnoreCase(nullSafe(task.getStatus())))
                .sorted(Comparator.comparing(Task::getDueDate))
                .map(task -> {
                    Project project = projectsById.get(task.getProjectId());
                    return new UpcomingTask(
                            task.getId(),
                            task.getTitle(),
                            task.getPriority(),
                            task.getStatus(),
                            task.getDueDate(),
                            project == null ? null : project.getName(),
                            task.getAssignedTo()
                    );
                })
                .toList();
    }

    private List<RecentActivity> buildRecentActivity(List<TaskHistory> histories) {
        if (histories == null || histories.isEmpty()) {
            return new ArrayList<>();
        }

        List<RecentActivity> activities = new ArrayList<>();
        for (TaskHistory history : histories) {
            if (activities.size() == 5) {
                break;
            }

            try {
                Task task = history.getTask();
                activities.add(new RecentActivity(
                        history.getId(),
                        task == null ? null : task.getId(),
                        task == null ? null : task.getTitle(),
                        history.getAction(),
                        history.getOldValue(),
                        history.getNewValue(),
                        history.getUpdatedBy(),
                        history.getUpdatedAt()
                ));
            } catch (EntityNotFoundException ignored) {
                // Old history rows can point to tasks that were deleted before cleanup existed.
            }
        }
        return activities;
    }

    private long countByStatus(List<Task> tasks, String status) {
        return tasks.stream()
                .filter(task -> status.equalsIgnoreCase(nullSafe(task.getStatus())))
                .count();
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
