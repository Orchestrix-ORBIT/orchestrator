package com.example.core_api.resource;

import com.example.core_api.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceBookingRepository bookingRepository;

    public ResourceService(ResourceRepository resourceRepository, ResourceBookingRepository bookingRepository) {
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
    }

    public ResourceResponse createResource(CreateResourceRequest request, UUID ownerId) {
        Resource resource = Resource.builder()
                .name(request.getName())
                .type(request.getType())
                .description(request.getDescription())
                .ownerId(ownerId)
                .status(ResourceStatus.AVAILABLE)
                .metadata(request.getMetadata())
                .build();
                
        resource = resourceRepository.save(resource);
        return mapToResourceResponse(resource);
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> getAllResources(ResourceType type, ResourceStatus status) {
        List<Resource> resources;
        if (type != null) {
            resources = resourceRepository.findAllByType(type);
        } else if (status != null) {
            resources = resourceRepository.findAllByStatus(status);
        } else {
            resources = resourceRepository.findAll();
        }
        
        return resources.stream().map(this::mapToResourceResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ResourceResponse getResourceById(UUID id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        return mapToResourceResponse(resource);
    }

    public BookingResponse createBooking(UUID resourceId, CreateBookingRequest request, UUID userId) {
        if (request.getEndTime().isBefore(request.getStartTime()) || request.getEndTime().isEqual(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be strictly after start time");
        }
        
        if (!resourceRepository.existsById(resourceId)) {
            throw new ResourceNotFoundException("Resource not found with id: " + resourceId);
        }

        List<ResourceBooking> overlappingBookings = bookingRepository.findOverlappingBookings(
                resourceId, request.getStartTime(), request.getEndTime());

        if (!overlappingBookings.isEmpty()) {
            throw new IllegalStateException("Resource is already booked during the requested time period");
        }

        ResourceBooking booking = ResourceBooking.builder()
                .resourceId(resourceId)
                .userId(userId)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(BookingStatus.PENDING_APPROVAL)
                .purpose(request.getPurpose())
                .build();
                
        booking = bookingRepository.save(booking);
        return mapToBookingResponse(booking);
    }

    public BookingResponse updateBookingStatus(UUID bookingId, BookingStatus newStatus) {
        ResourceBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
                
        booking.setStatus(newStatus);
        booking = bookingRepository.save(booking);
        return mapToBookingResponse(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(UUID userId) {
        return bookingRepository.findAllByUserId(userId).stream()
                .map(this::mapToBookingResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsForResource(UUID resourceId) {
        return bookingRepository.findAllByResourceId(resourceId).stream()
                .map(this::mapToBookingResponse)
                .collect(Collectors.toList());
    }

    private ResourceResponse mapToResourceResponse(Resource resource) {
        return ResourceResponse.builder()
                .id(resource.getId())
                .name(resource.getName())
                .type(resource.getType())
                .description(resource.getDescription())
                .ownerId(resource.getOwnerId())
                .status(resource.getStatus())
                .createdAt(resource.getCreatedAt())
                .build();
    }
    
    private BookingResponse mapToBookingResponse(ResourceBooking booking) {
        return BookingResponse.builder()
                .id(booking.getId())
                .resourceId(booking.getResourceId())
                .userId(booking.getUserId())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .status(booking.getStatus())
                .purpose(booking.getPurpose())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
