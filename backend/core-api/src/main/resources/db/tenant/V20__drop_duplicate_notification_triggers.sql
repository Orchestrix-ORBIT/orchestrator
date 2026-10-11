-- Task-assignment and booking-status notifications are created by the application
-- (TaskService, ResourceService) with specific messages and recipients. The V18 triggers
-- inserted a second, generic notification for the same events, so they are removed.
DROP TRIGGER IF EXISTS trigger_task_assignment ON tasks;
DROP TRIGGER IF EXISTS trigger_booking_status ON resource_bookings;
DROP FUNCTION IF EXISTS notify_task_assignment();
DROP FUNCTION IF EXISTS notify_booking_status();
