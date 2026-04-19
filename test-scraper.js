/**
 * Script de teste multi-fabricante
 * Salva logs detalhados para análise antes de atualizar banco
 */

const fs = require('fs');
const path = require('path');
const ScraperFactory = require('./src/scraper/scraper-factory');
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
  // Dell
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
  // Lenovo
  {
    Sku: '82yu000lbr',
    Fabricante: 'Lenovo',
    Serie: 'V14 G3',
    Processador: 'Intel Core i3-1315U',
    SistemaOperacional: 'Windows 11 Home',
    PlacaVideo: 'Intel UHD Graphics',
    Memoria: '8 GB DDR5',
    Armazenamento: '256 GB SSD',
    Tela: '14.0" Full HD (1920x1080)',
    UrlSpec: 'https://www.lenovo.com/br/pt/laptops/lenovo/v-series/Lenovo-V14-G3-IAP/p/82YU000LBR',
    Preco: 3644.99
  },
  {
    Sku: '21jq0006br',
    Fabricante: 'Lenovo',
    Serie: 'ThinkPad E14 G6',
    Processador: 'Intel Core Ultra 5 225U',
    SistemaOperacional: 'Windows 11 Home',
    PlacaVideo: 'Intel Graphics',
    Memoria: '16 GB DDR5',
    Armazenamento: '512 GB SSD',
    Tela: '14.0" WUXGA (1920x1200)',
    UrlSpec: 'https://www.lenovo.com/br/pt/laptops/thinkpad/thinkpad-e-series/ThinkPad-E14-G6/p/21JQ0006BR',
    Preco: 8954.99
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
  
  log('=== TESTE MULTI-FABRICANTE ===\n');
  log(`Amostra: ${sample.length} SKUs`);
  log(`Fabricantes: ${[...new Set(sample.map(s => s.Fabricante))].join(', ')}`);
  log(`Suportados: ${ScraperFactory.listSupported().join(', ')}`);
  log(`Salvar HTML: ${saveHtml ? 'Sim' : 'Não'}`);
  log(`Salvar Screenshots: ${saveScreenshots ? 'Sim' : 'Não'}`);
  log(`Modo headed: ${headed ? 'Sim' : 'Não'}\n`);

  results.total = sample.length;

  // Agrupar por fabricante
  const porFabricante = {};
  for (const modelo of sample) {
    if (!porFabricante[modelo.Fabricante]) {
      porFabricante[modelo.Fabricante] = [];
    }
    porFabricante[modelo.Fabricante].push(modelo);
  }

  // Criar scrapers por fabricante
  const scrapers = {};
  for (const fabricante of Object.keys(porFabricante)) {
    if (!ScraperFactory.isSupported(fabricante)) {
      log(`⚠️  Fabricante "${fabricante}" não suportado. Pulando.`);
      continue;
    }
    try {
      scrapers[fabricante] = ScraperFactory.create(fabricante, { headless: !headed });
      await scrapers[fabricante].init();
      log(`✅ Scraper ${fabricante} inicializado`);
    } catch (error) {
      log(`❌ Erro ao criar scraper ${fabricante}: ${error.message}`);
    }
  }

  let processados = 0;

  for (const [fabricante, modelosFab] of Object.entries(porFabricante)) {
    const scraper = scrapers[fabricante];
    if (!scraper) {
      for (const modelo of modelosFab) {
        results.erro++;
        results.detalhes.push({
          sku: modelo.Sku,
          fabricante,
          status: 'scraper_nao_disponivel'
        });
      }
      continue;
    }

    log(`\n[${fabricante}] Testando ${modelosFab.length} modelo(s)...`);

    for (let i = 0; i < modelosFab.length; i++) {
      const modelo = modelosFab[i];
      processados++;
      const progresso = `[${processados}/${sample.length}]`;
      
      log(`${progresso} ${modelo.Sku} (${fabricante})`);
      log(`   URL: ${modelo.UrlSpec}`);
      log(`   Preço BD: R$ ${modelo.Preco?.toFixed(2) || 'N/A'}`);

      const resultado = {
        sku: modelo.Sku,
        fabricante,
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
          log(`   ❌ Erro: ${scrapeResult.error}`);
          resultado.status = 'erro';
          resultado.erro = scrapeResult.error;
          results.erro++;
          results.detalhes.push(resultado);
          continue;
        }

        log(`   ✅ Página carregada | Configs: ${scrapeResult.configs.length}`);

        if (saveHtml && scrapeResult.html) {
          const htmlFile = path.join(HTML_DIR, `${modelo.Sku}-${timestamp}.html`);
          fs.writeFileSync(htmlFile, scrapeResult.html);
          resultado.htmlFile = htmlFile;
        }

        if (saveScreenshots && scrapeResult.html) {
          const page = await scraper.context.newPage();
          await page.setContent(scrapeResult.html, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000);
          const screenshotFile = path.join(SCREENSHOTS_DIR, `${modelo.Sku}-${timestamp}.png`);
          await page.screenshot({ fullPage: true, path: screenshotFile });
          await page.close();
          resultado.screenshotFile = screenshotFile;
          log(`   📸 Screenshot`);
        }

        if (scrapeResult.configs.length > 0) {
          scrapeResult.configs.forEach((config, idx) => {
            log(`     [${idx + 1}] R$ ${config.price?.toFixed(2) || 'N/A'}`);
          });
        }

        resultado.configsEncontradas = scrapeResult.configs;

        const precoMatch = PriceExtractor.matchConfigToSku(scrapeResult.configs, modelo);
        
        if (precoMatch !== null) {
          log(`   💰 Match: R$ ${precoMatch.toFixed(2)}`);
          resultado.precoMatch = precoMatch;
          resultado.status = 'preco_encontrado';
          results.precoEncontrado++;
          
          const diferenca = precoMatch - (modelo.Preco || 0);
          if (Math.abs(diferenca) > 0.01) {
            log(`   ⚠️  Diferença: R$ ${diferenca.toFixed(2)}`);
            resultado.diferenca = diferenca;
          }
        } else {
          log(`   ⚠️  Preço não encontrado`);
          resultado.status = 'preco_nao_encontrado';
          results.precoNaoEncontrado++;
        }

        results.sucesso++;

      } catch (error) {
        log(`   ❌ Erro: ${error.message}`);
        resultado.status = 'erro';
        resultado.erro = error.message;
        results.erro++;
      }

      results.detalhes.push(resultado);

      if (i < modelosFab.length - 1) {
        await scraper.delay();
      }
    }

    await scraper.close();
  }

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
