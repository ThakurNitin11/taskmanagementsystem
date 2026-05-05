package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberResponse {
    private Long id;
    private String name;
    private String email;
    private String role;

    public static ProjectMemberResponse fromUser(User user) {
        return new ProjectMemberResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole()
        );
    }
}
