-- Add project_id to resource_bookings table
ALTER TABLE resource_bookings
ADD COLUMN project_id UUID;
