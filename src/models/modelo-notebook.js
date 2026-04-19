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
        DataInclusao
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
          DataInclusao
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
          DataInclusao
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
      .query(`
        UPDATE ModeloNotebook 
        SET Preco = @preco 
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
}

module.exports = new ModeloNotebook();
