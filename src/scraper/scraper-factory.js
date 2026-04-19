const DellScraper = require('./vendors/dell-scraper');
const LenovoScraper = require('./vendors/lenovo-scraper');

/**
 * Factory para criar instâncias de scraper por fabricante
 */
const scraperRegistry = {
  'Dell': DellScraper,
  'Lenovo': LenovoScraper,
  // Futuros fabricantes:
  // 'HP': HPScraper,
  // 'Asus': AsusScraper,
};

class ScraperFactory {
  /**
   * Cria uma instância de scraper para o fabricante especificado
   * @param {string} fabricante - Nome do fabricante (Dell, Lenovo, etc.)
   * @param {Object} options - Opções para o scraper (headless, delayMs, etc.)
   * @returns {BaseScraper} Instância do scraper apropriado
   * @throws {Error} Se fabricante não tiver scraper implementado
   */
  static create(fabricante, options = {}) {
    const normalizedFabricante = this.normalizeFabricante(fabricante);
    const ScraperClass = scraperRegistry[normalizedFabricante];
    
    if (!ScraperClass) {
      const disponiveis = Object.keys(scraperRegistry).join(', ');
      throw new Error(
        `Scraper não implementado para fabricante: "${fabricante}". ` +
        `Disponíveis: ${disponiveis}`
      );
    }
    
    return new ScraperClass(options);
  }

  /**
   * Verifica se existe scraper para um fabricante
   * @param {string} fabricante 
   * @returns {boolean}
   */
  static isSupported(fabricante) {
    const normalized = this.normalizeFabricante(fabricante);
    return normalized in scraperRegistry;
  }

  /**
   * Lista todos os fabricantes suportados
   * @returns {string[]}
   */
  static listSupported() {
    return Object.keys(scraperRegistry);
  }

  /**
   * Normaliza nome do fabricante (case-insensitive, trim)
   */
  static normalizeFabricante(fabricante) {
    if (!fabricante) return '';
    return fabricante.trim().charAt(0).toUpperCase() + 
           fabricante.trim().slice(1).toLowerCase();
  }

  /**
   * Auto-detecta fabricante baseado na URL
   * @param {string} url 
   * @returns {string|null}
   */
  static detectFromUrl(url) {
    if (!url) return null;
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('dell.com')) return 'Dell';
    if (urlLower.includes('lenovo.com')) return 'Lenovo';
    // if (urlLower.includes('hp.com')) return 'HP';
    // if (urlLower.includes('asus.com')) return 'Asus';
    
    return null;
  }
}

module.exports = ScraperFactory;
