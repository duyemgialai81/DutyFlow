package com.example.duty.service;

import com.example.duty.entity.SystemSetting;
import com.example.duty.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Đọc/ghi cài đặt hệ thống dạng key-value từ bảng system_setting.
 * Admin chỉnh trực tiếp trên giao diện web, không cần sửa code hay restart server.
 */
@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository repo;

    public Optional<String> get(String key) {
        return repo.findById(key)
                .map(SystemSetting::getValue)
                .filter(v -> v != null && !v.isBlank());
    }

    public String getOrDefault(String key, String defaultValue) {
        return get(key).orElse(defaultValue);
    }

    @Transactional
    public void set(String key, String value) {
        SystemSetting s = repo.findById(key).orElseGet(() -> {
            SystemSetting n = new SystemSetting();
            n.setKey(key);
            return n;
        });
        s.setValue(value != null ? value.strip() : null);
        repo.save(s);
    }
}
