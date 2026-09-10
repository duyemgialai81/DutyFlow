package com.example.duty.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Điều hướng tất cả các route của Single Page Application (React Router) về index.html.
 */
@Controller
public class SpaController {

  @GetMapping(value = {
      "/",
      "/login",
      "/overview",
      "/duty/**",
      "/shifts",
      "/users",
      "/requests",
      "/reports",
      "/settings",
      "/notifications"
  })
  public String forward() {
    return "forward:/index.html";
  }
}
