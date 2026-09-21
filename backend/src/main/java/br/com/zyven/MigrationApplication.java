package br.com.zyven;

import javax.sql.DataSource;

import org.flywaydb.core.Flyway;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

public class MigrationApplication {

    public static void main(String[] args) {
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(ZyvenApplication.class)
                .web(WebApplicationType.NONE)
                .bannerMode(Banner.Mode.OFF)
                .properties("spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=none")
                .run(args)) {
            DataSource dataSource = context.getBean(DataSource.class);
            Flyway.configure().dataSource(dataSource).load().migrate();
        }
    }
}
