package com.example.core_api.auth;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Brute-force protection (SRS FR-AUTH-10).
// After MAX_FAILURES consecutive failed logins for the same tenant + email, the account
// is locked for LOCK_DURATION. A successful login clears the counter.
// State is kept in memory: it resets when Core API restarts and is per instance.
@Component
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private record Attempts(int failures, Instant lockedUntil) {}

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    private static String key(String tenant, String email) {
        return tenant + "|" + (email == null ? "" : email.trim().toLowerCase());
    }

    /** Minutes left on the lock (rounded up), or 0 if the account is not locked. */
    public long minutesLocked(String tenant, String email) {
        Attempts a = attempts.get(key(tenant, email));
        if (a == null || a.lockedUntil() == null) return 0;
        Duration left = Duration.between(Instant.now(), a.lockedUntil());
        if (left.isNegative() || left.isZero()) {
            attempts.remove(key(tenant, email));
            return 0;
        }
        return Math.max(1, (left.toSeconds() + 59) / 60);
    }

    /** Records a failure and returns how many attempts remain before the lock (0 = now locked). */
    public int recordFailure(String tenant, String email) {
        Attempts updated = attempts.compute(key(tenant, email), (k, a) -> {
            int failures = (a == null ? 0 : a.failures()) + 1;
            Instant lockedUntil = failures >= MAX_FAILURES ? Instant.now().plus(LOCK_DURATION) : null;
            return new Attempts(failures, lockedUntil);
        });
        return Math.max(0, MAX_FAILURES - updated.failures());
    }

    public void recordSuccess(String tenant, String email) {
        attempts.remove(key(tenant, email));
    }
}
