package com.kprcas.newsletter.controller;

import com.kprcas.newsletter.config.JwtUtils;
import com.kprcas.newsletter.model.ActivityLog;
import com.kprcas.newsletter.model.Project;
import com.kprcas.newsletter.model.ProjectVersion;
import com.kprcas.newsletter.repository.ActivityLogRepository;
import com.kprcas.newsletter.repository.ProjectRepository;
import com.kprcas.newsletter.repository.ProjectVersionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/projects")
@Transactional
public class ProjectController {

    private static final ThreadLocal<String> currentTheme = new ThreadLocal<>();

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectVersionRepository versionRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private com.kprcas.newsletter.service.NewsletterGeneratorService newsletterGeneratorService;

    private Long getUserIdFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if ("default_admin_token".equals(token) || token.trim().isEmpty()) {
                return 1L;
            }
            Long id = jwtUtils.getIdFromToken(token);
            return id != null ? id : 1L;
        }
        return 1L;
    }

    private String getUserRoleFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if ("default_admin_token".equals(token) || token.trim().isEmpty()) {
                return "ADMIN";
            }
            String role = jwtUtils.getRoleFromToken(token);
            return role != null ? role : "ADMIN";
        }
        return "ADMIN";
    }

    private String getUserNameFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if ("default_admin_token".equals(token) || token.trim().isEmpty()) {
                return "KPRCAS Editorial Team";
            }
            String name = jwtUtils.getNameFromToken(token);
            return name != null ? name : "KPRCAS Editorial Team";
        }
        return "KPRCAS Editorial Team";
    }

    @GetMapping
    public ResponseEntity<?> getMyProjects(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromHeader(authHeader);
        String role = getUserRoleFromHeader(authHeader);

        List<Project> projects;
        if ("ADMIN".equals(role)) {
            projects = projectRepository.findByIsTemplateFalseOrderByUpdatedAtDesc();
        } else {
            projects = projectRepository.findByOwnerIdAndIsTemplateFalseOrderByUpdatedAtDesc(userId);
        }
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates() {
        List<Project> templates = projectRepository.findByIsTemplateTrueOrderByUpdatedAtDesc();
        return ResponseEntity.ok(templates);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProjectById(@PathVariable Long id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);
            
            Project project = projectRepository.findById(id).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
            }

            // Templates are public. User projects check owner or admin/faculty/student role safely.
            if (!project.isTemplate()) {
                if (project.getOwnerId() != null && userId != null) {
                    if (!project.getOwnerId().equals(userId) && !"ADMIN".equals(role) && !"FACULTY".equals(role)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
                    }
                }
            }

            return ResponseEntity.ok(project);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error loading project: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody Project project, @RequestHeader("Authorization") String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String userName = getUserNameFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Token");
            }

            project.setOwnerId(userId);
            project.setOwnerName(userName != null ? userName : "User");
            if (project.getStatus() == null) {
                project.setStatus("DRAFT");
            }
            if (project.getName() == null || project.getName().trim().isEmpty()) {
                project.setName("Untitled Newsletter");
            }
            if (project.getCategory() == null || project.getCategory().trim().isEmpty()) {
                project.setCategory("Academic");
            }
            if (project.getDepartment() == null || project.getDepartment().trim().isEmpty()) {
                project.setDepartment("Information Technology");
            }
            if (project.getContent() == null || project.getContent().trim().isEmpty()) {
                String promptText = (project.getDescription() != null && !project.getDescription().trim().isEmpty()) 
                        ? project.getDescription() 
                        : project.getName();
                String initialContent = create8PageNewsletterJson(
                    "#1e40af", "#0f172a", "#f97316", "#ffffff",
                    project.getName(), "Campus Event", project.getDepartment(), "June 2026",
                    "All Students", "Academic, Event", "Professional", promptText, 1
                );
                project.setContent(initialContent);
            }

            Project savedProject = projectRepository.save(project);

            // Save initial version safely
            try {
                versionRepository.save(new ProjectVersion(savedProject.getId(), savedProject.getContent(), "Initial Draft"));
            } catch (Exception vErr) {
                System.err.println("Version save warning: " + vErr.getMessage());
            }

            // Audit Log safely
            try {
                activityLogRepository.save(new ActivityLog(
                        userId, userName, role, "CREATE_PROJECT",
                        "Created project: " + savedProject.getName() + " (ID: " + savedProject.getId() + ")"
                ));
            } catch (Exception aErr) {
                System.err.println("Audit log save warning: " + aErr.getMessage());
            }

            return ResponseEntity.ok(savedProject);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating project: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(@PathVariable("id") Long id, @RequestBody Map<String, Object> updates, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String userName = getUserNameFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);

            Project project = projectRepository.findById(id).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
            }

            if (project.getOwnerId() != null && userId != null) {
                if (!project.getOwnerId().equals(userId) && !"ADMIN".equals(role) && !"FACULTY".equals(role)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
                }
            }

            boolean saveVersion = false;
            String versionDescription = "Autosave";

            if (updates.containsKey("name")) project.setName((String) updates.get("name"));
            if (updates.containsKey("description")) project.setDescription((String) updates.get("description"));
            if (updates.containsKey("content")) {
                project.setContent((String) updates.get("content"));
                saveVersion = true;
            }
            if (updates.containsKey("status")) {
                project.setStatus((String) updates.get("status"));
                versionDescription = "Status update to: " + updates.get("status");
                saveVersion = true;
            }
            if (updates.containsKey("category")) project.setCategory((String) updates.get("category"));
            if (updates.containsKey("department")) project.setDepartment((String) updates.get("department"));
            if (updates.containsKey("isTemplate") && "ADMIN".equals(role)) {
                project.setTemplate((Boolean) updates.get("isTemplate"));
            }

            Project savedProject = projectRepository.save(project);

            if (saveVersion) {
                try {
                    versionRepository.save(new ProjectVersion(savedProject.getId(), savedProject.getContent(), versionDescription));
                } catch (Exception ignored) {}
            }

            return ResponseEntity.ok(savedProject);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating project: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<?> duplicateProject(@PathVariable("id") Long id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String userName = getUserNameFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);

            Project project = projectRepository.findById(id).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
            }

            Project duplicate = new Project();
            duplicate.setName("Copy of " + project.getName());
            duplicate.setDescription(project.getDescription());
            duplicate.setContent(project.getContent());
            duplicate.setCategory(project.getCategory());
            duplicate.setDepartment(project.getDepartment());
            duplicate.setStatus("DRAFT");
            duplicate.setOwnerId(userId != null ? userId : 1L);
            duplicate.setOwnerName(userName != null ? userName : "User");
            duplicate.setTemplate(false);

            Project savedDuplicate = projectRepository.save(duplicate);
            try {
                versionRepository.save(new ProjectVersion(savedDuplicate.getId(), savedDuplicate.getContent(), "Cloned from ID: " + id));
            } catch (Exception ignored) {}

            try {
                activityLogRepository.save(new ActivityLog(
                        userId, userName, role, "DUPLICATE_PROJECT",
                        "Duplicated project " + id + " as " + savedDuplicate.getId()
                ));
            } catch (Exception ignored) {}

            return ResponseEntity.ok(savedDuplicate);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error duplicating project: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable("id") Long id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String userName = getUserNameFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);

            Project project = projectRepository.findById(id).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
            }

            if (project.getOwnerId() != null && userId != null) {
                if (!project.getOwnerId().equals(userId) && !"ADMIN".equals(role)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
                }
            }

            projectRepository.delete(project);

            try {
                activityLogRepository.save(new ActivityLog(
                        userId, userName, role, "DELETE_PROJECT",
                        "Deleted project: " + project.getName() + " (ID: " + id + ")"
                ));
            } catch (Exception ignored) {}

            return ResponseEntity.ok("Project deleted successfully");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting project: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<?> getProjectVersions(@PathVariable("id") Long id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);

            Project project = projectRepository.findById(id).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
            }

            List<ProjectVersion> versions = versionRepository.findByProjectIdOrderByCreatedAtDesc(id);
            return ResponseEntity.ok(versions);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error fetching versions: " + e.getMessage());
        }
    }

    @PostMapping("/versions/{versionId}/restore")
    public ResponseEntity<?> restoreProjectVersion(@PathVariable("versionId") Long versionId, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Long userId = getUserIdFromHeader(authHeader);
            String userName = getUserNameFromHeader(authHeader);
            String role = getUserRoleFromHeader(authHeader);

            ProjectVersion version = versionRepository.findById(versionId).orElse(null);
            if (version == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Version snapshot not found");
            }

            Project project = projectRepository.findById(version.getProjectId()).orElse(null);
            if (project == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Associated project not found");
            }

            if (project.getOwnerId() != null && userId != null) {
                if (!project.getOwnerId().equals(userId) && !"ADMIN".equals(role)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
                }
            }

            project.setContent(version.getContent());
            project.setUpdatedAt(new Date());
            Project restoredProject = projectRepository.save(project);

            // Save a version entry for the restore action itself
            try {
                versionRepository.save(new ProjectVersion(project.getId(), project.getContent(), "Restored version ID: " + versionId));
            } catch (Exception ignored) {}

            // Audit Log
            try {
                activityLogRepository.save(new ActivityLog(
                        userId, userName, role, "RESTORE_VERSION",
                        "Restored project ID " + project.getId() + " to version ID " + versionId
                ));
            } catch (Exception ignored) {}

            return ResponseEntity.ok(restoredProject);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error restoring version: " + e.getMessage());
        }
    }

    @PostMapping("/generate-ai")
    public ResponseEntity<?> generateProjectWithAI(@RequestBody Map<String, Object> request, @RequestHeader("Authorization") String authHeader) {
        Long userId = getUserIdFromHeader(authHeader);
        String userName = getUserNameFromHeader(authHeader);
        String role = getUserRoleFromHeader(authHeader);
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Token");
        }

        Long templateId = 1L;
        if (request.containsKey("templateId") && request.get("templateId") != null) {
            try {
                templateId = Long.valueOf(request.get("templateId").toString());
            } catch (Exception ignored) {}
        }
        String name = request.getOrDefault("name", "Generated Newsletter").toString();
        String eventType = request.getOrDefault("eventType", "Campus Event").toString();
        String department = request.getOrDefault("department", "General").toString();
        String date = request.getOrDefault("date", "Today").toString();
        String audience = request.getOrDefault("audience", "All Students").toString();
        String keywords = request.getOrDefault("keywords", "Academic").toString();
        String tone = request.getOrDefault("tone", "Modern").toString();
        String rawPrompt = request.getOrDefault("prompt", "").toString();

        // Override with dynamically extracted fields from rawPrompt if available
        if (rawPrompt != null && !rawPrompt.trim().isEmpty()) {
            String parsedDept = extractFieldFromPrompt(rawPrompt, "department of");
            if (parsedDept == null) parsedDept = extractFieldFromPrompt(rawPrompt, "dept of");
            if (parsedDept == null) parsedDept = extractFieldFromPrompt(rawPrompt, "dept. of");
            if (parsedDept != null) department = parsedDept;

            String parsedTitle = extractFieldFromPrompt(rawPrompt, "newsletter title:");
            if (parsedTitle == null) parsedTitle = extractFieldFromPrompt(rawPrompt, "newsletter title");
            if (parsedTitle == null) parsedTitle = extractFieldFromPrompt(rawPrompt, "title:");
            if (parsedTitle != null) name = parsedTitle;

            String parsedDate = extractFieldFromPrompt(rawPrompt, "date:");
            if (parsedDate == null) parsedDate = extractFieldFromPrompt(rawPrompt, "date");
            if (parsedDate != null) date = parsedDate;
        }

        Project template = null;
        if (templateId != null) {
            template = projectRepository.findById(templateId).orElse(null);
        }
        if (template == null) {
            java.util.List<Project> templates = projectRepository.findByIsTemplateTrueOrderByUpdatedAtDesc();
            if (!templates.isEmpty()) {
                template = templates.get(0);
            }
        }
        if (template == null) {
            java.util.List<Project> allProjects = projectRepository.findAll();
            if (!allProjects.isEmpty()) {
                template = allProjects.get(0);
            }
        }
        if (template == null) {
            template = new Project();
            template.setCategory("Academic");
            template.setDepartment("Information Technology");
            template.setContent("{}");
        }

        // Determine generated name based on department
        String generatedName = name;
        if (name.equalsIgnoreCase("Generated Newsletter") || name.toLowerCase().contains("generated")) {
            String deptLower = department.toLowerCase();
            if (deptLower.contains("computer") || deptLower.contains("information") || deptLower.contains("it")) {
                generatedName = "CTRL+READ";
            } else if (deptLower.contains("placement")) {
                generatedName = "THE CAREER PATHWAY";
            } else if (deptLower.contains("commerce")) {
                generatedName = "COMMERCE CHRONICLE";
            } else if (deptLower.contains("research")) {
                generatedName = "RESEARCH BULLETIN";
            } else if (deptLower.contains("sports") || deptLower.contains("physical")) {
                generatedName = "SPORTS & CLUBS BULLETIN";
            } else {
                generatedName = "DEPARTMENT CHRONICLE";
            }
        }

        // Create a copy of the template
        Project generated = new Project();
        generated.setName(generatedName);
        generated.setDescription("AI-generated 8-page newsletter for " + eventType + " under " + department);
        generated.setCategory(template.getCategory());
        generated.setDepartment(department);
        generated.setStatus("DRAFT");
        generated.setOwnerId(userId);
        generated.setOwnerName(userName);
        generated.setTemplate(false);

        // Fetch colors from template content
        String primary = "#1e40af";
        String secondary = "#0f172a";
        String accent = "#f97316";
        String background = "#ffffff";
        
        String content = template.getContent();
        if (content != null) {
            if (content.contains("\"primary\":\"")) {
                int start = content.indexOf("\"primary\":\"") + 11;
                int end = content.indexOf("\"", start);
                primary = content.substring(start, end);
            }
            if (content.contains("\"secondary\":\"")) {
                int start = content.indexOf("\"secondary\":\"") + 13;
                int end = content.indexOf("\"", start);
                secondary = content.substring(start, end);
            }
            if (content.contains("\"accent\":\"")) {
                int start = content.indexOf("\"accent\":\"") + 10;
                int end = content.indexOf("\"", start);
                accent = content.substring(start, end);
            }
            if (content.contains("\"background\":\"")) {
                int start = content.indexOf("\"background\":\"") + 14;
                int end = content.indexOf("\"", start);
                background = content.substring(start, end);
            }
        }

        // Call the 8-page newsletter generator
        String generatedContent = create8PageNewsletterJson(
            primary, secondary, accent, background,
            generatedName, eventType, department, date,
            audience, keywords, tone, rawPrompt, templateId.intValue()
        );

        generated.setContent(generatedContent);
        Project savedProject = projectRepository.save(generated);

        // Save initial version
        versionRepository.save(new ProjectVersion(savedProject.getId(), savedProject.getContent(), "AI Generated 8-Page Template"));

        // Audit Log
        activityLogRepository.save(new ActivityLog(
                userId, userName, role, "GENERATE_PROJECT_AI",
                "AI generated 8-page newsletter project: " + savedProject.getName() + " (ID: " + savedProject.getId() + ") using Template ID: " + templateId
        ));

        return ResponseEntity.ok(savedProject);
    }

    @PostMapping("/{id}/regenerate-ai")
    public ResponseEntity<?> regenerateProjectWithAI(@PathVariable("id") Long id, @RequestBody Map<String, Object> request, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromHeader(authHeader);
        String userName = getUserNameFromHeader(authHeader);
        String role = getUserRoleFromHeader(authHeader);
        
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Token");
        }

        Project project = projectRepository.findById(id).orElse(null);
        if (project == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Project not found");
        }

        if (!project.getOwnerId().equals(userId) && !"ADMIN".equals(role) && !"FACULTY".equals(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
        }

        Long templateId = Long.valueOf(request.getOrDefault("templateId", "1").toString());
        String name = request.getOrDefault("name", project.getName()).toString();
        String eventType = request.getOrDefault("eventType", "Campus Event").toString();
        String department = request.getOrDefault("department", project.getDepartment()).toString();
        String date = request.getOrDefault("date", "Today").toString();
        String audience = request.getOrDefault("audience", "All Students").toString();
        String keywords = request.getOrDefault("keywords", "Academic").toString();
        String tone = request.getOrDefault("tone", "Modern").toString();
        String rawPrompt = request.getOrDefault("prompt", "").toString();

        // Override with dynamically extracted fields from rawPrompt if available
        if (rawPrompt != null && !rawPrompt.trim().isEmpty()) {
            String parsedDept = extractFieldFromPrompt(rawPrompt, "department of");
            if (parsedDept == null) parsedDept = extractFieldFromPrompt(rawPrompt, "dept of");
            if (parsedDept == null) parsedDept = extractFieldFromPrompt(rawPrompt, "dept. of");
            if (parsedDept != null) department = parsedDept;

            String parsedTitle = extractFieldFromPrompt(rawPrompt, "newsletter title:");
            if (parsedTitle == null) parsedTitle = extractFieldFromPrompt(rawPrompt, "newsletter title");
            if (parsedTitle == null) parsedTitle = extractFieldFromPrompt(rawPrompt, "title:");
            if (parsedTitle != null) name = parsedTitle;

            String parsedDate = extractFieldFromPrompt(rawPrompt, "date:");
            if (parsedDate == null) parsedDate = extractFieldFromPrompt(rawPrompt, "date");
            if (parsedDate != null) date = parsedDate;
        }

        Project template = projectRepository.findById(templateId).orElse(null);
        if (template == null) {
            List<Project> availableTemplates = projectRepository.findByIsTemplateTrueOrderByUpdatedAtDesc();
            if (!availableTemplates.isEmpty()) {
                template = availableTemplates.get(0);
            }
        }

        // Fetch colors from template content
        String primary = "#1e40af";
        String secondary = "#0f172a";
        String accent = "#f97316";
        String background = "#ffffff";
        
        if (template != null && template.getContent() != null) {
            String content = template.getContent();
            if (content.contains("\"primary\":\"")) {
                int start = content.indexOf("\"primary\":\"") + 11;
                int end = content.indexOf("\"", start);
                primary = content.substring(start, end);
            }
            if (content.contains("\"secondary\":\"")) {
                int start = content.indexOf("\"secondary\":\"") + 13;
                int end = content.indexOf("\"", start);
                secondary = content.substring(start, end);
            }
            if (content.contains("\"accent\":\"")) {
                int start = content.indexOf("\"accent\":\"") + 10;
                int end = content.indexOf("\"", start);
                accent = content.substring(start, end);
            }
            if (content.contains("\"background\":\"")) {
                int start = content.indexOf("\"background\":\"") + 14;
                int end = content.indexOf("\"", start);
                background = content.substring(start, end);
            }
        }

        // Call the 8-page newsletter generator
        String generatedContent = create8PageNewsletterJson(
            primary, secondary, accent, background,
            name, eventType, department, date,
            audience, keywords, tone, rawPrompt, templateId.intValue()
        );

        project.setContent(generatedContent);
        project.setUpdatedAt(new Date());
        Project savedProject = projectRepository.save(project);

        // Save version
        versionRepository.save(new ProjectVersion(savedProject.getId(), savedProject.getContent(), "Regenerated via AI Prompt"));

        // Audit Log
        activityLogRepository.save(new ActivityLog(
                userId, userName, role, "REGENERATE_PROJECT_AI",
                "AI regenerated project: " + savedProject.getName() + " (ID: " + savedProject.getId() + ") using Template ID: " + templateId
        ));

        return ResponseEntity.ok(savedProject);
    }

    private String expandPromptToArticle(String prompt, String department, String eventType, String date, String audience) {
        String cleaned = (prompt != null) ? prompt.replace("\n", " ").replace("\"", "\\\"").trim() : "";
        
        // Check if Tamil characters are present
        boolean isTamil = false;
        for (char c : cleaned.toCharArray()) {
            if (Character.UnicodeBlock.of(c) == Character.UnicodeBlock.TAMIL) {
                isTamil = true;
                break;
            }
        }
        
        if (isTamil) {
            return cleaned;
        }

        String deptName = (department != null && !department.isEmpty()) ? department : "Information Technology";
        String evType = (eventType != null && !eventType.isEmpty()) ? eventType : "Academic Initiative";
        String evDate = (date != null && !date.isEmpty()) ? date : "JUNE 2026";
        String aud = (audience != null && !audience.isEmpty()) ? audience : "Our Student Delegation";
        String topicStr = cleaned.isEmpty() ? "Executive presentation, student web app deployment, leadership appreciation" : cleaned;
        
        return "The Department organized the academic initiative titled \"" + evType + "\" hosted at KPRCAS campus on " + evDate + ". " +
               "The student delegation (" + aud + "), representing the Department of " + deptName + ", actively represented the department with technical excellence and dedication. " +
               "During the main program session, the project team delivered an executive presentation before college dignitaries and department leaders. " +
               "Key project highlights included student web app deployment, live feature demonstration, and interactive module testing. " +
               "The executive leadership team expressed immense appreciation for the students' problem-solving mindset, practical execution, and dedicated teamwork. " +
               "Focus areas and core event highlights included: " + topicStr + ". " +
               "The department warmly congratulates the students on their active participation, exemplary dedication, and outstanding academic initiative!";
    }

    private String create8PageNewsletterJson(
        String primary, String secondary, String accent, String background,
        String name, String eventType, String department, String date,
        String audience, String keywords, String tone, String prompt,
        int templateIndex
    ) {
        try {
            List<Map<String, Object>> pages = newsletterGeneratorService.generateNewsletter(
                prompt, name, department, date, audience,
                primary, secondary, accent, background
            );
            
            Map<String, Object> projectData = new HashMap<>();
            projectData.put("canvasWidth", 800);
            projectData.put("canvasHeight", 1130);
            
            Map<String, String> theme = new HashMap<>();
            theme.put("primary", primary);
            theme.put("secondary", secondary);
            theme.put("accent", accent);
            theme.put("background", background);
            projectData.put("theme", theme);
            projectData.put("pages", pages);
            
            Map<String, Object> promptMetadata = new HashMap<>();
            promptMetadata.put("templateId", templateIndex);
            promptMetadata.put("prompt", prompt);
            promptMetadata.put("eventType", eventType);
            promptMetadata.put("department", department);
            promptMetadata.put("date", date);
            promptMetadata.put("audience", audience);
            projectData.put("promptMetadata", promptMetadata);
            
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.writeValueAsString(projectData);
        } catch (Exception e) {
            e.printStackTrace();
            return "{}";
        }
    }

    private String getPageTitle(int pageNum, String prompt) {
        String pagePrompt = extractPagePrompt(prompt, pageNum);
        if (pagePrompt != null && !pagePrompt.trim().isEmpty()) {
            if (pagePrompt.contains(":")) {
                int colonIdx = pagePrompt.indexOf(":");
                String beforeColon = pagePrompt.substring(0, colonIdx).trim();
                if (beforeColon.length() < 50 && beforeColon.length() > 2) {
                    return beforeColon.toUpperCase();
                }
            }
            String[] words = pagePrompt.split("\\s+");
            if (words.length > 0) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < Math.min(words.length, 4); i++) {
                    sb.append(words[i]).append(" ");
                }
                return sb.toString().trim().toUpperCase();
            }
        }

        String theme = currentTheme.get();
        if (theme == null) theme = "GENERAL";

        if ("WORKSHOP".equals(theme)) {
            switch (pageNum) {
                case 2: return "WORKSHOP OVERVIEW & INAUGURAL";
                case 3: return "KEYNOTE PRESENTATIONS";
                case 4: return "HANDS-ON LAB SESSIONS";
                case 5: return "STUDENT INNOVATION SHOWCASE";
                case 6: return "VALEDICTORY & CERTIFICATE CEREMONY";
                case 7: return "ORGANIZING COMMITTEE & MENTOR INSIGHTS";
            }
        } else if ("PLACEMENT".equals(theme)) {
            switch (pageNum) {
                case 2: return "PLACEMENT DRIVE SUMMARY";
                case 3: return "SELECTED CANDIDATES";
                case 4: return "CTC HIGHLIGHTS & SALARY PACKAGES";
                case 5: return "APTITUDE & CODING PREPARATION";
                case 6: return "RECRUITER FEEDBACK";
                case 7: return "PLACEMENT CELL MESSAGE";
            }
        } else if ("ACHIEVEMENTS".equals(theme)) {
            switch (pageNum) {
                case 2: return "HACKATHON HEROES";
                case 3: return "PROJECT ARCHITECTURE & TECH STACK";
                case 4: return "AWARD CEREMONY & ACCOLADES";
                case 5: return "COMPETITOR PROFILES & TECH JOURNEY";
                case 6: return "JURY FEEDBACK & METRICS";
                case 7: return "MENTOR COLLABORATION";
            }
        } else if ("RESEARCH".equals(theme)) {
            switch (pageNum) {
                case 2: return "RESEARCH & DEVELOPMENT INITIATIVES";
                case 3: return "ABSTRACT SHOWCASE";
                case 4: return "DATA VISUALIZATION & EXPERIMENTS";
                case 5: return "COLLABORATIVE PARTNERSHIPS";
                case 6: return "FUTURE SCOPE & APPLICATIONS";
                case 7: return "PATENTS & IP REGISTRY";
            }
        } else if ("INDUCTION".equals(theme)) {
            switch (pageNum) {
                case 2: return "DEEKSHARAMBH INDUCTION";
                case 3: return "CAMPUS TOUR & ECOSYSTEM";
                case 4: return "ACADEMIC REGULATIONS & GUIDELINES";
                case 5: return "TECHNICAL CLUBS & HACKATHONS";
                case 6: return "CITE HACKATHON INITIATIVE";
                case 7: return "SENIOR-JUNIOR INTERACTIONS";
            }
        }

        switch (pageNum) {
            case 2: return "STUDENTS' ACHIEVEMENTS";
            case 3: return "ACADEMIC INTERNSHIPS";
            case 4: return "DEPARTMENT WORKSHOPS";
            case 5: return "FRESHERS' ORIENTATION";
            case 6: return "STUDENTS' INDUCTION PROGRAM";
            case 7: return "FACULTY KEYNOTES & RESEARCH";
            default: return "CAMPUS SPOTLIGHT";
        }
    }

    private String getPageSubTitle(int pageNum, String eventType) {
        String theme = currentTheme.get();
        if (theme == null) theme = "GENERAL";

        if ("WORKSHOP".equals(theme)) {
            switch (pageNum) {
                case 2: return "EMPOWERING STUDENTS WITH NEW PARADIGMS";
                case 3: return "EXPERT PERSPECTIVES ON INDUSTRIAL EVOLUTIONS";
                case 4: return "PRACTICAL WORKFLOWS AND TOOLSETS";
                case 5: return "DESIGNING MINI PROJECTS AND DEMOS";
                case 6: return "CELEBRATING SUCCESS AND PARTICIPATION";
                case 7: return "LEADERSHIP AND COORDINATION REFLECTIONS";
            }
        } else if ("PLACEMENT".equals(theme)) {
            switch (pageNum) {
                case 2: return "OPENING CAREER DOORWAYS FOR TOMORROW'S LEADERS";
                case 3: return "CONGRATULATIONS TO OUR SUCCESSFUL STUDENTS";
                case 4: return "ELITE OFFERS AND RECOGNITION";
                case 5: return "TRAINING SESSIONS AND MOCK INTERVIEWS";
                case 6: return "INDUSTRY PARTNERS COMMEND STUDENT TALENT";
                case 7: return "HOD AND PLACEMENT COORDINATORS SHARE VISION";
            }
        } else if ("ACHIEVEMENTS".equals(theme)) {
            switch (pageNum) {
                case 2: return "KPRCAS TEAMS TRIUMPH AT NATIONAL COMPETITIONS";
                case 3: return "INNOVATING SOLUTIONS FOR REAL WORLD CHALLENGES";
                case 4: return "SHINING ON THE NATIONAL STAGE";
                case 5: return "MEET THE DESIGNERS BEHIND THE INNOVATION";
                case 6: return "EVALUATION CRITERIA AND HIGHLIGHTS";
                case 7: return "FACULTY GUIDANCE EMPOWERING SUCCESS";
            }
        } else if ("RESEARCH".equals(theme)) {
            switch (pageNum) {
                case 2: return "PIONEERING DISCOVERIES AND ACADEMIC WRITING";
                case 3: return "EXPLORING INNOVATIVE SYSTEM ARCHITECTURES";
                case 4: return "EMPIRICAL ANALYSIS AND VALIDATION RESULTS";
                case 5: return "INTERNATIONAL IMPACT AND CITATIONS";
                case 6: return "SCALING RESEARCH TO REAL WORLD ENTERPRISES";
                case 7: return "SAFEGUARDING INTELLECTUAL PROPERTY AND INNOVATION";
            }
        } else if ("INDUCTION".equals(theme)) {
            switch (pageNum) {
                case 2: return "WELCOMING THE B.SC IT COHORT OF 2026";
                case 3: return "EXPLORING LABS, SYNERGY CELL, AND INCUBATION HUB";
                case 4: return "ESTABLISHING PATHWAYS FOR DISCIPLINED LEARNING";
                case 5: return "JOINING COMMUNITIES FOR EXTRA CURRICULAR EXCELLENCE";
                case 6: return "MR. GANAPATHI RAM INTRODUCES THE INNOVATION PLATFORM";
                case 7: return "ESTABLISHING ACADEMIC MENTORSHIP CHAINS";
            }
        }

        switch (pageNum) {
            case 2: return "NATIONAL LEVEL HACKATHON PARTICIPATION";
            case 3: return "21-DAY INTENSIVE PLACEMENT TRAINING";
            case 4: return "EMPOWERING EXCELLENCE WITH TOOLS & METHODS";
            case 5: return "WELCOMING THE INCOMING COHORT";
            case 6: return "DEEKSHARAMBH CAMPUS PREPARATION";
            case 7: return "EXPERTS SHARING KNOWLEDGE & EXPERTISE";
            default: return eventType.toUpperCase();
        }
    }

    private String getPageArticle(int pageNum, String department, String eventType, String date, String audience, String prompt) {
        String pagePrompt = extractPagePrompt(prompt, pageNum);
        if (pagePrompt != null && !pagePrompt.trim().isEmpty()) {
            String body = pagePrompt;
            if (pagePrompt.contains(":")) {
                int colonIdx = pagePrompt.indexOf(":");
                String beforeColon = pagePrompt.substring(0, colonIdx).trim();
                String afterColon = pagePrompt.substring(colonIdx + 1).trim();
                if (beforeColon.length() < 50 && beforeColon.length() > 2) {
                    body = afterColon;
                }
            }
            return expandPromptToArticle(body, department, eventType, date, audience);
        }

        String theme = currentTheme.get();
        if (theme == null) theme = "GENERAL";

        boolean isPrimaryPageForPrompt = false;
        if ("WORKSHOP".equals(theme) && pageNum == 4) isPrimaryPageForPrompt = true;
        else if ("PLACEMENT".equals(theme) && pageNum == 2) isPrimaryPageForPrompt = true;
        else if ("ACHIEVEMENTS".equals(theme) && pageNum == 2) isPrimaryPageForPrompt = true;
        else if ("RESEARCH".equals(theme) && pageNum == 2) isPrimaryPageForPrompt = true;
        else if ("INDUCTION".equals(theme) && pageNum == 2) isPrimaryPageForPrompt = true;
        else if ("GENERAL".equals(theme) && pageNum == 4) isPrimaryPageForPrompt = true;
        
        if (isPrimaryPageForPrompt && prompt != null && !prompt.trim().isEmpty()) {
            return expandPromptToArticle(prompt, department, eventType, date, audience);
        }

        if ("WORKSHOP".equals(theme)) {
            switch (pageNum) {
                case 2: return "The Department of " + department + " inaugurated its prestigious training series on " + date + ". The inaugural address highlighted the significance of keeping pace with emerging tech innovations. Faculty members welcomed the gathering, setting a motivating tone for the interactive learning tracks to follow.";
                case 3: return "Distinguished guest speakers took the stage to share state-of-the-art developments. They emphasized practical applications, current industry demands, and the necessity of hands-on expertise to solve contemporary engineering problems.";
                case 4: return "A specialized training workshop was hosted at KPRCAS campus. Over 120 student participants from the department engaged in interactive, hands-on lab exercises designed to sharpen technical proficiency and analytical skills.";
                case 5: return "During the technical tracks, student teams collaborated to construct functional prototypes and mini projects based on the tools discussed. Instructors evaluated the designs, noting high creativity and solid implementation of core principles.";
                case 6: return "The training concluded with a grand valedictory session. Certificates of participation were distributed to all student attendees. HOD and HOD-nominated panels praised the students' active engagement and distributed awards to top-performing teams.";
                case 7: return "This program was meticulously coordinated by senior faculty coordinators and student volunteers. Their dedication ensured seamless lab setups, guest hospitality, and active scheduling. The organizing committee expressed appreciation to the management for their continuous support.";
            }
        } else if ("PLACEMENT".equals(theme)) {
            switch (pageNum) {
                case 2: return "The Department of " + department + " organized a campus recruitment drive on " + date + ". Students demonstrated professional interview skills during multiple rounds of selection, showing their readiness for global careers.";
                case 3: return "We are immensely proud to announce that several pre-final and final year students secured prestigious career placements. Their success is a testament to their continuous hard work, technical skill development, and aptitude preparation.";
                case 4: return "This placement season saw an impressive rise in average and highest salary packages. Top recruiters offered outstanding packages, reflecting the growing industrial trust in our students' software engineering capabilities and soft skills.";
                case 5: return "Prior to the drive, the department arranged intensive aptitude, resume-building, and coding bootcamps. Industry mentors hosted mock HR and technical interviews, giving students the confidence and skills needed to clear advanced evaluation rounds.";
                case 6: return "Visiting corporate recruiters shared exceptional feedback regarding the curriculum alignment and technical acumen of KPRCAS candidates. They noted that students possessed strong fundamentals in modern application development frameworks.";
                case 7: return "The department placement coordinators highlighted KPRCAS's focus on industry preparedness. By offering custom technical courses, coding clubs, and corporate linkages, we strive to ensure that every student is equipped for premium global career opportunities.";
            }
        } else if ("ACHIEVEMENTS".equals(theme)) {
            switch (pageNum) {
                case 2: return "The Department of " + department + " celebrated student success at the national-level event on " + date + ". KPRCAS teams displayed outstanding technical capabilities and team communication during the competitive hackathon.";
                case 3: return "The winning solution integrated modern full-stack tools, data modeling, and cloud services to address key social and enterprise bottlenecks. Judges appreciated the clean code formatting, responsive design, and intuitive user interface.";
                case 4: return "The final valedictory round hosted distinguished dignitaries who presented trophies, certificates, and cash awards to our winning students. This victory brings immense pride to the entire institution and serves as an inspiration to junior batches.";
                case 5: return "Our student competitors spent weeks researching, building wireframes, and writing backend logic. Their dedication to self-learning and technical exploration highlights the department's active support for extra-curricular academic pursuits.";
                case 6: return "The jury commended the team's presentation clarity, scalable database architecture, and live project demonstration. They noted that KPRCAS students showcased excellent team dynamics and project management skills throughout the 36-hour coding sprint.";
                case 7: return "Faculty mentors played an essential role, offering technical counseling and refining the project's logic. The department continues to host internal hackathons, ideation camps, and research labs to prepare students for top-tier national events.";
            }
        } else if ("RESEARCH".equals(theme)) {
            switch (pageNum) {
                case 2: return "The Department of " + department + " is leading scientific breakthroughs. Our faculty and researchers published multiple high-impact journal papers on " + date + ", marking a significant step forward in research publications.";
                case 3: return "The published paper presents a comprehensive study on data patterns and automated optimization techniques. The methodology addresses critical challenges in latency, showing high efficiency compared to traditional algorithms.";
                case 4: return "Using high-fidelity datasets, the research validates the proposed approach across multiple operational scenarios. The experimental results indicate consistent improvements in processing speed and overall system reliability.";
                case 5: return "Our research teams regularly collaborate with global academic institutions and research labs. These linkages enhance research quality, invite high citation metrics, and position our department at the forefront of international scientific discourse.";
                case 6: return "The theoretical frameworks developed in these publications are being extended into open-source repositories and prototype models. Future iterations aim to integrate AI agents to scale computational efficiency in cloud networks.";
                case 7: return "Along with academic papers, the department has filed multiple patents for novel software designs. Our dedicated patent cell provides students and faculty with legal and technical aid to register and monetize their innovative designs.";
            }
        } else if ("INDUCTION".equals(theme)) {
            switch (pageNum) {
                case 2: return "The Department of " + department + " hosted its orientation program to welcome the incoming batch of first-year students on " + date + ". HOD and HOD-appointed advisors addressed the gathering, setting the academic roadmap.";
                case 3: return "Students toured our high-end computing laboratories, central library, and innovation zones. The coordinators introduced the Synergy Cell, motivating freshers to participate in entrepreneurship bootcamps and startup initiatives.";
                case 4: return "The academic session detailed the curriculum structure, credit systems, and internal assessment formats. HOD emphasized the importance of regular attendance, technical certifications, and ethical coding practices for career success.";
                case 5: return "Senior student coordinators presented the active clubs under the School of Computing. Freshers learned about coding circles, web design squads, and robotics groups, and were encouraged to register for upcoming hackathons.";
                case 6: return "A special briefing was held on the Center for Innovation and Technical Excellence (CITE). The program guides students from scratch to building competition-ready applications and winning premium national hackathon challenges.";
                case 7: return "The induction program concluded with warm interactive circles where senior students shared their college journeys, exam preparation strategies, and placement interview tips, establishing strong, supportive mentorship chains.";
            }
        }

        return generateUniqueArticle(department, eventType, pageNum, 0);
    }

    private String getImageUrl(int pageNum, int imgIndex) {
        String theme = currentTheme.get();
        if (theme == null) theme = "GENERAL";

        String url = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80"; // Default campus
        
        if ("WORKSHOP".equals(theme)) {
            String[] list = {
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80", // Workshop collaboration
                "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80", // Presentation
                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80", // Seminar hall
                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80", // Group talk
                "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80"  // Working on laptop
            };
            url = list[(pageNum + imgIndex) % list.length];
        } else if ("PLACEMENT".equals(theme)) {
            String[] list = {
                "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", // Interviewer
                "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80", // Handshake
                "https://images.unsplash.com/photo-1521791136368-1a8ac2f72a56?auto=format&fit=crop&w=400&q=80", // Teamwork success
                "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80", // Business presentation
                "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80"  // Professional candidate
            };
            url = list[(pageNum + imgIndex) % list.length];
        } else if ("ACHIEVEMENTS".equals(theme)) {
            String[] list = {
                "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80", // Coding squad
                "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=400&q=80", // Certificate
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80", // Hackathon desk
                "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80", // Award trophy
                "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80"  // Celebration group
            };
            url = list[(pageNum + imgIndex) % list.length];
        } else if ("RESEARCH".equals(theme)) {
            String[] list = {
                "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=400&q=80", // Research lab
                "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80", // Books pile
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80", // Writing notes
                "https://images.unsplash.com/photo-1558021211-6d1403321394?auto=format&fit=crop&w=400&q=80", // Computer server lab
                "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80"  // Studying at library
            };
            url = list[(pageNum + imgIndex) % list.length];
        } else if ("INDUCTION".equals(theme)) {
            String[] list = {
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80", // Professor presenting
                "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&q=80", // Students gathering
                "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80", // College main campus
                "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=400&q=80", // Classroom lecture
                "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=400&q=80"  // Student reading books
            };
            url = list[(pageNum + imgIndex) % list.length];
        } else {
            String[] list = {
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1589330694653-ded6df53f6ee?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80"
            };
            url = list[(pageNum + imgIndex) % list.length];
        }
        
        return url;
    }

    private String getThemeName(String eventType, String prompt) {
        String query = ((eventType != null ? eventType : "") + " " + (prompt != null ? prompt : "")).toLowerCase();
        if (query.contains("workshop") || query.contains("seminar") || query.contains("lecture") || query.contains("webinar")) {
            return "WORKSHOP";
        } else if (query.contains("placement") || query.contains("recruit") || query.contains("job") || query.contains("career")) {
            return "PLACEMENT";
        } else if (query.contains("achievement") || query.contains("hackathon") || query.contains("won ") || query.contains("pride") || query.contains("competition")) {
            return "ACHIEVEMENTS";
        } else if (query.contains("research") || query.contains("journal") || query.contains("paper") || query.contains("publication") || query.contains("patent")) {
            return "RESEARCH";
        } else if (query.contains("induction") || query.contains("welcome") || query.contains("orientation") || query.contains("fresher")) {
            return "INDUCTION";
        }
        return "GENERAL";
    }

    private String generateUniqueArticle(String dept, String category, int pageNum, int index) {
        String event = category.toUpperCase();
        switch (pageNum) {
            case 2:
                return "The students of the Department of " + dept + " demonstrated exceptional talent at the recent National Level " + event + " Symposium. " +
                       "Securing top positions across multiple competitive tracks, the team was highly commended by the jury. " +
                       "This stellar achievement underscores our department's emphasis on excellence and practical readiness for industrial challenges.";
            case 3:
                return "Our pre-final year students from the Department of " + dept + " have embarked on an intensive internship initiative focusing on " + event + " applications. " +
                       "Partnering with leading tech firms in the region, the program bridges academic theory and real-world execution. " +
                       "Staff coordinators monitored the progress, noting significant feedback from industry supervisors on our students' dedication.";
            case 4:
                return "A high-impact training workshop on " + event + " was hosted by the Department of " + dept + " at KPRCAS campus. " +
                       "The session invited distinguished resource experts who delivered key insights on advanced techniques and industrial methodologies. " +
                       "Over 120 student participants engaged in interactive, hands-on lab exercises designed to sharpen technical proficiency.";
            case 5:
                return "To welcome our new batch of student cohorts, the Department of " + dept + " celebrated their freshman orientation program. " +
                       "Senior student mentors, along with faculty members, introduced the freshers to our academic culture, clubs, and campus ecosystems. " +
                       "The Dean and HOD addressed the gathering, emphasizing high ethics and professional milestones in " + event + ".";
            case 6:
                return "Under the Deeksharambh student induction guidelines, the Department of " + dept + " organized a comprehensive tour and seminar. " +
                       "The program focused on outlining career domains, career prospects, and entrepreneurship incubation options. " +
                       "This initial exposure successfully motivated students to explore research and innovation pathways in " + event + ".";
            case 7:
                return "Dr. K. Srinivasan, Associate Professor from the Department of " + dept + ", was invited as the chief keynote guest speaker for the national conference. " +
                       "His address on next-generation developments in " + event + " was highly appreciated. " +
                       "Such active faculty contributions reflect KPRCAS's continuous role in leading academic and technical discourse.";
            default:
                return "The Department of " + dept + " has successfully concluded its academic event focused on " + event + ". " +
                       "This initiative aimed at fostering skills, building industry connections, and encouraging research among both students and faculty members.";
        }
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\r", "")
                  .replace("\n", "\\n")
                  .replace("\t", "\\t");
    }

    private String extractPagePrompt(String prompt, int pageNum) {
        if (prompt == null) return null;
        String lower = prompt.toLowerCase();
        
        String currentMarker = "page " + pageNum;
        int startIdx = lower.indexOf(currentMarker);
        if (startIdx == -1) {
            currentMarker = "pg " + pageNum;
            startIdx = lower.indexOf(currentMarker);
            if (startIdx == -1) {
                currentMarker = "pg. " + pageNum;
                startIdx = lower.indexOf(currentMarker);
            }
        }
        
        if (startIdx != -1) {
            int contentStart = startIdx + currentMarker.length();
            while (contentStart < prompt.length()) {
                char c = prompt.charAt(contentStart);
                if (c == ':' || c == '-' || c == ' ' || c == '\t' || c == '\r' || c == '\n') {
                    contentStart++;
                } else {
                    break;
                }
            }
            
            int endIdx = prompt.length();
            for (int nextPage = pageNum + 1; nextPage <= 9; nextPage++) {
                String nextMarker = "page " + nextPage;
                int nextStart = lower.indexOf(nextMarker);
                if (nextStart == -1) {
                    nextMarker = "pg " + nextPage;
                    nextStart = lower.indexOf(nextMarker);
                    if (nextStart == -1) {
                        nextMarker = "pg. " + nextPage;
                        nextStart = lower.indexOf(nextMarker);
                    }
                }
                
                if (nextStart != -1 && nextStart > contentStart) {
                    endIdx = nextStart;
                    break;
                }
            }
            
            String extracted = prompt.substring(contentStart, endIdx).trim();
            if (extracted.endsWith(":") || extracted.endsWith("-")) {
                extracted = extracted.substring(0, extracted.length() - 1).trim();
            }
            return extracted;
        }
        return null;
    }

    private String extractFieldFromPrompt(String prompt, String prefix) {
        if (prompt == null) return null;
        String lower = prompt.toLowerCase();
        String lowerPrefix = prefix.toLowerCase();
        int idx = lower.indexOf(lowerPrefix);
        if (idx != -1) {
            int startIdx = idx + prefix.length();
            while (startIdx < prompt.length()) {
                char c = prompt.charAt(startIdx);
                if (c == ':' || c == '-' || c == ' ' || c == '\t' || c == '\r' || c == '\n') {
                    startIdx++;
                } else {
                    break;
                }
            }
            int endIdx = prompt.length();
            int periodIdx = prompt.indexOf(".", startIdx);
            int newlineIdx = prompt.indexOf("\n", startIdx);
            
            int nextField1 = lower.indexOf("department", startIdx);
            int nextField2 = lower.indexOf("newsletter title", startIdx);
            int nextField3 = lower.indexOf("date", startIdx);
            int nextField4 = lower.indexOf("page", startIdx);
            int nextField5 = lower.indexOf("pg", startIdx);
            
            if (periodIdx != -1 && periodIdx < endIdx) endIdx = periodIdx;
            if (newlineIdx != -1 && newlineIdx < endIdx) endIdx = newlineIdx;
            if (nextField1 != -1 && nextField1 < endIdx) endIdx = nextField1;
            if (nextField2 != -1 && nextField2 < endIdx) endIdx = nextField2;
            if (nextField3 != -1 && nextField3 < endIdx) endIdx = nextField3;
            if (nextField4 != -1 && nextField4 < endIdx) endIdx = nextField4;
            if (nextField5 != -1 && nextField5 < endIdx) endIdx = nextField5;
            
            String extracted = prompt.substring(startIdx, endIdx).trim();
            if (extracted.endsWith(":") || extracted.endsWith("-")) {
                extracted = extracted.substring(0, extracted.length() - 1).trim();
            }
            if (!extracted.isEmpty()) {
                return extracted;
            }
        }
        return null;
    }
}
