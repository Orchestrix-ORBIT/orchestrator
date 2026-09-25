# Realtime service tests

Run the suite from `backend/realtime-service`:

```bash
./mvnw test
```

The unit tests cover chat persistence and pagination behavior with mocked repositories, controller responses and STOMP broadcasts with a mocked messaging template, tenant header handling and cleanup, tenant identifier fallback, and JDBC connection schema selection and release. `RealtimeServiceApplicationTests` verifies that the Spring context starts.

The context startup test is not a database integration test. Hibernate may log a PostgreSQL connection failure while the test still passes. The opt-in `ChatDatabaseIT` and `ChatStompIT` now verify database persistence and live SockJS/STOMP delivery against an isolated PostgreSQL container. `ChatStompIT` checks that messages with the same project ID route to separate tenant topics and schemas. Subscription authorization remains untested and is not currently enforced.
