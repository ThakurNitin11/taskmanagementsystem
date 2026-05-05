package com.taskmanager.taskmanager.repository;

import com.taskmanager.taskmanager.model.TaskAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, Long> {
    List<TaskAttachment> findByTaskIdOrderByUploadedAtDesc(Long taskId);

    void deleteByTaskId(Long taskId);
}
