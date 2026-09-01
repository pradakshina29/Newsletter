package com.kprcas.newsletter.controller;

import com.kprcas.newsletter.config.JwtUtils;
import com.kprcas.newsletter.model.ActivityLog;
import com.kprcas.newsletter.model.Project;
import com.kprcas.newsletter.model.User;
import com.kprcas.newsletter.repository.ActivityLogRepository;
import com.kprcas.newsletter.repository.ProjectRepository;
import com.kprcas.newsletter.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN') or hasRole('FACULTY')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private JwtUtils jwtUtils;

    private Long getUserIdFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return jwtUtils.getIdFromToken(header.substring(7));
        }
        return null;
    }

    private String getUserNameFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return jwtUtils.getNameFromToken(header.substring(7));
        }
        return null;
    }

    private String getUserRoleFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return jwtUtils.getRoleFromToken(header.substring(7));
        }
        return null;
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getSystemStats() {
        long totalUsers = userRepository.count();
        long totalProjects = projectRepository.countByIsTemplateFalse();
        long pendingApprovals = projectRepository.countByStatusAndIsTemplateFalse("PENDING_APPROVAL");
        
        List<Project> templates = projectRepository.findByIsTemplateTrueOrderByUpdatedAtDesc();
        long totalTemplates = templates.size();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalProjects", totalProjects);
        stats.put("pendingApprovals", pendingApprovals);
        stats.put("totalTemplates", totalTemplates);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/logs")
    public ResponseEntity<?> getActivityLogs() {
        List<ActivityLog> logs = activityLogRepository.findAllByOrderByTimestampDesc();
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        List<User> users = userRepository.findAll();
        // Clear passwords before returning
        for (User u : users) {
            u.setPassword("PROTECTED");
        }
        return ResponseEntity.ok(users);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUserRole(@PathVariable("id") Long id, @RequestBody Map<String, String> request, @RequestHeader("Authorization") String authHeader) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        if (request.containsKey("role")) {
            user.setRole(request.get("role").toUpperCase());
        }
        if (request.containsKey("enabled")) {
            user.setEnabled(Boolean.parseBoolean(request.get("enabled")));
        }

        User updatedUser = userRepository.save(user);
        updatedUser.setPassword("PROTECTED");

        // Log action
        activityLogRepository.save(new ActivityLog(
                getUserIdFromHeader(authHeader),
                getUserNameFromHeader(authHeader),
                getUserRoleFromHeader(authHeader),
                "UPDATE_USER",
                "Updated user " + user.getEmail() + " status/role to: " + user.getRole()
        ));

        return ResponseEntity.ok(updatedUser);
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingApprovals() {
        List<Project> pending = projectRepository.findByStatusAndIsTemplateFalseOrderByUpdatedAtDesc("PENDING_APPROVAL");
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/newsletters/{id}/approve")
    public ResponseEntity<?> approveNewsletter(@PathVariable("id") Long id, @RequestHeader("Authorization") String authHeader) {
        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Newsletter not found");
        }

        project.setStatus("PUBLISHED");
        Project approvedProject = projectRepository.save(project);

        // Audit Log
        activityLogRepository.save(new ActivityLog(
                getUserIdFromHeader(authHeader),
                getUserNameFromHeader(authHeader),
                getUserRoleFromHeader(authHeader),
                "APPROVE_NEWSLETTER",
                "Approved newsletter: " + project.getName() + " (ID: " + id + ")"
        ));

        return ResponseEntity.ok(approvedProject);
    }

    @PostMapping("/newsletters/{id}/reject")
    public ResponseEntity<?> rejectNewsletter(@PathVariable("id") Long id, @RequestHeader("Authorization") String authHeader) {
        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Newsletter not found");
        }

        project.setStatus("DRAFT"); // Returns it to draft status
        Project rejectedProject = projectRepository.save(project);

        // Audit Log
        activityLogRepository.save(new ActivityLog(
                getUserIdFromHeader(authHeader),
                getUserNameFromHeader(authHeader),
                getUserRoleFromHeader(authHeader),
                "REJECT_NEWSLETTER",
                "Rejected newsletter (returned to draft): " + project.getName() + " (ID: " + id + ")"
        ));

        return ResponseEntity.ok(rejectedProject);
    }
}
