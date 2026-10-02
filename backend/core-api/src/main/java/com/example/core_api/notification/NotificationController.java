package com.example.core_api.notification;

import com.example.core_api.auth.User;
import com.example.core_api.exception.ResourceNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    // TenantFilter (Order=1) already sets TenantContext from X-Tenant-ID before any
    // controller method runs — no manual schema switching needed here.

    @GetMapping
    public List<Notification> getNotifications(@AuthenticationPrincipal User currentUser) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.getId());
    }

    @PatchMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal User currentUser) {
        List<Notification> notifs = notificationRepository.findAllByUserId(currentUser.getId());
        notifs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifs);
    }

    @PatchMapping("/{id}/read")
    public void toggleRead(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        Notification notification = notificationRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));
        notification.setRead(!notification.isRead());
        notificationRepository.save(notification);
    }
}
