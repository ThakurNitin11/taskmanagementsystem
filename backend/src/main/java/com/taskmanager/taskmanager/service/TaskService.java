package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.dto.TaskResponse;
import com.taskmanager.taskmanager.model.*;
import com.taskmanager.taskmanager.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.Principal;
import java.util.List;
import java.util.UUID;

@Service
public class TaskService {

    private static final String ADMIN_ROLE = "ROLE_ADMIN";
    private static final String MANAGER_ROLE = "ROLE_MANAGER";
    private static final String MEMBER_ROLE = "ROLE_MEMBER";
    private static final String EMPLOYEE_ROLE = "ROLE_EMPLOYEE";
    private static final String STATUS_BLOCKED = "BLOCKED";
    private static final String STATUS_TODO = "TODO";
    private static final String STATUS_IN_PROGRESS = "IN_PROGRESS";
    private static final String STATUS_DONE = "DONE";


    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final TaskCommentRepository commentRepository;
    private final TaskAttachmentRepository attachmentRepository;
    private final TaskHistoryRepository historyRepository;
    private final Path uploadRoot;

    public TaskService(
            TaskRepository taskRepository,
            UserRepository userRepository,
            ProjectRepository projectRepository,
            ProjectService projectService,
            TaskCommentRepository commentRepository,
            TaskAttachmentRepository attachmentRepository,
            TaskHistoryRepository historyRepository,
            @Value("${app.upload.task-dir:uploads/tasks}") String uploadDir
    ) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.commentRepository = commentRepository;
        this.attachmentRepository = attachmentRepository;
        this.historyRepository = historyRepository;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public TaskResponse createTask(Task task, Principal principal) {
        if (task.getStatus() == null || task.getStatus().isEmpty()) {
            task.setStatus("TODO");
        }
        if (task.getPriority() == null) {
            task.setPriority(Priority.MEDIUM);
        }
        validateTaskProjectAndAssignee(task, principal);

        Task savedTask = taskRepository.save(task);
        saveHistory(savedTask, "TASK_CREATED", null, savedTask.getTitle(), principal.getName());
        return toTaskResponse(savedTask);
    }

    public List<TaskResponse> getAllTasks(Principal principal) {
        User user = getLoggedInUser(principal);

        if (ADMIN_ROLE.equals(user.getRole())) {
            return taskRepository.findAll().stream()
                    .map(this::toTaskResponse)
                    .toList();
        }

        if (MANAGER_ROLE.equals(user.getRole())) {
            List<Long> projectIds = projectRepository.findByManagerEmail(user.getEmail())
                    .stream()
                    .map(Project::getId)
                    .toList();

            if (projectIds.isEmpty()) {
                return List.of();
            }

            return taskRepository.findByProjectIdIn(projectIds)
                    .stream()
                    .map(this::toTaskResponse)
                    .toList();
        }

        return taskRepository.findByAssignedTo(user.getEmail()).stream()
                .map(this::toTaskResponse)
                .toList();
    }

    public List<TaskResponse> getMyTasks(Principal principal) {
        return taskRepository.findByAssignedTo(principal.getName()).stream()
                .map(this::toTaskResponse)
                .toList();
    }

    public TaskResponse updateTask(Long taskId, Task updatedTask, Principal principal) {
        Task task = getTaskForAdmin(taskId, principal);

        if (updatedTask.getTitle() != null) {
            task.setTitle(updatedTask.getTitle());
        }
        if (updatedTask.getDescription() != null) {
            task.setDescription(updatedTask.getDescription());
        }
        if (updatedTask.getAssignedTo() != null) {
            task.setAssignedTo(updatedTask.getAssignedTo());
        }
        if (updatedTask.getAssignedToId() != null) {
            task.setAssignedToId(updatedTask.getAssignedToId());
        }
        if (updatedTask.getProjectId() != null) {
            task.setProjectId(updatedTask.getProjectId());
        }
        validateTaskProjectAndAssignee(task, principal);
        if (updatedTask.getDueDate() != null) {
            task.setDueDate(updatedTask.getDueDate());
        }
        if (updatedTask.getPriority() != null && updatedTask.getPriority() != task.getPriority()) {
            Priority oldPriority = task.getPriority();
            task.setPriority(updatedTask.getPriority());
            saveHistory(task, "PRIORITY_UPDATED", valueOf(oldPriority), valueOf(updatedTask.getPriority()), principal.getName());
        }
        if (updatedTask.getStatus() != null && !updatedTask.getStatus().equals(task.getStatus())) {
            String oldStatus = task.getStatus();
            task.setStatus(updatedTask.getStatus());
            saveHistory(task, "STATUS_UPDATED", oldStatus, updatedTask.getStatus(), principal.getName());
        }

        return toTaskResponse(taskRepository.save(task));
    }

    public TaskResponse updateStatus(Long taskId, Task updatedTask, Principal principal) {
        Task task = getAccessibleTask(taskId, principal);
        String oldStatus = task.getStatus();
        String newStatus = normalizeStatus(updatedTask.getStatus());

        task.setStatus(newStatus);
        Task savedTask = taskRepository.save(task);
        saveHistory(savedTask, "STATUS_UPDATED", oldStatus, newStatus, principal.getName());
        return toTaskResponse(savedTask);
    }

    public TaskResponse updatePriority(Long taskId, Task updatedTask, Principal principal) {
        Task task = getTaskForAdmin(taskId, principal);
        Priority oldPriority = task.getPriority();
        Priority newPriority = updatedTask.getPriority() == null ? Priority.MEDIUM : updatedTask.getPriority();

        task.setPriority(newPriority);
        Task savedTask = taskRepository.save(task);
        saveHistory(savedTask, "PRIORITY_UPDATED", valueOf(oldPriority), valueOf(newPriority), principal.getName());
        return toTaskResponse(savedTask);
    }

    @Transactional
    public void deleteTask(Long taskId, Principal principal) {
        Task task = getTaskForAdmin(taskId, principal);

        commentRepository.deleteByTaskId(taskId);
        attachmentRepository.deleteByTaskId(taskId);
        historyRepository.deleteByTaskId(taskId);

        taskRepository.delete(task);
    }

    public TaskComment addComment(Long taskId, String comment, Principal principal) {
        Task task = getAccessibleTask(taskId, principal);
        User user = getLoggedInUser(principal);

        TaskComment taskComment = new TaskComment();
        taskComment.setTask(task);
        taskComment.setComment(comment);
        taskComment.setCommentedByEmail(user.getEmail());
        taskComment.setCommentedByName(user.getName());

        TaskComment savedComment = commentRepository.save(taskComment);
        saveHistory(task, "COMMENT_ADDED", null, comment, principal.getName());
        return savedComment;
    }

    public List<TaskComment> getComments(Long taskId, Principal principal) {
        getAccessibleTask(taskId, principal);
        return commentRepository.findByTaskIdOrderByCreatedAtDesc(taskId);
    }

    public TaskAttachment uploadAttachment(Long taskId, MultipartFile file, Principal principal) {
        Task task = getAccessibleTask(taskId, principal);

        try {
            Files.createDirectories(uploadRoot);

            String originalFileName = file.getOriginalFilename() == null ? "file" : Paths.get(file.getOriginalFilename()).getFileName().toString();
            String uniqueFileName = UUID.randomUUID() + "_" + originalFileName;
            Path targetPath = uploadRoot.resolve(uniqueFileName).normalize();

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            TaskAttachment attachment = new TaskAttachment();
            attachment.setTask(task);
            attachment.setFileName(originalFileName);
            attachment.setFileType(file.getContentType());
            attachment.setFilePath(targetPath.toString());
            attachment.setUploadedBy(principal.getName());

            TaskAttachment savedAttachment = attachmentRepository.save(attachment);
            saveHistory(task, "ATTACHMENT_UPLOADED", null, originalFileName, principal.getName());
            return savedAttachment;
        } catch (IOException ex) {
            throw new RuntimeException("Could not upload file", ex);
        }
    }

    public List<TaskAttachment> getAttachments(Long taskId, Principal principal) {
        getAccessibleTask(taskId, principal);
        return attachmentRepository.findByTaskIdOrderByUploadedAtDesc(taskId);
    }

    public TaskAttachment getAttachmentForDownload(Long attachmentId, Principal principal) {
        TaskAttachment attachment = attachmentRepository.findById(attachmentId).orElseThrow();
        getAccessibleTask(attachment.getTask().getId(), principal);
        return attachment;
    }

    public Resource loadAttachmentResource(TaskAttachment attachment) {
        try {
            Path filePath = Paths.get(attachment.getFilePath()).toAbsolutePath().normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                throw new RuntimeException("File not found");
            }

            return resource;
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found", ex);
        }
    }

    public List<TaskHistory> getHistory(Long taskId, Principal principal) {
        getAccessibleTask(taskId, principal);
        return historyRepository.findByTaskIdOrderByUpdatedAtDesc(taskId);
    }

    private Task getAccessibleTask(Long taskId, Principal principal) {
        Task task = taskRepository.findById(taskId).orElseThrow();
        User user = getLoggedInUser(principal);

        if (ADMIN_ROLE.equals(user.getRole())) {
            return task;
        }

        if (MANAGER_ROLE.equals(user.getRole())
                && task.getProjectId() != null
                && projectRepository.existsByIdAndManagerEmail(task.getProjectId(), user.getEmail())) {
            return task;
        }

        if ((EMPLOYEE_ROLE.equals(user.getRole()) || MEMBER_ROLE.equals(user.getRole()))
                && user.getEmail().equalsIgnoreCase(task.getAssignedTo())) {
            return task;
        }

        throw new AccessDeniedException("Access denied");
    }

    private Task getTaskForAdmin(Long taskId, Principal principal) {
        Task task = taskRepository.findById(taskId).orElseThrow();
        User user = getLoggedInUser(principal);

        if (ADMIN_ROLE.equals(user.getRole())) {
            return task;
        }

        if (MANAGER_ROLE.equals(user.getRole())
                && task.getProjectId() != null
                && projectRepository.existsByIdAndManagerEmail(task.getProjectId(), user.getEmail())) {
            return task;
        }

        throw new AccessDeniedException("Access denied");
    }

    private User getLoggedInUser(Principal principal) {
        return userRepository.findByEmail(principal.getName()).orElseThrow();
    }

    private void validateTaskProjectAndAssignee(Task task, Principal principal) {
        if (task.getProjectId() == null) {
            throw new IllegalArgumentException("Project is required");
        }

        Project project = projectService.getProjectForTaskCreation(task.getProjectId());
        User user = getLoggedInUser(principal);
        User assignee = resolveAssignee(task);

        if (MANAGER_ROLE.equals(user.getRole())) {
            if (project.getManager() == null ||
                    !user.getEmail().equalsIgnoreCase(project.getManager().getEmail())) {
                throw new AccessDeniedException("Manager can create task only in assigned project");
            }
            if (assignee != null
                    && (assignee.getManager() == null || !user.getId().equals(assignee.getManager().getId()))) {
                throw new AccessDeniedException("You can assign tasks only to your assigned team members");
            }
        }

        projectService.validateAssignedUserIsProjectMember(project, task.getAssignedTo());
    }

    private User resolveAssignee(Task task) {
        if (task.getAssignedToId() != null) {
            User assignee = userRepository.findById(task.getAssignedToId())
                    .orElseThrow(() -> new IllegalArgumentException("Assigned user not found"));
            task.setAssignedTo(assignee.getEmail());
            return assignee;
        }

        if (task.getAssignedTo() == null || task.getAssignedTo().isBlank()) {
            return null;
        }

        String assignedTo = task.getAssignedTo().trim();
        User assignee = assignedTo.contains("@")
                ? userRepository.findByEmailIgnoreCase(assignedTo).orElse(null)
                : userRepository.findFirstByNameIgnoreCase(assignedTo).orElse(null);

        if (assignee != null) {
            task.setAssignedTo(assignee.getEmail());
        }

        return assignee;
    }

    private TaskResponse toTaskResponse(Task task) {
        Project project = task.getProjectId() == null
                ? null
                : projectRepository.findById(task.getProjectId()).orElse(null);
        return TaskResponse.fromTask(task, project);
    }

    private void saveHistory(Task task, String action, String oldValue, String newValue, String updatedBy) {
        TaskHistory history = new TaskHistory();
        history.setTask(task);
        history.setAction(action);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setUpdatedBy(updatedBy);
        historyRepository.save(history);
    }

    private String valueOf(Object value) {
        return value == null ? null : value.toString();
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status is required");
        }

        String normalizedStatus = status.trim().toUpperCase();
        if (!STATUS_TODO.equals(normalizedStatus)
                && !STATUS_IN_PROGRESS.equals(normalizedStatus)
                && !STATUS_DONE.equals(normalizedStatus)
                && !STATUS_BLOCKED.equals(normalizedStatus)) {
            throw new IllegalArgumentException("Invalid task status");
        }

        return normalizedStatus;
    }
}
