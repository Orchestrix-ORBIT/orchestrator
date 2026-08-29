package com.example.core_api.notification;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @GetMapping
    public List<Notification> getNotifications() {
        return notificationRepository.findAllByOrderByCreatedAtDesc();
    }

    @PatchMapping("/read-all")
    public void markAllRead() {
        List<Notification> notifs = notificationRepository.findAll();
        notifs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifs);
    }

    @PatchMapping("/{id}/read")
    public void toggleRead(@PathVariable java.util.UUID id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(!n.isRead());
            notificationRepository.save(n);
        });
    }
}
