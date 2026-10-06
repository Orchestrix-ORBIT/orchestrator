-- ==============================================================================
-- Automated Notification Triggers
-- Automatically inserts into notifications table on specific actions
-- ==============================================================================

-- 1. Task Assignment Trigger
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- When a task is inserted with an assignee, or an assignee is updated to a new user
    IF NEW.assignee_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
            NEW.assignee_id,
            'TASK_ASSIGNED',
            'New Task Assigned',
            'You have been assigned to a task: ' || NEW.title
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_task_assignment ON tasks;
CREATE TRIGGER trigger_task_assignment
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_assignment();

-- 2. Resource Booking Status Update Trigger
CREATE OR REPLACE FUNCTION notify_booking_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When a resource booking status changes (e.g. Approved, Rejected, Completed)
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
            NEW.user_id,
            'BOOKING_UPDATE',
            'Resource Booking Updated',
            'Your booking status has changed to: ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_status ON resource_bookings;
CREATE TRIGGER trigger_booking_status
AFTER UPDATE ON resource_bookings
FOR EACH ROW
EXECUTE FUNCTION notify_booking_status();
