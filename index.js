require('dotenv').config();

const program = require('./src/cli');
const ScraperFactory = require('./src/scraper/scraper-factory');
const PriceExtractor = require('./src/scraper/price-extractor');
const modeloNotebook = require('./src/models/modelo-notebook');
const { closeConnection } = require('./config/database');

const options = program.opts();

async function showStats() {
  try {
    const stats = await modeloNotebook.getEstatisticas();
    
    console.log('\n=== Estatísticas do Banco ===\n');
    console.log(`Total de modelos: ${stats.geral.total}`);
    console.log(`Com URL: ${stats.geral.comUrl}`);
    console.log(`Com preço: ${stats.geral.comPreco}`);
    console.log(`Fabricantes: ${stats.geral.totalFabricantes}`);
    
    console.log('\n=== Por Fabricante ===');
    for (const fab of stats.porFabricante) {
      console.log(`${fab.Fabricante}: ${fab.total} total, ${fab.comUrl} com URL, ${fab.comPreco} com preço`);
    }
    
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error.message);
    await closeConnection();
    process.exit(1);
  }
}

async function main() {
  if (options.stats) {
    await showStats();
    return;
  }

  if (!options.all && !options.fabricante && !options.sku) {
    console.log('Use uma opção: --all, --fabricante <nome>, --sku <sku>, ou --stats');
    program.help();
  }

  let modelos = [];
  
  try {
    if (options.sku) {
      const modelo = await modeloNotebook.getBySku(options.sku);
      if (modelo) {
        modelos.push(modelo);
      } else {
        console.log(`SKU ${options.sku} não encontrado ou sem URL`);
        await closeConnection();
        process.exit(1);
      }
    } else if (options.fabricante) {
      modelos = await modeloNotebook.getByFabricante(options.fabricante);
    } else {
      modelos = await modeloNotebook.getAll();
    }

    if (modelos.length === 0) {
      console.log('Nenhum modelo encontrado com URL para processar');
      await closeConnection();
      process.exit(0);
    }

    console.log(`\nProcessando ${modelos.length} modelo(s)...\n`);
    console.log(`Fabricantes: ${[...new Set(modelos.map(m => m.Fabricante))].join(', ')}`);
    console.log(`Scrapers suportados: ${ScraperFactory.listSupported().join(', ')}\n`);

    // Agrupar modelos por fabricante
    const modelosPorFabricante = {};
    for (const modelo of modelos) {
      if (!modelosPorFabricante[modelo.Fabricante]) {
        modelosPorFabricante[modelo.Fabricante] = [];
      }
      modelosPorFabricante[modelo.Fabricante].push(modelo);
    }

    // Criar scrapers por fabricante
    const scrapers = {};
    for (const fabricante of Object.keys(modelosPorFabricante)) {
      if (!ScraperFactory.isSupported(fabricante)) {
        console.log(`⚠️  Fabricante "${fabricante}" não tem scraper implementado. Pulando ${modelosPorFabricante[fabricante].length} modelo(s).`);
        continue;
      }
      try {
        scrapers[fabricante] = ScraperFactory.create(fabricante, { headless: !options.headed });
        await scrapers[fabricante].init();
        console.log(`✅ Scraper para ${fabricante} inicializado`);
      } catch (error) {
        console.log(`❌ Erro ao inicializar scraper ${fabricante}: ${error.message}`);
      }
    }

    const resultados = {
      sucesso: 0,
      erro: 0,
      atualizados: 0,
      pulados: 0,
      detalhes: []
    };

    let processados = 0;
    const total = modelos.length;

    for (const [fabricante, modelosFab] of Object.entries(modelosPorFabricante)) {
      const scraper = scrapers[fabricante];
      if (!scraper) {
        resultados.pulados += modelosFab.length;
        for (const modelo of modelosFab) {
          resultados.detalhes.push({ sku: modelo.Sku, status: 'scraper_nao_disponivel', fabricante });
        }
        continue;
      }

      console.log(`\n[${fabricante}] Processando ${modelosFab.length} modelo(s)...`);

      for (let i = 0; i < modelosFab.length; i++) {
        const modelo = modelosFab[i];
        processados++;
        const progresso = `[${processados}/${total}]`;
        
        console.log(`${progresso} ${modelo.Sku} (${fabricante})`);

        try {
          const resultado = await scraper.scrapeUrl(modelo.UrlSpec, modelo.Sku);
          
          if (resultado.error) {
            console.log(`  ❌ Erro: ${resultado.error}`);
            resultados.erro++;
            resultados.detalhes.push({ sku: modelo.Sku, fabricante, status: 'erro', error: resultado.error });
            continue;
          }

          const precoEncontrado = PriceExtractor.matchConfigToSku(
            resultado.configs, 
            modelo
          );

          if (precoEncontrado === null) {
            console.log(`  ⚠️  Preço não encontrado na página`);
            resultados.detalhes.push({ sku: modelo.Sku, fabricante, status: 'preco_nao_encontrado' });
            continue;
          }

          console.log(`  💰 Preço: R$ ${precoEncontrado.toFixed(2)} (atual: R$ ${modelo.Preco ? modelo.Preco.toFixed(2) : 'N/A'})`);

          if (!options.dryRun) {
            const atualizado = await modeloNotebook.updatePreco(modelo.Sku, precoEncontrado);
            if (atualizado) {
              console.log(`  ✅ Atualizado`);
              resultados.atualizados++;
            } else {
              console.log(`  ⚠️  Sem alteração`);
            }
          } else {
            console.log(`  🔄 [DRY-RUN]`);
          }

          resultados.sucesso++;
          resultados.detalhes.push({ 
            sku: modelo.Sku, 
            fabricante,
            status: 'sucesso', 
            precoNovo: precoEncontrado,
            precoAntigo: modelo.Preco 
          });

        } catch (error) {
          console.log(`  ❌ Erro: ${error.message}`);
          resultados.erro++;
          resultados.detalhes.push({ sku: modelo.Sku, fabricante, status: 'erro', error: error.message });
        }

        // Delay entre requisições
        if (i < modelosFab.length - 1 || Object.keys(modelosPorFabricante).indexOf(fabricante) < Object.keys(modelosPorFabricante).length - 1) {
          await scraper.delay();
        }
      }

      await scraper.close();
    }

    // Resumo
    console.log('\n=== RESUMO ===');
    console.log(`Total: ${modelos.length}`);
    console.log(`Sucesso: ${resultados.sucesso}`);
    console.log(`Erros: ${resultados.erro}`);
    if (resultados.pulados > 0) {
      console.log(`Pulados (sem scraper): ${resultados.pulados}`);
    }
    if (!options.dryRun) {
      console.log(`Atualizados no banco: ${resultados.atualizados}`);
    } else {
      console.log(`[DRY-RUN] Nenhuma alteração realizada`);
    }

  } catch (error) {
    console.error('Erro fatal:', error.message);
    console.error(error.stack);
    await closeConnection();
    process.exit(1);
  }

  await closeConnection();
  process.exit(0);
}

main();
