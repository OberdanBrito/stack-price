const modeloNotebook = require('./src/models/modelo-notebook');
require('dotenv').config();

async function updateSkuUrl() {
  try {
    const sku = 'brpaa16250hbtohtwz_x';
    const novaUrl = 'https://www.dell.com/pt-br/shop/notebooks-gamer/notebook-gamer-alienware-16-area-51/spd/alienware-area-51-aa16250-gaming-laptop/brpaa16250hbtohtwz_x';
    
    console.log(`Atualizando URL para SKU ${sku}...`);
    const atualizado = await modeloNotebook.updateUrl(sku, novaUrl);
    
    if (atualizado) {
      console.log('URL atualizada com sucesso!');
      console.log(`Nova URL: ${novaUrl}`);
    } else {
      console.log('Nenhuma alteração realizada (SKU não encontrado ou URL já igual)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro ao atualizar URL:', error.message);
    process.exit(1);
  }
}

updateSkuUrl();
