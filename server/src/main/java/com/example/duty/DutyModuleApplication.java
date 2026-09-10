package com.example.duty;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Module Phân lịch trực + Quản lý ca trực + Thông báo Zalo.
 * Có thể chạy standalone hoặc import package com.example.duty vào project hiện tại
 * (component-scan tự nhặt controller/service/repository của module).
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
@EnableScheduling   // bật @Scheduled — job nhắc nhở ca trực 7:00 AM
@EnableCaching      // bật @Cacheable với Redis backend
public class DutyModuleApplication {

  public static void main(String[] args) {
    SpringApplication.run(DutyModuleApplication.class, args);
  }
}
