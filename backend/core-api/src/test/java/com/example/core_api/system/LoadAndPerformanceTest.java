package com.example.core_api.system;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class LoadAndPerformanceTest {

    @Autowired
    private DataSource dataSource;

    @Test
    public void testHikariCPConnectionPoolUnderLoad() throws InterruptedException, ExecutionException {
        int concurrentRequests = 100;
        ExecutorService executor = Executors.newFixedThreadPool(50);
        List<Callable<Long>> tasks = new ArrayList<>();

        for (int i = 0; i < concurrentRequests; i++) {
            tasks.add(() -> {
                long start = System.currentTimeMillis();
                // Simulate a fast database query by checking connection validity (measures HikariCP overhead)
                try (Connection conn = dataSource.getConnection()) {
                    boolean isValid = conn.isValid(2);
                    assertTrue(isValid, "Database connection should be valid");
                }
                return System.currentTimeMillis() - start;
            });
        }

        List<Future<Long>> futures = executor.invokeAll(tasks);

        long totalDuration = 0;
        long maxDuration = 0;
        for (Future<Long> future : futures) {
            long duration = future.get();
            totalDuration += duration;
            if (duration > maxDuration) {
                maxDuration = duration;
            }
        }

        long averageDuration = totalDuration / concurrentRequests;
        executor.shutdown();

        System.out.println("\n=== Load Testing & Performance Profiling Results ===");
        System.out.println("Concurrent DB Connections tested: " + concurrentRequests);
        System.out.println("HikariCP successfully managed the load without SocketTimeoutException.");
        System.out.println("Average DB Connection checkout time: " + averageDuration + "ms");
        System.out.println("Max DB Connection checkout time: " + maxDuration + "ms");
        System.out.println("====================================================\n");

        assertTrue(averageDuration < 2000, "HikariCP connection checkout average should be under 2000ms");
    }
}
