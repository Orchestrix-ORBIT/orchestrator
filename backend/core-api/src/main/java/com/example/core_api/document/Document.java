package com.example.core_api.document;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(nullable = false)
    private String title;

    // Stored encrypted; null if the document is a file-based upload
    @Convert(converter = AttributeEncryptor.class)
    @Column(name = "content_encrypted", columnDefinition = "TEXT")
    private String contentEncrypted;

    // MinIO object key for file-based documents; null if content is inline
    @Column(name = "file_storage_key", length = 512)
    private String fileStorageKey;

    @Column(nullable = false)
    @Builder.Default
    private int version = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
