package com.taskmanager.taskmanager.dto;

import com.taskmanager.taskmanager.model.Project;
import com.taskmanager.taskmanager.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private Long id;
    private String name;
    private String description;
    private String createdBy;

    // 🔥 NEW: manager details
    private Long managerId;
    private String managerName;
    private String managerEmail;

    private int membersCount;
    private List<MemberResponse> members;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProjectResponse fromProject(Project project) {

        // manager extract
        User manager = project.getManager();

        // members convert
        List<MemberResponse> members = project.getMembers().stream()
                .map(MemberResponse::fromUser)
                .toList();

        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getCreatedBy(),

                // 🔥 manager mapping
                manager != null ? manager.getId() : null,
                manager != null ? manager.getName() : null,
                manager != null ? manager.getEmail() : null,

                members.size(),
                members,
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }
}
