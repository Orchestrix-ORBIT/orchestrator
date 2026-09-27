package com.example.core_api.project;

import com.example.core_api.auth.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class ProjectAccessInterceptor implements HandlerInterceptor {
    private static final Pattern PROJECT_PATH = Pattern.compile("^/api/(?:projects|chat/projects)/([0-9a-fA-F-]{36})(?:/.*)?$");
    private final ProjectRepository projects;
    private final ProjectAccess access;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Matcher matcher = PROJECT_PATH.matcher(request.getRequestURI());
        if (!matcher.matches()) return true;
        UUID projectId;
        try {
            projectId = UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException malformed) {
            return true;
        }
        if (!projects.existsById(projectId)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return false;
        }
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (!(principal instanceof User user) || !access.canAccess(user, projectId)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return false;
        }
        return true;
    }
}
