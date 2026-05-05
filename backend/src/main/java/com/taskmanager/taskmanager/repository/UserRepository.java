package com.taskmanager.taskmanager.repository;

import com.taskmanager.taskmanager.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findFirstByNameIgnoreCase(String name);

    List<User> findByEmailIn(Collection<String> emails);

    List<User> findByRole(String role);

    List<User> findByRoleAndActiveTrue(String role);

    List<User> findByRoleAndManagerId(String role, Long managerId);

    List<User> findByManagerId(Long managerId);

    boolean existsByRole(String role);
}
