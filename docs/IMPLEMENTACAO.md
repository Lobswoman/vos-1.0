# Registro de implementação e rastreabilidade

Sprint 1: 06/10/2026 a 06/11/2026 — 21 Story Points. Implementação desenvolvida a partir dos documentos fornecidos e do pedido de desenvolvimento, preservando códigos e estimativas. Não foram criados commits ou alterados status do projeto GitHub; os arquivos estão disponíveis para revisão no checkout.

| História | Responsável acadêmico | SP | Requisitos | Arquivos/componentes principais | Verificação |
|---|---|---|---|---|---|
| US01 — Informações da excursão | Victória Fonseca Souza | 2 | FR1 | `public/js/app.js`: `boot`, `home`; `src/app.js`: GET viagens; `database/demo.json`, `database/init.js` | T01; navegador e estados sem viagem/API indisponível |
| US02 — Assentos | Victória Fonseca Souza | 5 | FR2–FR4 | `app.js`: `seatPage`; `public/js/domain.js`: `consecutive`; API de assentos e índice único em `database/schema.sql` | T02–T06, T19–T21, T23 |
| US03 — Passageiros e responsável | Athos Almeida Lima Fagundes | 5 | FR5–FR6 | `app.js`: `peoplePage`, `capturePeople`; `src/rules.js`; regras CPF/idade compartilhadas; tabelas passageiros e vínculo | T07–T10, ida/volta entre etapas e recuperação do rascunho |
| US04 — Bagagem | Higor Gabriel Soares Damasceno | 1 | FR7 | `app.js`: `baggagePage`; validação, tabela `aceites_bagagem`, versão `bagagem-demo-1` | T11 e fluxo completo |
| US05 — Assinatura | Higor Gabriel Soares Damasceno | 3 | FR8 | `app.js`: `contractPage`, `setupCanvas`, `saveSignature`; `src/rules.js`: `validSignature`; tabela contratos | T12–T14, captura mouse/toque emulado |
| US06 — Forma de pagamento | Rayssa Soares Maia | 2 | FR9 | `app.js`: `paymentPage`; validação e tabela pagamentos | T15–T16, total calculado no servidor |
| US07 — Reserva e voucher | Rayssa Soares Maia | 3 | FR10–FR11 | `app.js`: `reviewPage`, `submit`, `showVoucher`; `src/app.js`: POST e GET voucher; transação SQL | T17–T22, recuperação e impressão/PDF |

`public/css/style.css` oferece identidade visual, responsividade, foco visível, redução de animação e CSS A4. `public/index.html` define landmarks, idioma e alertas. `server.js`, `database/init.js` e `scripts/` oferecem inicialização e suporte de demonstração.

## Critérios e limites

As histórias foram implementadas e verificadas no escopo descrito no relatório. Responsáveis acima são os nomes previstos no planejamento acadêmico, não uma alegação de autoria individual deste código. Não foram implementadas US08–US14 nem as funções administrativas das próximas Sprints. A separação futura de guia e administrador continua dependendo da modelagem de autenticação.

Termos/contrato, geometria do mapa e consecutividade são propostas para demonstração. A homologação presencial em Windows, aparelho físico, leitor de tela e impressora permanece não executada.
