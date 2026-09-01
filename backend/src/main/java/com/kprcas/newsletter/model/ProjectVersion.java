package com.kprcas.newsletter.model;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "project_versions")
public class ProjectVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long projectId;

    @Column(columnDefinition = "LONGTEXT", nullable = false)
    private String content; // Snapshot content of the project at this version

    private String description; // E.g., "Autosave", "Manual Save", "Restore"

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Date createdAt;

    public ProjectVersion() {}

    public ProjectVersion(Long projectId, String content, String description) {
        this.projectId = projectId;
        this.content = content;
        this.description = description;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = new Date();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
