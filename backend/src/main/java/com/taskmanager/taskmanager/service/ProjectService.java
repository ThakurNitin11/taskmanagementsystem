package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.dto.MemberResponse;
import com.taskmanager.taskmanager.dto.ProjectRequest;
import com.taskmanager.taskmanager.dto.ProjectResponse;
import com.taskmanager.taskmanager.model.Project;
import com.taskmanager.taskmanager.model.User;
import com.taskmanager.taskmanager.repository.ProjectRepository;
import com.taskmanager.taskmanager.repository.TaskRepository;
import com.taskmanager.taskmanager.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
public class ProjectService {

    private static final String ADMIN_ROLE = "ROLE_ADMIN";
    private static final String MEMBER_ROLE = "ROLE_MEMBER";
    private static final String MANAGER_ROLE = "ROLE_MANAGER";
    private static final String EMPLOYEE_ROLE = "ROLE_EMPLOYEE";

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public ProjectService(ProjectRepository projectRepository,
                          UserRepository userRepository,
                          TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public ProjectResponse createProject(ProjectRequest request, Principal principal) {
        validateProjectName(request.getName());

        Project project = new Project();
        project.setName(request.getName().trim());
        project.setDescription(request.getDescription());
        project.setCreatedBy(principal.getName());
        User manager = resolveManager(request);

        project.setManager(manager);
        project.setMembers(new HashSet<>());

        return ProjectResponse.fromProject(projectRepository.save(project));
    }

    public List<ProjectResponse> getProjects(Principal principal) {
        User user = getLoggedInUser(principal);

        List<Project> projects;

        if (ADMIN_ROLE.equals(user.getRole())) {
            projects = projectRepository.findAll();
        } else if (MANAGER_ROLE.equals(user.getRole())) {
            projects = projectRepository.findByManagerEmail(user.getEmail());
        } else {
            projects = projectRepository.findByMembersEmail(user.getEmail());
        }

        return projects.stream()
                .map(ProjectResponse::fromProject)
                .toList();
    }

    public ProjectResponse getProject(Long id, Principal principal) {
        Project project = getAccessibleProject(id, principal);
        return ProjectResponse.fromProject(project);
    }

    @Transactional
    public ProjectResponse updateProject(Long id, ProjectRequest request) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));

        if (request.getName() != null) {
            validateProjectName(request.getName());
            project.setName(request.getName().trim());
        }

        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }

        if (request.getManagerId() != null) {
            project.setManager(resolveManager(request));
        }

        return ProjectResponse.fromProject(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));

        if (taskRepository.existsByProjectId(id)) {
            throw new IllegalStateException("Cannot delete project with existing tasks");
        }

        projectRepository.delete(project);
    }

    public List<MemberResponse> getProjectMembers(Long id, Principal principal) {
        Project project = getAccessibleProject(id, principal);

        return project.getMembers().stream()
                .map(MemberResponse::fromUser)
                .toList();
    }

    public User getCurrentUser(Principal principal) {
        return getLoggedInUser(principal);
    }

    @Transactional
    public ProjectResponse updateProjectMembers(Long id, ProjectRequest request, Principal principal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));
        User loggedInUser = getLoggedInUser(principal);

        ensureCanManageProject(project, loggedInUser);
        project.setMembers(resolveMembersForProject(request, loggedInUser));

        return ProjectResponse.fromProject(projectRepository.save(project));
    }

    public Project getProjectForTaskCreation(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));
    }

    public void validateAssignedUserIsProjectMember(Project project, String assignedTo) {
        if (assignedTo == null || assignedTo.isBlank()) {
            return;
        }

        boolean isMember = project.getMembers().stream()
                .anyMatch(member -> assignedTo.equalsIgnoreCase(member.getEmail()));

        if (!isMember) {
            throw new IllegalArgumentException("Assigned user must be a project member");
        }
    }

    public boolean canAccessProject(Long projectId, Principal principal) {
        User user = getLoggedInUser(principal);

        return ADMIN_ROLE.equals(user.getRole())
                || projectRepository.existsByIdAndManagerEmail(projectId, user.getEmail());
    }

    private Project getAccessibleProject(Long id, Principal principal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Project not found"));
        User user = getLoggedInUser(principal);

        if (ADMIN_ROLE.equals(user.getRole())) {
            return project;
        }

        if (MANAGER_ROLE.equals(user.getRole())
                && project.getManager() != null
                && user.getEmail().equalsIgnoreCase(project.getManager().getEmail())) {
            return project;
        }

        throw new AccessDeniedException("You do not manage this project");
    }

    private User resolveManager(ProjectRequest request) {
        Long managerId = request.getManagerId();

        if (managerId == null) {
            throw new IllegalArgumentException("Project manager is required");
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Project manager not found"));

        if (!MANAGER_ROLE.equals(manager.getRole())) {
            throw new IllegalArgumentException("Project manager must be ROLE_MANAGER");
        }

        if (!manager.isActive()) {
            throw new IllegalArgumentException("Selected manager is inactive");
        }

        return manager;
    }

    private Set<User> resolveMembersForProject(ProjectRequest request, User loggedInUser) {
        Set<User> members = new HashSet<>();

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            for (Long memberId : request.getMemberIds()) {
                User user = userRepository.findById(memberId)
                        .orElseThrow(() -> new IllegalArgumentException("Invalid member id: " + memberId));
                members.add(user);
            }
        }

        boolean hasInvalidMemberRole = members.stream()
                .anyMatch(user -> !EMPLOYEE_ROLE.equals(user.getRole())
                        && !MEMBER_ROLE.equals(user.getRole()));

        if (hasInvalidMemberRole) {
            throw new IllegalArgumentException("Only MEMBER or EMPLOYEE users can be assigned to a project");
        }

        boolean hasInactiveEmployee = members.stream()
                .anyMatch(user -> !user.isActive());

        if (hasInactiveEmployee) {
            throw new IllegalArgumentException("Inactive employee cannot be assigned to project");
        }

        if (MANAGER_ROLE.equals(loggedInUser.getRole())) {
            boolean hasUnassignedEmployee = members.stream()
                    .anyMatch(user -> user.getManager() == null
                            || !loggedInUser.getId().equals(user.getManager().getId()));

            if (hasUnassignedEmployee) {
                throw new AccessDeniedException("You can add only your assigned employees to this project");
            }
        }

        return members;
    }

    private void ensureCanManageProject(Project project, User user) {
        if (ADMIN_ROLE.equals(user.getRole())) {
            return;
        }

        if (MANAGER_ROLE.equals(user.getRole())
                && project.getManager() != null
                && user.getEmail().equalsIgnoreCase(project.getManager().getEmail())) {
            return;
        }

        throw new AccessDeniedException("You do not manage this project");
    }

    private void validateProjectName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Project name is required");
        }
    }

    private User getLoggedInUser(Principal principal) {
        return userRepository.findByEmailIgnoreCase(principal.getName())
                .orElseThrow(() -> new NoSuchElementException("User not found"));
    }
}
