package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.dto.TaskResponse;
import com.taskmanager.taskmanager.model.*;
import com.taskmanager.taskmanager.service.TaskService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/tasks", "/api/tasks"})
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    // ADMIN and MANAGER can create task
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public TaskResponse createTask(@RequestBody Task task, Principal principal) {
        return taskService.createTask(task, principal);
    }

    // ADMIN sees all tasks, MANAGER sees assigned project tasks, MEMBER/EMPLOYEE sees own tasks
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','MEMBER','EMPLOYEE')")
    public List<TaskResponse> getAllTasks(Principal principal) {
        return taskService.getAllTasks(principal);
    }

    // EMPLOYEE sees own tasks
    @GetMapping("/my")
    public List<TaskResponse> getMyTasks(Principal principal) {
        return taskService.getMyTasks(principal);
    }

    // ADMIN and MANAGER can update task
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public TaskResponse updateTask(@PathVariable Long id, @RequestBody Task updatedTask, Principal principal) {
        return taskService.updateTask(id, updatedTask, principal);
    }

    // ADMIN / MANAGER / EMPLOYEE can update status if access allowed
    @PutMapping("/{id}/status")
    public TaskResponse updateStatus(@PathVariable Long id, @RequestBody Task updatedTask, Principal principal) {
        return taskService.updateStatus(id, updatedTask, principal);
    }

    // ADMIN and MANAGER can update priority
    @PutMapping("/{id}/priority")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public TaskResponse updatePriority(@PathVariable Long id, @RequestBody Task updatedTask, Principal principal) {
        return taskService.updatePriority(id, updatedTask, principal);
    }

    // ADMIN and MANAGER can delete task
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<String> deleteTask(@PathVariable Long id, Principal principal) {
        taskService.deleteTask(id, principal);
        return ResponseEntity.ok("Task deleted successfully");
    }

    @PostMapping("/{taskId}/comments")
    public TaskComment addComment(@PathVariable Long taskId, @RequestBody Map<String, String> request, Principal principal) {
        return taskService.addComment(taskId, request.get("comment"), principal);
    }

    @GetMapping("/{taskId}/comments")
    public List<TaskComment> getComments(@PathVariable Long taskId, Principal principal) {
        return taskService.getComments(taskId, principal);
    }

    @PostMapping(value = "/{taskId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TaskAttachment uploadAttachment(
            @PathVariable Long taskId,
            @RequestParam("file") MultipartFile file,
            Principal principal
    ) {
        return taskService.uploadAttachment(taskId, file, principal);
    }

    @GetMapping("/{taskId}/attachments")
    public List<TaskAttachment> getAttachments(@PathVariable Long taskId, Principal principal) {
        return taskService.getAttachments(taskId, principal);
    }

    @GetMapping("/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long attachmentId, Principal principal) {
        TaskAttachment attachment = taskService.getAttachmentForDownload(attachmentId, principal);
        Resource resource = taskService.loadAttachmentResource(attachment);
        String contentType = attachment.getFileType() == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : attachment.getFileType();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFileName() + "\"")
                .body(resource);
    }

    @GetMapping("/{taskId}/history")
    public List<TaskHistory> getHistory(@PathVariable Long taskId, Principal principal) {
        return taskService.getHistory(taskId, principal);
    }
}
