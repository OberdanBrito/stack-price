const { Command } = require('commander');

const program = new Command();

program
  .name('dell-scraper')
  .description('Scraper de preços Dell para ModeloNotebook')
  .version('1.0.0');

program
  .option('--all', 'Processar todos os SKUs com URL')
  .option('--fabricante <nome>', 'Filtrar por fabricante (ex: Dell)')
  .option('--sku <sku>', 'Processar SKU específico')
  .option('--dry-run', 'Simular execução sem atualizar banco')
  .option('--headed', 'Executar navegador em modo visível (não headless)')
  .option('--stats', 'Mostrar estatísticas do banco e sair')
  .option('--delay <ms>', 'Delay entre requisições em ms', '3000');

program.parse();

module.exports = program;
