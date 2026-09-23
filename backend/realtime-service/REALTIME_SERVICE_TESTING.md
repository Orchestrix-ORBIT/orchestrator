# Realtime service tests

Run the suite from `backend/realtime-service`:

```bash
./mvnw test
```

The unit tests cover chat persistence and pagination behavior with mocked repositories, controller responses and STOMP broadcasts with a mocked messaging template, tenant header handling and cleanup, tenant identifier fallback, and JDBC connection schema selection and release. `RealtimeServiceApplicationTests` verifies that the Spring context starts.

The context startup test is not a database integration test. Hibernate may log a PostgreSQL connection failure while the test still passes. The unit tests use mocks and do not prove that chat messages can be saved to a real PostgreSQL schema or delivered through a live WebSocket connection. Those paths need an integration environment with PostgreSQL and a STOMP client.
