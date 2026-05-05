package com.taskmanager.taskmanager.dto;

import lombok.Data;

@Data
public class UserRequest {
    private String name;
    private String email;
    private String password;
    private String role;
    private String mobile;
    private String department;
    private String status;
    private Long managerId;
}
