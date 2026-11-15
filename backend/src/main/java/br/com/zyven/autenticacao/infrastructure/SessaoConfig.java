package br.com.zyven.autenticacao.infrastructure;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
public class SessaoConfig {

    @Bean
    CookieSerializer cookieSerializer(@Value("${zyven.session.cookie.secure:${ZYVEN_SESSION_COOKIE_SECURE:false}}") boolean secure) {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("ZYVEN_SESSION");
        serializer.setCookieMaxAge(Math.toIntExact(Duration.ofDays(30).getSeconds()));
        serializer.setUseSecureCookie(secure);
        serializer.setSameSite("Strict");
        return serializer;
    }
}
