# Stack Price - Scraper Multi-Fabricante

Sistema Node.js para atualização automática de preços de notebooks (Dell, Lenovo, etc.).

## Fabricantes Suportados

- **Dell** ✅
- **Lenovo** ✅
- HP, Asus, Acer (fácil extensão)

## Instalação

```bash
cd scraper
npm install
npx playwright install chromium
```

## Configuração

```bash
cp .env.example .env
# Edite .env com credenciais SQL Server
```

## Uso

```bash
# Estatísticas
node index.js --stats

# Todos os fabricantes (dry-run primeiro)
node index.js --all --dry-run
node index.js --all

# Por fabricante
node index.js --fabricante Dell
node index.js --fabricante Lenovo

# SKU específico
node index.js --sku cto07_pc14250_bccx2

# Debug (navegador visível)
node index.js --sku 82yu000lbr --headed
```

## Descoberta de SKUs Dell

Script para extrair novos SKUs de páginas de categoria/busca da Dell e inserir/atualizar no banco de dados.

```bash
# Descobrir SKUs de uma página de categoria (dry-run)
node src/dell-sku-discovery.js --url "https://www.dell.com/pt-br/search/notebook%20dell" --max-pages 15 --dry-run

# Salvar novos SKUs no banco de dados
node src/dell-sku-discovery.js --url "https://www.dell.com/pt-br/search/notebook%20dell" --max-pages 15

# Com navegador visível
node src/dell-sku-discovery.js --url "https://www.dell.com/pt-br/search/notebook%20dell" --max-pages 15 --headed
```

**Opções:**
- `--url <url>`: URL da página de categoria/busca (obrigatório)
- `--max-pages <num>`: Número máximo de páginas para navegar (default: 1)
- `--dry-run`: Simular execução sem salvar no banco
- `--headed`: Executar navegador em modo visível
- `--fabricante <nome>`: Fabricante para salvar no banco (default: Dell)

## Descoberta de SKUs Lenovo

Script para extrair novos SKUs de páginas de busca/categoria da Lenovo e inserir/atualizar no banco de dados.

```bash
# Descobrir SKUs de uma página de busca (dry-run)
node src/lenovo-sku-discovery.js --url "https://www.lenovo.com/br/pt/search?text=notebook" --max-pages 3 --dry-run

# Salvar novos SKUs no banco de dados
node src/lenovo-sku-discovery.js --url "https://www.lenovo.com/br/pt/search?text=notebook" --max-pages 3

# Com navegador visível
node src/lenovo-sku-discovery.js --url "https://www.lenovo.com/br/pt/search?text=notebook" --max-pages 3 --headed

# Exemplo real - 18 SKUs inseridos
node src/lenovo-sku-discovery.js --url "https://www.lenovo.com/br/pt/search?text=notebook&rows=20" --max-pages 1
```

**Opções:**
- `--url <url>`: URL da página de busca/categoria (obrigatório)
- `--max-pages <num>`: Número máximo de páginas para navegar (default: 1)
- `--dry-run`: Simular execução sem salvar no banco
- `--headed`: Executar navegador em modo visível
- `--fabricante <nome>`: Fabricante para salvar no banco (default: Lenovo)

## Arquitetura

- **Factory Pattern**: `ScraperFactory` instancia scraper por fabricante
- **Base Scraper**: Interface comum com métodos genéricos
- **Vendors**: Implementações específicas em `src/scraper/vendors/`

## Estrutura

```
src/scraper/
├── base-scraper.js         # Classe abstrata
├── scraper-factory.js      # Factory multi-fabricante
├── price-extractor.js      # Matching de preços
└── vendors/
    ├── dell-scraper.js     # Implementação Dell
    └── lenovo-scraper.js   # Implementação Lenovo
```

## Adicionar Novo Fabricante

1. Criar `src/scraper/vendors/{fabricante}-scraper.js`
2. Estender `BaseScraper`
3. Implementar `scrapeUrl()`
4. Registrar em `scraper-factory.js`

Exemplo:
```javascript
const BaseScraper = require('../base-scraper');

class HPScraper extends BaseScraper {
  async scrapeUrl(url, sku) {
    // Implementação específica HP
  }
}
module.exports = HPScraper;
```
