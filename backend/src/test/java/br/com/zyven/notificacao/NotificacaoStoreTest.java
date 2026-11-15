package br.com.zyven.notificacao;

import br.com.zyven.notificacao.infrastructure.NotificacaoStore;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class NotificacaoStoreTest {
    @Autowired NotificacaoStore store;

    @Test
    void registraAguaEConfiguraMetaDiaria() {
        int antes = store.preferencias().aguahoje();
        assertThat(store.beberAgua(500).aguahoje()).isEqualTo(antes + 500);
        assertThat(store.definirMeta(new BigDecimal("125.50")).metadiaria()).isEqualByComparingTo("125.50");
    }
}
