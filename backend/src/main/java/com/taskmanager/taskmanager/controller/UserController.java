package com.taskmanager.taskmanager.controller;

import com.taskmanager.taskmanager.dto.MemberResponse;
import com.taskmanager.taskmanager.dto.UserRequest;
import com.taskmanager.taskmanager.dto.UserResponse;
import com.taskmanager.taskmanager.model.User;
import com.taskmanager.taskmanager.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/users", "/users"})
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getUsers() {
        List<UserResponse> users = userService.getAllUsers().stream()
                .map(UserResponse::fromUser)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody UserRequest request) {
        try {
            User savedUser = userService.createUserByAdmin(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.fromUser(savedUser));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserRequest request) {
        try {
            User savedUser = userService.updateUserByAdmin(id, request);
            return ResponseEntity.ok(UserResponse.fromUser(savedUser));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/members")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<MemberResponse>> getMembers(Principal principal) {
        List<MemberResponse> members = userService.getMembers(principal).stream()
                .map(MemberResponse::fromUser)
                .toList();
        return ResponseEntity.ok(members);
    }

    @GetMapping("/managers")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getManagers() {
        List<UserResponse> managers = userService.getManagers().stream()
                .map(UserResponse::fromUser)
                .toList();
        return ResponseEntity.ok(managers);
    }

    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<List<UserResponse>> getEmployees() {
        List<UserResponse> employees = userService.getEmployees().stream()
                .map(UserResponse::fromUser)
                .toList();
        return ResponseEntity.ok(employees);
    }

    @GetMapping("/my-team")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<MemberResponse>> getMyTeam(Principal principal) {
        User currentUser = userService.getCurrentUser(principal);
        log.info("endpoint=GET /api/users/my-team currentUserEmail={} currentRole={}",
                currentUser.getEmail(), currentUser.getRole());

        List<MemberResponse> team = userService.getMyTeam(principal).stream()
                .map(MemberResponse::fromUser)
                .toList();
        return ResponseEntity.ok(team);
    }

    @PutMapping("/{employeeId}/assign-manager/{managerId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignManager(@PathVariable Long employeeId, @PathVariable Long managerId) {
        try {
            User user = userService.assignManager(employeeId, managerId);
            return ResponseEntity.ok(UserResponse.fromUser(user));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{employeeId}/remove-manager")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeManager(@PathVariable Long employeeId) {
        try {
            User user = userService.removeManager(employeeId);
            return ResponseEntity.ok(UserResponse.fromUser(user));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{userId}/promote-manager")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> promoteToManager(@PathVariable Long userId) {
        try {
            User user = userService.promoteToManager(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "User promoted to manager",
                    "user", UserResponse.fromUser(user)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{userId}/make-employee")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> makeEmployee(@PathVariable Long userId) {
        try {
            User user = userService.makeEmployee(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "User changed to employee",
                    "user", UserResponse.fromUser(user)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{userId}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateUser(@PathVariable Long userId) {
        try {
            User user = userService.deactivateUser(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "User deactivated",
                    "user", UserResponse.fromUser(user)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{userId}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateUser(@PathVariable Long userId) {
        try {
            User user = userService.activateUser(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "User activated",
                    "user", UserResponse.fromUser(user)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{userId}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetPassword(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body
    ) {
        try {
            userService.resetPassword(userId, body.get("newPassword"));
            return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
