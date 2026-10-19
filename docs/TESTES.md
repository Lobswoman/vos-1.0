# Relatório de testes — Sprint 1

Execução em 19/10/2026. Ambiente real: Linux, Node.js 24.19.0, Express 5.1.0, SQLite nativo do Node e Chromium 154.0.8037.57 controlado por Playwright 1.56.1. Nenhuma execução foi feita no Windows ou em aparelho físico. Todos os bancos dos testes são temporários e descartados; o banco fornecido para demonstração permanece sem reservas.

## Resultado consolidado

- `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` e `npm run db:init`: APROVADO; instalação pelo lockfile e inicialização repetível.
- `npm test`: **23 testes aprovados, 0 reprovados, 0 ignorados**. O número é de casos automatizados; vários cobrem mais de um ID acadêmico.
- `VOS_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`: APROVADO nos escopos descritos abaixo. Sem erros JavaScript/CSP inesperados e sem requisições externas no fluxo completo.
- Desktop 1440×1000 e celular emulado Pixel 7 412×839: jornada completa, captura de assinatura, pagamento pendente, voucher, reload e ocupação indisponível após conclusão.
- Notebook 1366×768 e tablet 768×1024: mapa e layout sem rolagem horizontal indevida. Não se afirma execução integral da jornada nesses dois formatos.
- Cenários adicionais: rascunho após atualizar, retorno para edição, viagem inexistente, API indisponível e perda deliberada da resposta após gravação seguida de reenvio idempotente.

## Matriz T01–T24

As situações APROVADO referem-se ao procedimento efetivamente executado nesta tabela, com as limitações indicadas. Os procedimentos são reproduzíveis nas suítes `tests/api.test.js` e `tests/browser.js`.

| ID | Funcionalidade | Procedimento executado | Resultado esperado | Resultado obtido | Situação | Observações |
|---|---|---|---|---|---|---|
| T01 | Excursão | GET viagens e início no navegador | Dados do SQLite, sem duplicação de seed | Excursão Montes Claros → Barretos e 44 vagas | APROVADO | Ausência/erro de carga também exercitados |
| T02 | 44 poltronas | GET assentos e contagem DOM | Exatamente 44 | API e mapa com 44 | APROVADO | Desktop, notebook, tablet e celular emulado |
| T03 | Assento livre | Clique e seleção por teclado/Enter | Estado selecionado e possibilidade de avançar | Seleção indicada e fluxo habilitado | APROVADO | Seleção temporária não grava banco |
| T04 | Assento ocupado | Concluir reserva e voltar ao mapa | Poltrona desabilitada | Ocupada, desabilitada no DOM e rejeitada pela API | APROVADO | Cliente e servidor |
| T05 | Máximo cinco | Selecionar 1→2→6→5→9 e tentar 10; POST de seis | Cinco válidas, sexta bloqueada | Limite preservado na UI e 422 na API | APROVADO | Cinco passageiros geram cinco códigos únicos |
| T06 | Consecutividade | Tentar 1 e 3; validar lacuna/duplicata/fora de faixa | Sequência inválida bloqueada | Erro claro e nenhuma gravação | APROVADO | Caminho proposto no README |
| T07 | Adulto | Cadastro fictício válido e POST | Cadastro associado ao assento | Nome e poltrona corretos no voucher | APROVADO | Snapshot pessoal no SQLite |
| T08 | Menor com responsável | Data 2015-05-20, responsável válido, fluxo celular | Exigir e persistir responsável | Campos aparecem e reserva é concluída | APROVADO | Idade na data da partida |
| T09 | Menor sem responsável | POST sem campos legais | 422 e zero registros | Rejeição sem registros parciais | APROVADO | Campos required também definidos na interface |
| T10 | CPF inválido | CPF repetitivo inválido e CPFs iguais na reserva | Bloquear | Erro na interface e 422 no servidor | APROVADO | Validação matemática, não identidade civil |
| T11 | Bagagem | Avançar sem checkbox; POST sem aceite/versão antiga | Bloqueio | Alerta na UI e 422 na API | APROVADO | Versão e data persistidas em conclusão válida |
| T12 | Assinatura mouse | Desenhar, limpar, redesenhar e concluir | Captura e persistência PNG | Reserva aceita e imagem verificada pela API | APROVADO | Chromium desktop |
| T13 | Assinatura toque | Eventos touch via CDP no celular emulado | Traço aceito e persistido | Fluxo completo aprovado | APROVADO | Toque emulado; aparelho físico não executado |
| T14 | Assinatura vazia | Canvas vazio e POST com PNG transparente/Base64 inválido | Rejeição | Alerta e 422; versão antiga também bloqueada | APROVADO | Verificação real de pixels no servidor |
| T15 | Forma de pagamento | Escolher PIX e concluir | Forma vinculada ao grupo | PIX persistido e exibido | APROVADO | Sem cobrança real |
| T16 | Pagamento pendente | Consultar tabela e voucher | PENDENTE e total do servidor | PENDENTE; total de 20000 centavos por pessoa | APROVADO | Cinco passageiros totalizam 100000 centavos |
| T17 | Reserva válida | Fluxo completo e inspeção das seis tabelas | Gravação integrada | Uma reserva com vínculos completos | APROVADO | Desktop e celular emulado |
| T18 | Voucher | Consulta Bearer, reload e PDF | Nomes, poltronas, códigos e financeiro corretos | Voucher consistente; PDF A4 gerado | APROVADO | Sem CPF/assinatura no retorno; chave incorreta recebe 404 |
| T19 | Persistência | Fechar HTTP e banco, reabrir o mesmo arquivo | Ocupação e códigos mantidos | Mesmo voucher e poltrona ocupada, sem duplicação | APROVADO | Reinício real em banco de teste, não simulação com storage |
| T20 | Dupla reserva | Dois POSTs para mesma poltrona | Primeiro 201, segundo 409 | Uma única reserva | APROVADO | Restrição SQL e reconsulta |
| T21 | Conflito simultâneo | Promise.all com dois POSTs diferentes para mesmo lugar | Uma confirmação e um conflito | Status [201,409], seis tabelas consistentes | APROVADO | Mesma instância HTTP, requisições simultâneas |
| T22 | Erro de banco | Trigger aborta inserção de pagamento | Rollback integral | Zero linhas nas seis tabelas; recuperação após remover trigger | APROVADO | Falha induzida somente no banco descartável |
| T23 | Tela celular | Jornada Pixel 7 emulado; screenshots e largura DOM | Mapa utilizável sem corte horizontal | Fluxo completo concluído sem overflow | APROVADO | Não comprova ergonomia em aparelho físico |
| T24 | Teclado e mensagens | Tab/Enter na seleção, foco e role alert em erros | Seleção acionável e mensagens expostas | Seleção/desmarcação por Enter; erros com foco e alerta | APROVADO | Auditoria com leitor de tela e assinatura sem ponteiro não executadas |

## Verificações adicionais de integridade e segurança

A suíte verifica hash/chave de acesso, idempotência do mesmo payload, rejeição do payload alterado com chave consumida, proteção de origem/Host, CSP sem `unsafe-inline`, rejeição de nome com script, SQL parametrizado com ID malformado, datas inexistentes/futuras, fronteira do aniversário de 18 anos e validação preliminar sem gravar. Perda deliberada de resposta após commit retorna a mesma reserva ao reenviar; atualizar o voucher não faz novo POST.

O teste de XSS não constitui pentest completo. O teste de concorrência cobre requisições simultâneas na instância local; não é teste de carga distribuída. Nenhum pagamento, identidade ou requisito legal foi certificado.

## Desempenho e recursos

Comando `npm run verify:runtime`, servidor em processo Node separado, base temporária e 30 GETs sequenciais do mapa, sem concorrência ou carga externa:

- Mediana da consulta completa: **2,27 ms**.
- Máximo observado: **47,29 ms** (inclui aquecimento).
- RSS do processo do servidor após as consultas: **45,73 MiB**.
- Front-end mais banco temporário e arquivos SQLite: **111.164 bytes**, abaixo de 50 MB.
- Fluxo de finalização no navegador (última execução): **122 ms** desktop e **71 ms** celular emulado, medidos do clique até a presença do voucher. No desktop essa medição inclui a consulta da reserva idempotente após a resposta perdida, não uma segunda criação.

Resultados são observações deste ambiente, abaixo do objetivo proposto de dois segundos e dos limites de 128 MB/50 MB. Não garantem pico de memória sob carga ou crescimento ilimitado do banco: assinaturas e reservas aumentam o armazenamento. `node_modules`, navegador de teste e documentação não entram no limite de front-end+banco. JSONs brutos estão em `docs/evidencias/`.

## Checklist de homologação manual pendente

| Item | Procedimento proposto | Esperado | Obtido | Situação |
|---|---|---|---|---|
| Windows/VS Code | Instalar Node 24, npm ci, npm start e percorrer jornada | Mesmo comportamento local | Não há máquina Windows disponível nesta execução | NÃO EXECUTADO |
| Celular físico | Avaliar toque, rotação, zoom, teclado e assinatura em aparelho real | Campos/mapa/assinatura utilizáveis | Somente emulação Chromium executada | NÃO EXECUTADO |
| Impressora física | Abrir voucher, Ctrl+P e imprimir A4 | Sem cortes e com códigos legíveis | PDF A4 gerado; papel não impresso | NÃO EXECUTADO |
| Leitor de tela | Percorrer etapas com NVDA/VoiceOver e conferir mensagens | Contexto e erros compreensíveis | Inspeção/teclado automatizados não substituem leitor real | NÃO EXECUTADO |
| Aprovação operacional/jurídica | PO revisar planta, consecutividade, contrato e bagagem | Regras/textos aprovados para uso pretendido | Conteúdo marcado provisório | NÃO EXECUTADO |

Não há testes reprovados conhecidos ao final das suítes executadas. Essa afirmação se limita aos testes listados; os itens acima permanecem pendentes.

## Evidências e reprodução

- `docs/evidencias/desktop-home.png`: início do portal com dados fictícios.
- `docs/evidencias/mobile-seats.png`: mapa no celular emulado, incluindo lugar ocupado.
- `docs/evidencias/voucher-demonstracao.pdf`: voucher emitido pelo navegador em banco de teste já descartado.
- `docs/evidencias/browser-results.json` e `runtime-results.json`: metadados da execução efetiva.
- `artifacts/` é gerado localmente nas novas execuções e fica fora do Git.

Para repetir: `npm ci`, `npm test`, instalar Chromium por Playwright ou informar `VOS_CHROMIUM_PATH`, e executar `npm run test:e2e`. Para medir recursos, interrompa o servidor da porta 3000 e execute `npm run verify:runtime`. Os testes não alteram os dados de demonstração.
