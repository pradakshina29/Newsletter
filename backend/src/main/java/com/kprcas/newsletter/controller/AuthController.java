package com.kprcas.newsletter.controller;

import com.kprcas.newsletter.config.JwtUtils;
import com.kprcas.newsletter.model.ActivityLog;
import com.kprcas.newsletter.model.User;
import com.kprcas.newsletter.repository.ActivityLogRepository;
import com.kprcas.newsletter.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivityLogRepository activityLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");
        String name = request.get("name");
        String role = request.get("role"); // ADMIN, FACULTY, STUDENT
        String department = request.get("department");

        if (email == null || password == null || name == null || role == null || department == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Missing registration fields.");
        }

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email is already registered.");
        }

        User user = new User(
                email,
                passwordEncoder.encode(password),
                name,
                role.toUpperCase(),
                department
        );

        User savedUser = userRepository.save(user);

        // Audit Log
        activityLogRepository.save(new ActivityLog(
                savedUser.getId(),
                savedUser.getName(),
                savedUser.getRole(),
                "REGISTER",
                "Successfully registered user: " + savedUser.getEmail()
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("message", "User registered successfully");
        response.put("userId", savedUser.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email and password are required.");
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password.");
        }

        String jwt = jwtUtils.generateToken(user.getEmail(), user.getRole(), user.getId(), user.getName());

        // Audit Log
        activityLogRepository.save(new ActivityLog(
                user.getId(),
                user.getName(),
                user.getRole(),
                "LOGIN",
                "Logged in from web application"
        ));

        Map<String, Object> response = new HashMap<>();
        response.put("token", jwt);
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("name", user.getName());
        response.put("role", user.getRole());
        response.put("department", user.getDepartment());

        return ResponseEntity.ok(response);
    }
}
