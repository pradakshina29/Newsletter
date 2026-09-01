package com.kprcas.newsletter.repository;

import com.kprcas.newsletter.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwnerIdAndIsTemplateFalseOrderByUpdatedAtDesc(Long ownerId);
    List<Project> findByIsTemplateTrueOrderByUpdatedAtDesc();
    List<Project> findByIsTemplateTrueAndCategoryOrderByUpdatedAtDesc(String category);
    List<Project> findByStatusAndIsTemplateFalseOrderByUpdatedAtDesc(String status);
    List<Project> findByIsTemplateFalseOrderByUpdatedAtDesc();
    
    long countByStatusAndIsTemplateFalse(String status);
    long countByIsTemplateFalse();
}
