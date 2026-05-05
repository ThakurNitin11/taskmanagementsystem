package com.taskmanager.taskmanager.service;

import com.taskmanager.taskmanager.dto.UserRequest;
import com.taskmanager.taskmanager.model.User;
import com.taskmanager.taskmanager.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.util.List;

@Service
public class UserService {

    public static final String ADMIN_ROLE = "ROLE_ADMIN";
    public static final String MEMBER_ROLE = "ROLE_MEMBER";
    public static final String MANAGER_ROLE = "ROLE_MANAGER";
    public static final String EMPLOYEE_ROLE = "ROLE_EMPLOYEE";

    private static final String DEFAULT_ADMIN_NAME = "Admin";
    private static final String DEFAULT_ADMIN_EMAIL = "admin@company.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "admin123";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.admin.name:" + DEFAULT_ADMIN_NAME + "}")
    private String adminName;

    @Value("${app.admin.email:" + DEFAULT_ADMIN_EMAIL + "}")
    private String adminEmail;

    @Value("${app.admin.password:" + DEFAULT_ADMIN_PASSWORD + "}")
    private String adminPassword;

    @Value("${app.users.member-manager-required:false}")
    private boolean memberManagerRequired;

    @PostConstruct
    private void createAdminUser() {
        User existingAdmin = userRepository.findByEmailIgnoreCase(adminEmail).orElse(null);

        if (existingAdmin != null) {
            existingAdmin.setName(adminName);
            existingAdmin.setEmail(adminEmail.trim().toLowerCase());
            existingAdmin.setPassword(passwordEncoder.encode(adminPassword));
            existingAdmin.setRole(ADMIN_ROLE);
            existingAdmin.setActive(true);
            existingAdmin.setStatus("ACTIVE");
            existingAdmin.setManager(null);
            userRepository.save(existingAdmin);
            return;
        }

        User admin = new User();
        admin.setName(adminName);
        admin.setEmail(adminEmail.trim().toLowerCase());
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setRole(ADMIN_ROLE);
        admin.setActive(true);
        admin.setStatus("ACTIVE");

        userRepository.save(admin);
    }

    public User register(User user) {
        String email = user.getEmail() == null ? "" : user.getEmail().trim().toLowerCase();

        if (email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        user.setEmail(email);
        user.setRole(EMPLOYEE_ROLE);
        user.setActive(true);
        user.setStatus("ACTIVE");
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    public User createUserByAdmin(UserRequest request) {
        String name = request.getName() == null ? "" : request.getName().trim();
        String email = normalizeEmail(request.getEmail());
        String password = request.getPassword();

        if (name.isBlank()) {
            throw new IllegalArgumentException("Name is required");
        }
        if (email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        String role = normalizeRole(request.getRole());

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setRole(role);
        applyProfileFields(user, request, false);
        user.setActive(resolveActive(request.getStatus(), true));
        user.setPassword(passwordEncoder.encode(password));
        applyManagerAssignment(user, request.getManagerId(), role, true);

        return userRepository.save(user);
    }

    public User updateUserByAdmin(Long userId, UserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getName() != null) {
            String name = request.getName().trim();
            if (name.isBlank()) {
                throw new IllegalArgumentException("Name is required");
            }
            user.setName(name);
        }

        if (request.getEmail() != null) {
            String email = normalizeEmail(request.getEmail());
            if (email.isBlank()) {
                throw new IllegalArgumentException("Email is required");
            }
            userRepository.findByEmailIgnoreCase(email)
                    .filter(existing -> !existing.getId().equals(userId))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Email already exists");
                    });
            user.setEmail(email);
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        String role = request.getRole() == null || request.getRole().isBlank()
                ? user.getRole()
                : normalizeRole(request.getRole());

        user.setRole(role);
        applyProfileFields(user, request, true);

        if (request.getStatus() != null) {
            user.setActive(resolveActive(request.getStatus(), user.isActive()));
        }

        applyManagerAssignment(user, request.getManagerId(), role, false);

        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmailIgnoreCase(email.trim()).orElse(null);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getVisibleUsers(String role, Principal principal) {
        User loggedInUser = findByEmail(principal.getName());
        if (loggedInUser == null) {
            throw new IllegalArgumentException("User not found");
        }

        String normalizedRole = role == null || role.isBlank() ? null : role.trim().toUpperCase();

        if (ADMIN_ROLE.equals(loggedInUser.getRole())) {
            if (normalizedRole == null) {
                return userRepository.findAll();
            }
            return userRepository.findByRole(normalizedRole);
        }

        if (normalizedRole != null && !normalizedRole.equals(loggedInUser.getRole())) {
            return List.of();
        }

        return List.of(loggedInUser);
    }

    public List<User> getManagers() {
        return userRepository.findByRoleAndActiveTrue(MANAGER_ROLE);
    }

    public List<User> getMembers(Principal principal) {
        User loggedInUser = getLoggedInUser(principal);
        if (ADMIN_ROLE.equals(loggedInUser.getRole())) {
            return userRepository.findByRole(MEMBER_ROLE);
        }
        if (MANAGER_ROLE.equals(loggedInUser.getRole())) {
            return userRepository.findByRoleAndManagerId(MEMBER_ROLE, loggedInUser.getId());
        }
        return List.of();
    }

    public List<User> getMembers() {
        return userRepository.findByRole(MEMBER_ROLE);
    }

    public List<User> getEmployees() {
        return userRepository.findByRoleAndActiveTrue(EMPLOYEE_ROLE);
    }

    public List<User> getMyTeam(Principal principal) {
        User manager = getLoggedInUser(principal);
        if (!MANAGER_ROLE.equals(manager.getRole())) {
            throw new IllegalArgumentException("Only manager can view team");
        }
        return userRepository.findByManagerId(manager.getId());
    }

    public User getCurrentUser(Principal principal) {
        return getLoggedInUser(principal);
    }

    public User assignManager(Long employeeId, Long managerId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        User manager = validateManager(managerId);

        if (!MEMBER_ROLE.equals(employee.getRole()) && !EMPLOYEE_ROLE.equals(employee.getRole())) {
            throw new IllegalArgumentException("Only employee/member users can be assigned to a manager");
        }

        employee.setManager(manager);
        return userRepository.save(employee);
    }

    public User removeManager(Long employeeId) {
        User employee = userRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        if (!MEMBER_ROLE.equals(employee.getRole()) && !EMPLOYEE_ROLE.equals(employee.getRole())) {
            throw new IllegalArgumentException("Only employee/member users can be removed from a manager");
        }

        employee.setManager(null);
        return userRepository.save(employee);
    }

    public User promoteToManager(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (ADMIN_ROLE.equals(user.getRole())) {
            throw new IllegalArgumentException("Admin role cannot be changed");
        }

        user.setRole(MANAGER_ROLE);
        user.setActive(true);
        user.setStatus("ACTIVE");
        user.setManager(null);
        return userRepository.save(user);
    }

    public User makeEmployee(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (ADMIN_ROLE.equals(user.getRole())) {
            throw new IllegalArgumentException("Admin role cannot be changed");
        }

        user.setRole(EMPLOYEE_ROLE);
        user.setManager(null);
        return userRepository.save(user);
    }

    public User deactivateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (ADMIN_ROLE.equals(user.getRole())) {
            throw new IllegalArgumentException("Admin cannot be deactivated");
        }

        user.setActive(false);
        user.setStatus("INACTIVE");
        return userRepository.save(user);
    }

    public User activateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setActive(true);
        user.setStatus("ACTIVE");
        return userRepository.save(user);
    }

    public void resetPassword(Long userId, String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private void applyManagerAssignment(User user, Long managerId, String role, boolean clearWhenManagerIdMissing) {
        if (MANAGER_ROLE.equals(role) || ADMIN_ROLE.equals(role)) {
            user.setManager(null);
            return;
        }

        if (MEMBER_ROLE.equals(role) && memberManagerRequired && managerId == null && user.getManager() == null) {
            throw new IllegalArgumentException("Manager is required for member user");
        }

        if (managerId == null) {
            if (clearWhenManagerIdMissing) {
                user.setManager(null);
            }
            return;
        }

        user.setManager(validateManager(managerId));
    }

    private User validateManager(Long managerId) {
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));

        if (!MANAGER_ROLE.equals(manager.getRole())) {
            throw new IllegalArgumentException("Selected manager must have ROLE_MANAGER role");
        }

        if (!manager.isActive()) {
            throw new IllegalArgumentException("Selected manager is inactive");
        }

        return manager;
    }

    private void applyProfileFields(User user, UserRequest request, boolean partialUpdate) {
        if (!partialUpdate || request.getMobile() != null) {
            user.setMobile(request.getMobile());
        }
        if (!partialUpdate || request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            if (user.getStatus() == null || user.getStatus().isBlank()) {
                user.setStatus(user.isActive() ? "ACTIVE" : "INACTIVE");
            }
            return;
        }

        String status = request.getStatus().trim().toUpperCase();
        user.setStatus(status);
    }

    private boolean resolveActive(String status, boolean defaultActive) {
        if (status == null || status.isBlank()) {
            return defaultActive;
        }

        String normalizedStatus = status.trim().toUpperCase();
        if ("ACTIVE".equals(normalizedStatus)) {
            return true;
        }
        if ("INACTIVE".equals(normalizedStatus) || "DISABLED".equals(normalizedStatus)) {
            return false;
        }

        return defaultActive;
    }

    private User getLoggedInUser(Principal principal) {
        return userRepository.findByEmailIgnoreCase(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("Role is required");
        }

        String normalizedRole = role.trim().toUpperCase();
        if (!normalizedRole.startsWith("ROLE_")) {
            normalizedRole = "ROLE_" + normalizedRole;
        }

        if (!ADMIN_ROLE.equals(normalizedRole)
                && !MEMBER_ROLE.equals(normalizedRole)
                && !MANAGER_ROLE.equals(normalizedRole)
                && !EMPLOYEE_ROLE.equals(normalizedRole)) {
            throw new IllegalArgumentException("Invalid role");
        }

        return normalizedRole;
    }
}
