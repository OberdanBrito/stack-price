const { Command } = require('commander');
const LenovoScraper = require('./scraper/vendors/lenovo-scraper');
const modeloNotebook = require('./models/modelo-notebook');
const { closeConnection } = require('../config/database');
require('dotenv').config();

const program = new Command();

program
  .name('lenovo-specs-update')
  .description('Script para atualizar especificações técnicas de notebooks Lenovo no banco de dados')
  .version('1.0.0');

program
  .option('--fabricante <nome>', 'Fabricante para processar (default: Lenovo)', 'Lenovo')
  .option('--sku <sku>', 'Processar SKU específico')
  .option('--dry-run', 'Simular execução sem salvar no banco')
  .option('--headed', 'Executar navegador em modo visível')
  .option('--limit <num>', 'Limite de registros para processar (default: todos)', '0');

program.parse();

const options = program.opts();

async function main() {
  const scraper = new LenovoScraper({ 
    headless: !options.headed 
  });

  try {
    console.log('=== Lenovo Specs Update ===');
    console.log(`Fabricante: ${options.fabricante}`);
    console.log(`Dry-run: ${options.dryRun ? 'Sim' : 'Não'}`);
    console.log('');

    await scraper.init();

    // Buscar modelos sem specs ou todos do fabricante
    let modelos;
    if (options.sku) {
      const modelo = await modeloNotebook.getBySku(options.sku);
      modelos = modelo ? [modelo] : [];
    } else {
      modelos = await modeloNotebook.getByFabricante(options.fabricante);
    }

    // Filtrar apenas os que precisam de specs (Processador nulo) ou todos se especificado
    const modelosParaProcessar = options.limit > 0 
      ? modelos.slice(0, parseInt(options.limit))
      : modelos;

    console.log(`Total de modelos ${options.fabricante}: ${modelos.length}`);
    console.log(`Modelos para processar: ${modelosParaProcessar.length}`);
    console.log('');

    if (modelosParaProcessar.length === 0) {
      console.log('Nenhum modelo encontrado para processar.');
      return;
    }

    let sucessos = 0;
    let erros = 0;
    let pulados = 0;

    for (let i = 0; i < modelosParaProcessar.length; i++) {
      const modelo = modelosParaProcessar[i];
      const progresso = `[${i + 1}/${modelosParaProcessar.length}]`;

      console.log(`${progresso} Processando ${modelo.Sku}...`);

      // Pular se já tem processador preenchido
      if (modelo.Processador && !options.sku) {
        console.log(`     Pulando - já possui processador: ${modelo.Processador.substring(0, 50)}...`);
        pulados++;
        continue;
      }

      try {
        const resultado = await scraper.extractDetailedSpecs(modelo.UrlSpec, modelo.Sku);

        if (resultado.error) {
          console.log(`     Erro: ${resultado.errorMessage}`);
          erros++;
          continue;
        }

        const specs = resultado.specs;
        const preco = resultado.preco;

        // Verificar se conseguiu extrair algo
        const temSpecs = Object.values(specs).some(v => v !== null);
        
        if (!temSpecs) {
          console.log(`     Nenhuma especificação encontrada na página`);
          erros++;
          continue;
        }

        console.log(`     Processador: ${specs.processador || 'N/A'}`);
        console.log(`     SO: ${specs.sistemaOperacional || 'N/A'}`);
        console.log(`     Placa Vídeo: ${specs.placaVideo || 'N/A'}`);
        console.log(`     Memória: ${specs.memoria || 'N/A'}`);
        console.log(`     Armazenamento: ${specs.armazenamento || 'N/A'}`);
        console.log(`     Tela: ${specs.tela || 'N/A'}`);
        console.log(`     Preço: ${preco || 'N/A'}`);

        if (!options.dryRun) {
          console.log(`     DEBUG: Atualizando specs para ${modelo.Sku}`);
          console.log(`     DEBUG: Specs:`, JSON.stringify(specs));
          
          try {
            const atualizado = await modeloNotebook.updateSpecs(modelo.Sku, specs);
            
            if (atualizado) {
              console.log(`     ✓ Especificações atualizadas`);
              sucessos++;
            } else {
              console.log(`     ✗ Falha ao atualizar specs (nenhuma linha afetada)`);
              erros++;
            }
          } catch (dbError) {
            console.log(`     ✗ Erro do banco: ${dbError.message}`);
            erros++;
          }
        } else {
          console.log(`     [DRY-RUN] Não salvo`);
          sucessos++;
        }

      } catch (error) {
        console.log(`     Erro: ${error.message}`);
        erros++;
      }

      // Delay entre requisições
      if (i < modelosParaProcessar.length - 1) {
        await scraper.delay();
      }
    }

    console.log('');
    console.log('=== Resumo ===');
    console.log(`Total processados: ${modelosParaProcessar.length}`);
    console.log(`Sucessos: ${sucessos}`);
    console.log(`Erros: ${erros}`);
    console.log(`Pulados (já tinham specs): ${pulados}`);

  } catch (error) {
    console.error('Erro na execução:', error);
    process.exit(1);
  } finally {
    await scraper.close();
    await closeConnection();
  }
}

main();
