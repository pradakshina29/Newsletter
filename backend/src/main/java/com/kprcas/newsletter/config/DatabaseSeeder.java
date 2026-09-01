package com.kprcas.newsletter.config;

import com.kprcas.newsletter.model.Project;
import com.kprcas.newsletter.model.User;
import com.kprcas.newsletter.repository.ProjectRepository;
import com.kprcas.newsletter.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private boolean currentSeedingIsBlank = false;

    @Override
    public void run(String... args) throws Exception {
        seedUsers();
        seedTemplates();
    }

    private void seedUsers() {
        if (userRepository.count() == 0) {
            User admin = new User(
                    "admin@kprcas.ac.in",
                    passwordEncoder.encode("admin123"),
                    "Admin Officer",
                    "ADMIN",
                    "Administration"
            );

            User faculty = new User(
                    "faculty@kprcas.ac.in",
                    passwordEncoder.encode("faculty123"),
                    "Dr. K. Srinivasan (HOD)",
                    "FACULTY",
                    "Computer Science"
            );

            User student = new User(
                    "student@kprcas.ac.in",
                    passwordEncoder.encode("student123"),
                    "Sanjay Kumar A.",
                    "STUDENT",
                    "Computer Science"
            );

            userRepository.saveAll(Arrays.asList(admin, faculty, student));
            System.out.println("Default users seeded: admin@kprcas.ac.in, faculty@kprcas.ac.in, student@kprcas.ac.in");
        }
    }

    private void seedTemplates() {
        java.util.List<Project> existingTemplates = projectRepository.findByIsTemplateTrueOrderByUpdatedAtDesc();
        projectRepository.deleteAll(existingTemplates);

        // 1. Single Official 8-page Newsletter Template
        Project officialTemplate = new Project();
        officialTemplate.setName("CTRL+READ — Official Department Newsletter");
        officialTemplate.setDescription("Official 8-page KPRCAS department newsletter template reproducing the exact visual design, headers, and 8-page structure.");
        officialTemplate.setCategory("Academic");
        officialTemplate.setDepartment("Information Technology");
        officialTemplate.setStatus("PUBLISHED");
        officialTemplate.setTemplate(true);
        officialTemplate.setOwnerId(1L);
        officialTemplate.setOwnerName("System");
        officialTemplate.setContent(create8PageTemplate("#1e40af", "#0f172a", "#f97316", "#EFEFEF", "CTRL+READ", "Induction Program", "Information Technology", "June 2026", "150 Students", "", "Professional", "", 1, false));

        projectRepository.save(officialTemplate);
        System.out.println("Seeded single official CTRL+READ template successfully.");
    }

    private String expandPromptToArticle(String prompt, String department, String eventType, String date, String audience) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return "The Department of " + department + " organized a high-impact " + eventType + " on " + date + ". " +
                   "The event witnessed active participation from " + audience + ", providing them with hands-on " +
                   "insights and interactive learning opportunities under expert guidance.";
        }
        
        // Clean prompt
        String cleaned = prompt.replace("\n", " ").replace("\"", "\\\"");
        
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
        
        // Generate a formal, publication-quality paragraph in English
        return "The Department of " + department + " successfully organized a specialized " + eventType + " on " + date + 
               " at KPRCAS campus. " + cleaned + " The sessions provided students with practical exposure, " +
               "interactive demonstrations, and key conceptual understanding. A total of " + audience + 
               " actively participated, engaging in practical exercises. The event concluded with certificate " +
               "distribution and feedback sessions, marking another successful milestone for the department.";
    }

    private String create8PageTemplate(
        String primary, String secondary, String accent, String background,
        String name, String eventType, String department, String date,
        String audience, String keywords, String tone, String prompt,
        int templateIndex
    ) {
        return create8PageTemplate(primary, secondary, accent, background, name, eventType, department, date, audience, keywords, tone, prompt, templateIndex, false);
    }

    private String create8PageTemplate(
        String primary, String secondary, String accent, String background,
        String name, String eventType, String department, String date,
        String audience, String keywords, String tone, String prompt,
        int templateIndex, boolean isBlank
    ) {
        this.currentSeedingIsBlank = isBlank;
        if (isBlank) {
            name = "CTRL+READ";
            department = "Information Technology";
            date = "June 2026";
        }
        String resolvedDept = isBlank ? "Information Technology" : department;
        String resolvedDate = isBlank ? "June 2026" : date;
        String resolvedName = "CTRL+READ";

        // Always generate clean 8-page newsletter layouts with ZERO inbuilt pictures
        if (true) {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append("\"canvasWidth\":800,");
            sb.append("\"canvasHeight\":1130,");
            sb.append("\"theme\":{\"primary\":\"#1e40af\",\"secondary\":\"#0f172a\",\"accent\":\"#f97316\",\"background\":\"#EFEFEF\"},");
            sb.append("\"pages\":[");
            for (int i = 1; i <= 8; i++) {
                if (i > 1) sb.append(",");
                sb.append("  {");
                sb.append("    \"id\":\"page_").append(i).append("\",");
                sb.append("    \"elements\":[");
                sb.append("      {\"id\":\"p").append(i).append("_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"#EFEFEF\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
                sb.append("      {\"id\":\"p").append(i).append("_line_hdr0\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":40,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
                sb.append("      {\"id\":\"p").append(i).append("_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":52,\"width\":450,\"height\":25,\"text\":\"DEPARTMENT OF ").append(resolvedDept.toUpperCase()).append("\",\"fontSize\":12,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"left\"},");
                sb.append("      {\"id\":\"p").append(i).append("_date_hdr\",\"type\":\"text\",\"x\":500,\"y\":52,\"width\":250,\"height\":25,\"text\":\"").append(resolvedDate.toUpperCase()).append("\",\"fontSize\":12,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
                sb.append("      {\"id\":\"p").append(i).append("_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":85,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
                sb.append("      {\"id\":\"p").append(i).append("_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":98,\"width\":700,\"height\":65,\"text\":\"").append(resolvedName.toUpperCase()).append("\",\"fontSize\":52,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":1.5},");
                sb.append("      {\"id\":\"p").append(i).append("_line_hdr2_left\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":180,\"width\":240,\"height\":1,\"fillColor\":\"#000000\"},");
                sb.append("      {\"id\":\"p").append(i).append("_subtitle_hdr\",\"type\":\"text\",\"x\":300,\"y\":170,\"width\":200,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.5},");
                sb.append("      {\"id\":\"p").append(i).append("_line_hdr2_right\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":510,\"y\":180,\"width\":240,\"height\":1,\"fillColor\":\"#000000\"},");
                if (i == 1) {
                    sb.append("      {\"id\":\"p1_kprcas_logo\",\"type\":\"image\",\"x\":50,\"y\":200,\"width\":330,\"height\":100,\"url\":\"/assets/kprcas_logo.jpg\",\"borderRadius\":0,\"objectFit\":\"contain\"},");
                    sb.append("      {\"id\":\"p1_launchit_logo\",\"type\":\"image\",\"x\":420,\"y\":200,\"width\":330,\"height\":100,\"url\":\"/assets/launchit_logo.jpg\",\"borderRadius\":0,\"objectFit\":\"contain\"},");
                    sb.append("      {\"id\":\"p1_school_text\",\"type\":\"text\",\"x\":50,\"y\":315,\"width\":700,\"height\":25,\"text\":\"SCHOOL OF COMPUTING SCIENCE\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":1.0},");
                    sb.append("      {\"id\":\"p1_dept_text\",\"type\":\"text\",\"x\":50,\"y\":345,\"width\":700,\"height\":25,\"text\":\"DEPARTMENT OF ").append(resolvedDept.toUpperCase()).append("\",\"fontSize\":14,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":1.0},");
                    sb.append("      {\"id\":\"p1_cover_img\",\"type\":\"image\",\"x\":50,\"y\":380,\"width\":700,\"height\":575,\"url\":\"/assets/kprcas_campus.png\",\"borderRadius\":12,\"shadow\":\"lg\",\"objectFit\":\"cover\"},");
                    sb.append("      {\"id\":\"p1_cover_caption\",\"type\":\"text\",\"x\":50,\"y\":970,\"width\":700,\"height\":20,\"text\":\"KPRCAS Main Campus • Official Department Newsletter Cover Page\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#64748b\",\"italic\":true,\"align\":\"center\"},");
                }
                sb.append("      {\"id\":\"p").append(i).append("_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page ").append(i).append(" • Official publication of the Department of ").append(resolvedDept).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
                sb.append("    ]");
                sb.append("  }");
            }
            sb.append("]}");
            return sb.toString();
        }

        String resolvedCollege = "KPR College of Arts Science and Research";

        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"canvasWidth\":800,");
        sb.append("\"canvasHeight\":1130,");
        sb.append("\"theme\":{\"primary\":\"").append(primary).append("\",\"secondary\":\"").append(secondary).append("\",\"accent\":\"").append(accent).append("\",\"background\":\"").append(background).append("\"},");
        sb.append("\"pages\":[");

        // PAGE 1: COVER PAGE
        sb.append("  {");
        sb.append("    \"id\":\"page_1\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p1_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p1_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(resolvedDept.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"left\"},");
        sb.append("      {\"id\":\"p1_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(resolvedDate.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p1_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p1_newsletter_title\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":50,\"text\":\"").append(resolvedName.toUpperCase()).append("\",\"fontSize\":36,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p1_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":125,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p1_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":150,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p1_kprcas_logo_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":170,\"width\":320,\"height\":80,\"fillColor\":\"#eff6ff\",\"strokeColor\":\"#cbd5e1\",\"strokeWidth\":1,\"borderRadius\":8},");
        sb.append("      {\"id\":\"p1_kprcas_logo_text\",\"type\":\"text\",\"x\":70,\"y\":190,\"width\":280,\"height\":40,\"text\":\"").append(resolvedCollege).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#1e40af\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p1_launchit_logo_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":430,\"y\":170,\"width\":320,\"height\":80,\"fillColor\":\"#fff1f2\",\"strokeColor\":\"#fecdd3\",\"strokeWidth\":1,\"borderRadius\":8},");
        sb.append("      {\"id\":\"p1_launchit_logo_text\",\"type\":\"text\",\"x\":450,\"y\":195,\"width\":280,\"height\":30,\"text\":\"LAUNCH IT • DESIGN STUDIO\",\"fontSize\":12,\"fontFamily\":\"Poppins\",\"color\":\"#be123c\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p1_school_text\",\"type\":\"text\",\"x\":50,\"y\":280,\"width\":700,\"height\":30,\"text\":\"SCHOOL OF COMPUTING SCIENCE\",\"fontSize\":16,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":1.0},");
        sb.append("      {\"id\":\"p1_dept_text\",\"type\":\"text\",\"x\":50,\"y\":320,\"width\":700,\"height\":30,\"text\":\"DEPARTMENT OF ").append(resolvedDept.toUpperCase()).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":1.0},");
        sb.append("      {\"id\":\"p1_cover_img\",\"type\":\"image\",\"x\":50,\"y\":380,\"width\":700,\"height\":600,\"url\":\"https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80\",\"borderRadius\":12,\"shadow\":\"lg\"},");
        sb.append("      {\"id\":\"p1_cover_caption\",\"type\":\"text\",\"x\":50,\"y\":995,\"width\":700,\"height\":20,\"text\":\"KPRCAS Main Campus - Official Academic Newsletter Cover Page\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#64748b\",\"italic\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p1_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 1 • Official publication of the Department of ").append(resolvedDept).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        int layoutStyle = templateIndex % 4;

        // PAGE 2: STUDENT ACHIEVEMENTS
        String p2Title = getPageTitle(2);
        String p2SubTitle = getPageSubTitle(2, eventType);
        String p2Article = getPageArticle(2, department, eventType, date, audience, prompt);
        sb.append("  {");
        sb.append("    \"id\":\"page_2\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p2_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p2_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p2_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p2_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p2_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p2_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p2_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p2_title\",\"type\":\"text\",\"x\":50,\"y\":170,\"width\":700,\"height\":30,\"text\":\"").append(p2Title).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"").append(primary).append("\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p2_sub_title\",\"type\":\"text\",\"x\":50,\"y\":205,\"width\":700,\"height\":30,\"text\":\"").append(p2SubTitle).append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        if (layoutStyle == 1) {
            sb.append("      {\"id\":\"p2_text\",\"type\":\"text\",\"x\":50,\"y\":680,\"width\":700,\"height\":380,\"text\":\"").append(p2Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p2_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":700,\"height\":400,\"url\":\"").append(getImageUrl(2, 1)).append("\",\"borderRadius\":12},");
            sb.append("      {\"id\":\"p2_img2\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(2, 2)).append("\"},");
            sb.append("      {\"id\":\"p2_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(2, 3)).append("\"},");
            sb.append("      {\"id\":\"p2_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(2, 4)).append("\"},");
        } else if (layoutStyle == 2) {
            sb.append("      {\"id\":\"p2_text\",\"type\":\"text\",\"x\":400,\"y\":250,\"width\":350,\"height\":750,\"text\":\"").append(p2Article).append("\",\"fontSize\":11,\"fontFamily\":\"Georgia\",\"color\":\"#111827\",\"align\":\"justify\",\"lineHeight\":1.7},");
            sb.append("      {\"id\":\"p2_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(2, 1)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p2_img2\",\"type\":\"image\",\"x\":50,\"y\":650,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(2, 2)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p2_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(2, 3)).append("\"},");
            sb.append("      {\"id\":\"p2_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(2, 4)).append("\"},");
        } else if (layoutStyle == 3) {
            sb.append("      {\"id\":\"p2_text\",\"type\":\"text\",\"x\":50,\"y\":620,\"width\":700,\"height\":400,\"text\":\"").append(p2Article).append("\",\"fontSize\":11,\"fontFamily\":\"Montserrat\",\"color\":\"#1f2937\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p2_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":220,\"height\":330,\"url\":\"").append(getImageUrl(2, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p2_img2\",\"type\":\"image\",\"x\":290,\"y\":250,\"width\":220,\"height\":330,\"url\":\"").append(getImageUrl(2, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p2_img3\",\"type\":\"image\",\"x\":530,\"y\":250,\"width\":220,\"height\":330,\"url\":\"").append(getImageUrl(2, 3)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p2_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(2, 4)).append("\"},");
        } else {
            sb.append("      {\"id\":\"p2_text\",\"type\":\"text\",\"x\":50,\"y\":250,\"width\":700,\"height\":260,\"text\":\"").append(p2Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p2_img1\",\"type\":\"image\",\"x\":120,\"y\":530,\"width\":180,\"height\":220,\"url\":\"").append(getImageUrl(2, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p2_img2\",\"type\":\"image\",\"x\":330,\"y\":530,\"width\":350,\"height\":220,\"url\":\"").append(getImageUrl(2, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p2_img3\",\"type\":\"image\",\"x\":120,\"y\":770,\"width\":180,\"height\":220,\"url\":\"").append(getImageUrl(2, 3)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p2_img4\",\"type\":\"image\",\"x\":330,\"y\":770,\"width\":350,\"height\":220,\"url\":\"").append(getImageUrl(2, 4)).append("\",\"borderRadius\":8},");
        }
        sb.append("      {\"id\":\"p2_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 2 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        // PAGE 3: ACADEMIC INTERNSHIPS
        String p3Title = getPageTitle(3);
        String p3SubTitle = getPageSubTitle(3, eventType);
        String p3Article = getPageArticle(3, department, eventType, date, audience, prompt);
        sb.append("  {");
        sb.append("    \"id\":\"page_3\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p3_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p3_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p3_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p3_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p3_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p3_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p3_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p3_title\",\"type\":\"text\",\"x\":50,\"y\":170,\"width\":700,\"height\":30,\"text\":\"").append(p3Title).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"").append(primary).append("\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p3_sub_title\",\"type\":\"text\",\"x\":50,\"y\":205,\"width\":700,\"height\":30,\"text\":\"").append(p3SubTitle).append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        if (layoutStyle == 1) {
            sb.append("      {\"id\":\"p3_text\",\"type\":\"text\",\"x\":50,\"y\":680,\"width\":700,\"height\":320,\"text\":\"").append(p3Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p3_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":700,\"height\":400,\"url\":\"").append(getImageUrl(3, 1)).append("\",\"borderRadius\":12},");
            sb.append("      {\"id\":\"p3_img2\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(3, 2)).append("\"},");
            sb.append("      {\"id\":\"p3_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(3, 3)).append("\"},");
        } else if (layoutStyle == 2) {
            sb.append("      {\"id\":\"p3_text\",\"type\":\"text\",\"x\":400,\"y\":250,\"width\":350,\"height\":750,\"text\":\"").append(p3Article).append("\",\"fontSize\":11,\"fontFamily\":\"Georgia\",\"color\":\"#111827\",\"align\":\"justify\",\"lineHeight\":1.7},");
            sb.append("      {\"id\":\"p3_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(3, 1)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p3_img2\",\"type\":\"image\",\"x\":50,\"y\":650,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(3, 2)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p3_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(3, 3)).append("\"},");
        } else if (layoutStyle == 3) {
            sb.append("      {\"id\":\"p3_text\",\"type\":\"text\",\"x\":50,\"y\":700,\"width\":700,\"height\":300,\"text\":\"").append(p3Article).append("\",\"fontSize\":11,\"fontFamily\":\"Montserrat\",\"color\":\"#1f2937\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p3_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":330,\"height\":200,\"url\":\"").append(getImageUrl(3, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p3_img2\",\"type\":\"image\",\"x\":420,\"y\":250,\"width\":330,\"height\":200,\"url\":\"").append(getImageUrl(3, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p3_img3\",\"type\":\"image\",\"x\":50,\"y\":470,\"width\":700,\"height\":200,\"url\":\"").append(getImageUrl(3, 3)).append("\",\"borderRadius\":8},");
        } else {
            sb.append("      {\"id\":\"p3_text\",\"type\":\"text\",\"x\":50,\"y\":250,\"width\":700,\"height\":220,\"text\":\"").append(p3Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p3_img1\",\"type\":\"image\",\"x\":100,\"y\":500,\"width\":280,\"height\":200,\"url\":\"").append(getImageUrl(3, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p3_img2\",\"type\":\"image\",\"x\":420,\"y\":500,\"width\":280,\"height\":200,\"url\":\"").append(getImageUrl(3, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p3_img3\",\"type\":\"image\",\"x\":150,\"y\":720,\"width\":500,\"height\":320,\"url\":\"").append(getImageUrl(3, 3)).append("\",\"borderRadius\":8},");
        }
        sb.append("      {\"id\":\"p3_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 3 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        // PAGE 4: DEPARTMENT WORKSHOPS
        String p4Title = getPageTitle(4);
        String p4SubTitle = getPageSubTitle(4, eventType);
        String p4Article = getPageArticle(4, department, eventType, date, audience, prompt);
        sb.append("  {");
        sb.append("    \"id\":\"page_4\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p4_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p4_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p4_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p4_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p4_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p4_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p4_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p4_title\",\"type\":\"text\",\"x\":50,\"y\":170,\"width\":700,\"height\":30,\"text\":\"").append(p4Title).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"").append(primary).append("\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p4_sub_title\",\"type\":\"text\",\"x\":50,\"y\":205,\"width\":700,\"height\":30,\"text\":\"").append(p4SubTitle).append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        if (layoutStyle == 1) {
            sb.append("      {\"id\":\"p4_text\",\"type\":\"text\",\"x\":50,\"y\":680,\"width\":700,\"height\":320,\"text\":\"").append(p4Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p4_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":700,\"height\":400,\"url\":\"").append(getImageUrl(4, 1)).append("\",\"borderRadius\":12},");
            sb.append("      {\"id\":\"p4_img2\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(4, 2)).append("\"},");
            sb.append("      {\"id\":\"p4_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(4, 3)).append("\"},");
        } else if (layoutStyle == 2) {
            sb.append("      {\"id\":\"p4_text\",\"type\":\"text\",\"x\":400,\"y\":250,\"width\":350,\"height\":750,\"text\":\"").append(p4Article).append("\",\"fontSize\":11,\"fontFamily\":\"Georgia\",\"color\":\"#111827\",\"align\":\"justify\",\"lineHeight\":1.7},");
            sb.append("      {\"id\":\"p4_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(4, 1)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p4_img2\",\"type\":\"image\",\"x\":50,\"y\":650,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(4, 2)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p4_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(4, 3)).append("\"},");
        } else if (layoutStyle == 3) {
            sb.append("      {\"id\":\"p4_text\",\"type\":\"text\",\"x\":50,\"y\":700,\"width\":700,\"height\":300,\"text\":\"").append(p4Article).append("\",\"fontSize\":11,\"fontFamily\":\"Montserrat\",\"color\":\"#1f2937\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p4_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":330,\"height\":200,\"url\":\"").append(getImageUrl(4, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p4_img2\",\"type\":\"image\",\"x\":420,\"y\":250,\"width\":330,\"height\":200,\"url\":\"").append(getImageUrl(4, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p4_img3\",\"type\":\"image\",\"x\":50,\"y\":470,\"width\":700,\"height\":200,\"url\":\"").append(getImageUrl(4, 3)).append("\",\"borderRadius\":8},");
        } else {
            sb.append("      {\"id\":\"p4_text\",\"type\":\"text\",\"x\":50,\"y\":250,\"width\":700,\"height\":220,\"text\":\"").append(p4Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p4_img1\",\"type\":\"image\",\"x\":100,\"y\":500,\"width\":280,\"height\":200,\"url\":\"").append(getImageUrl(4, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p4_img2\",\"type\":\"image\",\"x\":420,\"y\":500,\"width\":280,\"height\":200,\"url\":\"").append(getImageUrl(4, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p4_img3\",\"type\":\"image\",\"x\":150,\"y\":720,\"width\":500,\"height\":320,\"url\":\"").append(getImageUrl(4, 3)).append("\",\"borderRadius\":8},");
        }
        sb.append("      {\"id\":\"p4_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 4 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        // PAGE 5: FRESHERS ORIENTATION
        String p5Title = getPageTitle(5);
        String p5SubTitle = getPageSubTitle(5, eventType);
        String p5Article = getPageArticle(5, department, eventType, date, audience, prompt);
        sb.append("  {");
        sb.append("    \"id\":\"page_5\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p5_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p5_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p5_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p5_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p5_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p5_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p5_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p5_title\",\"type\":\"text\",\"x\":50,\"y\":170,\"width\":700,\"height\":30,\"text\":\"").append(p5Title).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"").append(primary).append("\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p5_sub_title\",\"type\":\"text\",\"x\":50,\"y\":205,\"width\":700,\"height\":30,\"text\":\"").append(p5SubTitle).append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        if (layoutStyle == 1) {
            sb.append("      {\"id\":\"p5_text\",\"type\":\"text\",\"x\":50,\"y\":680,\"width\":700,\"height\":320,\"text\":\"").append(p5Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p5_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":700,\"height\":400,\"url\":\"").append(getImageUrl(5, 1)).append("\",\"borderRadius\":12},");
            sb.append("      {\"id\":\"p5_img2\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 2)).append("\"},");
            sb.append("      {\"id\":\"p5_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 3)).append("\"},");
            sb.append("      {\"id\":\"p5_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 4)).append("\"},");
            sb.append("      {\"id\":\"p5_img5\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 5)).append("\"},");
        } else if (layoutStyle == 2) {
            sb.append("      {\"id\":\"p5_text\",\"type\":\"text\",\"x\":400,\"y\":250,\"width\":350,\"height\":750,\"text\":\"").append(p5Article).append("\",\"fontSize\":11,\"fontFamily\":\"Georgia\",\"color\":\"#111827\",\"align\":\"justify\",\"lineHeight\":1.7},");
            sb.append("      {\"id\":\"p5_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(5, 1)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p5_img2\",\"type\":\"image\",\"x\":50,\"y\":650,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(5, 2)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p5_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 3)).append("\"},");
            sb.append("      {\"id\":\"p5_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 4)).append("\"},");
            sb.append("      {\"id\":\"p5_img5\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(5, 5)).append("\"},");
        } else if (layoutStyle == 3) {
            sb.append("      {\"id\":\"p5_text\",\"type\":\"text\",\"x\":50,\"y\":620,\"width\":700,\"height\":400,\"text\":\"").append(p5Article).append("\",\"fontSize\":11,\"fontFamily\":\"Montserrat\",\"color\":\"#1f2937\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p5_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":220,\"height\":180,\"url\":\"").append(getImageUrl(5, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img2\",\"type\":\"image\",\"x\":290,\"y\":250,\"width\":220,\"height\":180,\"url\":\"").append(getImageUrl(5, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img3\",\"type\":\"image\",\"x\":530,\"y\":250,\"width\":220,\"height\":180,\"url\":\"").append(getImageUrl(5, 3)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img4\",\"type\":\"image\",\"x\":50,\"y\":450,\"width\":330,\"height\":150,\"url\":\"").append(getImageUrl(5, 4)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img5\",\"type\":\"image\",\"x\":420,\"y\":450,\"width\":330,\"height\":150,\"url\":\"").append(getImageUrl(5, 5)).append("\",\"borderRadius\":8},");
        } else {
            sb.append("      {\"id\":\"p5_text\",\"type\":\"text\",\"x\":50,\"y\":250,\"width\":700,\"height\":180,\"text\":\"").append(p5Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p5_img1\",\"type\":\"image\",\"x\":50,\"y\":450,\"width\":220,\"height\":200,\"url\":\"").append(getImageUrl(5, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img2\",\"type\":\"image\",\"x\":290,\"y\":450,\"width\":220,\"height\":200,\"url\":\"").append(getImageUrl(5, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img3\",\"type\":\"image\",\"x\":530,\"y\":450,\"width\":220,\"height\":200,\"url\":\"").append(getImageUrl(5, 3)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img4\",\"type\":\"image\",\"x\":50,\"y\":670,\"width\":700,\"height\":180,\"url\":\"").append(getImageUrl(5, 4)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p5_img5\",\"type\":\"image\",\"x\":50,\"y\":870,\"width\":700,\"height\":180,\"url\":\"").append(getImageUrl(5, 5)).append("\",\"borderRadius\":8},");
        }
        sb.append("      {\"id\":\"p5_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 5 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        // PAGE 6: INDUCTION PROGRAM
        String p6Title = getPageTitle(6);
        String p6SubTitle = getPageSubTitle(6, eventType);
        String p6Article = getPageArticle(6, department, eventType, date, audience, prompt);
        sb.append("  {");
        sb.append("    \"id\":\"page_6\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p6_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p6_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p6_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p6_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p6_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p6_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p6_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p6_title\",\"type\":\"text\",\"x\":50,\"y\":170,\"width\":700,\"height\":30,\"text\":\"").append(p6Title).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"").append(primary).append("\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p6_sub_title\",\"type\":\"text\",\"x\":50,\"y\":205,\"width\":700,\"height\":30,\"text\":\"").append(p6SubTitle).append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        if (layoutStyle == 1) {
            sb.append("      {\"id\":\"p6_text\",\"type\":\"text\",\"x\":50,\"y\":680,\"width\":700,\"height\":320,\"text\":\"").append(p6Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p6_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":700,\"height\":400,\"url\":\"").append(getImageUrl(6, 1)).append("\",\"borderRadius\":12},");
            sb.append("      {\"id\":\"p6_img2\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 2)).append("\"},");
            sb.append("      {\"id\":\"p6_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 3)).append("\"},");
            sb.append("      {\"id\":\"p6_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 4)).append("\"},");
            sb.append("      {\"id\":\"p6_img5\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 5)).append("\"},");
        } else if (layoutStyle == 2) {
            sb.append("      {\"id\":\"p6_text\",\"type\":\"text\",\"x\":400,\"y\":250,\"width\":350,\"height\":750,\"text\":\"").append(p6Article).append("\",\"fontSize\":11,\"fontFamily\":\"Georgia\",\"color\":\"#111827\",\"align\":\"justify\",\"lineHeight\":1.7},");
            sb.append("      {\"id\":\"p6_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(6, 1)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p6_img2\",\"type\":\"image\",\"x\":50,\"y\":650,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(6, 2)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p6_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 3)).append("\"},");
            sb.append("      {\"id\":\"p6_img4\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 4)).append("\"},");
            sb.append("      {\"id\":\"p6_img5\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(6, 5)).append("\"},");
        } else if (layoutStyle == 3) {
            sb.append("      {\"id\":\"p6_text\",\"type\":\"text\",\"x\":50,\"y\":620,\"width\":700,\"height\":400,\"text\":\"").append(p6Article).append("\",\"fontSize\":11,\"fontFamily\":\"Montserrat\",\"color\":\"#1f2937\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p6_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":220,\"height\":180,\"url\":\"").append(getImageUrl(6, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img2\",\"type\":\"image\",\"x\":290,\"y\":250,\"width\":220,\"height\":180,\"url\":\"").append(getImageUrl(6, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img3\",\"type\":\"image\",\"x\":530,\"y\":250,\"width\":220,\"height\":180,\"url\":\"").append(getImageUrl(6, 3)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img4\",\"type\":\"image\",\"x\":50,\"y\":450,\"width\":330,\"height\":150,\"url\":\"").append(getImageUrl(6, 4)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img5\",\"type\":\"image\",\"x\":420,\"y\":450,\"width\":330,\"height\":150,\"url\":\"").append(getImageUrl(6, 5)).append("\",\"borderRadius\":8},");
        } else {
            sb.append("      {\"id\":\"p6_text\",\"type\":\"text\",\"x\":50,\"y\":250,\"width\":700,\"height\":200,\"text\":\"").append(p6Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p6_img1\",\"type\":\"image\",\"x\":50,\"y\":470,\"width\":330,\"height\":240,\"url\":\"").append(getImageUrl(6, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img2\",\"type\":\"image\",\"x\":420,\"y\":470,\"width\":330,\"height\":240,\"url\":\"").append(getImageUrl(6, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img3\",\"type\":\"image\",\"x\":50,\"y\":730,\"width\":220,\"height\":160,\"url\":\"").append(getImageUrl(6, 3)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img4\",\"type\":\"image\",\"x\":290,\"y\":730,\"width\":220,\"height\":160,\"url\":\"").append(getImageUrl(6, 4)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p6_img5\",\"type\":\"image\",\"x\":530,\"y\":730,\"width\":220,\"height\":160,\"url\":\"").append(getImageUrl(6, 5)).append("\",\"borderRadius\":8},");
        }
        sb.append("      {\"id\":\"p6_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 6 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        // PAGE 7: FACULTY ACHIEVEMENTS
        String p7Title = getPageTitle(7);
        String p7SubTitle = getPageSubTitle(7, eventType);
        String p7Article = getPageArticle(7, department, eventType, date, audience, prompt);
        sb.append("  {");
        sb.append("    \"id\":\"page_7\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p7_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p7_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p7_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p7_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p7_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p7_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p7_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p7_title\",\"type\":\"text\",\"x\":50,\"y\":170,\"width\":700,\"height\":30,\"text\":\"").append(p7Title).append("\",\"fontSize\":15,\"fontFamily\":\"Poppins\",\"color\":\"").append(primary).append("\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p7_sub_title\",\"type\":\"text\",\"x\":50,\"y\":205,\"width\":700,\"height\":30,\"text\":\"").append(p7SubTitle).append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        if (layoutStyle == 1) {
            sb.append("      {\"id\":\"p7_text\",\"type\":\"text\",\"x\":50,\"y\":680,\"width\":700,\"height\":320,\"text\":\"").append(p7Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p7_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":700,\"height\":400,\"url\":\"").append(getImageUrl(7, 1)).append("\",\"borderRadius\":12},");
            sb.append("      {\"id\":\"p7_img2\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(7, 2)).append("\"},");
            sb.append("      {\"id\":\"p7_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(7, 3)).append("\"},");
        } else if (layoutStyle == 2) {
            sb.append("      {\"id\":\"p7_text\",\"type\":\"text\",\"x\":400,\"y\":250,\"width\":350,\"height\":750,\"text\":\"").append(p7Article).append("\",\"fontSize\":11,\"fontFamily\":\"Georgia\",\"color\":\"#111827\",\"align\":\"justify\",\"lineHeight\":1.7},");
            sb.append("      {\"id\":\"p7_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(7, 1)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p7_img2\",\"type\":\"image\",\"x\":50,\"y\":650,\"width\":320,\"height\":380,\"url\":\"").append(getImageUrl(7, 2)).append("\",\"borderRadius\":4},");
            sb.append("      {\"id\":\"p7_img3\",\"type\":\"image\",\"x\":0,\"y\":0,\"width\":0,\"height\":0,\"url\":\"").append(getImageUrl(7, 3)).append("\"},");
        } else if (layoutStyle == 3) {
            sb.append("      {\"id\":\"p7_text\",\"type\":\"text\",\"x\":50,\"y\":700,\"width\":700,\"height\":300,\"text\":\"").append(p7Article).append("\",\"fontSize\":11,\"fontFamily\":\"Montserrat\",\"color\":\"#1f2937\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p7_img1\",\"type\":\"image\",\"x\":50,\"y\":250,\"width\":330,\"height\":200,\"url\":\"").append(getImageUrl(7, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p7_img2\",\"type\":\"image\",\"x\":420,\"y\":250,\"width\":330,\"height\":200,\"url\":\"").append(getImageUrl(7, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p7_img3\",\"type\":\"image\",\"x\":50,\"y\":470,\"width\":700,\"height\":200,\"url\":\"").append(getImageUrl(7, 3)).append("\",\"borderRadius\":8},");
        } else {
            sb.append("      {\"id\":\"p7_text\",\"type\":\"text\",\"x\":50,\"y\":250,\"width\":700,\"height\":200,\"text\":\"").append(p7Article).append("\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#334155\",\"align\":\"justify\",\"lineHeight\":1.6},");
            sb.append("      {\"id\":\"p7_img1\",\"type\":\"image\",\"x\":50,\"y\":470,\"width\":330,\"height\":480,\"url\":\"").append(getImageUrl(7, 1)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p7_img2\",\"type\":\"image\",\"x\":410,\"y\":470,\"width\":340,\"height\":230,\"url\":\"").append(getImageUrl(7, 2)).append("\",\"borderRadius\":8},");
            sb.append("      {\"id\":\"p7_img3\",\"type\":\"image\",\"x\":410,\"y\":720,\"width\":340,\"height\":230,\"url\":\"").append(getImageUrl(7, 3)).append("\",\"borderRadius\":8},");
        }
        sb.append("      {\"id\":\"p7_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 7 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  },");

        // PAGE 8: EDITORIAL BOARD
        sb.append("  {");
        sb.append("    \"id\":\"page_8\",");
        sb.append("    \"elements\":[");
        sb.append("      {\"id\":\"p8_bg\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":0,\"y\":0,\"width\":800,\"height\":1130,\"fillColor\":\"").append(background).append("\",\"strokeColor\":\"transparent\",\"strokeWidth\":0,\"opacity\":100,\"rotation\":0,\"locked\":true},");
        sb.append("      {\"id\":\"p8_dept_hdr\",\"type\":\"text\",\"x\":50,\"y\":30,\"width\":400,\"height\":20,\"text\":\"").append(department.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true},");
        sb.append("      {\"id\":\"p8_date_hdr\",\"type\":\"text\",\"x\":450,\"y\":30,\"width\":300,\"height\":20,\"text\":\"").append(date.toUpperCase()).append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"right\"},");
        sb.append("      {\"id\":\"p8_line_hdr1\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":55,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p8_title_hdr\",\"type\":\"text\",\"x\":50,\"y\":70,\"width\":700,\"height\":45,\"text\":\"").append(name.toUpperCase()).append("\",\"fontSize\":28,\"fontFamily\":\"Playfair Display\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_subtitle_hdr\",\"type\":\"text\",\"x\":50,\"y\":115,\"width\":700,\"height\":20,\"text\":\"NEWS LETTER\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p8_line_hdr2\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":140,\"width\":700,\"height\":1,\"fillColor\":\"#000000\"},");
        sb.append("      {\"id\":\"p8_banner\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":100,\"y\":165,\"width\":600,\"height\":40,\"fillColor\":\"#e2e8f0\",\"strokeColor\":\"transparent\",\"strokeWidth\":0},");
        sb.append("      {\"id\":\"p8_title\",\"type\":\"text\",\"x\":100,\"y\":173,\"width\":600,\"height\":30,\"text\":\"EDITORIAL BOARD\",\"fontSize\":16,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\",\"letterSpacing\":2.0},");
        sb.append("      {\"id\":\"p8_pill_chief\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":110,\"y\":230,\"width\":250,\"height\":40,\"fillColor\":\"#cbd5e1\",\"borderRadius\":8,\"strokeColor\":\"transparent\",\"strokeWidth\":0},");
        sb.append("      {\"id\":\"p8_lbl_chief\",\"type\":\"text\",\"x\":110,\"y\":240,\"width\":250,\"height\":30,\"text\":\"CHIEF EDITOR\",\"fontSize\":12,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_pic_chief\",\"type\":\"image\",\"x\":135,\"y\":290,\"width\":200,\"height\":200,\"url\":\"").append(isBlank ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80" : "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80").append("\",\"borderRadius\":100},");
        sb.append("      {\"id\":\"p8_name_chief\",\"type\":\"text\",\"x\":60,\"y\":510,\"width\":350,\"height\":25,\"text\":\"").append(isBlank ? "[Chief Editor]" : "DR. S. INIYA").append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_role_chief\",\"type\":\"text\",\"x\":60,\"y\":535,\"width\":350,\"height\":20,\"text\":\"").append(isBlank ? "[Chief Editor Role]" : "ASSOCIATE PROFESSOR AND HEAD").append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":false,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_dept_chief\",\"type\":\"text\",\"x\":60,\"y\":560,\"width\":350,\"height\":20,\"text\":\"").append(isBlank ? "[Chief Editor Dept]" : "DEPT. OF INFORMATION TECHNOLOGY").append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":false,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_pill_co\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":440,\"y\":230,\"width\":250,\"height\":40,\"fillColor\":\"#cbd5e1\",\"borderRadius\":8,\"strokeColor\":\"transparent\",\"strokeWidth\":0},");
        sb.append("      {\"id\":\"p8_lbl_co\",\"type\":\"text\",\"x\":440,\"y\":240,\"width\":250,\"height\":30,\"text\":\"CO EDITOR\",\"fontSize\":12,\"fontFamily\":\"Poppins\",\"color\":\"#0f172a\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_pic_co\",\"type\":\"image\",\"x\":465,\"y\":290,\"width\":200,\"height\":200,\"url\":\"").append(isBlank ? "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80" : "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80").append("\",\"borderRadius\":100},");
        sb.append("      {\"id\":\"p8_name_co\",\"type\":\"text\",\"x\":390,\"y\":510,\"width\":350,\"height\":25,\"text\":\"").append(isBlank ? "[Co-Editor]" : "MR. KARTHI K M").append("\",\"fontSize\":13,\"fontFamily\":\"Poppins\",\"color\":\"#000000\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_role_co\",\"type\":\"text\",\"x\":390,\"y\":535,\"width\":350,\"height\":20,\"text\":\"").append(isBlank ? "[Co-Editor Role]" : "ASSISTANT PROFESSOR").append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":false,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_dept_co\",\"type\":\"text\",\"x\":390,\"y\":560,\"width\":350,\"height\":20,\"text\":\"").append(isBlank ? "[Co-Editor Dept]" : "DEPT. OF INFORMATION TECHNOLOGY").append("\",\"fontSize\":10,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":false,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_div_l\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":50,\"y\":610,\"width\":320,\"height\":6,\"fillColor\":\"#000000\",\"borderRadius\":3,\"strokeColor\":\"transparent\",\"strokeWidth\":0},");
        sb.append("      {\"id\":\"p8_div_r\",\"type\":\"shape\",\"shapeType\":\"rect\",\"x\":430,\"y\":610,\"width\":320,\"height\":6,\"fillColor\":\"#000000\",\"borderRadius\":3,\"strokeColor\":\"transparent\",\"strokeWidth\":0},");
        sb.append("      {\"id\":\"p8_contact_title\",\"type\":\"text\",\"x\":50,\"y\":640,\"width\":700,\"height\":25,\"text\":\"KPR COLLEGE OF ARTS, SCIENCE AND RESEARCH\",\"fontSize\":12,\"fontFamily\":\"Poppins\",\"color\":\"#1e40af\",\"bold\":true,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_contact_addr\",\"type\":\"text\",\"x\":50,\"y\":670,\"width\":700,\"height\":20,\"text\":\"Avinashi Road, Arasur, Coimbatore - 641407, Tamil Nadu, India.\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":false,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_contact_email\",\"type\":\"text\",\"x\":50,\"y\":685,\"width\":700,\"height\":20,\"text\":\"Email: info@kprcas.ac.in • Web: https://kprcas.ac.in\",\"fontSize\":11,\"fontFamily\":\"Poppins\",\"color\":\"#475569\",\"bold\":false,\"align\":\"center\"},");
        sb.append("      {\"id\":\"p8_footer_text\",\"type\":\"text\",\"x\":50,\"y\":1090,\"width\":700,\"height\":20,\"text\":\"Page 8 • Official publication of the Department of ").append(department).append("\",\"fontSize\":9,\"fontFamily\":\"Poppins\",\"color\":\"#94a3b8\",\"bold\":false,\"align\":\"center\"}");
        sb.append("    ]");
        sb.append("  }");
        sb.append("]}");
        return sb.toString();
    }

    private String getDynamicTemplateTitle(String dept, String cat, int index) {
        String deptShort = dept;
        if ("Computer Science".equalsIgnoreCase(dept)) deptShort = "COMPUTING";
        else if ("Commerce".equalsIgnoreCase(dept)) deptShort = "COMMERCE";
        else if ("Business Administration".equalsIgnoreCase(dept)) deptShort = "MANAGEMENT";
        else if ("Placement Cell".equalsIgnoreCase(dept)) deptShort = "PLACEMENT";
        else if ("Physical Education".equalsIgnoreCase(dept)) deptShort = "SPORTS";
        else if ("Research & Development".equalsIgnoreCase(dept)) deptShort = "RESEARCH";
        else deptShort = dept.toUpperCase();

        String catUpper = cat.toUpperCase();
        if ("Academic".equalsIgnoreCase(cat)) {
            return deptShort + " CHRONICLE";
        } else if ("Placement".equalsIgnoreCase(cat)) {
            return deptShort + " SPOTLIGHT";
        } else if ("Research".equalsIgnoreCase(cat)) {
            return deptShort + " BULLETIN";
        } else if ("Sports".equalsIgnoreCase(cat)) {
            return deptShort + " CHAMPIONS";
        } else if ("Achievements".equalsIgnoreCase(cat)) {
            return deptShort + " LAURELS";
        } else if ("Events".equalsIgnoreCase(cat)) {
            return deptShort + " INSIGHTS";
        } else {
            return deptShort + " " + catUpper + " BULLETIN";
        }
    }

    private String getPageTitle(int pageNum) {
        switch (pageNum) {
            case 2: return "STUDENT'S ACHIEVEMENTS";
            case 3: return "STUDENT'S ACHIEVEMENTS";
            case 4: return "DEPARTMENT EVENTS";
            case 5: return "DEPARTMENT OF INFORMATION TECHNOLOGY";
            case 6: return "INDUCTION PROGRAM";
            case 7: return "FACULTY ACHIEVEMENTS";
            default: return "CAMPUS SPOTLIGHT";
        }
    }

    private String getPageSubTitle(int pageNum, String eventType) {
        if (this.currentSeedingIsBlank) {
            switch (pageNum) {
                case 2: return "Click to enter event / achievement title";
                case 3: return "Click to enter internship / activity title";
                case 4: return "Click to enter workshop / seminar title";
                case 5: return "WELCOMES FRESHERS";
                case 6: return "DEEKSHARAMBH 2026";
                case 7: return "Click to enter faculty session title";
                default: return "Click to enter page subtitle";
            }
        }
        switch (pageNum) {
            case 2: return "NAAN MUTHALVAN HACKATHON PARTICIPATION";
            case 3: return "III B.Sc IT STUDENTS PURSUING 21-DAYS INTENSIVE INTERNSHIP";
            case 4: return "WORKSHOP ON SUSTAINABLE RESEARCH METHODOLOGY & ACADEMIC PUBLICATION";
            case 5: return "WELCOMES FRESHERS";
            case 6: return "DEEKSHARAMBH 2026";
            case 7: return "EXPERT SESSION ON DIGITAL INNOVATION TOOLS";
            default: return eventType.toUpperCase();
        }
    }

    private String getPageArticle(int pageNum, String department, String eventType, String date, String audience, String prompt) {
        if (this.currentSeedingIsBlank) {
            switch (pageNum) {
                case 2: return "Click here to enter student achievement details or use the Form Wizard on the left sidebar to generate article text...";
                case 3: return "Click here to enter student internship details or use the Form Wizard on the left sidebar...";
                case 4: return "Click here to enter workshop description or click 'AI Customize Page' in top right...";
                case 5: return "Click here to enter orientation program description...";
                case 6: return "Click here to enter induction program highlights...";
                case 7: return "Click here to enter faculty member achievement or resource person details...";
                default: return "Click here to enter article text...";
            }
        }
        if (prompt != null && !prompt.trim().isEmpty()) {
            String eventLower = eventType.toLowerCase();
            boolean isMatch = false;
            if (pageNum == 2 && (eventLower.contains("hackathon") || eventLower.contains("achievement"))) isMatch = true;
            else if (pageNum == 3 && eventLower.contains("internship")) isMatch = true;
            else if (pageNum == 4 && (eventLower.contains("workshop") || eventLower.contains("seminar"))) isMatch = true;
            else if (pageNum == 5 && eventLower.contains("welcome")) isMatch = true;
            else if (pageNum == 6 && (eventLower.contains("induction") || eventLower.contains("orientation"))) isMatch = true;
            else if (pageNum == 7 && (eventLower.contains("research") || eventLower.contains("publication"))) isMatch = true;
            
            if (isMatch) {
                return expandPromptToArticle(prompt, department, eventType, date, audience);
            }
        }
        return generateUniqueArticle(department, eventType, pageNum, 0);
    }

    private String resolveImgUrl(int pageNum, int imgIndex, boolean isBlank) {
        if (isBlank) {
            return "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=400&q=80";
        }
        return getImageUrl(pageNum, imgIndex);
    }

    private String getImageUrl(int pageNum, int imgIndex) {
        if (this.currentSeedingIsBlank) {
            return "https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=400&q=80";
        }
        String[][] urls = {
            { // Page 2: Student profile 1, certificate 1, profile 2, certificate 2
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1589330694653-ded6df53f6ee?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1589330694653-ded6df53f6ee?auto=format&fit=crop&w=400&q=80"
            },
            { // Page 3: Internship (3 images)
                "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=400&q=80"
            },
            { // Page 4: Workshop (3 images)
                "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80"
            },
            { // Page 5: Freshers (5 images)
                "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1525921429624-479b6c29457f?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=400&q=80"
            },
            { // Page 6: Induction (5 images)
                "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1558021211-6d1403321394?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80"
            },
            { // Page 7: Faculty (3 images)
                "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=400&q=80",
                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80"
            }
        };

        try {
            int pageIdx = pageNum - 2;
            if (pageIdx < 0 || pageIdx >= urls.length) return "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80";
            int imgIdx = imgIndex - 1;
            if (imgIdx < 0 || imgIdx >= urls[pageIdx].length) return urls[pageIdx][0];
            return urls[pageIdx][imgIdx];
        } catch (Exception e) {
            return "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80";
        }
    }

    private String generateUniqueArticle(String dept, String category, int pageNum, int index) {
        switch (pageNum) {
            case 2:
                return "Mr. Aswanth R (2426J1463) and Mr. Anand R (2426J1457) from III BSc IT 'A' Section were selected for the prestigious Naan Muthalvan Hackathon finals. The competitive event was conducted on June 30, 2026, serving as a platform for elite technical talent. Utilizing their well-rounded prior experience in hackathons, both students displayed exceptional problem-solving and coding skills during the challenge.";
            case 3:
                return "Students of III B.Sc IT (Sections 'A' and 'B') are currently pursuing a prestigious 21-day internship program at App Innovation Technologies, Coimbatore. The intensive training provides hands-on industry exposure in cutting-edge domains, including Data Analytics, Cyber Security, and MERN Stack development. Under the guidance of seasoned experts, Dr S. Srividhya, Head, Department of Information Technology, visited the internship venue on June 26, 2026, to monitor the interns' progress.";
            case 4:
                return "The Department of Information Technology organised a one-day workshop titled \"Empowering Quality Education through Sustainable Research Methodology and Academic Publication Skills\" on June 30, 2026. The session was delivered by Dr. M. Rajeswari, Assistant Professor & Innovation Ambassador from PSGR Krishnammal College for Women, Coimbatore. The morning session focused on building foundational insights into research methodologies and effective academic publication strategies. In the afternoon, the workshop concluded with a highly interactive, hands-on session that allowed students to practically apply the learned concepts.";
            case 5:
                return "The Department of BSc IT organized a vibrant orientation program to warmly welcome the incoming 2026–2027 batch of first-year students, organized by staff advisors Ms. Dhivya J and Dr. Baskar G, alongside enthusiastic senior students, the event kicked off with a sweet gesture as chocolates were distributed to the freshers. Students were formally introduced to Dr. Ranjitha Kumari S, Dean, SoCS, Dr. S. Srividhya, Head, Department, and the department's dedicated faculty members.";
            case 6:
                return "As part of Deeksharambh 2026, the Department of Information Technology organized a two-day Induction Program on June 29 and 30, 2026, for the incoming 2026–2027 batch. The program commenced on day one with an immersive campus tour alongside an introduction to campus rules, placement avenues, and entrepreneurial ecosystems like the Incubation Hub and Synergy Cell. Additionally, Mr. Ganapathi Ram introduced the CITE initiative to encourage student participation in hackathons and technical competitions. The event also highlighted insights on different domains by Dr. Shanthi Shenoy, Dr. Gokulnath P, and Dr. Thanga Helina.";
            case 7:
                return "Dr. V. Vinodhini, Associate Professor from the Department of Information Technology, served as a distinguished Resource Person for the students' Induction Program, DEEKSHARAMBH '26, organized by the Department of Computer Technology. The specialized session was conducted at hall CT101 on June 30 , 2026. Her session successfully equipped the newly inducted students with crucial exposure to modern technological frameworks and essential digital workflows.";
            default:
                return "The Department of Information Technology has successfully concluded its academic event. This initiative aimed at fostering skills, building industry connections, and encouraging research among both students and faculty members.";
        }
    }
}
