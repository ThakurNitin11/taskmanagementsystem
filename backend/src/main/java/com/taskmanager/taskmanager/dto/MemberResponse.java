package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MemberResponse {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String mobile;
    private String department;
    private String status;
    private Long managerId;
    private String managerName;
    private String managerEmail;

    public static MemberResponse fromUser(User user) {
        User manager = user.getManager();
        return new MemberResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getMobile(),
                user.getDepartment(),
                user.getStatus(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getName(),
                manager == null ? null : manager.getEmail()
        );
    }
}
