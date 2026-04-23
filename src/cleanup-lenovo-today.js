const { getConnection, closeConnection } = require('../config/database');
require('dotenv').config();

async function cleanup() {
  try {
    console.log('=== Limpeza de Registros Lenovo - Data de Hoje com Processador Nulo ===\n');
    
    const pool = await getConnection();
    
    // Verificar quantos registros serão afetados
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as total 
      FROM ModeloNotebook 
      WHERE CAST(DataInclusao AS DATE) = CAST(GETDATE() AS DATE)
        AND (Processador IS NULL OR Processador = '')
    `);
    
    const totalRegistros = checkResult.recordset[0].total;
    console.log(`Registros encontrados para remoção: ${totalRegistros}`);
    
    if (totalRegistros === 0) {
      console.log('Nenhum registro encontrado com os critérios especificados.');
      return;
    }
    
    // Mostrar os registros que serão removidos
    const previewResult = await pool.request().query(`
      SELECT Sku, Fabricante, Serie, UrlSpec, DataInclusao
      FROM ModeloNotebook 
      WHERE CAST(DataInclusao AS DATE) = CAST(GETDATE() AS DATE)
        AND (Processador IS NULL OR Processador = '')
      ORDER BY DataInclusao DESC
    `);
    
    console.log('\n=== Registros que serão removidos ===');
    previewResult.recordset.forEach((row, index) => {
      console.log(`${index + 1}. SKU: ${row.Sku}`);
      console.log(`   Fabricante: ${row.Fabricante}`);
      console.log(`   Série: ${row.Serie}`);
      console.log(`   URL: ${row.UrlSpec}`);
      console.log(`   Data: ${row.DataInclusao}`);
      console.log('');
    });
    
    // Remover os registros
    const deleteResult = await pool.request().query(`
      DELETE FROM ModeloNotebook 
      WHERE CAST(DataInclusao AS DATE) = CAST(GETDATE() AS DATE)
        AND (Processador IS NULL OR Processador = '')
    `);
    
    console.log(`\n=== Resultado ===`);
    console.log(`${deleteResult.rowsAffected} registros removidos com sucesso.`);
    
  } catch (error) {
    console.error('Erro na execução:', error.message);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

cleanup();
