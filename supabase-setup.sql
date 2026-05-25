-- ============================================================
-- B.SISTEM — Supabase Setup
-- Execute este script no SQL Editor do seu projeto Supabase
-- (supabase.com → seu projeto → SQL Editor → New query)
-- ============================================================

-- 1. Tabela de dados compartilhados (substitui o localStorage)
CREATE TABLE IF NOT EXISTS kv_store (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Perfis de usuário (nome + role por usuário autenticado)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('geral', 'criativo', 'estatico')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;

-- kv_store: qualquer usuário autenticado pode ler e escrever
CREATE POLICY "auth_read_kv"   ON kv_store FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_kv" ON kv_store FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_kv" ON kv_store FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_kv" ON kv_store FOR DELETE TO authenticated USING (true);

-- profiles: qualquer usuário autenticado pode ler todos os perfis
CREATE POLICY "auth_read_profiles" ON profiles FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Como adicionar usuários da equipe
-- ============================================================
-- 1. Vá em: Supabase → Authentication → Users → Invite user
--    (ou "Add user" e defina email + senha manualmente)
--
-- 2. Após criar o usuário, insira o perfil com nome e role:

-- Exemplo (substitua o UUID pelo ID real do usuário criado):
-- INSERT INTO profiles (id, name, role) VALUES
--   ('UUID-DO-USUARIO', 'Nome da Pessoa', 'geral');    -- acesso total
--   ('UUID-DO-USUARIO', 'Nome da Pessoa', 'criativo'); -- roteiros + vídeos
--   ('UUID-DO-USUARIO', 'Nome da Pessoa', 'estatico'); -- estáticos/imagens
--
-- Para ver os UUIDs dos usuários cadastrados:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- ============================================================
-- Roles disponíveis
-- ============================================================
-- geral    → acesso total (equivale ao Gestor anterior)
-- criativo → edita roteiros e vídeos
-- estatico → edita estáticos/imagens
