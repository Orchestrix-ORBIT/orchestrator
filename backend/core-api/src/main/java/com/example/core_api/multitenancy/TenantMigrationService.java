@Service
@RequiredArgsConstructor
public class TenantMigrationService {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    /**
     * Creates a new PostgreSQL schema and applies all tenant migrations.
     * Called once during tenant provisioning.
     */
    public void provisionTenantSchema(String schemaName) {
        try (Connection conn = DriverManager.getConnection(
                datasourceUrl, datasourceUsername, datasourcePassword)) {

            // 1. Create the schema
            conn.createStatement()
                .execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

            // 2. Grant app role access to new schema
            conn.createStatement()
                .execute("GRANT ALL ON SCHEMA " + schemaName + " TO orchestrix_app");

        } catch (SQLException e) {
            throw new RuntimeException("Failed to create schema: " + schemaName, e);
        }

        // 3. Run Flyway migrations against the new schema
        Flyway flyway = Flyway.configure()
            .dataSource(datasourceUrl, datasourceUsername, datasourcePassword)
            .schemas(schemaName)
            .locations("classpath:db/tenant")   // ← Uses tenant template migrations
            .baselineOnMigrate(true)
            .load();

        flyway.migrate();
    }
}
