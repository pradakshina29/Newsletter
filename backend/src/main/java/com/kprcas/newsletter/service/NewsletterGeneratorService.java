package com.kprcas.newsletter.service;

import org.springframework.stereotype.Service;
import java.util.*;
import java.util.regex.*;

@Service
public class NewsletterGeneratorService {

    public static class Activity {
        public String title = "CAMPUS ACTIVITY";
        public String content = "";
        public String type = "Event Highlight";
        public List<String> facts = new ArrayList<>();
        public List<String> images = new ArrayList<>();
    }

    public List<Map<String, Object>> generateNewsletter(String prompt) {
        String department = extractDepartment(prompt);
        String collegeName = extractCollegeName(prompt);
        String newsletterTitle = extractNewsletterTitle(prompt, department);
        String date = extractDate(prompt);
        String audience = extractAudience(prompt);

        Map<String, String> themeColors = getThemeForDepartment(department);
        String primary = themeColors.get("primary");
        String secondary = themeColors.get("secondary");
        String accent = themeColors.get("accent");
        String background = themeColors.get("background");

        return generateNewsletter(prompt, newsletterTitle, department, date, audience, primary, secondary, accent, background);
    }

    public List<Map<String, Object>> generateNewsletter(
            String prompt, String name, String department, String date, String audience,
            String primary, String secondary, String accent, String background
    ) {
        List<Map<String, Object>> pages = new ArrayList<>();
        List<Activity> activities = extractActivities(prompt, department, date, audience);

        // --- PAGE 1: COVER ---
        pages.add(createCoverPage(name, department, date, primary, secondary, accent, background, activities));

        // --- PAGES 2-7: CONTENT PAGES ---
        distributeActivities(pages, activities, name, department, date, audience, primary, secondary, accent, background);

        // --- PAGE 8: EDITORIAL BOARD ---
        pages.add(createEditorialBoardPage(prompt, name, department, date, primary, secondary, accent, background));

        return pages;
    }

    private Map<String, Object> createPage(String id, List<Map<String, Object>> elements, String backgroundColor) {
        Map<String, Object> page = new HashMap<>();
        page.put("id", id);
        
        Map<String, Object> bg = new HashMap<>();
        bg.put("id", id + "_bg");
        bg.put("type", "shape");
        bg.put("shapeType", "rect");
        bg.put("x", 0);
        bg.put("y", 0);
        bg.put("width", 800);
        bg.put("height", 1130);
        bg.put("fillColor", backgroundColor != null ? backgroundColor : "#ffffff");
        bg.put("strokeColor", "transparent");
        bg.put("strokeWidth", 0);
        bg.put("opacity", 100);
        bg.put("rotation", 0);
        bg.put("locked", true);
        bg.put("zIndex", 1);
        
        elements.add(0, bg);
        page.put("elements", elements);
        return page;
    }

    private Map<String, Object> textEl(String id, String text, int x, int y, int w, int h, int fontSize, boolean bold, String align, String color) {
        Map<String, Object> el = new HashMap<>();
        el.put("id", id);
        el.put("type", "text");
        el.put("x", x);
        el.put("y", y);
        el.put("width", w);
        el.put("height", h);
        el.put("text", text);
        el.put("fontSize", fontSize);
        el.put("fontFamily", "Poppins");
        el.put("bold", bold);
        el.put("italic", false);
        el.put("underline", false);
        el.put("align", align);
        el.put("color", color != null ? color : "#000000");
        el.put("opacity", 100);
        el.put("rotation", 0);
        el.put("zIndex", 10);
        el.put("lineHeight", 1.5);
        return el;
    }

    private Map<String, Object> imgEl(String id, String url, int x, int y, int w, int h) {
        Map<String, Object> el = new HashMap<>();
        el.put("id", id);
        el.put("type", "image");
        el.put("x", x);
        el.put("y", y);
        el.put("width", w);
        el.put("height", h);
        el.put("url", url);
        el.put("borderRadius", 12);
        el.put("opacity", 100);
        el.put("rotation", 0);
        el.put("zIndex", 5);
        el.put("shadow", "md");
        return el;
    }

    private Map<String, Object> shapeEl(String id, int x, int y, int w, int h, String fillColor, String strokeColor, int strokeWidth, int borderRadius) {
        Map<String, Object> el = new HashMap<>();
        el.put("id", id);
        el.put("type", "shape");
        el.put("shapeType", "rect");
        el.put("x", x);
        el.put("y", y);
        el.put("width", w);
        el.put("height", h);
        el.put("fillColor", fillColor != null ? fillColor : "#ffffff");
        el.put("strokeColor", strokeColor != null ? strokeColor : "transparent");
        el.put("strokeWidth", strokeWidth);
        if (borderRadius > 0) {
            el.put("borderRadius", borderRadius);
        }
        el.put("opacity", 100);
        el.put("rotation", 0);
        el.put("zIndex", 2);
        return el;
    }

    private void addPageHeader(List<Map<String, Object>> elements, String name, String department, String date, String primaryColor, String secondaryColor) {
        String deptText = department != null && !department.trim().isEmpty() ? department.toUpperCase() : "INFORMATION TECHNOLOGY";
        if (!deptText.startsWith("DEPARTMENT OF") && !deptText.startsWith("DEPT")) {
            deptText = "DEPARTMENT OF " + deptText;
        }

        Map<String, Object> line0 = shapeEl("hdr_line0", 50, 40, 700, 1, "#000000", "transparent", 0, 0);
        line0.put("locked", true);
        elements.add(line0);

        Map<String, Object> dept = textEl("hdr_dept", deptText, 50, 52, 450, 25, 12, true, "left", "#000000");
        dept.put("locked", true);
        elements.add(dept);

        Map<String, Object> dateEl = textEl("hdr_date", date != null ? date.toUpperCase() : "JUNE 2026", 500, 52, 250, 25, 12, true, "right", "#000000");
        dateEl.put("locked", true);
        elements.add(dateEl);

        Map<String, Object> line1 = shapeEl("hdr_line1", 50, 85, 700, 1, "#000000", "transparent", 0, 0);
        line1.put("locked", true);
        elements.add(line1);

        Map<String, Object> title = textEl("hdr_title", "CTRL+READ", 50, 98, 700, 65, 52, true, "center", "#000000");
        title.put("fontFamily", "Playfair Display");
        title.put("letterSpacing", 1.5);
        title.put("locked", true);
        elements.add(title);

        Map<String, Object> line2Left = shapeEl("hdr_line2_left", 50, 180, 240, 1, "#000000", "transparent", 0, 0);
        line2Left.put("locked", true);
        elements.add(line2Left);

        Map<String, Object> subtitle = textEl("hdr_subtitle", "NEWS LETTER", 300, 170, 200, 20, 11, true, "center", "#000000");
        subtitle.put("letterSpacing", 2.5);
        subtitle.put("locked", true);
        elements.add(subtitle);

        Map<String, Object> line2Right = shapeEl("hdr_line2_right", 510, 180, 240, 1, "#000000", "transparent", 0, 0);
        line2Right.put("locked", true);
        elements.add(line2Right);
    }

    private void addPageFooter(List<Map<String, Object>> elements, int pageNum, String department) {
        elements.add(textEl("ftr_text_" + pageNum, "Page " + pageNum + " • Official publication of the Department of " + department, 50, 1090, 700, 20, 9, false, "center", "#94a3b8"));
    }

    private Map<String, Object> createCoverPage(
            String name, String department, String date,
            String primary, String secondary, String accent, String background,
            List<Activity> activities
    ) {
        List<Map<String, Object>> elements = new ArrayList<>();
        addPageHeader(elements, name, department, date, primary, secondary);

        // Logo block at y=200
        elements.add(shapeEl("p1_logo_bg", 50, 200, 330, 90, "#eff6ff", "#cbd5e1", 1, 8));
        elements.add(textEl("p1_logo_text", "KPR College of Arts Science and Research", 65, 225, 300, 40, 12, true, "center", "#1e40af"));

        elements.add(shapeEl("p1_studio_bg", 420, 200, 330, 90, "#fff1f2", "#fecdd3", 1, 8));
        elements.add(textEl("p1_studio_text", "LAUNCH IT • DESIGN STUDIO", 435, 230, 300, 30, 12, true, "center", "#be123c"));

        // School designation & Department
        String schoolName = getSchoolForDepartment(department);
        elements.add(textEl("p1_school_text", schoolName, 50, 310, 700, 25, 14, true, "center", "#0f172a"));
        elements.add(textEl("p1_dept_text", "DEPARTMENT OF " + department.toUpperCase(), 50, 340, 700, 25, 13, true, "center", "#475569"));

        // Cover Image
        String coverImgUrl = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80";
        if (activities != null && !activities.isEmpty() && !activities.get(0).images.isEmpty()) {
            coverImgUrl = activities.get(0).images.get(0);
        }
        // Image bounded in Content Safe Area
        elements.add(imgEl("p1_cover_img", coverImgUrl, 50, 375, 700, 580));
        elements.add(textEl("p1_cover_caption", department + " Academic Newsletter - Official Cover Page", 50, 965, 700, 20, 9, false, "center", "#64748b"));

        addPageFooter(elements, 1, department);
        return createPage("page_1", elements, background);
    }

    private void distributeActivities(
            List<Map<String, Object>> pages, List<Activity> activities,
            String newsletterName, String department, String date, String audience,
            String primary, String secondary, String accent, String background
    ) {
        int contentPagesStart = 2;
        int contentPagesCount = 6; // Pages 2 to 7

        if (activities.size() == 1) {
            // Expand 1 major activity across all 6 pages
            Activity act = activities.get(0);
            String[] pageTitles = {
                    act.title + " - Overview",
                    "Objectives & Planning",
                    "Key Highlights & Sessions",
                    "Practical Exercises & Sandbox",
                    "Interactive Media Showcase",
                    "Outcomes & Valedictory"
            };
            String[] pageSubtitles = {
                    "Welcoming participants and inaugurating the event",
                    "Establishing the academic vision for the session",
                    "Delving into core concepts and training modules",
                    "Developing prototypes and collaborative mini-projects",
                    "Visual highlights of student interactions and labs",
                    "Recognizing participation and outlining future career scopes"
            };

            String overviewText = "In alignment with the department's commitment to academic excellence, the Department of " + department + " organized a specialized program focusing on " + act.title + ". " + act.content;
            String objectivesText = "The main objectives of this session were to provide student attendees with robust foundations in " + act.title + " techniques and methodologies. Faculty advisors collaborated with industry partners to design a comprehensive syllabus aligned with emerging industrial trends.";
            String highlightsText = "Detailed highlights of the sessions include active discussions and keynote presentations. Mentors explained real-world applications and answered students' queries regarding modern career pathways in the domain of " + department + ".";
            String practicalText = "Laboratory sandbox sessions allowed student groups to collaborate on practical mini projects. By working through guided exercises, participants converted theoretical logic into functioning models, gaining significant hand-on capabilities.";
            String mediaText = "The event's gallery captures the active engagement of students. Participants prepared workspace wireframes, collaborated on laptop configurations, and successfully presented their final mini project demos to the evaluation committee.";
            String outcomesText = "The event successfully concluded with certificate distribution. Feedback sheets filled by the students showed high satisfaction. This academic milestone further strengthens the department's commitment to career readiness.";

            String[] pageTexts = { overviewText, objectivesText, highlightsText, practicalText, mediaText, outcomesText };

            for (int i = 0; i < contentPagesCount; i++) {
                List<Map<String, Object>> elements = new ArrayList<>();
                int pageNum = contentPagesStart + i;
                addPageHeader(elements, newsletterName, department, date, primary, secondary);

                // Content safe area: y starts at 220
                elements.add(textEl("p" + pageNum + "_title", pageTitles[i], 50, 220, 700, 35, 18, true, "center", primary));
                elements.add(textEl("p" + pageNum + "_subtitle", pageSubtitles[i], 50, 260, 700, 25, 12, true, "center", "#0f172a"));
                elements.add(textEl("p" + pageNum + "_text", pageTexts[i], 50, 295, 700, 200, 11, false, "justify", "#334155"));

                // Dynamic Layout elements strictly inside content area (y >= 510)
                if (i == 0) { // Layout 1: Two grid images
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    elements.add(imgEl("p" + pageNum + "_img1", img1, 100, 510, 280, 190));
                    elements.add(imgEl("p" + pageNum + "_img2", img2, 420, 510, 280, 190));
                    
                    // Highlights box
                    elements.add(shapeEl("p" + pageNum + "_card", 150, 720, 500, 320, "#f8fafc", "#e2e8f0", 1, 12));
                    elements.add(textEl("p" + pageNum + "_card_title", "EVENT HIGHLIGHTS", 150, 740, 500, 30, 14, true, "center", primary));
                    elements.add(textEl("p" + pageNum + "_card_t1", "• Active student participation from the department", 180, 790, 440, 25, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_card_t2", "• Guest lecture handled by industry subject experts", 180, 830, 440, 25, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_card_t3", "• Sandbox practical lab modules and mini-projects", 180, 870, 440, 25, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_card_t4", "• Certificate distribution and outstanding performance recognition", 180, 910, 440, 25, 12, false, "left", "#0f172a"));
                } else if (i == 1) { // Layout 2: Hero Image + Double Column
                    String img1 = act.images.size() > 2 ? act.images.get(2) : "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80";
                    elements.add(imgEl("p" + pageNum + "_hero", img1, 50, 510, 700, 280));
                    
                    elements.add(textEl("p" + pageNum + "_col1_title", "Academic Integration", 50, 805, 330, 25, 13, true, "left", primary));
                    elements.add(textEl("p" + pageNum + "_col1_body", "Linking theoretical syllabus structures directly with hands-on labs has consistently improved student learning. The department maintains close ties with professional advisory boards to revise curriculum formats dynamically.", 50, 835, 330, 220, 11, false, "justify", "#475569"));
                    
                    elements.add(textEl("p" + pageNum + "_col2_title", "Future Skills Focus", 420, 805, 330, 25, 13, true, "left", primary));
                    elements.add(textEl("p" + pageNum + "_col2_body", "Acquiring skills in emerging fields prepares students for modern careers. Practical training workshops, symposia, and coding bootcamps are hosted regularly to provide students with premium placement readiness.", 420, 835, 330, 220, 11, false, "justify", "#475569"));
                } else if (i == 2) { // Layout 3: Three column images
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    String img3 = act.images.size() > 2 ? act.images.get(2) : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80";
                    
                    elements.add(imgEl("p" + pageNum + "_colimg1", img1, 50, 510, 220, 160));
                    elements.add(imgEl("p" + pageNum + "_colimg2", img2, 290, 510, 220, 160));
                    elements.add(imgEl("p" + pageNum + "_colimg3", img3, 530, 510, 220, 160));
                    
                    String img4 = act.images.size() > 3 ? act.images.get(3) : "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80";
                    elements.add(imgEl("p" + pageNum + "_wide1", img4, 50, 685, 700, 160));
                    
                    elements.add(shapeEl("p" + pageNum + "_quote_bg", 50, 860, 700, 140, "#f8fafc", "#cbd5e1", 1, 8));
                    elements.add(textEl("p" + pageNum + "_quote_text", "This program represents a significant milestone in reinforcing practical curriculum alignment and creative development at KPRCAS.", 80, 905, 640, 70, 12, true, "center", primary));
                } else if (i == 3) { // Layout 4: Article + Agenda Cards
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    elements.add(imgEl("p" + pageNum + "_img1", img1, 100, 510, 280, 190));
                    elements.add(imgEl("p" + pageNum + "_img2", img2, 420, 510, 280, 190));
                    
                    elements.add(shapeEl("p" + pageNum + "_agenda_bg", 150, 720, 500, 320, "#f8fafc", "#e2e8f0", 1, 12));
                    elements.add(textEl("p" + pageNum + "_agenda_title", "TECHNICAL AGENDA & TIMELINE", 150, 735, 500, 30, 14, true, "center", primary));
                    elements.add(textEl("p" + pageNum + "_session1", "• 09:30 AM - Inaugural Ceremony & Keynote Address", 180, 780, 440, 30, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_session2", "• 11:30 AM - Technical Session I: Core Methodologies", 180, 820, 440, 30, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_session3", "• 02:00 PM - Practical Hands-on Sandbox Exercises", 180, 860, 440, 30, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_session4", "• 03:30 PM - Participant Demos, Valedictory & Certification", 180, 900, 440, 30, 12, false, "left", "#0f172a"));
                } else if (i == 4) { // Layout 5: Timeline statistics cards
                    elements.add(shapeEl("p" + pageNum + "_stat1_bg", 100, 510, 170, 160, "#eff6ff", "#cbd5e1", 1, 8));
                    elements.add(textEl("p" + pageNum + "_stat1_val", "100%", 100, 540, 170, 40, 32, true, "center", primary));
                    elements.add(textEl("p" + pageNum + "_stat1_lbl", "COMPLETION", 110, 590, 150, 40, 11, true, "center", "#475569"));
                    
                    elements.add(shapeEl("p" + pageNum + "_stat2_bg", 315, 510, 170, 160, "#fff7ed", "#fed7aa", 1, 8));
                    elements.add(textEl("p" + pageNum + "_stat2_val", "12+", 315, 540, 170, 40, 32, true, "center", "#c2410c"));
                    elements.add(textEl("p" + pageNum + "_stat2_lbl", "MINI PROJECTS", 325, 590, 150, 40, 11, true, "center", "#475569"));
                    
                    elements.add(shapeEl("p" + pageNum + "_stat3_bg", 530, 510, 170, 160, "#f0fdf4", "#bbf7d0", 1, 8));
                    elements.add(textEl("p" + pageNum + "_stat3_val", "A+", 530, 540, 170, 40, 32, true, "center", "#166534"));
                    elements.add(textEl("p" + pageNum + "_stat3_lbl", "GRADE RATING", 540, 590, 150, 40, 11, true, "center", "#475569"));

                    elements.add(shapeEl("p" + pageNum + "_award_card", 150, 700, 500, 320, "#fef3c7", "#fde68a", 1, 12));
                    elements.add(textEl("p" + pageNum + "_award_title", "★ EXCELLENCE AWARD WINNERS ★", 150, 730, 500, 30, 18, true, "center", "#b45309"));
                    elements.add(textEl("p" + pageNum + "_award_body", "The final judging committee presented excellence badges to the top-performing teams. This award recognizes standard coding performance, creative implementation, and clean architectural design.", 180, 780, 440, 100, 13, false, "center", "#78350f"));
                    elements.add(textEl("p" + pageNum + "_award_footer", "HONORARY TROPHY • CERTIFICATE OF DISTINCTION", 150, 910, 500, 25, 12, true, "center", "#b45309"));
                } else { // Layout 6: Four Grid Images
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    String img3 = act.images.size() > 2 ? act.images.get(2) : "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80";
                    String img4 = act.images.size() > 3 ? act.images.get(3) : "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80";
                    
                    elements.add(imgEl("p" + pageNum + "_grid1", img1, 100, 510, 280, 180));
                    elements.add(imgEl("p" + pageNum + "_grid2", img2, 420, 510, 280, 180));
                    elements.add(imgEl("p" + pageNum + "_grid3", img3, 100, 705, 280, 180));
                    elements.add(imgEl("p" + pageNum + "_grid4", img4, 420, 705, 280, 180));

                    elements.add(shapeEl("p" + pageNum + "_banner", 100, 900, 600, 120, "#eff6ff", "#cbd5e1", 1, 8));
                    elements.add(textEl("p" + pageNum + "_banner_text", "For more details on upcoming symposia, training programs, and guest lectures, contact the department coordination desk or write to us.", 120, 930, 560, 60, 12, false, "center", "#1e40af"));
                }

                addPageFooter(elements, pageNum, department);
                pages.add(createPage("page_" + pageNum, elements, background));
            }
        } else {
            // Multiple activities - Map each activity to pages dynamically
            for (int i = 0; i < contentPagesCount; i++) {
                List<Map<String, Object>> elements = new ArrayList<>();
                int pageNum = contentPagesStart + i;
                addPageHeader(elements, newsletterName, department, date, primary, secondary);

                int actIdx = i % activities.size();
                Activity act = activities.get(actIdx);

                String pageTitle = act.title;
                String pageSubtitle = "Highlights from the Department of " + department;
                String articleText = act.content;

                if (i >= activities.size()) {
                    if (pageNum == 3) {
                        pageTitle = "Academic Internships & Corporate Placements";
                        pageSubtitle = "Preparing students for modern corporate challenges";
                        articleText = "KPRCAS prioritizes student placement readiness through active corporate collaborations. Trainees from the Department of " + department + " participated in intensive internship drives during " + date + ". These professional experiences help students build technical confidence, learn modern engineering cycles, and secure career opportunities in leading organizations.";
                    } else if (pageNum == 4) {
                        pageTitle = "Student Workshops & Technical Practice";
                        pageSubtitle = "Hands-on laboratory sessions and collaborative prototypes";
                        articleText = "To supplement theoretical learning, the Department of " + department + " organized multiple specialized workshop modules during the semester. Students worked in collaborative groups to solve industry-defined problems, write functional code, and test their systems. These sessions successfully bridge classroom instructions with real-world industry demands.";
                    } else if (pageNum == 5) {
                        pageTitle = "Campus Placements & Outstanding Records";
                        pageSubtitle = "Trainees secure key roles in global technology companies";
                        articleText = "The placements division at KPRCAS reported outstanding hiring numbers this semester. A total of " + audience + " participated in coding reviews, pre-placement interviews, and aptitude tests. Leading recruiters commended our students for their quick problem-solving abilities and standard software development knowledge.";
                    } else if (pageNum == 6) {
                        pageTitle = "Faculty Research & Publications";
                        pageSubtitle = "Advancing academic research and publication contributions";
                        articleText = "Faculty members of the Department of " + department + " continue to push academic frontiers with high-impact publications, patents, and journal entries. Collaborating with national research centers, our scholars focus on cutting-edge disciplines to bring innovative solutions to local communities and academic fields alike.";
                    } else {
                        pageTitle = "Extra-Curricular Clubs & Sports Excellence";
                        pageSubtitle = "Nurturing talent and athletic achievements at KPRCAS";
                        articleText = "Students of the Department of " + department + " actively participate in sports competitions, NSS/NCC drives, and cultural clubs at KPRCAS. Encouraged by our physical education trainers, our athletes secured top ranks in state-level tournaments during " + date + ", proving our commitment to holistic student development.";
                    }
                }

                // Content safe area: y starts at 220
                elements.add(textEl("p" + pageNum + "_title", pageTitle, 50, 220, 700, 35, 18, true, "center", primary));
                elements.add(textEl("p" + pageNum + "_subtitle", pageSubtitle, 50, 260, 700, 25, 12, true, "center", "#0f172a"));
                elements.add(textEl("p" + pageNum + "_text", articleText, 50, 295, 700, 200, 11, false, "justify", "#334155"));

                // Varied layouts based on page index i
                if (i == 0) { // Layout 0: Event Summary Card
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    elements.add(imgEl("p" + pageNum + "_img1", img1, 100, 510, 280, 190));
                    elements.add(imgEl("p" + pageNum + "_img2", img2, 420, 510, 280, 190));

                    elements.add(shapeEl("p" + pageNum + "_card", 150, 720, 500, 320, "#f8fafc", "#e2e8f0", 1, 12));
                    elements.add(textEl("p" + pageNum + "_card_title", "EVENT DATA SHEET", 150, 740, 500, 30, 14, true, "center", primary));
                    elements.add(textEl("p" + pageNum + "_card_t1", "• Department: " + department, 180, 790, 440, 25, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_card_t2", "• Event Category: " + act.type, 180, 830, 440, 25, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_card_t3", "• Event Date / Schedule: " + date, 180, 870, 440, 25, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_card_t4", "• Participant Engagement: " + audience, 180, 910, 440, 25, 12, false, "left", "#0f172a"));
                } else if (i == 1) { // Layout 1: Hero Image + Double Column
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80";
                    elements.add(imgEl("p" + pageNum + "_hero", img1, 50, 510, 700, 270));

                    elements.add(textEl("p" + pageNum + "_col1_title", "Key Takeaways", 50, 795, 330, 25, 13, true, "left", primary));
                    elements.add(textEl("p" + pageNum + "_col1_body", "Linking theoretical structures directly with hands-on learning improves outcomes. The department maintains links with industrial advisory boards to customize schedules.", 50, 825, 330, 230, 11, false, "justify", "#475569"));

                    elements.add(textEl("p" + pageNum + "_col2_title", "Academic Impact", 420, 795, 330, 25, 13, true, "left", primary));
                    elements.add(textEl("p" + pageNum + "_col2_body", "Acquiring skills in emerging sub-domains prepares students for premium placements. Dedicated sessions help trainees synthesize standard methodologies easily.", 420, 825, 330, 230, 11, false, "justify", "#475569"));
                } else if (i == 2) { // Layout 2: Three Column Images
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    String img3 = act.images.size() > 2 ? act.images.get(2) : "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80";

                    elements.add(imgEl("p" + pageNum + "_colimg1", img1, 50, 510, 220, 160));
                    elements.add(imgEl("p" + pageNum + "_colimg2", img2, 290, 510, 220, 160));
                    elements.add(imgEl("p" + pageNum + "_colimg3", img3, 530, 510, 220, 160));

                    String img4 = act.images.size() > 3 ? act.images.get(3) : "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80";
                    elements.add(imgEl("p" + pageNum + "_wide1", img4, 50, 685, 700, 160));

                    elements.add(shapeEl("p" + pageNum + "_quote_bg", 50, 860, 700, 140, "#f8fafc", "#cbd5e1", 1, 8));
                    elements.add(textEl("p" + pageNum + "_quote_text", "This program represents a significant milestone in reinforcing practical curriculum alignment and creative development at KPRCAS.", 80, 900, 640, 70, 12, true, "center", primary));
                } else if (i == 3) { // Layout 3: Timeline Milestones
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    elements.add(imgEl("p" + pageNum + "_img1", img1, 100, 510, 280, 190));
                    elements.add(imgEl("p" + pageNum + "_img2", img2, 420, 510, 280, 190));

                    elements.add(shapeEl("p" + pageNum + "_agenda_bg", 150, 720, 500, 320, "#f8fafc", "#e2e8f0", 1, 12));
                    elements.add(textEl("p" + pageNum + "_agenda_title", "EVENT MILESTONES & AGENDA", 150, 735, 500, 30, 14, true, "center", primary));
                    elements.add(textEl("p" + pageNum + "_session1", "• Phase 1 - Registration & Pre-event briefing session", 180, 780, 440, 30, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_session2", "• Phase 2 - Hands-on training and practice modules", 180, 820, 440, 30, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_session3", "• Phase 3 - Interactive reviews and project showcase", 180, 860, 440, 30, 12, false, "left", "#0f172a"));
                    elements.add(textEl("p" + pageNum + "_session4", "• Phase 4 - Valedictory ceremony & award distribution", 180, 900, 440, 30, 12, false, "left", "#0f172a"));
                } else if (i == 4) { // Layout 4: Achievement Stats
                    elements.add(shapeEl("p" + pageNum + "_stat1_bg", 100, 510, 170, 160, "#eff6ff", "#cbd5e1", 1, 8));
                    elements.add(textEl("p" + pageNum + "_stat1_val", "100%", 100, 540, 170, 40, 32, true, "center", primary));
                    elements.add(textEl("p" + pageNum + "_stat1_lbl", "COMPLETION", 110, 590, 150, 40, 11, true, "center", "#475569"));

                    elements.add(shapeEl("p" + pageNum + "_stat2_bg", 315, 510, 170, 160, "#fff7ed", "#fed7aa", 1, 8));
                    elements.add(textEl("p" + pageNum + "_stat2_val", "150+", 315, 540, 170, 40, 32, true, "center", "#c2410c"));
                    elements.add(textEl("p" + pageNum + "_stat2_lbl", "ATTENDEES", 325, 590, 150, 40, 11, true, "center", "#475569"));

                    elements.add(shapeEl("p" + pageNum + "_stat3_bg", 530, 510, 170, 160, "#f0fdf4", "#bbf7d0", 1, 8));
                    elements.add(textEl("p" + pageNum + "_stat3_val", "A+", 530, 540, 170, 40, 32, true, "center", "#166534"));
                    elements.add(textEl("p" + pageNum + "_stat3_lbl", "GRADE RATING", 540, 590, 150, 40, 11, true, "center", "#475569"));

                    elements.add(shapeEl("p" + pageNum + "_award_card", 150, 700, 500, 320, "#fef3c7", "#fde68a", 1, 12));
                    elements.add(textEl("p" + pageNum + "_award_title", "★ SPECIAL RECOGNITION AWARD ★", 150, 730, 500, 30, 16, true, "center", "#b45309"));
                    elements.add(textEl("p" + pageNum + "_award_body", "The advisory board commended the participants for their active involvement, creative problem-solving, and standard dedication shown during the sessions.", 180, 780, 440, 100, 13, false, "center", "#78350f"));
                    elements.add(textEl("p" + pageNum + "_award_footer", "HONORARY TROPHY • CERTIFICATE OF DISTINCTION", 150, 910, 500, 25, 12, true, "center", "#b45309"));
                } else { // Layout 5: Four Grid Images
                    String img1 = act.images.size() > 0 ? act.images.get(0) : "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80";
                    String img2 = act.images.size() > 1 ? act.images.get(1) : "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80";
                    String img3 = act.images.size() > 2 ? act.images.get(2) : "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=400&q=80";
                    String img4 = act.images.size() > 3 ? act.images.get(3) : "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80";

                    elements.add(imgEl("p" + pageNum + "_grid1", img1, 100, 510, 280, 180));
                    elements.add(imgEl("p" + pageNum + "_grid2", img2, 420, 510, 280, 180));
                    elements.add(imgEl("p" + pageNum + "_grid3", img3, 100, 705, 280, 180));
                    elements.add(imgEl("p" + pageNum + "_grid4", img4, 420, 705, 280, 180));

                    elements.add(shapeEl("p" + pageNum + "_banner", 100, 900, 600, 120, "#eff6ff", "#cbd5e1", 1, 8));
                    elements.add(textEl("p" + pageNum + "_banner_text", "For details on future events, internships, and research papers, contact the coordination desk or visit the website.", 120, 930, 560, 60, 12, false, "center", "#1e40af"));
                }

                addPageFooter(elements, pageNum, department);
                pages.add(createPage("page_" + pageNum, elements, background));
            }
        }
    }

    private Map<String, Object> createEditorialBoardPage(
            String prompt, String name, String department, String date,
            String primary, String secondary, String accent, String background
    ) {
        List<Map<String, Object>> elements = new ArrayList<>();
        addPageHeader(elements, name, department, date, primary, secondary);

        // Editorial banner at y=220 inside content safe area
        elements.add(shapeEl("p8_ribbon_bg", 80, 220, 640, 40, "#e2e8f0", "transparent", 0, 4));
        elements.add(textEl("p8_ribbon_text", "EDITORIAL BOARD", 80, 228, 640, 30, 20, true, "center", "#0f172a"));

        String chiefEditor = extractEditorName(prompt, "Chief Editor");
        String coEditor = extractEditorName(prompt, "Co-Editor");
        String facultyCoordinator = extractEditorName(prompt, "Faculty Coordinator");
        String studentCoordinator = extractEditorName(prompt, "Student Coordinator");

        if (chiefEditor.isEmpty()) chiefEditor = "DR. S. SRIVIDHYA";
        if (coEditor.isEmpty()) coEditor = "MR. AKHIL K M";

        // Left Column: Chief Editor / Faculty
        elements.add(shapeEl("p8_badge_chief_bg", 105, 290, 240, 32, "#ddd6fe", "transparent", 0, 6));
        elements.add(textEl("p8_badge_chief_text", "CHIEF EDITOR", 105, 297, 240, 20, 13, true, "center", "#4c1d95"));
        elements.add(imgEl("p8_pic_chief", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80", 135, 340, 180, 180));
        elements.add(textEl("p8_name_chief", chiefEditor, 50, 540, 350, 25, 14, true, "center", "#0f172a"));
        elements.add(textEl("p8_desig_chief", "ASSOCIATE PROFESSOR AND HEAD", 50, 565, 350, 20, 11, false, "center", "#334155"));
        elements.add(textEl("p8_dept_chief", "DEPT. OF " + department.toUpperCase(), 50, 585, 350, 20, 11, false, "center", "#334155"));

        // Right Column: Co-Editor / Students
        elements.add(shapeEl("p8_badge_co_bg", 455, 290, 240, 32, "#ddd6fe", "transparent", 0, 6));
        elements.add(textEl("p8_badge_co_text", "CO EDITOR", 455, 297, 240, 20, 13, true, "center", "#4c1d95"));
        elements.add(imgEl("p8_pic_co", "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80", 485, 340, 180, 180));
        elements.add(textEl("p8_name_co", coEditor, 400, 540, 350, 25, 14, true, "center", "#0f172a"));
        elements.add(textEl("p8_desig_co", "ASSISTANT PROFESSOR", 400, 565, 350, 20, 11, false, "center", "#334155"));
        elements.add(textEl("p8_dept_co", "DEPT. OF " + department.toUpperCase(), 400, 585, 350, 20, 11, false, "center", "#334155"));

        elements.add(shapeEl("p8_line_div_left", 50, 640, 320, 2, "#000000", "transparent", 0, 0));
        elements.add(shapeEl("p8_diamond_div1", 380, 636, 10, 10, "#000000", "transparent", 0, 0));
        elements.add(shapeEl("p8_diamond_div2", 410, 636, 10, 10, "#000000", "transparent", 0, 0));
        elements.add(shapeEl("p8_line_div_right", 430, 640, 320, 2, "#000000", "transparent", 0, 0));

        // Contact info
        elements.add(textEl("p8_contact_title", "KPR COLLEGE OF ARTS, SCIENCE AND RESEARCH", 50, 700, 700, 25, 12, true, "center", primary));
        elements.add(textEl("p8_contact_addr", "Avinashi Road, Arasur, Coimbatore - 641407, Tamil Nadu, India.", 50, 730, 700, 20, 11, false, "center", "#475569"));
        elements.add(textEl("p8_contact_email", "Email: info@kprcas.ac.in • Web: https://kprcas.ac.in", 50, 755, 700, 20, 11, false, "center", "#475569"));

        addPageFooter(elements, 8, department);
        return createPage("page_8", elements, background);
    }

    // --- PROMPT EXTRACTION UTILITIES ---

    public String extractDepartment(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) {
            return "Academic Department";
        }
        Pattern p = Pattern.compile("(?i)(?:department of|dept\\.? of|school of)\\s+([A-Za-z\\s&]+)");
        Matcher m = p.matcher(prompt);
        if (m.find()) {
            String d = m.group(1).trim();
            String[] verbs = {"conducted", "organized", "hosted", "held", "celebrated", "achieved", "published", "participated", "has", "is", "was", "for", "on", "with", "newsletter", "title", "date", "page", "chief", "editor", "co-editor"};
            for (String v : verbs) {
                int idx = d.toLowerCase().indexOf(" " + v);
                if (idx != -1) {
                    d = d.substring(0, idx).trim();
                }
            }
            if (d.endsWith(".") || d.endsWith(",")) {
                d = d.substring(0, d.length() - 1).trim();
            }
            if (d.length() > 3) {
                return capitalizeWords(d);
            }
        }
        
        // Fallbacks
        String lower = prompt.toLowerCase();
        if (lower.contains("information technology") || lower.contains("it dept") || lower.contains("it department")) return "Information Technology";
        if (lower.contains("computer science") || lower.contains("cs dept") || lower.contains("cs department")) return "Computer Science";
        if (lower.contains("fashion technology") || lower.contains("fashion dept") || lower.contains("fashion department")) return "Fashion Technology";
        if (lower.contains("biotechnology") || lower.contains("biotech dept") || lower.contains("biotech department")) return "Biotechnology";
        if (lower.contains("commerce") || lower.contains("commerce dept")) return "Commerce";
        if (lower.contains("english") || lower.contains("english dept")) return "English";
        if (lower.contains("mathematics") || lower.contains("math dept")) return "Mathematics";
        if (lower.contains("management") || lower.contains("bba dept")) return "Management";

        return "Academic Department";
    }

    public String extractCollegeName(String prompt) {
        if (prompt != null) {
            String lower = prompt.toLowerCase();
            if (lower.contains("kprcas") || lower.contains("kpr college") || lower.contains("kprca")) {
                return "KPR College of Arts Science and Research";
            }
            // Check if there is another college name
            Pattern p = Pattern.compile("(?i)(?:college of|university of|institute of)\\s+([A-Za-z\\s]+)");
            Matcher m = p.matcher(prompt);
            if (m.find()) {
                return capitalizeWords(m.group(0).trim());
            }
        }
        return "KPR College of Arts Science and Research";
    }

    public String extractNewsletterTitle(String prompt, String department) {
        if (prompt != null) {
            Pattern p = Pattern.compile("(?i)(?:newsletter title:?|title:?|newsletter title is)\\s*([^\\n.]+)");
            Matcher m = p.matcher(prompt);
            if (m.find()) {
                return m.group(1).trim().replace("\"", "");
            }
        }
        
        // Generate dynamically based on department
        String deptLower = department.toLowerCase();
        if (deptLower.contains("computer") || deptLower.contains("information") || deptLower.contains("it")) {
            return "CTRL+READ";
        } else if (deptLower.contains("fashion") || deptLower.contains("couture")) {
            return "COUTURE DIARIES";
        } else if (deptLower.contains("commerce") || deptLower.contains("finance")) {
            return "COMMERCE CHRONICLE";
        } else if (deptLower.contains("biotechnology") || deptLower.contains("biology")) {
            return "BIO-PULSE";
        } else if (deptLower.contains("english")) {
            return "CREATIVE INK";
        } else if (deptLower.contains("mathematics") || deptLower.contains("math")) {
            return "MATHEMATICA";
        } else if (deptLower.contains("sports")) {
            return "THE ATHLETIC";
        }
        return "DEPARTMENT CHRONICLE";
    }

    public String extractDate(String prompt) {
        if (prompt != null) {
            // Find month names
            String[] months = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
                               "ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"};
            String lower = prompt.toLowerCase();
            for (int i = 0; i < months.length; i++) {
                if (lower.contains(months[i].toLowerCase())) {
                    String monthName = months[i < 12 ? i : i - 12];
                    // Look for a year nearby
                    Pattern p = Pattern.compile("\\b(202\\d|203\\d)\\b");
                    Matcher m = p.matcher(prompt);
                    if (m.find()) {
                        return monthName + " " + m.group(1);
                    }
                    return monthName + " 2026";
                }
            }
            if (lower.contains("2026")) return "Academic Year 2026";
        }
        return "August 2026";
    }

    public String extractAudience(String prompt) {
        if (prompt != null) {
            Pattern p = Pattern.compile("\\b(\\d{2,4})\\s*(?:students|participants|athletes|delegates)\\b", Pattern.CASE_INSENSITIVE);
            Matcher m = p.matcher(prompt);
            if (m.find()) {
                return m.group(1) + " Participants";
            }
            
            Pattern p2 = Pattern.compile("\\b(\\d{2,4})\\s*(?:attended|participated)\\b", Pattern.CASE_INSENSITIVE);
            Matcher m2 = p2.matcher(prompt);
            if (m2.find()) {
                return m2.group(1) + " Students";
            }
        }
        return "150 Students";
    }

    public String extractEditorName(String prompt, String role) {
        if (prompt == null) return "";
        Pattern p = Pattern.compile("(?i)" + role + "\\s*(?:is|:|:-)?\\s*([A-Za-z\\s.]+?)(?=\\n|,|and|co-editor|faculty coordinator|student coordinator|editorial team|$)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(prompt);
        if (m.find()) {
            String name = m.group(1).trim();
            // Clean common trailing garbage
            if (name.toLowerCase().endsWith(" is")) name = name.substring(0, name.length() - 3).trim();
            while (name.endsWith(".") || name.endsWith(",")) {
                name = name.substring(0, name.length() - 1).trim();
            }
            return capitalizeWords(name);
        }
        return "";
    }

    public List<Activity> extractActivities(String prompt, String department, String date, String audience) {
        List<Activity> list = new ArrayList<>();
        if (prompt == null || prompt.trim().isEmpty()) {
            return list;
        }

        List<String> rawChunks = new ArrayList<>();
        String[] lines = prompt.split("\\r?\\n");
        StringBuilder currentBlock = new StringBuilder();

        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) continue;

            boolean isNewHeader = trimmed.matches("^(?:\\d+\\.|\\d+\\)|[A-Z\\s]{4,}:|•|\\*)\\s*.*") ||
                                 trimmed.toLowerCase().startsWith("student achievements") ||
                                 trimmed.toLowerCase().startsWith("faculty achievements") ||
                                 trimmed.toLowerCase().contains("hackathon") ||
                                 trimmed.toLowerCase().contains("nptel") ||
                                 trimmed.toLowerCase().contains("admission") ||
                                 trimmed.toLowerCase().contains("publishes") ||
                                 trimmed.toLowerCase().contains("presents a paper");

            if (isNewHeader && currentBlock.length() > 25) {
                rawChunks.add(currentBlock.toString().trim());
                currentBlock = new StringBuilder();
            }

            if (currentBlock.length() > 0) currentBlock.append(" ");
            currentBlock.append(trimmed);
        }
        if (currentBlock.length() > 0) {
            rawChunks.add(currentBlock.toString().trim());
        }

        for (String chunk : rawChunks) {
            String lower = chunk.toLowerCase();
            if (lower.contains("chief editor") || lower.contains("co-editor") || lower.contains("faculty coordinator") || lower.contains("student coordinator")) {
                continue;
            }
            if (lower.equals("achievements on may 2026") || lower.equals("student achievements") || lower.equals("faculty achievements")) {
                continue;
            }

            String cleanedChunk = chunk.replaceFirst("^(?:\\d+\\.|\\d+\\)|•|\\*)\\s*", "").trim();
            if (cleanedChunk.length() < 8) continue;

            Activity act = new Activity();
            act.title = extractActivityTitle(cleanedChunk);
            act.type = detectEventType(cleanedChunk);
            act.content = enhanceAcademicWriting(cleanedChunk, department, date);
            act.images = getImagesForActivity(department, act.type, act.title);
            list.add(act);
        }

        if (list.isEmpty()) {
            Activity act = new Activity();
            act.title = "Department Activity";
            act.type = "Highlights";
            act.content = "The Department of " + department + " conducted engaging academic and extra-curricular programs during this period. " +
                          "These sessions provided students with practical exposure and key learning insights.";
            act.images = getImagesForActivity(department, "General", "");
            list.add(act);
        }

        return list;
    }

    private String extractActivityTitle(String chunk) {
        String lower = chunk.toLowerCase();
        String[] indicators = {
            "conducted a ", "conducted an ", "conducted ", 
            "organized a ", "organized an ", "organized ", 
            "held a ", "held an ", "held ", 
            "hosted a ", "hosted an ", "hosted ", 
            "showcased ", "celebrated ", "achieved ", 
            "won first prize at the ", "won first prize at ", "won a ", "won ", 
            "completed a ", "completed an ", "completed ",
            "welcomed freshers in the ", "welcomed freshers in ", "welcomed ",
            "published a research paper on ", "published a ", "published "
        };
        for (String ind : indicators) {
            int idx = lower.indexOf(ind);
            if (idx != -1) {
                int start = idx + ind.length();
                int end = chunk.indexOf(".", start);
                if (end == -1) end = chunk.length();
                String titlePart = chunk.substring(start, end).trim();
                String[] words = titlePart.split("\\s+");
                if (words.length > 5) {
                    StringBuilder sb = new StringBuilder();
                    for (int i = 0; i < 5; i++) {
                        sb.append(words[i]).append(" ");
                    }
                    titlePart = sb.toString().trim();
                }
                if (titlePart.endsWith(" for") || titlePart.endsWith(" with") || titlePart.endsWith(" on") || titlePart.endsWith(" at") || titlePart.endsWith(" across")) {
                    titlePart = titlePart.substring(0, titlePart.lastIndexOf(" ")).trim();
                }
                if (titlePart.length() > 3) {
                    return capitalizeWords(titlePart);
                }
            }
        }
        
        String[] words = chunk.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(words.length, 4); i++) {
            sb.append(words[i]).append(" ");
        }
        return capitalizeWords(sb.toString().trim().replace(".", ""));
    }

    private String detectEventType(String chunk) {
        String lower = chunk.toLowerCase();
        if (lower.contains("workshop")) return "Workshop";
        if (lower.contains("seminar") || lower.contains("lecture") || lower.contains("webinar") || lower.contains("talk")) return "Seminar";
        if (lower.contains("placement") || lower.contains("recruit") || lower.contains("job") || lower.contains("hired")) return "Placement";
        if (lower.contains("achievement") || lower.contains("won") || lower.contains("award") || lower.contains("hackathon") || lower.contains("competition")) return "Achievement";
        if (lower.contains("research") || lower.contains("journal") || lower.contains("paper") || lower.contains("publish")) return "Research";
        if (lower.contains("visit") || lower.contains("industry")) return "Industrial Visit";
        if (lower.contains("freshers") || lower.contains("orientation") || lower.contains("induction") || lower.contains("welcome")) return "Orientation";
        if (lower.contains("sports") || lower.contains("athlet")) return "Sports";
        return "Department Highlights";
    }

    private String enhanceAcademicWriting(String chunk, String department, String defaultDate) {
        if (chunk == null || chunk.trim().isEmpty()) return "";
        
        // Check for Tamil
        boolean isTamil = false;
        for (char c : chunk.toCharArray()) {
            if (Character.UnicodeBlock.of(c) == Character.UnicodeBlock.TAMIL) {
                isTamil = true;
                break;
            }
        }
        if (isTamil) return chunk;

        String[] sentences = chunk.split("(?<=\\.)\\s+");
        List<String> enhanced = new ArrayList<>();
        
        for (String s : sentences) {
            String sClean = s.trim();
            if (sClean.isEmpty()) continue;
            
            String lower = sClean.toLowerCase();
            if (lower.contains("conducted") || lower.contains("organized") || lower.contains("held") || lower.contains("hosted")) {
                enhanced.add("In alignment with the department's institutional vision of academic excellence, the " + sClean);
            } else if (lower.contains("participated") || lower.contains("attended") || lower.contains("students")) {
                enhanced.add("This initiative witnessed active participation, where " + sClean);
            } else if (lower.contains("expert") || lower.contains("speaker") || lower.contains("resource person")) {
                enhanced.add("To ensure industry-aligned practical training, " + sClean);
            } else if (lower.contains("learned") || lower.contains("developed") || lower.contains("created") || lower.contains("projects")) {
                enhanced.add("During the technical sessions, " + sClean);
            } else {
                enhanced.add(sClean);
            }
        }
        
        StringBuilder sb = new StringBuilder();
        for (String s : enhanced) {
            sb.append(s).append(" ");
        }
        String result = sb.toString().trim();
        if (!result.endsWith(".")) {
            result = result + ".";
        }
        return result.replace("..", ".").replace(" .", ".");
    }

    private static String capitalizeWords(String str) {
        if (str == null || str.isEmpty()) return "";
        String[] words = str.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            sb.append(Character.toUpperCase(w.charAt(0)));
            if (w.length() > 1) {
                sb.append(w.substring(1).toLowerCase());
            }
            sb.append(" ");
        }
        return sb.toString().trim();
    }

    private String getSchoolForDepartment(String department) {
        String deptLower = department.toLowerCase();
        if (deptLower.contains("computer") || deptLower.contains("computing") || deptLower.contains("information") || deptLower.contains("it")) {
            return "SCHOOL OF COMPUTING SCIENCE";
        } else if (deptLower.contains("fashion") || deptLower.contains("textile") || deptLower.contains("apparel") || deptLower.contains("design") || deptLower.contains("couture")) {
            return "SCHOOL OF DESIGN & FASHION";
        } else if (deptLower.contains("commerce") || deptLower.contains("business") || deptLower.contains("management") || deptLower.contains("finance")) {
            return "SCHOOL OF COMMERCE & MANAGEMENT";
        } else if (deptLower.contains("english") || deptLower.contains("tamil") || deptLower.contains("humanities")) {
            return "SCHOOL OF LIBERAL ARTS & SCIENCE";
        } else if (deptLower.contains("biotechnology") || deptLower.contains("biology") || deptLower.contains("chemistry") || deptLower.contains("science")) {
            return "SCHOOL OF NATURAL & APPLIED SCIENCES";
        }
        return "SCHOOL OF LIBERAL ARTS & SCIENCE";
    }

    private Map<String, String> getThemeForDepartment(String department) {
        Map<String, String> theme = new HashMap<>();
        String dept = department.toLowerCase();
        
        if (dept.contains("information technology") || dept.contains("computer") || dept.contains("cs") || dept.contains("it")) {
            theme.put("primary", "#1e40af"); // Royal Blue
            theme.put("secondary", "#0f172a"); // Navy
            theme.put("accent", "#f97316"); // Orange
            theme.put("background", "#ffffff");
        } else if (dept.contains("fashion") || dept.contains("textile") || dept.contains("apparel") || dept.contains("couture") || dept.contains("design")) {
            theme.put("primary", "#e11d48"); // Crimson Rose
            theme.put("secondary", "#1e1b4b"); // Dark Indigo
            theme.put("accent", "#c084fc"); // Lavender
            theme.put("background", "#ffffff");
        } else if (dept.contains("commerce") || dept.contains("finance") || dept.contains("accounting") || dept.contains("business")) {
            theme.put("primary", "#0f172a"); // Dark Slate
            theme.put("secondary", "#1e40af"); // Corporate Blue
            theme.put("accent", "#eab308"); // Gold
            theme.put("background", "#ffffff");
        } else if (dept.contains("biotechnology") || dept.contains("biology") || dept.contains("science") || dept.contains("chemistry") || dept.contains("botany")) {
            theme.put("primary", "#166534"); // Forest Green
            theme.put("secondary", "#0f172a"); // Navy
            theme.put("accent", "#10b981"); // Mint Green
            theme.put("background", "#ffffff");
        } else if (dept.contains("english") || dept.contains("literature") || dept.contains("humanities") || dept.contains("languages")) {
            theme.put("primary", "#991b1b"); // Deep Red/Rosewood
            theme.put("secondary", "#3f2f2f"); // Warm Brown
            theme.put("accent", "#d97706"); // Amber
            theme.put("background", "#ffffff");
        } else if (dept.contains("mathematics") || dept.contains("math") || dept.contains("statistics")) {
            theme.put("primary", "#0f766e"); // Deep Teal
            theme.put("secondary", "#0f172a"); // Navy
            theme.put("accent", "#06b6d4"); // Cyan
            theme.put("background", "#ffffff");
        } else if (dept.contains("sports") || dept.contains("physical")) {
            theme.put("primary", "#b91c1c"); // Bold Red
            theme.put("secondary", "#0f172a"); // Navy
            theme.put("accent", "#fbbf24"); // Yellow Gold
            theme.put("background", "#ffffff");
        } else {
            theme.put("primary", "#1e40af"); // Royal Blue
            theme.put("secondary", "#0f172a"); // Navy
            theme.put("accent", "#f97316"); // Orange
            theme.put("background", "#ffffff");
        }
        return theme;
    }

    private List<String> getImagesForActivity(String dept, String type, String topic) {
        List<String> list = new ArrayList<>();
        String query = (dept + " " + type + " " + topic).toLowerCase();
        
        if (query.contains("fashion") || query.contains("apparel") || query.contains("couture") || query.contains("design") || query.contains("runway")) {
            list.add("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80"); // Fashion clothes
            list.add("https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80"); // Runway model
            list.add("https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80"); // Sewing designer
            list.add("https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80"); // Fashion shopping model
            list.add("https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80"); // Clothes rack
        } else if (query.contains("biotechnology") || query.contains("biology") || query.contains("lab") || query.contains("science") || query.contains("gel") || query.contains("electrophoresis") || query.contains("microscope")) {
            list.add("https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=600&q=80"); // Biotech lab
            list.add("https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=600&q=80"); // Microscope
            list.add("https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80"); // Petri dish
            list.add("https://images.unsplash.com/photo-1576086213241-556ff6d5bfcf?auto=format&fit=crop&w=600&q=80"); // Scientist typing
            list.add("https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&w=600&q=80"); // Chemistry beaker
        } else if (query.contains("commerce") || query.contains("finance") || query.contains("banking") || query.contains("tax") || query.contains("literacy") || query.contains("investment")) {
            list.add("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80"); // Business chart
            list.add("https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80"); // Budget calculator
            list.add("https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"); // Corporate handshake
            list.add("https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80"); // Digital money
            list.add("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80"); // Investment plant coins
        } else if (query.contains("english") || query.contains("literature") || query.contains("writing") || query.contains("poetry") || query.contains("essay") || query.contains("book") || query.contains("library")) {
            list.add("https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80"); // Library pile of books
            list.add("https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80"); // Pen paper writing
            list.add("https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80"); // Typing on old typewriter
            list.add("https://images.unsplash.com/photo-1474366521946-c3d4b507abf2?auto=format&fit=crop&w=600&q=80"); // Reading in classroom
            list.add("https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=600&q=80"); // Reading near window
        } else if (query.contains("sports") || query.contains("athlet") || query.contains("football") || query.contains("run") || query.contains("play") || query.contains("game")) {
            list.add("https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80"); // Running track
            list.add("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80"); // Sports equipment
            list.add("https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80"); // Athlete starting line
            list.add("https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80"); // Soccer ball
            list.add("https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80"); // Football stadium match
        } else if (query.contains("placement") || query.contains("career") || query.contains("job") || query.contains("recruit") || query.contains("interview")) {
            list.add("https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80"); // Professional candidate
            list.add("https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=80"); // Interviewer smiling
            list.add("https://images.unsplash.com/photo-1521791136368-1a8ac2f72a56?auto=format&fit=crop&w=600&q=80"); // Office team shake
            list.add("https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"); // Corporate handshake
            list.add("https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80"); // Group recruitment seminar
        } else if (query.contains("workshop") || query.contains("seminar") || query.contains("lecture") || query.contains("webinar") || query.contains("symposium") || query.contains("hackathon") || query.contains("coding") || query.contains("computer")) {
            list.add("https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80"); // Active students coding
            list.add("https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"); // Workshop table discuss
            list.add("https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80"); // Presentation slide
            list.add("https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80"); // College lecture room
            list.add("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"); // Digital screen learning
        } else {
            list.add("https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80"); // College campus building
            list.add("https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80"); // Students gathering
            list.add("https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80"); // Study group
            list.add("https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=600&q=80"); // Classroom lecture
            list.add("https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"); // Digital collaborative workspace
        }
        return list;
    }
}
