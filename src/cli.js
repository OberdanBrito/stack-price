const { Command } = require('commander');
const ScraperFactory = require('./scraper/scraper-factory');

const program = new Command();
const suportados = ScraperFactory.listSupported().join(', ');

program
  .name('stack-price')
  .description(`Scraper multi-fabricante para atualização de preços\nSuportados: ${suportados}`)
  .version('1.0.0');

program
  .option('--all', 'Processar todos os SKUs com URL (todos os fabricantes)')
  .option('--fabricante <nome>', `Filtrar por fabricante (${suportados})`)
  .option('--sku <sku>', 'Processar SKU específico')
  .option('--dry-run', 'Simular execução sem atualizar banco')
  .option('--headed', 'Executar navegador em modo visível (não headless)')
  .option('--stats', 'Mostrar estatísticas do banco e sair')
  .option('--delay <ms>', 'Delay entre requisições em ms', '3000');

program.parse();

module.exports = program;
