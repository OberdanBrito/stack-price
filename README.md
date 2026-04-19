# Scraper de Preços Dell

Sistema Node.js para atualização automática de preços de notebooks da Dell.

## Instalação

```bash
cd scraper
npm install
npx playwright install chromium
```

## Configuração

Copie `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais SQL Server.

## Uso

```bash
# Ver estatísticas do banco
node index.js --stats

# Processar todos os SKUs (dry-run primeiro)
node index.js --all --dry-run

# Executar atualização real
node index.js --all

# Por fabricante
node index.js --fabricante Dell

# SKU específico
node index.js --sku cto07_pc14250_bccx2

# Com navegador visível (debug)
node index.js --sku cto07_pc14250_bccx2 --headed
```

## Funcionamento

1. Consulta SKUs com `UrlSpec` no banco
2. Navega para cada URL usando Playwright
3. Extrai múltiplas configurações/preços da página
4. Faz match entre specs da página e dados do SKU
5. Atualiza `ModeloNotebook.Preco`
6. Trigger SQL popula `ModeloNotebookPrecoHistorico` automaticamente

## Estrutura

- `index.js` - Entry point e orquestração
- `src/scraper/dell-scraper.js` - Playwright para Dell
- `src/scraper/price-extractor.js` - Parser e matching de preços
- `src/models/modelo-notebook.js` - Acesso SQL Server
- `config/database.js` - Conexão com banco
