package com.example.core_api.exception;

public class ResourceBookingConflictException extends RuntimeException {
    public ResourceBookingConflictException(String message) {
        super(message);
    }
}
