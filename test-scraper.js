/**
 * Script de teste do scraper Dell
 * Salva logs detalhados para análise antes de atualizar banco
 */

const fs = require('fs');
const path = require('path');
const DellScraper = require('./src/scraper/dell-scraper');
const PriceExtractor = require('./src/scraper/price-extractor');

const LOGS_DIR = path.join(__dirname, 'logs');
const HTML_DIR = path.join(LOGS_DIR, 'html');
const SCREENSHOTS_DIR = path.join(LOGS_DIR, 'screenshots');

// Criar diretórios
[LOGS_DIR, HTML_DIR, SCREENSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = path.join(LOGS_DIR, `scraper-test-${timestamp}.log`);
const RESULTS_FILE = path.join(LOGS_DIR, `scraper-results-${timestamp}.json`);

let logContent = '';
let results = {
  timestamp: new Date().toISOString(),
  total: 0,
  sucesso: 0,
  erro: 0,
  precoEncontrado: 0,
  precoNaoEncontrado: 0,
  detalhes: []
};

function log(message, consoleOutput = true) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContent += line + '\n';
  if (consoleOutput) {
    console.log(message);
  }
}

async function salvarLogs() {
  fs.writeFileSync(LOG_FILE, logContent);
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  log(`\n📁 Logs salvos em:`, false);
  log(`   - ${LOG_FILE}`, false);
  log(`   - ${RESULTS_FILE}`, false);
}

// Dados de teste - amostra representativa das URLs do SQL
const TEST_DATA = [
  {
    Sku: 'brpdc14250ubtohtrj_x',
    Fabricante: 'Dell',
    Serie: 'Notebook 14',
    Processador: 'Intel Core 7-150U, 10 nucleos',
    SistemaOperacional: 'Ubuntu Linux 22.04 LTS',
    PlacaVideo: 'Intel Graphics',
    Memoria: '16 GB DDR5',
    Armazenamento: '512 GB SSD',
    Tela: '14.0" Full HD+ (1920x1200) WVA',
    UrlSpec: 'https://www.dell.com/pt-br/shop/notebooks-dell/notebook-dell-14/spd/dell-dc14250-laptop',
    Preco: 6698.00
  },
  {
    Sku: 'brpdc14250hbtohtrj_x',
    Fabricante: 'Dell',
    Serie: 'Notebook 14',
    Processador: 'Intel Core 7-150U, 10 nucleos',
    SistemaOperacional: 'Windows 11 Home',
    PlacaVideo: 'Intel Graphics',
    Memoria: '16 GB DDR5',
    Armazenamento: '512 GB SSD',
    Tela: '14.0" Full HD+ (1920x1200) WVA',
    UrlSpec: 'https://www.dell.com/pt-br/shop/notebooks-dell/notebook-dell-14/spd/dell-dc14250-laptop',
    Preco: 6999.00
  },
  {
    Sku: 'cto07_pc14250_bccx2',
    Fabricante: 'Dell',
    Serie: 'Pro 14',
    Processador: 'Intel Core 7-150U, 10 nucleos',
    SistemaOperacional: 'Windows 11 Pro',
    PlacaVideo: 'Intel Graphics',
    Memoria: '16 GB DDR5',
    Armazenamento: '512 GB SSD',
    Tela: '14.0" Full HD+ (1920x1200) IPS',
    UrlSpec: 'https://www.dell.com/pt-br/shop/notebooks-dell/notebook-dell-pro-14/spd/dell-pro-pc14250-laptop/cto07_pc14250_bccx2',
    Preco: 11298.00
  },
  {
    Sku: 'brppv15250wbtohxgg_x',
    Fabricante: 'Dell',
    Serie: 'Pro 15 Essential',
    Processador: 'Intel Core i7-1355U, 10 nucleos',
    SistemaOperacional: 'Windows 11 Home',
    PlacaVideo: 'Intel UHD Graphics',
    Memoria: '16 GB DDR5',
    Armazenamento: '1 TB SSD',
    Tela: '15.6" Full HD (1920x1080) WVA',
    UrlSpec: 'https://www.dell.com/pt-br/shop/notebooks-dell/notebook-dell-pro-15-essential/spd/dell-pro-pv15250-laptop/brppv15250wbtohxgg_x',
    Preco: 9299.00
  }
];

async function runTests(options = {}) {
  const { 
    sampleSize = TEST_DATA.length, 
    saveHtml = true, 
    saveScreenshots = true,
    headed = false 
  } = options;

  const sample = TEST_DATA.slice(0, sampleSize);
  
  log('=== TESTE DO SCRAPER DELL ===\n');
  log(`Amostra: ${sample.length} SKUs`);
  log(`Salvar HTML: ${saveHtml ? 'Sim' : 'Não'}`);
  log(`Salvar Screenshots: ${saveScreenshots ? 'Sim' : 'Não'}`);
  log(`Modo headed: ${headed ? 'Sim' : 'Não'}\n`);

  const scraper = new DellScraper({ headless: !headed });
  await scraper.init();

  results.total = sample.length;

  for (let i = 0; i < sample.length; i++) {
    const modelo = sample[i];
    const progresso = `[${i + 1}/${sample.length}]`;
    
    log(`${progresso} Testando ${modelo.Sku}`);
    log(`   URL: ${modelo.UrlSpec}`);
    log(`   Preço atual no BD: R$ ${modelo.Preco?.toFixed(2) || 'N/A'}`);

    const resultado = {
      sku: modelo.Sku,
      url: modelo.UrlSpec,
      timestamp: new Date().toISOString(),
      dadosBanco: {
        os: modelo.SistemaOperacional,
        memoria: modelo.Memoria,
        armazenamento: modelo.Armazenamento,
        precoAtual: modelo.Preco
      }
    };

    try {
      const scrapeResult = await scraper.scrapeUrl(modelo.UrlSpec, modelo.Sku);
      
      if (scrapeResult.error) {
        log(`   ❌ Erro no scraping: ${scrapeResult.error}`);
        resultado.status = 'erro';
        resultado.erro = scrapeResult.error;
        results.erro++;
        results.detalhes.push(resultado);
        continue;
      }

      log(`   ✅ Página carregada`);
      log(`   Configurações encontradas: ${scrapeResult.configs.length}`);

      // Salvar HTML para análise
      if (saveHtml && scrapeResult.html) {
        const htmlFile = path.join(HTML_DIR, `${modelo.Sku}-${timestamp}.html`);
        fs.writeFileSync(htmlFile, scrapeResult.html);
        resultado.htmlFile = htmlFile;
      }

      // Salvar screenshot para análise visual - reutiliza o HTML já salvo
      if (saveScreenshots && scrapeResult.html) {
        const page = await scraper.context.newPage();
        await page.setContent(scrapeResult.html, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        const screenshotFile = path.join(SCREENSHOTS_DIR, `${modelo.Sku}-${timestamp}.png`);
        await page.screenshot({ fullPage: true, path: screenshotFile });
        await page.close();
        resultado.screenshotFile = screenshotFile;
        log(`   📸 Screenshot salvo`);
      }

      // Detalhes das configurações encontradas
      if (scrapeResult.configs.length > 0) {
        log(`   Configurações na página:`);
        scrapeResult.configs.forEach((config, idx) => {
          log(`     [${idx + 1}] Preço: R$ ${config.price?.toFixed(2) || 'N/A'}, OS: ${config.os || 'N/A'}, RAM: ${config.memory || 'N/A'}, Storage: ${config.storage || 'N/A'}`);
        });
      }

      resultado.configsEncontradas = scrapeResult.configs;

      // Tentar matching
      const precoMatch = PriceExtractor.matchConfigToSku(scrapeResult.configs, modelo);
      
      if (precoMatch !== null) {
        log(`   💰 Preço match: R$ ${precoMatch.toFixed(2)}`);
        resultado.precoMatch = precoMatch;
        resultado.status = 'preco_encontrado';
        results.precoEncontrado++;
        
        const diferenca = precoMatch - (modelo.Preco || 0);
        if (Math.abs(diferenca) > 0.01) {
          log(`   ⚠️  Diferença de preço: R$ ${diferenca.toFixed(2)}`);
          resultado.diferenca = diferenca;
        }
      } else {
        log(`   ⚠️  Preço não encontrado para este SKU`);
        resultado.status = 'preco_nao_encontrado';
        results.precoNaoEncontrado++;
      }

      resultado.status = resultado.status || 'sucesso';
      results.sucesso++;

    } catch (error) {
      log(`   ❌ Erro inesperado: ${error.message}`);
      resultado.status = 'erro';
      resultado.erro = error.message;
      resultado.stack = error.stack;
      results.erro++;
    }

    results.detalhes.push(resultado);

    // Delay entre requisições
    if (i < sample.length - 1) {
      log(`   ⏱️  Aguardando 3s...\n`);
      await scraper.delay();
    } else {
      log('');
    }
  }

  await scraper.close();

  // Resumo
  log('=== RESUMO DO TESTE ===');
  log(`Total testado: ${results.total}`);
  log(`Sucesso (página carregada): ${results.sucesso}`);
  log(`Erros: ${results.erro}`);
  log(`Preço encontrado: ${results.precoEncontrado}`);
  log(`Preço NÃO encontrado: ${results.precoNaoEncontrado}`);

  await salvarLogs();
  
  log('\n✅ Teste concluído. Analise os logs antes de executar no banco.');
}

// Parse argumentos
const args = process.argv.slice(2);
const options = {
  sampleSize: parseInt(args.find(a => a.startsWith('--sample='))?.split('=')[1]) || TEST_DATA.length,
  saveHtml: !args.includes('--no-html'),
  saveScreenshots: args.includes('--screenshots'),
  headed: args.includes('--headed')
};

runTests(options).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
