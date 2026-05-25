# B.BOTH — Gestão de Conteúdo

Protótipo do sistema de gestão de conteúdo da agência. React rodando direto no browser (sem build).

## Pra abrir agora

Duplo-clique em `index.html` → abre no Chrome.

> Funciona 100% offline (todas as dependências estão em `vendor/`).

## Pra continuar editando no Claude Code

### 1. Instalar o Claude Code (se ainda não tiver)

```bash
npm install -g @anthropic-ai/claude-code
```

(Requer Node.js 18+. Se não tiver, baixa em https://nodejs.org)

### 2. Abrir o projeto

Abre um terminal **na pasta deste projeto** (a pasta que tem o `index.html` e o `CLAUDE.md`), e roda:

```bash
claude
```

### 3. Pedir mudanças

Já dentro do Claude Code, é só falar normalmente o que você quer mudar. Exemplos:

- "Adiciona uma aba de relatórios pra cada empresa"
- "Muda a cor dos botões pra um azul mais escuro"
- "Cria uma página de login"
- "Quero ver um gráfico de quantos posts foram feitos no mês"

Ele já vai entender o contexto porque vai ler o `CLAUDE.md` antes de fazer qualquer coisa.

### 4. Testar as mudanças

Depois que ele editar, abre o `index.html` no Chrome (ou recarrega com F5 se já tava aberto) pra ver o resultado.

## Estrutura

```
bboth-projeto/
├── index.html              ← abre isso no Chrome
├── gestao_conteudo.jsx     ← código React (source-of-truth)
├── CLAUDE.md               ← contexto do projeto pro Claude Code
├── README.md               ← este arquivo
└── vendor/                 ← React, Babel, Lucide (não mexer)
```

## Dúvidas comuns

**Os dados que eu criar somem se eu fechar?**
Não. Ficam salvos no navegador (`localStorage`). Mas são por navegador — sua redatora no PC dela vai ter os dados dela.

**Como reseto tudo?**
Abre o site, F12, aba "Application" (no Chrome), "Local Storage", clica no domínio e em "Clear". Recarrega — o seed dos exemplos roda de novo.

**Posso subir no GitHub Pages?**
Pode. Cria um repositório no GitHub, sobe a pasta inteira, vai em Settings → Pages → seleciona a branch `main` → Save. Em 1-2 min o site fica online.

**Quando vou precisar de backend?**
Quando você quiser que sua redatora, seu editor e você vejam os mesmos dados em tempo real. Aí o caminho é Supabase. Pede pro Claude Code: *"Migra esse projeto pra Vite + Supabase, mantendo a mesma interface"*. Ele faz.
