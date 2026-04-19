# Documentação de Execução - Dell Price Scraper

## Visão Geral

Sistema para atualização automática de preços de notebooks Dell via scraping das URLs armazenadas no banco SQL Server.

## Estrutura de Arquivos

```
scraper/
├── index.js                 # Execução principal (atualiza banco)
├── test-scraper.js          # Testes sem tocar no banco
├── package.json             # Dependências
├── .env.example             # Template de configuração
├── config/
│   └── database.js          # Conexão SQL Server
├── src/
│   ├── cli.js               # Interface de linha de comando
│   ├── models/
│   │   └── modelo-notebook.js  # Acesso a dados
│   └── scraper/
│       ├── dell-scraper.js  # Lógica Playwright
│       └── price-extractor.js  # Parser de preços
└── logs/                    # Gerado automaticamente
    ├── *.log                # Logs de execução
    ├── *.json               # Resultados estruturados
    ├── html/                # Páginas capturadas
    └── screenshots/         # Screenshots para análise
```

## Instalação (Primeira Vez)

```bash
cd scraper

# Instalar dependências
npm install

# Instalar navegador Chromium para Playwright
npx playwright install chromium

# Criar arquivo de configuração
cp .env.example .env
```

## Configuração

Editar `.env` com credenciais do SQL Server:

```env
DB_SERVER=localhost
DB_NAME=PrecificacaoHardware
DB_USER=sa
DB_PASSWORD=sua_senha
DB_PORT=1433

# Configurações opcionais
HEADLESS=true
DELAY_MS=3000
```

## Comandos de Execução

### 1. Testes (Sem Banco)

Executa scraping em amostra de teste, **não toca no banco**.

```bash
# Teste rápido (2 SKUs)
node test-scraper.js

# Teste completo (4 SKUs)
node test-scraper.js --sample=4

# Com screenshots para análise visual
node test-scraper.js --sample=4 --screenshots

# Modo headed (navegador visível)
node test-scraper.js --headed
```

**Saída**: Arquivos em `logs/` com HTML, screenshots e resultados JSON.

### 2. Simulação (Dry-Run)

Conecta ao banco, mostra o que seria atualizado, **mas não salva**.

```bash
# Simular todos os SKUs
node index.js --all --dry-run

# Simular por fabricante
node index.js --fabricante Dell --dry-run

# Simular SKU específico
node index.js --sku cto07_pc14250_bccx2 --dry-run
```

### 3. Execução Real

**Atualiza preços no banco**. Trigger SQL popula histórico automaticamente.

```bash
# Atualizar todos os SKUs com URL
node index.js --all

# Atualizar por fabricante
node index.js --fabricante Dell

# Atualizar SKU específico
node index.js --sku cto07_pc14250_bccx2

# Com navegador visível (debug)
node index.js --sku cto07_pc14250_bccx2 --headed
```

### 4. Estatísticas

```bash
# Ver estatísticas do banco
node index.js --stats
```

Saída exemplo:
```
=== Estatísticas do Banco ===
Total de modelos: 150
Com URL: 142
Com preço: 98
Fabricantes: 3

=== Por Fabricante ===
Dell: 140 total, 132 com URL, 90 com preço
Lenovo: 8 total, 8 com URL, 6 com preço
HP: 2 total, 2 com URL, 2 com preço
```

## Fluxo de Trabalho Recomendado

### Primeira Execução

1. **Testar**: `node test-scraper.js --sample=4 --screenshots`
2. **Verificar logs**: Analisar `logs/scraper-results-*.json`
3. **Simular**: `node index.js --all --dry-run`
4. **Executar real**: `node index.js --all`

### Atualizações Periódicas

```bash
# Verificar estatísticas
node index.js --stats

# Simular antes de executar
node index.js --all --dry-run

# Executar atualização
node index.js --all

# Verificar histórico no SQL Server
-- SELECT * FROM ModeloNotebookPrecoHistorico WHERE DataInicio >= CAST(GETDATE() AS DATE)
```

## Interpretação de Resultados

### Teste (test-scraper.js)

```
[1/4] Testando brpdc14250ubtohtrj_x
   URL: https://www.dell.com/pt-br/shop/...
   Preço atual no BD: R$ 6698.00
   ✅ Página carregada
   Configurações encontradas: 1
   💰 Preço match: R$ 6999.00
   ⚠️  Diferença de preço: R$ 301.00
```

**Significado**:
- `✅ Página carregada`: URL acessível
- `💰 Preço match`: Preço encontrado na página
- `⚠️ Diferença`: Preço mudou desde última atualização

### Execução Real (index.js)

```
[1/142] Processando brpdc14250ubtohtrj_x...
  💰 Preço encontrado: R$ 6999.00
     Preço atual: R$ 6698.00
  ✅ Preço atualizado no banco
```

**Significado**:
- `✅ Preço atualizado`: UPDATE executado com sucesso
- Trigger SQL `TRG_FechaPrecoAnterior` registra automaticamente no histórico

## Logs e Artefatos

Após execução, verificar:

```bash
# Listar logs recentes
ls -lt logs/*.log | head -5

# Ver último resultado JSON
cat logs/scraper-results-*.json | jq

# Ver screenshots (se gerados)
ls logs/screenshots/

# Analisar HTML capturado
cat logs/html/brpdc14250ubtohtrj_x-*.html | grep -i "price"
```

## Troubleshooting

### Timeout na página Dell

```
❌ Erro no scraping: page.goto: Timeout 30000ms exceeded.
```

**Solução**: Normal em horários de pico. O scraper já ajustou para 60s. Aguardar e tentar novamente.

### Preço não encontrado

```
⚠️  Preço não encontrado para este SKU
```

**Possíveis causas**:
- Produto fora de estoque
- Layout da página mudou
- Cookie consent bloqueando

**Ação**: Verificar screenshot em `logs/screenshots/` e HTML em `logs/html/`.

### Erro de conexão SQL Server

```
ConnectionError: Failed to connect to localhost:1433
```

**Verificar**:
1. SQL Server está rodando?
2. Credenciais em `.env` estão corretas?
3. Porta 1433 está aberta?
4. TCP/IP habilitado no SQL Server Configuration Manager?

### Chromium não encontrado

```
browserType.launch: Executable doesn't exist at ~/.cache/ms-playwright/chromium-...
```

**Solução**: `npx playwright install chromium`

## Comandos Úteis SQL Server

```sql
-- Ver preços atualizados hoje
SELECT 
    Sku, 
    Preco, 
    DataInclusao 
FROM ModeloNotebook 
WHERE CAST(DataInclusao AS DATE) = CAST(GETDATE() AS DATE);

-- Ver histórico de variações
SELECT 
    Sku,
    Preco,
    DataInicio,
    Fonte
FROM ModeloNotebookPrecoHistorico 
WHERE DataInicio >= DATEADD(DAY, -7, GETDATE())
ORDER BY Sku, DataInicio DESC;

-- SKUs com maior variação (últimos 30 dias)
SELECT 
    Sku,
    COUNT(*) AS Alteracoes,
    MIN(Preco) AS Minimo,
    MAX(Preco) AS Maximo,
    MAX(Preco) - MIN(Preco) AS Diferenca
FROM ModeloNotebookPrecoHistorico
WHERE DataInicio >= DATEADD(DAY, -30, GETDATE())
GROUP BY Sku
HAVING COUNT(*) > 1
ORDER BY Diferenca DESC;
```

## Atualização via Agendamento (Opcional)

Para execução automática, adicionar ao cron:

```bash
# Editar crontab
crontab -e

# Executar diariamente às 9h
0 9 * * * cd /caminho/scraper && node index.js --all >> logs/cron.log 2>&1
```

## Contato e Manutenção

- **Scraper Dell**: Se layout mudar, ajustar seletores em `src/scraper/dell-scraper.js`
- **Novo fabricante**: Criar scraper específico em `src/scraper/{fabricante}-scraper.js`
- **Logs de erro**: Verificar `logs/*.log` com timestamp da execução problemática
