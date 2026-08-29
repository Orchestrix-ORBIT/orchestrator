package com.example.core_api.document;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter for transparent field-level encryption of entity attributes.
 *
 * Automatically converts entity fields (plain text) to database columns (ciphertext Base64)
 * on persist/update, and converts database columns (ciphertext Base64) back to entity
 * fields (plain text) on fetch.
 */
@Converter
@Component
public class AttributeEncryptor implements AttributeConverter<String, String> {

    private static EncryptionService staticEncryptionService;

    private final EncryptionService encryptionService;

    @Autowired
    public AttributeEncryptor(EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
        staticEncryptionService = encryptionService;
    }

    /**
     * No-args constructor fallback for JPA providers initializing converters
     * outside standard Spring IoC bean lifecycle.
     */
    public AttributeEncryptor() {
        this.encryptionService = staticEncryptionService;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        EncryptionService service = getEncryptionService();
        return service != null ? service.encrypt(attribute) : attribute;
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        EncryptionService service = getEncryptionService();
        if (service == null) {
            return dbData;
        }
        try {
            return service.decrypt(dbData);
        } catch (Exception e) {
            // Fallback safely to raw string if dbData is unencrypted legacy text or invalid cipher
            return dbData;
        }
    }

    private EncryptionService getEncryptionService() {
        return encryptionService != null ? encryptionService : staticEncryptionService;
    }
}
