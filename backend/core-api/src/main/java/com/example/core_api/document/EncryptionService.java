package com.example.core_api.document;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Core cryptographic service for transparent document content encryption.
 *
 * ALGORITHM: AES/GCM/NoPadding
 * - Key Size: 256 bits (32 bytes)
 * - IV / Nonce: 12 bytes (96 bits) randomly generated per encryption
 * - Auth Tag Length: 128 bits
 *
 * STORED FORMAT: Base64( 12-byte IV + Ciphertext + 16-byte Tag )
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits standard for AES-GCM
    private static final int GCM_TAG_LENGTH = 128; // 128-bit authentication tag

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public EncryptionService(@Value("${encryption.secret-key}") String secretKeyString) {
        if (secretKeyString == null || secretKeyString.getBytes(StandardCharsets.UTF_8).length != 32) {
            throw new IllegalArgumentException("Encryption secret key must be exactly 32 bytes (256 bits) long.");
        }
        this.secretKey = new SecretKeySpec(secretKeyString.getBytes(StandardCharsets.UTF_8), "AES");
    }

    /**
     * Encrypts plain text string using AES-256 GCM.
     *
     * @param plainText Unencrypted text
     * @return Base64 encoded string containing prepended IV + Ciphertext + Tag
     */
    public String encrypt(String plainText) {
        if (plainText == null) {
            return null;
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherTextBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Combine [ 12-byte IV ] + [ Ciphertext + Tag ]
            byte[] combinedBytes = new byte[iv.length + cipherTextBytes.length];
            System.arraycopy(iv, 0, combinedBytes, 0, iv.length);
            System.arraycopy(cipherTextBytes, 0, combinedBytes, iv.length, cipherTextBytes.length);

            return Base64.getEncoder().encodeToString(combinedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error occurred while encrypting data", e);
        }
    }

    /**
     * Decrypts Base64 string payload using AES-256 GCM.
     *
     * @param cipherText Base64 encoded string containing prepended IV + Ciphertext + Tag
     * @return Original plain text string
     */
    public String decrypt(String cipherText) {
        if (cipherText == null) {
            return null;
        }

        try {
            byte[] combinedBytes = Base64.getDecoder().decode(cipherText);

            if (combinedBytes.length < GCM_IV_LENGTH) {
                throw new IllegalArgumentException("Invalid cipher text format");
            }

            // Extract 12-byte IV from front of array
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combinedBytes, 0, iv, 0, GCM_IV_LENGTH);

            // Extract remaining bytes (Ciphertext + Auth Tag)
            int cipherTextLength = combinedBytes.length - GCM_IV_LENGTH;
            byte[] cipherTextBytes = new byte[cipherTextLength];
            System.arraycopy(combinedBytes, GCM_IV_LENGTH, cipherTextBytes, 0, cipherTextLength);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherTextBytes);
            return new String(plainTextBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error occurred while decrypting data", e);
        }
    }
}
