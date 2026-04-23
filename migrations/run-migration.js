const { sql, getConnection, closeConnection } = require('../config/database');

async function columnExists(pool, tableName, columnName) {
  const result = await pool.request()
    .input('tableName', sql.VarChar, tableName)
    .input('columnName', sql.VarChar, columnName)
    .query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = @tableName 
        AND COLUMN_NAME = @columnName
    `);
  return result.recordset.length > 0;
}

async function runMigration() {
  try {
    console.log('Conectando ao banco de dados...');
    const pool = await getConnection();
    
    const tableName = 'ModeloNotebook';
    
    // Verificar UltimaVerificacao
    const ultimaVerificacaoExists = await columnExists(pool, tableName, 'UltimaVerificacao');
    if (!ultimaVerificacaoExists) {
      console.log('Adicionando coluna UltimaVerificacao...');
      await pool.request().query(`
        ALTER TABLE dbo.ModeloNotebook 
        ADD UltimaVerificacao date NULL
      `);
      console.log('Coluna UltimaVerificacao adicionada com sucesso.');
    } else {
      console.log('Coluna UltimaVerificacao já existe. Pulando...');
    }
    
    // Verificar MotivoFalha
    const motivoFalhaExists = await columnExists(pool, tableName, 'MotivoFalha');
    if (!motivoFalhaExists) {
      console.log('Adicionando coluna MotivoFalha...');
      await pool.request().query(`
        ALTER TABLE dbo.ModeloNotebook 
        ADD MotivoFalha varchar(255) NULL
      `);
      console.log('Coluna MotivoFalha adicionada com sucesso.');
    } else {
      console.log('Coluna MotivoFalha já existe. Pulando...');
    }
    
    console.log('\nMigração concluída com sucesso!');
    
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar migração:', error.message);
    await closeConnection();
    process.exit(1);
  }
}

runMigration();
