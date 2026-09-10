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
 * Đọc Bearer JWT / Cookie, nạp principal {sub, employeeId, name, role} vào SecurityContext.
 * Hỗ trợ 3 role: ROLE_ADMIN, ROLE_LEADER, ROLE_EMPLOYEE.
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
    String token = null;

    // Ưu tiên Authorization header
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      token = header.substring(7);
    }

    // Fallback sang HttpOnly cookie
    if (token == null && request.getCookies() != null) {
      for (var cookie : request.getCookies()) {
        if ("jwt".equals(cookie.getName())) {
          token = cookie.getValue();
          break;
        }
      }
    }

    if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
      try {
        Claims claims = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token)
            .getPayload();
        String sub = claims.getSubject();
        String role = claims.get("role", String.class); // ROLE_ADMIN | ROLE_LEADER | ROLE_EMPLOYEE
        Long employeeId = claims.get("employeeId", Long.class);
        String name = claims.get("name", String.class);

        // Chuẩn hoá role: đảm bảo có tiền tố ROLE_
        String authority = (role != null && role.startsWith("ROLE_")) ? role : "ROLE_EMPLOYEE";

        JwtPrincipal principal = new JwtPrincipal(sub, employeeId, name != null ? name : sub, authority);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null,
                List.of(new SimpleGrantedAuthority(authority))));
      } catch (Exception ignored) {
        // token sai/hết hạn → để Security trả 401
      }
    }
    chain.doFilter(request, response);
  }
}
