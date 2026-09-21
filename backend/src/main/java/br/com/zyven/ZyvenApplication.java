package br.com.zyven;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ZyvenApplication {

    public static void main(String[] args) {
        SpringApplication.run(ZyvenApplication.class, args);
    }
}
