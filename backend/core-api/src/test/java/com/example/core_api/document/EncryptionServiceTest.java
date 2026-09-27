package com.example.core_api.document;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EncryptionServiceTest {

    private static final String VALID_32_BYTE_KEY = "My32ByteSuperSecretKeyForAES256!";
    private EncryptionService encryptionService;

    @BeforeEach
    void setUp() {
        encryptionService = new EncryptionService(VALID_32_BYTE_KEY);
    }

    @Test
    void testEncryptAndDecryptSuccess() {
        String originalText = "Confidential Research Findings 2026";

        String encrypted = encryptionService.encrypt(originalText);
        assertNotNull(encrypted);
        assertNotEquals(originalText, encrypted);

        String decrypted = encryptionService.decrypt(encrypted);
        assertEquals(originalText, decrypted);
    }

    @Test
    void testUniqueIVPerEncryption() {
        String text = "Identical Text";

        String encrypted1 = encryptionService.encrypt(text);
        String encrypted2 = encryptionService.encrypt(text);

        // Random IV generation guarantees different ciphertexts for identical text
        assertNotEquals(encrypted1, encrypted2);

        // Both decrypt to identical plain text
        assertEquals(text, encryptionService.decrypt(encrypted1));
        assertEquals(text, encryptionService.decrypt(encrypted2));
    }

    @Test
    void testNullHandling() {
        assertNull(encryptionService.encrypt(null));
        assertNull(encryptionService.decrypt(null));
    }

    @Test
    void testInvalidKeyLengthConstructorThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> new EncryptionService("ShortKey"));
    }
}
