package com.taskmanager.taskmanager.repository;

import com.taskmanager.taskmanager.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByMembersEmail(String email);

    List<Project> findByManagerEmail(String email);

    List<Project> findByManagerIdOrCreatedBy(Long managerId, String createdBy);

    long countByMembersEmail(String email);

    long countByManagerEmail(String email);

    boolean existsByIdAndMembersEmail(Long id, String email);

    boolean existsByIdAndManagerEmail(Long id, String email);
}
