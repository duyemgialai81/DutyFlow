package com.example.duty.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class AsyncConfig {

  /**
   * Executor riêng cho pipeline notification — tách khỏi thread nghiệp vụ.
   * NotificationService.publish chạy @Async("notificationExecutor").
   */
  @Bean("notificationExecutor")
  public TaskExecutor notificationExecutor() {
    ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
    ex.setCorePoolSize(2);
    ex.setMaxPoolSize(6);
    ex.setQueueCapacity(200);
    ex.setThreadNamePrefix("notif-");
    ex.setWaitForTasksToCompleteOnShutdown(true);
    ex.setAwaitTerminationSeconds(20);
    ex.initialize();
    return ex;
  }
}
