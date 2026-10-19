# Documento técnico — VOS 1.0 / Sprint 1

## Arquitetura e execução

Navegador → REST HTTP de mesma origem → Express 5 → serviço de validação → driver `node:sqlite` do Node 24 → SQLite `database.db`. `pngjs` decodifica a assinatura para validar conteúdo e CRC. Nenhuma dependência usa serviço remoto durante a operação. Playwright é dependência somente de desenvolvimento.

A arquitetura é intencionalmente pequena. `server.js` inicia o processo em `127.0.0.1:3000` e trata encerramento; `src/app.js` organiza rotas, segurança e a unidade transacional; `src/rules.js` valida o payload completo e a imagem; `public/js/domain.js` compartilha regras puras (CPF, idade, sequência, versões) entre cliente e servidor; `database/init.js` cuida da conexão e seed. `public/js/app.js` controla as etapas e a comunicação REST. Não há microserviços, autenticação administrativa ou classes vazias para camadas ainda desnecessárias.

## Fluxo e estado

Início → mapa → passageiros → bagagem → contrato → pagamento → revisão → voucher. Voltar mantém os dados. `sessionStorage` guarda apenas o rascunho da aba, incluindo assinatura temporária. SQLite é a autoridade para disponibilidade, reservas e vouchers. Atualizar durante o rascunho retorna ao início e mantém campos/seleção ainda disponíveis; não restaura automaticamente a etapa visual. Ao concluir com sucesso e carregar o voucher, o rascunho é apagado.

Alterações em passageiros, poltronas, bagagem ou nome do signatário invalidam a assinatura. Mudança na forma de pagamento exige nova confirmação de revisão. A assinatura é vinculada aos passageiros, poltronas, preço da viagem e versão do contrato; a forma de pagamento é uma intenção registrada separadamente. Campos antigos de poltronas removidas permanecem apenas no rascunho e não são enviados nem persistidos como passageiros da reserva.

O submit utiliza chave de idempotência UUID e uma chave de consulta de 256 bits geradas pelo navegador. O servidor guarda SHA-256 da chave de consulta e do payload. Se a resposta de gravação se perder, o mesmo payload/chave recebe a mesma reserva. Payload diferente com a chave já consumida recebe 409. O voucher é recuperado por fragmento de URL e Bearer; o fragmento não é enviado como caminho HTTP. Não existe pesquisa pública por CPF.

## Modelo relacional

A estrutura abaixo é uma **proposta técnica de implementação**, não transcrição literal do diagrama acadêmico original.

| Tabela | Responsabilidade e vínculos |
|---|---|
| `viagens_config` | Excursão, cidades, datas, capacidade fixa 44, preço em centavos e status |
| `reservas_viagem` | Grupo de venda, viagem, código único, hash de acesso, idempotência e data |
| `passageiros` | Snapshot dos dados pessoais e do responsável na contratação |
| `reserva_passageiros` | Liga reserva, viagem, passageiro, poltrona e código individual de embarque |
| `pagamentos` | Uma intenção por reserva, forma, valor do servidor e situação inicial PENDENTE |
| `contratos` | Uma assinatura por grupo, nome do signatário, PNG Base64, versão e data |
| `aceites_bagagem` | Aceite obrigatório, versão e data associados ao grupo |

Chaves estrangeiras habilitadas em cada conexão. A combinação `(viagem_id, numero_poltrona)` é única no banco; capacidade/poltrona possuem `CHECK`. Códigos, chaves de idempotência e relações 1:1 são únicos. Há índice para reservas por viagem. Os valores financeiros são inteiros em centavos calculados pelo servidor, nunca aceitos do cliente.

As duas flags de check-in em `reserva_passageiros` são apenas preparação estrutural. Não há cancelamento/inativação nesta entrega: todas as ocupações persistidas continuam ativas. Uma Sprint futura de cancelamento precisará migrar a modelagem de liberação de poltronas; não deverá simplesmente mudar `status` deixando a ocupação sem tratamento.

Schema inicial em `database/schema.sql`, versionado por `PRAGMA user_version=1`. Inicialização e seed usam `CREATE IF NOT EXISTS` e `INSERT OR IGNORE`. Não existe migração destrutiva automática nem alteração automática de reservas antigas. Mudanças futuras no schema deverão introduzir migrações numeradas.

## Integridade transacional

`POST /api/reservas` abre `BEGIN IMMEDIATE`, verifica idempotência, valida viagem e todos os dados, reconsulta poltronas e grava as seis tabelas relacionadas. Um único `COMMIT` confirma o grupo. Erro em qualquer gravação executa `ROLLBACK`, inclusive dos passageiros. A restrição de unicidade funciona como última barreira contra duas reservas da mesma poltrona. WAL e `busy_timeout=5000` permitem coordenação do SQLite entre conexões. O servidor usa driver síncrono, adequado à pequena execução local; não há promessa de escala pública.

Nenhuma poltrona é ocupada ao clicar no mapa. Em conflito, a API retorna 409 e a interface orienta a selecionar novamente. O preço é lido do banco e não pode ser alterado por payload adulterado. O configurador de demonstração bloqueia atualização de viagem com reservas existentes.

## Endpoints

| Método e rota | Resultado | Erros principais |
|---|---|---|
| `GET /api/viagens` | Lista, incluindo disponibilidade agregada | 500 em falha de banco |
| `GET /api/viagens/:id` | Dados de uma excursão | 404 ausente |
| `GET /api/viagens/:id/assentos` | 44 objetos `{numero, estado}` | 404 ausente, 409 indisponível/partida passada |
| `POST /api/reservas/validar` | `{valida:true}` sem gravar | 422 inválido, 409 conflito |
| `POST /api/reservas` | 201 `{codigoReserva}` ou 200 em repetição | 422 inválido, 409 conflito, 500 rollback |
| `GET /api/reservas/:codigo/voucher` | Reserva, viagem, nomes, códigos e pagamento | 404 sem chave válida ou inexistente |

POST recebe `viagemId`, `assentos`, `passageiros`, `aceiteBagagem`, `versaoTermos`, `assinatura`, `signatario`, `versaoContrato`, `formaPagamento`, `confirmacao`, `chaveIdempotencia`, `chaveAcesso`. Exemplo executável completo em `tests/api.test.js` (função `payload`). Voucher exige `Authorization: Bearer <chaveAcesso>`. Campos, erros e respostas são JSON; corpos acima de 300 KB são rejeitados. Não há credencial administrativa embutida.

## Regras operacionais propostas

- Mapa de 11 fileiras, dois lugares de cada lado. Caminho em zigue-zague `1,2,6,5,9,10,...` / `3,4,8,7,11,12,...`; até cinco posições contíguas de um único caminho. Escada/entrada e banheiro ficam fora das sequências. Aprovação da Product Owner pendente.
- Um passageiro por assento e CPF sem repetição no mesmo grupo. O mesmo passageiro pode contratar outra viagem; não há unicidade global de CPF.
- Nome completo, CPF válido, nascimento real e telefone com DDD são obrigatórios. E-mail/documento complementar são opcionais. São decisões de implementação para completar os campos não detalhados nos trabalhos.
- Idade na data civil de partida; nascimento futuro é bloqueado pela data atual de São Paulo. Menor precisa de nome completo, CPF e vínculo do responsável.
- Um signatário pelo grupo, com nome explícito. Não equivale a identificação civil verificada. Cada assinatura deve ser PNG válido, dentro de dimensões limitadas e com pelo menos 25 pixels visíveis de tinta; não valida autoria nem tem certificação criptográfica.
- Datas do aceite e assinatura são atribuídas pelo servidor no instante da confirmação; versões demonstrativas identificadas. A aplicação não alega registrar o instante exato de cada clique anterior.
- Todas as formas de pagamento geram situação PENDENTE. Nenhuma cobrança ou chave PIX real.

## Segurança e privacidade

SQL parametrizado; validação no servidor; HTML dinâmico escapado; nomes rejeitam marcadores HTML; campos são normalizados/limitados. Documentos opcionais continuam tratados como texto, sem execução. CSP com `script-src 'self'`, sem handlers inline, objetos ou frames; cabeçalhos `nosniff`, `no-referrer` e `frame-ancestors 'none'`. Sem CORS liberado. Host de loopback e origem de mesma instância são validados, reduzindo risco de escritas externas e DNS rebinding. APIs retornam `Cache-Control: no-store`. Erros de banco não expõem SQL ou dados pessoais. O servidor não registra corpos de requisição.

SQLite não é criptografado; o ambiente local deve ser protegido. O acesso privado do voucher é um segredo portador e deve ser guardado. O rascunho da aba não foi projetado para uso compartilhado sem cuidados. Não há recuperação de chave perdida, autenticação, autorização administrativa, retenção/LGPD completa ou proteção para implantação pública. Não expor túneis nem alterar o bind para `0.0.0.0`.

## Futuro e evidências

As Sprints 2 e 3 cobrem administração, autenticação, financeiro, manifesto, check-in e ocorrências. Gateway e sincronização seguem adiados. Os códigos dos requisitos e responsáveis foram preservados em `IMPLEMENTACAO.md`.

A suíte de API verifica transações, integridade, validações e reinício real do banco/HTTP. Playwright percorre reserva completa em desktop e celular emulado, captura mouse/toque, consulta o voucher após reload e verifica perda de resposta com reenvio idempotente. O relatório `TESTES.md` discrimina a cobertura e as verificações ainda manuais. Não se afirma conformidade regulatória ou jurídica a partir desses testes.
