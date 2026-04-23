const { Command } = require('commander');
const LenovoScraper = require('./scraper/vendors/lenovo-scraper');
const modeloNotebook = require('./models/modelo-notebook');
const { sql, getConnection, closeConnection } = require('../config/database');
require('dotenv').config();

const program = new Command();

program
  .name('lenovo-sku-discovery')
  .description('Script para descoberta de SKUs Lenovo em páginas de categoria/busca')
  .version('1.0.0');

program
  .requiredOption('--url <url>', 'URL da página de categoria/busca da Lenovo')
  .option('--max-pages <num>', 'Número máximo de páginas para navegar', '1')
  .option('--dry-run', 'Simular execução sem salvar no banco')
  .option('--headed', 'Executar navegador em modo visível')
  .option('--fabricante <nome>', 'Fabricante para salvar no banco (default: Lenovo)', 'Lenovo');

program.parse();

const options = program.opts();

async function main() {
  const scraper = new LenovoScraper({ 
    headless: !options.headed 
  });

  try {
    console.log('=== Lenovo SKU Discovery ===');
    console.log(`URL: ${options.url}`);
    console.log(`Máximo de páginas: ${options.maxPages}`);
    console.log(`Dry-run: ${options.dryRun ? 'Sim' : 'Não'}`);
    console.log('');

    await scraper.init();

    const maxPages = parseInt(options.maxPages);
    const products = await scraper.extractSkusFromCategoryPage(options.url, maxPages);

    console.log('');
    console.log('=== Resumo da Extração ===');
    console.log(`Total de produtos encontrados: ${products.length}`);
    console.log('');

    if (products.length === 0) {
      console.log('Nenhum produto encontrado.');
      return;
    }

    // Mostrar amostra dos produtos encontrados
    console.log('=== Amostra de Produtos (primeiros 10) ===');
    products.slice(0, 10).forEach((product, index) => {
      console.log(`${index + 1}. SKU: ${product.sku}`);
      console.log(`   Nome: ${product.productName}`);
      console.log(`   URL: ${product.productUrl}`);
      console.log('');
    });

    if (products.length > 10) {
      console.log(`... e mais ${products.length - 10} produtos`);
      console.log('');
    }

    if (options.dryRun) {
      console.log('=== Modo Dry-Run ===');
      console.log('Nenhum dado será salvo no banco.');
      return;
    }

    // Integrar com banco de dados
    console.log('=== Integração com Banco de Dados ===');
    let novosSkus = 0;
    let skusAtualizados = 0;
    let skusExistentes = 0;

    for (const product of products) {
      try {
        // Verificar se SKU já existe
        const existente = await modeloNotebook.getBySku(product.sku);

        if (existente) {
          skusExistentes++;
          
          // Atualizar URL se for diferente
          if (existente.UrlSpec !== product.productUrl) {
            await modeloNotebook.updateUrl(product.sku, product.productUrl);
            skusAtualizados++;
            console.log(`✓ SKU ${product.sku}: URL atualizada`);
          } else {
            console.log(`- SKU ${product.sku}: já existe com mesma URL`);
          }
        } else {
          // Inserir novo SKU
          const pool = await getConnection();
          await pool.request()
            .input('sku', sql.VarChar, product.sku)
            .input('fabricante', sql.VarChar, options.fabricante)
            .input('serie', sql.VarChar, product.productName.substring(0, 40))
            .input('urlSpec', sql.VarChar, product.productUrl)
            .query(`
              INSERT INTO ModeloNotebook (Sku, Fabricante, Serie, UrlSpec, DataInclusao)
              VALUES (@sku, @fabricante, @serie, @urlSpec, GETDATE())
            `);
          
          novosSkus++;
          console.log(`✓ SKU ${product.sku}: novo SKU inserido`);
        }
      } catch (error) {
        console.error(`✗ Erro ao processar SKU ${product.sku}:`, error.message);
      }
    }

    console.log('');
    console.log('=== Resumo da Integração ===');
    console.log(`Novos SKUs inseridos: ${novosSkus}`);
    console.log(`SKUs com URL atualizada: ${skusAtualizados}`);
    console.log(`SKUs já existentes (sem alteração): ${skusExistentes}`);
    console.log(`Total processados: ${products.length}`);

  } catch (error) {
    console.error('Erro na execução:', error);
    process.exit(1);
  } finally {
    await scraper.close();
    await closeConnection();
  }
}

main();
