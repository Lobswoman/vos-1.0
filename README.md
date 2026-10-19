# VOS 1.0 — Voyage Operations System

Incremento da **Sprint 1 (US01–US07, 21 Story Points)** do sistema de excursões da RM Viagens e Turismo Ltda., empresa fictícia. Projeto acadêmico de Engenharia de Software, Engenharia de Sistemas — Unimontes. Professor: Allysson Costa e Silva. Período informado da Sprint: 06/10/2026 a 06/11/2026.

Aplicação real com portal responsivo, servidor Express e SQLite persistente. Não processa pagamentos. Excursão de demonstração: **Montes Claros/MG → Barretos/SP**, partida fictícia em 20/08/2027, preço fictício de R$ 200 por passageiro.

## Execução no Windows com VS Code

1. Instale **Node.js 24 LTS** pelo site oficial. O Node inclui o npm e o driver SQLite utilizado; não instale SQLite separadamente. Não utilizar Node 18/20/22 neste projeto.
2. Extraia o ZIP em uma pasta local e abra a pasta `vos-1.0` no VS Code (Arquivo → Abrir Pasta). A pasta correta contém `package.json`.
3. Abra Terminal → Novo Terminal. Se o PowerShell bloquear `npm.ps1`, utilize `npm.cmd` nos comandos abaixo, ou escolha o terminal Prompt de Comando. Não precisa alterar a política de segurança do Windows.
4. Confira as versões e instale as dependências:

```powershell
node --version
npm --version
npm ci
npm run db:init
npm start
```

5. Abra `http://localhost:3000` no navegador do **mesmo computador**. Use Chrome, Edge ou Firefox atualizado. A aplicação atende somente no endereço de loopback IPv4 `127.0.0.1`, porta 3000. `http://127.0.0.1:3000` também funciona.
6. Para encerrar, pressione **Ctrl+C** no terminal do servidor. Para retomar, execute `npm start` na mesma pasta. Reservas e poltronas ocupadas permanecem no banco.

No Linux/macOS, os comandos de instalação e execução são os mesmos. O sistema foi validado neste ambiente Linux com Node 24.19.0 e Chromium; a execução em Windows ainda precisa de homologação presencial.

A instalação inicial precisa de internet para baixar pacotes. Depois de `npm ci`, o fluxo principal funciona sem APIs, CDN, fontes ou serviços externos. Fontes são as do sistema operacional. `node_modules` não acompanha o ZIP.

## Funcionalidades

- **US01:** excursão obtida do SQLite, capacidade restante e tratamento de erro/indisponibilidade.
- **US02:** mapa de 44 lugares com corredor, entrada/escada e banheiro; máximo de cinco posições consecutivas no mesmo lado.
- **US03:** passageiro por poltrona; CPF com dígitos verificadores, nascimento, telefone com DDD; responsáveis obrigatórios para menores.
- **US04:** aceite obrigatório de termo demonstrativo versionado, com data/hora na confirmação.
- **US05:** contrato demonstrativo e assinatura manuscrita em Canvas por mouse/toque; PNG Base64 persistido; rejeição de imagem vazia no servidor.
- **US06:** intenção de PIX, dinheiro ou cartão, sem coleta de cartão nem cobrança; pagamento sempre `PENDENTE`.
- **US07:** revisão, gravação atômica, voucher com código de reserva e código individual por passageiro, impressão/PDF pelo navegador, consulta privada e reenvio idempotente.

O formulário mantém um rascunho temporário em `sessionStorage` da aba. O SQLite é a fonte oficial. Alterações nas etapas anteriores invalidam a assinatura. Dados definitivos só são gravados na conclusão válida. A seleção visual não segura a poltrona: outra pessoa pode concluir antes, gerando um conflito informado ao usuário.

## Banco e configuração da excursão

- Arquivo padrão: `database/database.db` (incluído no ZIP com a viagem fictícia e sem passageiros).
- `npm run db:init` cria as tabelas e insere a viagem **somente se ela ainda não existir**. É repetível e não apaga reservas.
- A inicialização também ocorre automaticamente em `npm start`.
- Edite `database/demo.json` para ajustar identificação, cidades, descrição, datas com fuso e preço em **centavos**. Execute `npm run demo:configure` para aplicar a uma viagem sem reservas. Depois de existir reserva, a alteração é bloqueada para preservar contratos/vouchers. Não é um CRUD administrativo da Sprint 2.
- Para dados de demonstração separados, escolha outro caminho com `VOS_DB_PATH`. Exemplo PowerShell:

```powershell
$env:VOS_DB_PATH = "C:\Projetos\vos-1.0\database\outra-demo\database.db"
npm start
```

Não apague o banco para atualizar o sistema. Antes de backup, encerre o servidor normalmente (Ctrl+C); preserve o diretório do banco, inclusive eventuais arquivos `-wal`/`-shm`. Copiar apenas um arquivo SQLite durante gravações pode resultar em backup incompleto. Não versione bancos com dados pessoais.

## Regra proposta de consecutividade

O leiaute exato não foi definido nos trabalhos originais. Implementou-se uma **proposta operacional sujeita à aprovação da Product Owner**: 11 fileiras de quatro lugares, com dois de cada lado do corredor. As posições de cada lado seguem um caminho em zigue-zague da frente para trás, sem saltos diagonais. Exemplos:

```text
Frente     lado esquerdo | corredor | lado direito
fileira 1      01 → 02   |          | 03 → 04
                   ↓    |          |      ↓
fileira 2      05 ← 06   |          | 07 ← 08
               ↓        |          | ↓
fileira 3      09 → 10   |          | 11 → 12
...
fileira 11     41   42   |          | 43   44
Traseira: banheiro em área separada. Entrada/escada à frente.
```

Uma sequência válida de cinco é **01 → 02 → 06 → 05 → 09**. Uma sequência de três à direita é **03 → 04 → 08**. Não é possível atravessar o corredor, pular posições ou deixar lacunas; para desmarcar, remova uma ponta da sequência. Essa decisão não pretende reproduzir uma planta oficial de veículo.

## Dados de teste

Use somente dados fictícios em demonstrações. A suíte usa nomes como `Pessoa Ficticia Teste`, telefone `38999990000` e CPFs sintéticos com dígitos verificadores válidos, por exemplo `52998224725`. A validade matemática de um CPF não comprova identidade nem sua inexistência no mundo real.

A idade é calculada na **data de partida**, comparando datas civis. Nascimento não pode ser futuro em relação à data atual de São Paulo. Para menor, informe nome completo, CPF válido e vínculo do responsável. Telefone com DDD é obrigatório; e-mail e documento complementar são opcionais (escolhas de implementação).

## Testes

```powershell
npm test
```

Executa 23 testes de API, regras e banco em bases temporárias: reserva válida, menores, validações, conflito simultâneo, rollback, reinício, idempotência e acesso privado. Não altera o banco de demonstração.

Para os testes de navegador (a instalação é necessária apenas uma vez):

```powershell
npx playwright install chromium
npm run test:e2e
```

A suíte abre servidor em porta temporária e banco descartável, exercita desktop e celular emulado (inclusive toque), verifica tablet/notebook e produz evidências em `artifacts/`. Para usar Chromium já instalado, defina `VOS_CHROMIUM_PATH` com o caminho do executável. Neste ambiente:

```bash
VOS_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Para medir consumo do servidor separado e tempo de consulta do mapa, deixe a porta 3000 livre e execute:

```powershell
npm run verify:runtime
```

Consulte [relatório de testes](docs/TESTES.md), [documento técnico](docs/TECNICO.md) e [rastreabilidade](docs/IMPLEMENTACAO.md). Evidências selecionadas acompanham `docs/evidencias/`. Testes automatizados não substituem homologação em Windows, celular físico, leitor de tela e impressora real.

## Voucher e privacidade

Após concluir, imprima/salve PDF e guarde o **acesso privado** pelo botão correspondente. O endereço contém código de reserva e chave aleatória no fragmento `#`; a consulta exige essa chave em cabeçalho Bearer. Saber apenas o código da reserva não dá acesso. Não divulgue esse endereço. O voucher omite CPF, nascimento, telefone e assinatura.

Reabrir o endereço ou atualizar a página consulta o mesmo registro. Uma repetição da mesma confirmação usa idempotência e não cria outra reserva. Não há recuperação de chave perdida nem painel de suporte nesta Sprint. O arquivo de acesso exige servidor local ativo e o banco original.

Os dados locais não são criptografados em repouso. Pessoas com acesso ao disco ou ferramentas do navegador podem acessá-los. Esta entrega acadêmica não está homologada para uso comercial com dados reais.

## Solução de problemas

- `node:sqlite` não encontrado: instale Node 24 LTS e reabra o terminal do VS Code.
- `EADDRINUSE`: encerre a outra aplicação na porta 3000, ou um servidor VOS anterior.
- `npm` fora da pasta: abra o diretório que contém `package.json`.
- `ENOSPC` ou erro de gravação: confira espaço e permissão de escrita na pasta do banco. Não tente apagar o banco para corrigir.
- Excursão indisponível: verifique o status e a data de partida. Ajuste a configuração de demonstração em banco sem reservas, ou utilize banco separado.
- Chromium ausente nos testes: execute `npx playwright install chromium` com acesso aos servidores oficiais de distribuição, ou configure o navegador local.
- Em máquina com cache npm sem permissão, use um cache gravável: `npm ci --cache .npm-cache`. Não desative TLS nem verificações de integridade.

## Limites e próximas Sprints

Não inclui login administrativo, dashboard, gestão administrativa de viagens, baixa de pagamento, manifesto ANTT, check-in e ocorrências. As colunas de check-in de ida/volta foram preparadas, mas não há endpoints ou telas dessas funções. Não há gateway de pagamento, sincronização ou túnel público.

A assinatura é **eletrônica manuscrita**, não uma assinatura criptográfica ICP-Brasil. Contrato e bagagem são textos provisórios, sem aprovação jurídica. Uma assinatura é coletada do responsável pela transação, vinculada ao grupo; não substitui autorizações legais de menores. A navegação funciona com teclado, mas a assinatura requer mouse/toque ou auxílio presencial.

## Equipe

| Papel | Integrante |
|---|---|
| Scrum Master | Pedro Henrique Marques da Silva |
| Product Owner | Mariana Amorim |
| Developers | Victória Fonseca Souza, Athos Almeida Lima Fagundes, Higor Gabriel Soares Damasceno, Rayssa Soares Maia |

Os nomes são utilizados na documentação acadêmica, sem exposição no atendimento ao passageiro.
