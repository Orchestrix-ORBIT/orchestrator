package com.example.core_api.tenant;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

// @Entity tells Hibernate: "This class represents a database table row"
// @Table tells Hibernate which exact table and schema this entity maps to
@Entity
@Table(name = "tenants", schema = "public") // Maps to public.tenants created by V1__create_tenants.sql
@Data               // Lombok: generates getters, setters, equals, hashCode, toString
@Builder            // Lombok: enables Tenant.builder().slug("acme").name("ACME Corp").build()
@NoArgsConstructor  // Lombok with no arguments constructor
@AllArgsConstructor // Lombok with arguments constructor
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // PostgreSQL auto-generates a UUID primary key
    private UUID id;

    // The short unique identifier used in URLs and the X-Tenant-ID header
    // e.g., "acme", "research-lab"
    @Column(nullable = false, unique = true, length = 63)
    private String slug;

    // Human-readable display name: "ACME Corp", "Research Lab"
    @Column(nullable = false, length = 255)
    private String name;

    // The PostgreSQL schema name: "org_acme", "org_research_lab"
    // Derived from slug during provisioning
    @Column(name = "schema_name", nullable = false, unique = true, length = 63)
    private String schemaName;

    // @Enumerated(STRING) stores "ACTIVE" in the DB instead of ordinal number 1
    // This makes the DB column human-readable and safe if enum order changes
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TenantStatus status;

    // Automatically set to current timestamp when the entity is first saved
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // Automatically updated to current timestamp whenever the entity is saved/updated
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
