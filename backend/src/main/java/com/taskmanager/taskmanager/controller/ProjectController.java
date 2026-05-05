package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.dto.MemberResponse;
import com.taskmanager.taskmanager.dto.ProjectRequest;
import com.taskmanager.taskmanager.dto.ProjectResponse;
import com.taskmanager.taskmanager.model.User;
import com.taskmanager.taskmanager.service.ProjectService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping({"/projects", "/api/projects"})
public class ProjectController {

    private static final Logger log = LoggerFactory.getLogger(ProjectController.class);

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createProject(@RequestBody ProjectRequest request, Principal principal) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(request, principal));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error(ex.getMessage()));
        }
    }

    @GetMapping
    public List<ProjectResponse> getProjects(Principal principal) {
        return projectService.getProjects(principal);
    }

    @GetMapping("/{id}")
    public ProjectResponse getProject(@PathVariable Long id, Principal principal) {
        return projectService.getProject(id, principal);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateProject(@PathVariable Long id, @RequestBody ProjectRequest request) {
        try {
            return ResponseEntity.ok(projectService.updateProject(id, request));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error(ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteProject(@PathVariable Long id) {
        try {
            projectService.deleteProject(id);
            return ResponseEntity.ok(Map.of("message", "Project deleted successfully"));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error(ex.getMessage()));
        }
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<?> getProjectMembers(@PathVariable Long id, Principal principal) {
        try {
            User currentUser = projectService.getCurrentUser(principal);
            log.info("endpoint=GET /api/projects/{projectId}/members currentUserEmail={} currentRole={} projectId={}",
                    currentUser.getEmail(), currentUser.getRole(), id);
            return ResponseEntity.ok(projectService.getProjectMembers(id, principal));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(ex.getMessage()));
        }
    }

    @PutMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<?> updateProjectMembers(@PathVariable Long id, @RequestBody ProjectRequest request, Principal principal) {
        try {
            User currentUser = projectService.getCurrentUser(principal);
            log.info("endpoint=PUT /api/projects/{projectId}/members currentUserEmail={} currentRole={} projectId={} memberIds={}",
                    currentUser.getEmail(), currentUser.getRole(), id, request.getMemberIds());
            ProjectResponse project = projectService.updateProjectMembers(id, request, principal);
            return ResponseEntity.ok(project);
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(error(ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(ex.getMessage()));
        }
    }

    private Map<String, String> error(String message) {
        return Map.of("message", message);
    }
}
