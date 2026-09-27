# MinIO Object Storage Integration Guide

This guide outlines the step-by-step procedure for integrating **MinIO Object Storage** into the `core-api` backend service for handling file uploads, downloads, and object life-cycle management.

---

## 🏗️ Architecture & Storage Strategy

### 1. Separation of Metadata and Binary Content
* **PostgreSQL Database (`public.documents` or tenant schemas)**: Stores document metadata (`id`, `title`, `project_id`, `author_id`, `file_storage_key`, `created_at`, `version`).
* **MinIO Object Storage**: Stores the binary file payloads (e.g. PDFs, images, dataset exports).

### 2. Multi-Tenant Key Hierarchy (Object Storage Paths)
To enforce multi-tenant separation in MinIO, all object keys follow a structured path convention:

```text
{tenant_slug}/{project_id}/{document_id}/{filename}
```

* **Example**: `acme-corp/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/f47ac10b-58cc-4372-a567-0e02b2c3d479/research_paper.pdf`

---

## 📋 Implementation Checklist

- [ ] **Step 1: Dependency & Environment Setup**
- [ ] **Step 2: Spring Boot Configuration Bean (`MinioConfig.java`)**
- [ ] **Step 3: Storage Service Implementation (`MinioStorageService.java`)**
- [ ] **Step 4: Update Document Service & Controllers (`DocumentService.java`, `DocumentController.java`)**
- [ ] **Step 5: Integration Testing & Manual Verification**

---

## Step 1: Dependencies & Configuration

### 1.1 Add MinIO Java SDK to `backend/core-api/pom.xml`

Add the official MinIO Java client dependency inside `<dependencies>`:

```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>
```

### 1.2 Update Environment File (`backend/.env`)

Add MinIO connection parameters to `.env`:

```env
# MinIO Object Storage Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=orchestrator_admin
MINIO_SECRET_KEY=orchestrator_password
MINIO_BUCKET_NAME=orchestrator-documents
```

*(Also add these placeholder keys to `backend/.env.example`)*.

### 1.3 Update `backend/core-api/src/main/resources/application.yml`

Map the environment variables to Spring configuration properties without hardcoding secrets:

```yaml
minio:
  endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
  access-key: ${MINIO_ACCESS_KEY}
  secret-key: ${MINIO_SECRET_KEY}
  bucket-name: ${MINIO_BUCKET_NAME:orchestrator-documents}
```

---

## Step 2: Create MinIO Client Configuration (`MinioConfig.java`)

Create the configuration class at:  
`backend/core-api/src/main/java/com/example/core_api/config/MinioConfig.java`

```java
package com.example.core_api.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Bean
    public MinioClient minioClient() throws Exception {
        MinioClient client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();

        // Ensure default bucket exists on startup
        boolean found = client.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!found) {
            client.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
        }

        return client;
    }
}
```

---

## Step 3: Create Storage Service Layer (`MinioStorageService.java`)

Define a clean storage service interface and MinIO implementation:

### 3.1 Interface (`FileStorageService.java`)
`backend/core-api/src/main/java/com/example/core_api/document/FileStorageService.java`

```java
package com.example.core_api.document;

import java.io.InputStream;

public interface FileStorageService {
    String uploadFile(String objectKey, InputStream inputStream, String contentType, long size);
    InputStream downloadFile(String objectKey);
    void deleteFile(String objectKey);
    String generatePresignedUrl(String objectKey, int expiryMinutes);
}
```

### 3.2 Implementation (`MinioStorageService.java`)
`backend/core-api/src/main/java/com/example/core_api/document/MinioStorageService.java`

```java
package com.example.core_api.document;

import io.minio.*;
import io.minio.http.Method;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;

@Service
public class MinioStorageService implements FileStorageService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    public MinioStorageService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    @Override
    public String uploadFile(String objectKey, InputStream inputStream, String contentType, long size) {
        try {
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .stream(inputStream, size, -1)
                    .contentType(contentType)
                    .build()
            );
            return objectKey;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to MinIO: " + e.getMessage(), e);
        }
    }

    @Override
    public InputStream downloadFile(String objectKey) {
        try {
            return minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to download file from MinIO: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String objectKey) {
        try {
            minioClient.removeObject(
                RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectKey)
                    .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete file from MinIO: " + e.getMessage(), e);
        }
    }

    @Override
    public String generatePresignedUrl(String objectKey, int expiryMinutes) {
        try {
            return minioClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucketName)
                    .object(objectKey)
                    .expiry(expiryMinutes, TimeUnit.MINUTES)
                    .build()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate presigned URL: " + e.getMessage(), e);
        }
    }
}
```

---

## Step 4: Integrate with Document REST API

### 4.1 Update `DocumentService.java`
Add file upload & download business logic:

1. **`uploadDocumentFile(UUID projectId, UUID authorId, MultipartFile file)`**:
   - Generates object key: `{tenantId}/{projectId}/{documentId}/{filename}`.
   - Calls `fileStorageService.uploadFile(...)`.
   - Creates and saves a new `Document` entity with `fileStorageKey`.

2. **`downloadDocumentFile(UUID documentId)`**:
   - Fetches `Document` entity by ID.
   - Retrieves file stream via `fileStorageService.downloadFile(document.getFileStorageKey())`.

3. **`deleteDocument(UUID projectId, UUID documentId)`**:
   - Deletes object from MinIO if `fileStorageKey != null`.
   - Deletes record from PostgreSQL database.

### 4.2 Update `DocumentController.java`

Expose file endpoints:

* **Upload File**:
  `POST /api/projects/{projectId}/documents/upload`  
  Accepts: `@RequestParam("file") MultipartFile file`, `@RequestParam("title") String title`

* **Download File (Stream)**:
  `GET /api/projects/{projectId}/documents/{documentId}/download`  
  Returns: `ResponseEntity<Resource>` with `Content-Disposition` header.

* **Presigned Download URL**:
  `GET /api/projects/{projectId}/documents/{documentId}/presigned-url`  
  Returns temporary URL string.

---

## Step 5: Verification & Testing Plan

### 1. Infrastructure Check
Start MinIO using Docker Compose:
```bash
docker compose up -d minio
```
Access MinIO Console at `http://localhost:9001` (User: `orchestrator_admin` / Pass: `orchestrator_password`).

### 2. Manual cURL Testing

#### Upload File:
```bash
curl -X POST "http://localhost:8080/api/projects/{projectId}/documents/upload" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/sample.pdf" \
  -F "title=Sample PDF Document"
```

#### Download File:
```bash
curl -X GET "http://localhost:8080/api/projects/{projectId}/documents/{documentId}/download" \
  -H "Authorization: Bearer <TOKEN>" \
  --output downloaded_sample.pdf
```

#### Delete Document & File:
```bash
curl -X DELETE "http://localhost:8080/api/projects/{projectId}/documents/{documentId}" \
  -H "Authorization: Bearer <TOKEN>"
```
