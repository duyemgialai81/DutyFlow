package com.example.duty.security;

import com.example.duty.util.SecurityUsers.JwtPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Đọc Bearer JWT, nạp principal {sub, employeeId, name, role} vào SecurityContext.
 * Project hiện tại đã có filter JWT riêng → BỎ file này và map principal sang JwtPrincipal.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final SecretKey key;

  public JwtAuthFilter(@Value("${app.security.jwt-secret}") String secret) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")
        && SecurityContextHolder.getContext().getAuthentication() == null) {
      try {
        Claims claims = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(header.substring(7))
            .getPayload();
        String sub = claims.getSubject();
        String role = claims.get("role", String.class);
        Long employeeId = claims.get("employeeId", Long.class);
        String name = claims.get("name", String.class);

        JwtPrincipal principal = new JwtPrincipal(sub, employeeId, name != null ? name : sub, role);
        var authorities = List.of(new SimpleGrantedAuthority(
            "ADMIN".equalsIgnoreCase(role) ? "ROLE_ADMIN" : "ROLE_EMPLOYEE"));
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, authorities));
      } catch (Exception ignored) {
        // token sai/hết hạn → để Security trả 401
      }
    }
    chain.doFilter(request, response);
  }
}
