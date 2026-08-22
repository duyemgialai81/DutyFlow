package com.example.duty.integration.zalo;

import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Mã hoá AES-256-GCM cho access/refresh token Zalo trước khi lưu DB.
 * Key lấy từ env ZALO_TOKEN_CIPHER_KEY (base64, 32 bytes).
 */
@Component
public class TokenCipher {

  private static final int IV_LEN = 12;
  private static final int TAG_BITS = 128;
  private final SecretKeySpec key;
  private final SecureRandom random = new SecureRandom();

  public TokenCipher(ZaloProperties props) {
    String b64 = props.tokenCipherKey();
    if (b64 == null || b64.isBlank()) {
      this.key = null; // môi trường dev chưa cấu hình — từ chối mã hoá
    } else {
      byte[] raw = Base64.getDecoder().decode(b64);
      this.key = new SecretKeySpec(raw, "AES");
    }
  }

  public String encrypt(String plain) {
    if (plain == null) return null;
    requireKey();
    try {
      byte[] iv = new byte[IV_LEN];
      random.nextBytes(iv);
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
      byte[] ct = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
      byte[] out = new byte[iv.length + ct.length];
      System.arraycopy(iv, 0, out, 0, iv.length);
      System.arraycopy(ct, 0, out, iv.length, ct.length);
      return Base64.getEncoder().encodeToString(out);
    } catch (Exception e) {
      throw new IllegalStateException("Không thể mã hoá token Zalo", e);
    }
  }

  public String decrypt(String enc) {
    if (enc == null) return null;
    requireKey();
    try {
      byte[] all = Base64.getDecoder().decode(enc);
      byte[] iv = new byte[IV_LEN];
      System.arraycopy(all, 0, iv, 0, IV_LEN);
      Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
      return new String(c.doFinal(all, IV_LEN, all.length - IV_LEN), StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new IllegalStateException("Không thể giải mã token Zalo", e);
    }
  }

  private void requireKey() {
    if (key == null) {
      throw new IllegalStateException("Thiếu ZALO_TOKEN_CIPHER_KEY — cấu hình env trước khi dùng OAuth Zalo.");
    }
  }
}
