package br.com.zyven;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

public class MigrationApplication {

    public static void main(String[] args) {
        System.setProperty("spring.flyway.enabled", "false");
        System.setProperty("spring.jpa.hibernate.ddl-auto", "none");
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(ZyvenApplication.class)
                .web(WebApplicationType.NONE)
                .bannerMode(Banner.Mode.OFF)
                .run(args)) {
            DataSource dataSource = context.getBean(DataSource.class);
            Flyway.configure().dataSource(dataSource).load().migrate();
        } finally {
            System.clearProperty("spring.flyway.enabled");
            System.clearProperty("spring.jpa.hibernate.ddl-auto");
        }
    }
}
