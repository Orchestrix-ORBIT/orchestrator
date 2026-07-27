package com.example.core_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// @SpringBootApplication is a shortcut for 3 annotations combined:
//   @Configuration        — this class can define Spring beans
//   @EnableAutoConfiguration — Spring Boot auto-configures JPA, datasource, Flyway, etc.
//   @ComponentScan        — scans all classes under com.example.core_api for @Component, @Service, @Repository, etc.
//
// This is the ENTRY POINT of the app. The JVM starts here.
@SpringBootApplication
public class CoreApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoreApiApplication.class, args);
    }
}
