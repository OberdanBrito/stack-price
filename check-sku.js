const { sql, getConnection, closeConnection } = require('./config/database');
require('dotenv').config();

async function checkSku() {
  try {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('sku', sql.VarChar, 'brpaa16250hbtohtwz_x')
      .query(`
        SELECT 
          Sku, 
          Fabricante, 
          Serie, 
          Processador, 
          SistemaOperacional, 
          PlacaVideo, 
          Memoria, 
          Armazenamento, 
          Tela, 
          UrlSpec, 
          Preco, 
          DataInclusao,
          UltimaVerificacao,
          MotivoFalha
        FROM ModeloNotebook 
        WHERE Sku = @sku
      `);
    
    if (result.recordset.length === 0) {
      console.log('SKU não encontrado no banco de dados');
    } else {
      const sku = result.recordset[0];
      console.log('\n=== SKU encontrado no banco ===');
      console.log(`Sku: ${sku.Sku}`);
      console.log(`Fabricante: ${sku.Fabricante}`);
      console.log(`Serie: ${sku.Serie}`);
      console.log(`UrlSpec: ${sku.UrlSpec}`);
      console.log(`Preco: ${sku.Preco ? `R$ ${sku.Preco.toFixed(2)}` : 'N/A'}`);
      console.log(`DataInclusao: ${sku.DataInclusao}`);
      console.log(`UltimaVerificacao: ${sku.UltimaVerificacao || 'N/A'}`);
      console.log(`MotivoFalha: ${sku.MotivoFalha || 'N/A'}`);
      
      console.log('\n=== Comparação com URL fornecida ===');
      const providedUrl = 'https://www.dell.com/pt-br/shop/notebooks-gamer/notebook-gamer-alienware-16-area-51/spd/alienware-area-51-aa16250-gaming-laptop/brpaa16250hbtohtwz_x';
      console.log(`URL fornecida: ${providedUrl}`);
      console.log(`URL no banco: ${sku.UrlSpec}`);
      console.log(`URLs iguais: ${sku.UrlSpec === providedUrl ? 'SIM' : 'NÃO'}`);
      
      console.log('\n=== Comparação de preço ===');
      const expectedPrice = 19498.00;
      console.log(`Preço esperado: R$ ${expectedPrice.toFixed(2)}`);
      console.log(`Preço no banco: ${sku.Preco ? `R$ ${sku.Preco.toFixed(2)}` : 'N/A'}`);
      if (sku.Preco) {
        const diff = Math.abs(sku.Preco - expectedPrice);
        console.log(`Diferença: R$ ${diff.toFixed(2)}`);
        console.log(`Preço próximo: ${diff < 100 ? 'SIM' : 'NÃO'}`);
      }
    }
    
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao consultar SKU:', error.message);
    await closeConnection();
    process.exit(1);
  }
}

checkSku();
