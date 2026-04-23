const { sql, getConnection } = require('../../config/database');

class ModeloNotebook {
  async getAll() {
    const pool = await getConnection();
    const result = await pool.request().query(`
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
      WHERE UrlSpec IS NOT NULL 
        AND UrlSpec <> ''
      ORDER BY Fabricante, Serie, Sku
    `);
    return result.recordset;
  }

  async getByFabricante(fabricante) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('fabricante', sql.VarChar, fabricante)
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
        WHERE Fabricante = @fabricante
          AND UrlSpec IS NOT NULL 
          AND UrlSpec <> ''
        ORDER BY Serie, Sku
      `);
    return result.recordset;
  }

  async getBySku(sku) {
    const pool = await getConnection();
    const result = await pool.request()
      .input('sku', sql.VarChar, sku)
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
          AND UrlSpec IS NOT NULL 
          AND UrlSpec <> ''
      `);
    return result.recordset[0] || null;
  }

  async updatePreco(sku, novoPreco) {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('sku', sql.VarChar, sku)
      .input('preco', sql.Decimal(10, 2), novoPreco)
      .input('ultimaVerificacao', sql.Date, new Date())
      .query(`
        UPDATE ModeloNotebook 
        SET Preco = @preco,
            UltimaVerificacao = @ultimaVerificacao
        WHERE Sku = @sku;
        
        SELECT @@ROWCOUNT AS updated;
      `);
    
    return result.recordset[0].updated > 0;
  }

  async updateVerificacao(sku) {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('sku', sql.VarChar, sku)
      .input('ultimaVerificacao', sql.Date, new Date())
      .query(`
        UPDATE ModeloNotebook 
        SET UltimaVerificacao = @ultimaVerificacao,
            MotivoFalha = NULL
        WHERE Sku = @sku;
        
        SELECT @@ROWCOUNT AS updated;
      `);
    
    return result.recordset[0].updated > 0;
  }

  async updateMotivoFalha(sku, motivo) {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('sku', sql.VarChar, sku)
      .input('ultimaVerificacao', sql.Date, new Date())
      .input('motivoFalha', sql.VarChar(255), motivo)
      .query(`
        UPDATE ModeloNotebook 
        SET UltimaVerificacao = @ultimaVerificacao,
            MotivoFalha = @motivoFalha
        WHERE Sku = @sku;
        
        SELECT @@ROWCOUNT AS updated;
      `);
    
    return result.recordset[0].updated > 0;
  }

  async updateUrl(sku, novaUrl) {
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('sku', sql.VarChar, sku)
      .input('urlSpec', sql.VarChar(255), novaUrl)
      .query(`
        UPDATE ModeloNotebook 
        SET UrlSpec = @urlSpec
        WHERE Sku = @sku;
        
        SELECT @@ROWCOUNT AS updated;
      `);
    
    return result.recordset[0].updated > 0;
  }

  async getEstatisticas() {
    const pool = await getConnection();
    
    const stats = await pool.request().query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN UrlSpec IS NOT NULL AND UrlSpec <> '' THEN 1 END) AS comUrl,
        COUNT(CASE WHEN Preco IS NOT NULL THEN 1 END) AS comPreco,
        COUNT(DISTINCT Fabricante) AS totalFabricantes
      FROM ModeloNotebook
    `);

    const porFabricante = await pool.request().query(`
      SELECT 
        Fabricante,
        COUNT(*) AS total,
        COUNT(CASE WHEN UrlSpec IS NOT NULL AND UrlSpec <> '' THEN 1 END) AS comUrl,
        COUNT(CASE WHEN Preco IS NOT NULL THEN 1 END) AS comPreco
      FROM ModeloNotebook
      GROUP BY Fabricante
      ORDER BY Fabricante
    `);

    return {
      geral: stats.recordset[0],
      porFabricante: porFabricante.recordset
    };
  }

  async updateSpecs(sku, specs) {
    const pool = await getConnection();
    
    // Helper para truncar strings e normalizar caracteres especiais
    const truncate = (str, maxLen) => {
      if (!str) return null;
      // Remover caracteres especiais problemáticos
      const normalized = str
        .replace(/[™®©]/g, '')  // Remover símbolos trademark
        .replace(/\s+/g, ' ')    // Normalizar espaços
        .trim();
      return normalized.substring(0, maxLen);
    };
    
    const result = await pool.request()
      .input('sku', sql.NVarChar, sku)
      .input('processador', sql.NVarChar(50), truncate(specs.processador, 45))
      .input('sistemaOperacional', sql.NVarChar(30), truncate(specs.sistemaOperacional, 28))
      .input('placaVideo', sql.NVarChar(50), truncate(specs.placaVideo, 45))
      .input('memoria', sql.NVarChar(20), truncate(specs.memoria, 18))
      .input('armazenamento', sql.NVarChar(30), truncate(specs.armazenamento, 28))
      .input('tela', sql.NVarChar(100), truncate(specs.tela, 95))
      .input('ultimaVerificacao', sql.Date, new Date())
      .query(`
        UPDATE ModeloNotebook 
        SET Processador = @processador,
            SistemaOperacional = @sistemaOperacional,
            PlacaVideo = @placaVideo,
            Memoria = @memoria,
            Armazenamento = @armazenamento,
            Tela = @tela,
            UltimaVerificacao = @ultimaVerificacao
        WHERE Sku = @sku;
        
        SELECT @@ROWCOUNT AS updated;
      `);
    
    return result.recordset[0].updated > 0;
  }
}

module.exports = new ModeloNotebook();
