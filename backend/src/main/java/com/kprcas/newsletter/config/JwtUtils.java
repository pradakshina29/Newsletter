package com.kprcas.newsletter.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private int jwtExpirationMs;

    private Key key;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateToken(String email, String role, Long id, String name) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("id", id);
        claims.put("name", name);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Log authentication errors
        }
        return false;
    }

    public String getEmailFromToken(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().getSubject();
        } catch (Exception e) {
            return null;
        }
    }

    public String getRoleFromToken(String token) {
        try {
            return (String) Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().get("role");
        } catch (Exception e) {
            return null;
        }
    }

    public Long getIdFromToken(String token) {
        try {
            Number id = (Number) Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().get("id");
            return id != null ? id.longValue() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public String getNameFromToken(String token) {
        try {
            return (String) Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody().get("name");
        } catch (Exception e) {
            return null;
        }
    }
}
