package com.kprcas.newsletter.model;

import javax.persistence.*;
import java.util.Date;

@Entity
@Table(name = "activity_logs")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private String userName;
    private String userRole;
    private String action;
    private String details;

    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp;

    public ActivityLog() {}

    public ActivityLog(Long userId, String userName, String userRole, String action, String details) {
        this.userId = userId;
        this.userName = userName;
        this.userRole = userRole;
        this.action = action;
        this.details = details;
        this.timestamp = new Date();
    }

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = new Date();
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserRole() { return userRole; }
    public void setUserRole(String userRole) { this.userRole = userRole; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public Date getTimestamp() { return timestamp; }
    public void setTimestamp(Date timestamp) { this.timestamp = timestamp; }
}
