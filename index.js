require('dotenv').config();

const program = require('./src/cli');
const DellScraper = require('./src/scraper/dell-scraper');
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

    const scraper = new DellScraper({
      headless: !options.headed
    });
    
    await scraper.init();

    const resultados = {
      sucesso: 0,
      erro: 0,
      atualizados: 0,
      detalhes: []
    };

    for (let i = 0; i < modelos.length; i++) {
      const modelo = modelos[i];
      const progresso = `[${i + 1}/${modelos.length}]`;
      
      console.log(`${progresso} Processando ${modelo.Sku}...`);

      try {
        const resultado = await scraper.scrapeUrl(modelo.UrlSpec, modelo.Sku);
        
        if (resultado.error) {
          console.log(`  ❌ Erro: ${resultado.error}`);
          resultados.erro++;
          resultados.detalhes.push({ sku: modelo.Sku, status: 'erro', error: resultado.error });
          continue;
        }

        const precoEncontrado = PriceExtractor.matchConfigToSku(
          resultado.configs, 
          modelo
        );

        if (precoEncontrado === null) {
          console.log(`  ⚠️  Preço não encontrado na página`);
          resultados.detalhes.push({ sku: modelo.Sku, status: 'preco_nao_encontrado' });
          continue;
        }

        console.log(`  💰 Preço encontrado: R$ ${precoEncontrado.toFixed(2)}`);
        console.log(`     Preço atual: R$ ${modelo.Preco ? modelo.Preco.toFixed(2) : 'N/A'}`);

        if (!options.dryRun) {
          const atualizado = await modeloNotebook.updatePreco(modelo.Sku, precoEncontrado);
          if (atualizado) {
            console.log(`  ✅ Preço atualizado no banco`);
            resultados.atualizados++;
          } else {
            console.log(`  ⚠️  Nenhuma linha atualizada`);
          }
        } else {
          console.log(`  🔄 [DRY-RUN] Preço seria atualizado: R$ ${precoEncontrado.toFixed(2)}`);
        }

        resultados.sucesso++;
        resultados.detalhes.push({ 
          sku: modelo.Sku, 
          status: 'sucesso', 
          precoNovo: precoEncontrado,
          precoAntigo: modelo.Preco 
        });

      } catch (error) {
        console.log(`  ❌ Erro inesperado: ${error.message}`);
        resultados.erro++;
        resultados.detalhes.push({ sku: modelo.Sku, status: 'erro', error: error.message });
      }

      // Delay entre requisições
      if (i < modelos.length - 1) {
        await scraper.delay();
      }
    }

    await scraper.close();

    // Resumo
    console.log('\n=== RESUMO ===');
    console.log(`Total processado: ${modelos.length}`);
    console.log(`Sucesso: ${resultados.sucesso}`);
    console.log(`Erros: ${resultados.erro}`);
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
