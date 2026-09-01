package com.kprcas.newsletter.repository;

import com.kprcas.newsletter.model.ProjectVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProjectVersionRepository extends JpaRepository<ProjectVersion, Long> {
    List<ProjectVersion> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
