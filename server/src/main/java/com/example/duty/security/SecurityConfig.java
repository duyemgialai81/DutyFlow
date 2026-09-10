package com.example.duty.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // bật @PreAuthorize ở controller
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthFilter jwtAuthFilter;
  private final TraceIdFilter traceIdFilter;

  @Value("${CORS_ALLOWED_ORIGINS:${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000,http://localhost:8080,https://donjaderoy-lich-kyta.hf.space,https://huggingface.co}}")
  private String allowedOrigins;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // Disable CSRF as we'll use SameSite cookies or JWT
        .cors(cors -> cors.configurationSource(corsSource()))
        .headers(headers -> headers
            .contentTypeOptions(cto -> {}) // X-Content-Type-Options: nosniff
            .contentSecurityPolicy(csp -> csp.policyDirectives("frame-ancestors 'self' https://huggingface.co https://*.hf.space"))
        )
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            // Webhook Zalo và Auth
            .requestMatchers(HttpMethod.POST, "/api/integrations/zalo/webhook").permitAll()
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers("/api/**").authenticated()
            .anyRequest().permitAll())
        .addFilterBefore(traceIdFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .exceptionHandling(eh -> eh.authenticationEntryPoint((req, res, ex) -> {
          res.setStatus(401);
          res.setContentType("application/json;charset=UTF-8");
          String traceId = org.slf4j.MDC.get("traceId");
          res.getWriter().write("""
              {"success":false,"code":"40101_UNAUTHORIZED","message":"Phiên đăng nhập không hợp lệ hoặc đã hết hạn.","traceId":"%s","timestamp":"%s"}
              """.formatted(traceId != null ? traceId : "", java.time.LocalDateTime.now()));
        }));
    return http.build();
  }

  /** CORS chỉ cho đúng domain frontend cấu hình qua env. */
  private CorsConfigurationSource corsSource() {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "X-Trace-Id", "X-Request-Id"));
    cfg.setExposedHeaders(List.of("X-Trace-Id"));
    cfg.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cfg);
    return source;
  }
}
