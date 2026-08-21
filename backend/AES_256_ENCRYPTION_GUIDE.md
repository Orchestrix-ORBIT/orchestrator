# AES-256 GCM Encryption Implementation Guide

This guide provides a step-by-step walkthrough for implementing transparent database attribute encryption for document contents (`contentEncrypted`) in `core-api` using Java Cryptography Architecture (`javax.crypto`) and JPA `AttributeConverter`.

---

## Technical Overview

- **Algorithm**: `AES/GCM/NoPadding` (Authenticated Encryption with Associated Data - AEAD)
- **Key Size**: 256 bits (32 bytes)
- **IV / Nonce**: 12-byte (96 bits) SecureRandom IV generated per encryption
- **Tag Size**: 128 bits
- **Encoded Storage Format**: Base64 string composed of:
  `[ 12 bytes IV | Ciphertext + 16 bytes Authentication Tag ]`

---

## Step 1: Configure Secret Key Environment & YAML

### 1.1 Update `backend/.env`
Add the `ENCRYPTION_SECRET_KEY` variable:

```env
# AES-256 Encryption Secret Key (Must be 32 characters / 256 bits)
ENCRYPTION_SECRET_KEY=My32ByteSuperSecretKeyForAES256!
```

### 1.2 Update `backend/core-api/src/main/resources/application.yml`
Add the configuration mapping under root:

```yaml
encryption:
  secret-key: ${ENCRYPTION_SECRET_KEY}
```

---

## Step 2: Create `EncryptionService.java`

Create file at:
`backend/core-api/src/main/java/com/example/core_api/document/EncryptionService.java`

### Key Responsibilities:
1. Load secret key from `${encryption.secret-key}` using `@Value`.
2. Generate a secure random 12-byte IV for every encryption.
3. Perform AES-256 GCM encryption and return Base64 string.
4. Perform AES-256 GCM decryption by extracting IV from decoded Base64 payload.

```java
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

@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits standard for GCM
    private static final int GCM_TAG_LENGTH = 128; // 128-bit authentication tag

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public EncryptionService(@Value("${encryption.secret-key}") String secretKeyString) {
        if (secretKeyString == null || secretKeyString.getBytes(StandardCharsets.UTF_8).length != 32) {
            throw new IllegalArgumentException("Encryption secret key must be exactly 32 bytes (256 bits) long.");
        }
        this.secretKey = new SecretKeySpec(secretKeyString.getBytes(StandardCharsets.UTF_8), "AES");
    }

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

            // Combine IV + CipherText
            byte[] combinedBytes = new byte[iv.length + cipherTextBytes.length];
            System.arraycopy(iv, 0, combinedBytes, 0, iv.length);
            System.arraycopy(cipherTextBytes, 0, combinedBytes, iv.length, cipherTextBytes.length);

            return Base64.getEncoder().encodeToString(combinedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error occurred while encrypting data", e);
        }
    }

    public String decrypt(String cipherText) {
        if (cipherText == null) {
            return null;
        }

        try {
            byte[] combinedBytes = Base64.getDecoder().decode(cipherText);

            if (combinedBytes.length < GCM_IV_LENGTH) {
                throw new IllegalArgumentException("Invalid cipher text format");
            }

            // Extract IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(combinedBytes, 0, iv, 0, GCM_IV_LENGTH);

            // Extract CipherText
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
```

---

## Step 3: Create `AttributeEncryptor.java`

Create file at:
`backend/core-api/src/main/java/com/example/core_api/document/AttributeEncryptor.java`

### Key Responsibilities:
1. Implement `jakarta.persistence.AttributeConverter<String, String>`.
2. Convert entity field (`plainText`) to database column payload (`cipherText`) upon persist/update.
3. Convert database column payload (`cipherText`) to entity field (`plainText`) upon fetch.

```java
package com.example.core_api.document;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Converter
@Component
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private final EncryptionService encryptionService;

    @Autowired
    public AttributeEncryptor(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        return encryptionService.decrypt(dbData);
    }
}
```

---

## Step 4: Annotate Entity (`Document.java`)

Update `backend/core-api/src/main/java/com/example/core_api/document/Document.java`:

Attach the `@Convert` annotation to `contentEncrypted`:

```java
    // Stored encrypted; null if the document is a file-based upload
    @Convert(converter = AttributeEncryptor.class)
    @Column(name = "content_encrypted", columnDefinition = "TEXT")
    private String contentEncrypted;
```

---

## Step 5: Create Unit Tests (`EncryptionServiceTest.java`)

Create file at:
`backend/core-api/src/test/java/com/example/core_api/document/EncryptionServiceTest.java`

```java
package com.example.core_api.document;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EncryptionServiceTest {

    private static final String SECRET_KEY = "12345678901234567890123456789012"; // 32 characters
    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionService(SECRET_KEY);
    }

    @Test
    void testEncryptAndDecryptSuccess() {
        String originalText = "Sensitive Document Body Content";

        String encrypted = encryptionService.encrypt(originalText);
        assertNotNull(encrypted);
        assertNotEquals(originalText, encrypted);

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(originalText, decrypted);
    }

    @Test
    void testUniqueIVPerEncryption() {
        String text = "Same Content";

        String encrypted1 = encryptionService.encrypt(text);
        String encrypted2 = encryptionService.encrypt(text);

        // Due to random IV, ciphertexts must differ
        assertNotEquals(encrypted1, encrypted2);

        // Both decrypt back to same content
        assertEquals(text, encryptionService.decrypt(encrypted1));
        assertEquals(text, encryptionService.decrypt(encrypted2));
    }

    @Test
    void testNullHandling() {
        assertNull(encryptionService.encrypt(null));
        assertNull(encryptionService.decrypt(null));
    }
}
```

---

## Summary Checklist

- [ ] Updated `.env` with `ENCRYPTION_SECRET_KEY`
- [ ] Updated `application.yml` with `encryption.secret-key` property
- [ ] Created `EncryptionService.java`
- [ ] Created `AttributeEncryptor.java`
- [ ] Added `@Convert(converter = AttributeEncryptor.class)` to `Document.java`
- [ ] Created `EncryptionServiceTest.java` and ran `./gradlew test` or `./mvnw test`
