# B.BOTH — Gestão de Conteúdo

Sistema interno de uma agência de marketing para gerenciar postagens (roteiros, estáticos, vídeos editados, cronograma e eventos) de Diretores e Empresas clientes.

## Status atual

Protótipo funcional rodando como single-page React app. Sem build step: o JSX é transpilado no navegador via Babel Standalone. Persistência via `localStorage` (não é multiusuário ainda).

## Arquitetura

```
bboth-projeto/
├── index.html              ← entry point; carrega vendor + monta o app
├── gestao_conteudo.jsx     ← TODO o código do app (componente React) em um arquivo
├── vendor/                 ← libs vendoradas (sem build tool)
│   ├── react.min.js        (React 18.2)
│   ├── react-dom.min.js    (ReactDOM 18.2)
│   ├── babel.min.js        (Babel Standalone 7.23 — transpila JSX no browser)
│   └── lucide.min.js       (Lucide 0.292 — ícones)
└── CLAUDE.md               ← este arquivo
```

**`index.html`** carrega os vendors, define um adaptador `window.storage` que envolve `localStorage`, define wrappers React para os ícones do Lucide, **inclui inline o conteúdo de `gestao_conteudo.jsx`** dentro de uma `<script type="text/babel">`, e monta o app.

**IMPORTANTE:** atualmente o conteúdo de `gestao_conteudo.jsx` está **duplicado** dentro de `index.html` (foi embutido na hora de gerar o HTML standalone). Quando editar o app, edite `gestao_conteudo.jsx` E depois re-sincronize o `index.html` (ver "Como editar" abaixo).

## Estrutura do componente principal

`gestao_conteudo.jsx` está organizado em seções com headers de comentário `/* ====== NOME ====== */`. Da seção 1 à última:

1. **Imports** — `react`, `lucide-react` (removidos no `index.html`, providos como globais)
2. **`useFontInjection`** — injeta Geist + Geist Mono + Instrument Serif via Google Fonts
3. **`COLORS` + `BRAND_GRADIENT`** — design tokens da identidade B.BOTH (azul `#0166fc` → ciano `#1de4f0`)
4. **Dados iniciais** — `INITIAL_DIRECTORS` (7 nomes), `INITIAL_GROUP` (UOP Partners), `INITIAL_COMPANIES` (Elite, Nexus, SW, ReNova)
5. **`getScheduleRules`** — regras de postagem por tipo de entidade:
   - Diretores/Grupo: estáticos seg-sáb, reels seg/qua/sáb
   - Empresas: estáticos seg/ter/qui/sex, reels qua/sáb
6. **`storage` helper** — wrap async em volta de `window.storage`
7. **`K`** — namespace de chaves do storage (`entities`, `roteiros:<id>`, `estaticos:<id>`, `videos:<id>`, `events:<id>`, `pdf:<fid>`, `image:<fid>`, `thumb:<fid>`)
8. **File helpers** — `fileToBase64`, `downloadBase64`, `uid`, `slugify`
9. **`SEED_IMAGES` + `SEED_POSTS`** — base64 das 8 imagens iniciais (4 originais Walter/Rogério/Rudi/Reinaldo + 4 geradas no mesmo estilo) e as legendas correspondentes
10. **`GlobalStyles`** — CSS global injetado via `<style>`
11. **`BBothLogo`** — SVG inline da logo com gradiente brand
12. **`Toast`** — notificação efêmera bottom-right
13. **`RoleSwitcher`** — selector de perfil (Gestor / Equipe Roteiros / Equipe Vídeos) — simula permissões
14. **`Header`** — topbar com logo + tagline + toggle Diretoria/Empresas + RoleSwitcher
15. **`Sidebar`** — lista entidades (diretores/grupo OU empresas, dependendo de `section`)
16. **`EntityHeader`** — cabeçalho da entidade selecionada com avatar+nome+handle+tabs
17. **`StatusBadge`** — pill colorido com estado (`para-gravar`, `gravado`, `para-postar`, `postado`)
18. **`RoteirosTab` + `RoteiroModal`** — aba de roteiros (com upload de PDF)
19. **`EstaticosTab` + `EstaticoModal`** — aba de estáticos (com upload de imagem)
20. **`VideosTab` + `VideoModal`** — aba de vídeos (link Drive/YT + thumbnail)
21. **`CronogramaTab` + `DayDetailModal`** — calendário mensal com slots automáticos
22. **`EventosTab` + `EventCard` + `EventModal`** — só para o grupo UOP Partners
23. **`AddCompanyModal`** — modal pra cadastrar nova empresa
24. **`App`** — componente raiz: gerencia `section`, `currentId`, `activeTab`, `role`, `entities`, e roda o **seed automático** dos 8 estáticos na primeira carga (guard via `app:seed:estaticos:v1`)

## Permissões (simuladas)

```js
ROLES = [
  { id: 'gestor', canAll: true },
  { id: 'roteiros', canRoteiros: true },  // edita roteiros E estáticos
  { id: 'videos', canVideos: true },      // edita vídeos
]
```

São simuladas localmente. Quando virar multiusuário (Supabase Auth), trocar pra checks reais.

## Convenções de estilo

- **CSS via `<style>` global** com classes (`btn`, `btn-primary`, `card`, `item-card`, `badge`, `modal-backdrop`, `tab`, `section-pill`, `sidebar-item`, `cal-grid`, `cal-cell`, `cal-slot`).
- **Cores em CSS vars** (`var(--ink-deep)`, `var(--mist)`, etc) injetadas no `GlobalStyles`, derivadas de `COLORS`.
- **Sem Tailwind, sem styled-components.** Apenas vanilla CSS + estilos inline pra props variáveis.
- **Tipografia**: Geist (sans), Geist Mono (datas/IDs), Instrument Serif (se precisar de toque editorial).
- **Espaçamento padrão:** 14-16px em cards, 28px em containers grandes.

## Como editar

Como `index.html` tem uma cópia embutida de `gestao_conteudo.jsx`, há **duas formas** de mexer:

### Forma 1 (recomendada): editar o JSX e re-empacotar

1. Edita `gestao_conteudo.jsx` normalmente
2. Re-embute no HTML rodando algo como (em Python ou JS, mas o usuário não tem ambiente Python configurado — então geralmente é melhor a Forma 2):
   ```bash
   # Pseudo-script: pega o body do JSX e injeta dentro do <script type="text/babel">
   ```

### Forma 2 (mais simples na prática): editar só o `index.html`

Dentro do `index.html`, procure pelo marcador de início do código React (logo após `// ===== Lucide UMD icon wrapper as React components =====` e os `const Foo = makeIcon(...)`) — daí em diante é o conteúdo do JSX. Edite ali e teste abrindo `index.html` no navegador. Quando estabilizar, sincronize de volta pra `gestao_conteudo.jsx`.

> **Nota pro Claude Code:** quando o usuário pedir mudanças, prefira editar `gestao_conteudo.jsx` (é o source-of-truth) e, no fim, reescreva a seção JSX dentro de `index.html` com `str_replace`. O bloco JSX no HTML começa após a definição dos ícones (`const Check = makeIcon('Check');`) e vai até logo antes do `// ===== Mount =====`.

## Limitações conhecidas + roadmap

- **Dados são por dispositivo** (`localStorage`) — não há sincronização entre usuários. Migração natural: Supabase Postgres + Storage.
- **Babel Standalone roda no browser** — leva ~2s no primeiro load. Migração natural: Vite ou Next.js build.
- **Sem autenticação real** — o `RoleSwitcher` é só visual. Migração natural: Supabase Auth.
- **Imagens em base64 dentro do localStorage** — funciona mas tem limite de ~5MB total. Migração natural: Supabase Storage com URLs.

Quando o usuário pedir multiusuário/login/sync, o caminho recomendado é Vite + React + TypeScript + Supabase. O componente principal (`gestao_conteudo.jsx`) pode ser migrado quase como está, trocando o `storage` helper por chamadas Supabase.

## Dados de exemplo (seed)

No primeiro acesso, o `App` popula a aba "Estáticos" dos diretores Walter, Rogério, Rudi e Reinaldo com 2 posts cada (1 "postado" + 1 "para postar"), incluindo imagens em base64 e legendas no padrão da agência. Esse seed roda uma vez só (guard `app:seed:estaticos:v1`). Pra resetar: limpar localStorage no DevTools.

## Padrão de legenda

Estabelecido pelo usuário:

```
Texto da legenda referente ao post.

Texto da legenda referente ao post.

Texto da legenda referente ao post.

- Nome do diretor com sobrenome

#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5
```

(3 parágrafos curtos, assinatura, 4-6 hashtags.)

## Identidade visual B.BOTH

- **Logo:** "B.BOTH" em Geist 900, gradiente horizontal `#0166fc → #009bed → #1de4f0`
- **Tagline:** "Be bold, be better"
- **Cores principais:** preto profundo (`#050608`) de fundo, surfaces grafite, gradiente brand pra acentos
- **Status:** ciano (`#1de4f0`) pra "concluído/postado", âmbar (`#f5b342`) pra "pendente/para postar"
