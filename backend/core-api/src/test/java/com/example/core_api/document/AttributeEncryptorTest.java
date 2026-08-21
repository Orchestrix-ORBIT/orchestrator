package com.example.core_api.document;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AttributeEncryptorTest {

    private static final String SECRET_KEY = "12345678901234567890123456789012";
    private AttributeEncryptor attributeEncryptor;

    @BeforeEach
    void setUp() {
        EncryptionService encryptionService = new EncryptionService(SECRET_KEY);
        attributeEncryptor = new AttributeEncryptor(encryptionService);
    }

    @Test
    void testConvertToDatabaseColumnAndEntityAttribute() {
        String plainText = "Secret Proposal Content";

        String dbData = attributeEncryptor.convertToDatabaseColumn(plainText);
        assertNotNull(dbData);
        assertNotEquals(plainText, dbData);

        String restoredText = attributeEncryptor.convertToEntityAttribute(dbData);
        assertEquals(plainText, restoredText);
    }

    @Test
    void testNullHandling() {
        assertNull(attributeEncryptor.convertToDatabaseColumn(null));
        assertNull(attributeEncryptor.convertToEntityAttribute(null));
    }
}
