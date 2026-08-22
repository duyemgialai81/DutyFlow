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

  @Value("${app.cors.allowed-origins:http://localhost:5173}")
  private String allowedOrigins;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.ignoringRequestMatchers("/api/integrations/zalo/webhook"))
        .cors(cors -> cors.configurationSource(corsSource()))
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            // Webhook Zalo: public nhưng có xác thực chữ ký HMAC trong controller
            .requestMatchers(HttpMethod.POST, "/api/integrations/zalo/webhook").permitAll()
            .requestMatchers("/api/**").authenticated()
            .anyRequest().permitAll())
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .exceptionHandling(eh -> eh.authenticationEntryPoint((req, res, ex) -> {
          res.setStatus(401);
          res.setContentType("application/json;charset=UTF-8");
          res.getWriter().write("""
              {"success":false,"code":"UNAUTHORIZED","message":"Phiên đăng nhập không hợp lệ.","timestamp":"%s"}
              """.formatted(java.time.LocalDateTime.now()));
        }));
    return http.build();
  }

  /** CORS chỉ cho đúng domain frontend cấu hình qua env. */
  private CorsConfigurationSource corsSource() {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOriginPatterns(Arrays.asList(allowedOrigins.split(",")));
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
    cfg.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cfg);
    return source;
  }
}
