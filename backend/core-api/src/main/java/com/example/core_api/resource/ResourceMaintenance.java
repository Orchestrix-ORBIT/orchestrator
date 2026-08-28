package com.example.core_api.resource;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "resource_maintenance")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ResourceMaintenance {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(name = "asset_name", nullable = false)
    private String assetName;

    private String category;

    @Column(name = "start_date")
    private String startDate;

    @Column(name = "end_date")
    private String endDate;

    @Column(name = "downtime_type")
    private String downtimeType;

    private String technician;

    @Builder.Default
    private String status = "Scheduled";

    private String notes;

    @Column(name = "created_at")
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
