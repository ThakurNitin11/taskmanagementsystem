package com.taskmanager.taskmanager.repository;

import com.taskmanager.taskmanager.model.TaskHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface TaskHistoryRepository extends JpaRepository<TaskHistory, Long> {
    List<TaskHistory> findByTaskIdOrderByUpdatedAtDesc(Long taskId);

    List<TaskHistory> findTop5ByOrderByUpdatedAtDesc();

    List<TaskHistory> findTop5ByTaskProjectIdInOrderByUpdatedAtDesc(List<Long> projectIds);

    List<TaskHistory> findTop5ByTaskAssignedToOrderByUpdatedAtDesc(String assignedTo);

    @Query("""
            select count(distinct h.task.id)
            from TaskHistory h
            where lower(h.task.assignedTo) = lower(:assignedTo)
              and h.updatedAt between :startDate and :endDate
              and h.task.status = 'DONE'
            """)
    long countCompletedTasksForAssignedUserBetween(
            @Param("assignedTo") String assignedTo,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    void deleteByTaskId(Long taskId);
}
