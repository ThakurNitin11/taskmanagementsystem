package com.taskmanager.taskmanager.dto;

import lombok.Data;
import java.util.List;

@Data
public class ProjectRequest {

    private String name;
    private String description;
    private Long managerId;
    private List<Long> memberIds;
}
