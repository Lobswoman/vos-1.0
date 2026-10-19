PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS viagens_config (
 id INTEGER PRIMARY KEY, identificacao TEXT NOT NULL, origem TEXT NOT NULL, destino TEXT NOT NULL,
 data_partida TEXT NOT NULL, data_retorno TEXT, descricao TEXT NOT NULL,
 capacidade INTEGER NOT NULL DEFAULT 44 CHECK(capacidade=44), valor_centavos INTEGER NOT NULL CHECK(valor_centavos>=0),
 status TEXT NOT NULL DEFAULT 'DISPONIVEL', ficticia INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reservas_viagem (
 id INTEGER PRIMARY KEY, viagem_id INTEGER NOT NULL REFERENCES viagens_config(id),
 codigo_reserva TEXT NOT NULL UNIQUE, acesso_hash TEXT NOT NULL,
 chave_idempotencia TEXT NOT NULL UNIQUE, payload_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'REGISTRADA', data_criacao TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS passageiros (
 id INTEGER PRIMARY KEY, nome_completo TEXT NOT NULL, cpf TEXT NOT NULL, data_nascimento TEXT NOT NULL,
 telefone TEXT NOT NULL, email TEXT, documento TEXT,
 nome_responsavel TEXT, cpf_responsavel TEXT, vinculo_responsavel TEXT
);
CREATE TABLE IF NOT EXISTS reserva_passageiros (
 id INTEGER PRIMARY KEY, reserva_id INTEGER NOT NULL REFERENCES reservas_viagem(id),
 viagem_id INTEGER NOT NULL REFERENCES viagens_config(id), passageiro_id INTEGER NOT NULL REFERENCES passageiros(id),
 numero_poltrona INTEGER NOT NULL CHECK(numero_poltrona BETWEEN 1 AND 44), codigo_embarque TEXT NOT NULL UNIQUE,
 status_embarque INTEGER NOT NULL DEFAULT 0, status_embarque_volta INTEGER NOT NULL DEFAULT 0,
 UNIQUE(viagem_id, numero_poltrona), UNIQUE(reserva_id, passageiro_id)
);
CREATE TABLE IF NOT EXISTS pagamentos (
 id INTEGER PRIMARY KEY, reserva_id INTEGER NOT NULL UNIQUE REFERENCES reservas_viagem(id),
 forma_pagamento TEXT NOT NULL CHECK(forma_pagamento IN ('PIX','DINHEIRO','CARTAO')),
 valor_total_centavos INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDENTE', data_registro TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contratos (
 id INTEGER PRIMARY KEY, reserva_id INTEGER NOT NULL UNIQUE REFERENCES reservas_viagem(id),
 assinatura_base64 TEXT NOT NULL, nome_signatario TEXT NOT NULL, data_assinatura TEXT NOT NULL, versao_documento TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS aceites_bagagem (
 id INTEGER PRIMARY KEY, reserva_id INTEGER NOT NULL UNIQUE REFERENCES reservas_viagem(id),
 versao_termos TEXT NOT NULL, aceito INTEGER NOT NULL CHECK(aceito=1), data_aceite TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reservas_viagem ON reservas_viagem(viagem_id);
PRAGMA user_version = 1;
