package com.taskmanager.taskmanager.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private long totalProjects;
    private long totalTasks;
    private long completedTasks;
    private long pendingTasks;
    private long todoTasks;
    private long inProgressTasks;
    private long overdueTasks;
    private long highPriorityTasks;
    private long mediumPriorityTasks;
    private long lowPriorityTasks;
    private long overallProgress;
    private long completedThisWeek;
    private List<ProjectSummary> myProjects = new ArrayList<>();
    private List<TeamMemberSummary> myTeam = new ArrayList<>();
    private List<TaskSummary> myTasks = new ArrayList<>();
    private List<UpcomingTask> upcomingDeadlines = new ArrayList<>();
    private List<TaskSummary> todaysFocus = new ArrayList<>();
    private List<RecentActivity> recentActivity = new ArrayList<>();
}
