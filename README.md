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
