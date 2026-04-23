/**
 * Classe centralizada para detecção e classificação de erros em scrapers
 * Elimina duplicação de código entre diferentes vendors
 */
class ScraperErrorHandler {
  // Códigos de erro padronizados
  static ERROR_CODES = {
    LINK_CHANGED: 'LINK_CHANGED',
    SITE_DOWN: 'SITE_DOWN',
    PRODUCT_REMOVED: 'PRODUCT_REMOVED',
    SELECTOR_NOT_FOUND: 'SELECTOR_NOT_FOUND',
    PRICE_REMOVED: 'PRICE_REMOVED',
    TIMEOUT: 'TIMEOUT',
    CONNECTION_ERROR: 'CONNECTION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  // Mensagens de erro padronizadas
  static ERROR_MESSAGES = {
    LINK_CHANGED: 'Página não encontrada (link do SKU pode ter mudado)',
    SITE_DOWN: (status) => `Erro HTTP ${status} (site pode estar fora do ar)`,
    PRODUCT_REMOVED: 'Produto não encontrado na página (fornecedor pode ter removido o produto)',
    SELECTOR_NOT_FOUND: 'Seletor de preço não encontrado (estrutura da página pode ter mudado)',
    PRICE_REMOVED: 'Seletor encontrado mas preço vazio (fornecedor pode ter removido o preço)',
    TIMEOUT: 'Timeout ao carregar página (site pode estar fora do ar ou lento)',
    CONNECTION_ERROR: 'Erro de conexão (site pode estar fora do ar)',
    UNKNOWN_ERROR: (msg) => msg
  };

  /**
   * Verifica status HTTP e retorna erro apropriado se necessário
   * @param {Response} response - Objeto de resposta do Playwright
   * @param {string} url - URL da página
   * @param {string} sku - SKU do produto
   * @returns {Object|null} Objeto de erro ou null se OK
   */
  static checkHttpStatus(response, url, sku) {
    if (response.status() === 404) {
      return this.createErrorResponse(
        this.ERROR_CODES.LINK_CHANGED,
        this.ERROR_MESSAGES.LINK_CHANGED,
        url,
        sku,
        'PAGE_NOT_FOUND'
      );
    }

    if (!response.ok()) {
      return this.createErrorResponse(
        this.ERROR_CODES.SITE_DOWN,
        this.ERROR_MESSAGES.SITE_DOWN(response.status()),
        url,
        sku,
        `HTTP_ERROR_${response.status()}`
      );
    }

    return null;
  }

  /**
   * Detecta erros de timeout
   * @param {Error} error - Objeto de erro
   * @returns {boolean} True se for timeout
   */
  static isTimeout(error) {
    return error.message.includes('timeout') || error.name === 'TimeoutError';
  }

  /**
   * Detecta erros de conexão
   * @param {Error} error - Objeto de erro
   * @returns {boolean} True se for erro de conexão
   */
  static isConnectionError(error) {
    return error.message.includes('net::') || error.message.includes('ERR_');
  }

  /**
   * Classifica um erro e retorna código/mensagem apropriados
   * @param {Error} error - Objeto de erro
   * @param {string} url - URL da página
   * @param {string} sku - SKU do produto
   * @returns {Object} Objeto de erro classificado
   */
  static classifyError(error, url, sku) {
    if (this.isTimeout(error)) {
      return this.createErrorResponse(
        this.ERROR_CODES.TIMEOUT,
        this.ERROR_MESSAGES.TIMEOUT,
        url,
        sku,
        error.message
      );
    }

    if (this.isConnectionError(error)) {
      return this.createErrorResponse(
        this.ERROR_CODES.CONNECTION_ERROR,
        this.ERROR_MESSAGES.CONNECTION_ERROR,
        url,
        sku,
        error.message
      );
    }

    return this.createErrorResponse(
      this.ERROR_CODES.UNKNOWN_ERROR,
      this.ERROR_MESSAGES.UNKNOWN_ERROR(error.message),
      url,
      sku,
      error.message
    );
  }

  /**
   * Verifica se o produto existe na página
   * @param {Page} page - Página do Playwright
   * @param {Array} selectors - Array de seletores específicos do vendor
   * @returns {Promise<boolean>} True se produto existe
   */
  static async checkProductExists(page, selectors) {
    try {
      const exists = await page.evaluate((selArray) => {
        for (const selector of selArray) {
          if (document.querySelector(selector)) {
            return true;
          }
        }

        const bodyText = document.body.textContent.toLowerCase();
        if (bodyText.includes('produto não encontrado') || 
            bodyText.includes('product not found') ||
            bodyText.includes('page not found') ||
            bodyText.includes('item not found')) {
          return false;
        }

        return true;
      }, selectors);
      return exists;
    } catch (e) {
      return true;
    }
  }

  /**
   * Aguarda conteúdo de preço carregar
   * @param {Page} page - Página do Playwright
   * @param {Array} selectors - Array de seletores de preço
   * @returns {Promise<void>}
   */
  static async waitForPriceContent(page, selectors) {
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch (e) {
        continue;
      }
    }
  }

  /**
   * Verifica se configs está vazio
   * @param {Array} configs - Array de configurações
   * @returns {boolean} True se vazio
   */
  static checkEmptyConfigs(configs) {
    return configs.length === 0;
  }

  /**
   * Verifica se configs tem preço válido
   * @param {Array} configs - Array de configurações
   * @returns {boolean} True se tem preço válido
   */
  static checkValidPrice(configs) {
    return configs.some(c => c.price !== null && c.price !== undefined);
  }

  /**
   * Cria objeto de erro padronizado
   * @param {string} errorCode - Código do erro
   * @param {string} errorMessage - Mensagem do erro
   * @param {string} url - URL da página
   * @param {string} sku - SKU do produto
   * @param {string} [originalError] - Erro original (opcional)
   * @param {Array} [configs] - Configurações extraídas (opcional)
   * @param {string} [html] - HTML da página (opcional)
   * @returns {Object} Objeto de erro
   */
  static createErrorResponse(errorCode, errorMessage, url, sku, originalError, configs, html) {
    const response = {
      url,
      sku,
      error: originalError || errorCode,
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString()
    };

    if (configs !== undefined) {
      response.configs = configs;
    }

    if (html !== undefined) {
      response.html = html;
    }

    return response;
  }

  /**
   * Cria objeto de sucesso padronizado
   * @param {string} url - URL da página
   * @param {string} sku - SKU do produto
   * @param {Array} configs - Configurações extraídas
   * @param {string} html - HTML da página
   * @returns {Object} Objeto de sucesso
   */
  static createSuccessResponse(url, sku, configs, html) {
    return {
      url,
      sku,
      configs,
      html,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Parser genérico de preço brasileiro (R$ 1.234,56)
   * @param {string} priceText - Texto do preço
   * @returns {number|null} Preço parseado ou null
   */
  static parsePrice(priceText) {
    if (!priceText) return null;
    
    const cleaned = priceText
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  /**
   * Extrai especificações baseadas em mapeamento
   * @param {NodeList} elements - Elementos para analisar
   * @param {Object} specMapping - Mapeamento de palavras-chave para campos
   * @returns {Object} Especificações extraídas
   */
  static extractSpecs(elements, specMapping) {
    const specs = {};
    
    elements.forEach(el => {
      const text = el.textContent.trim().toLowerCase();
      
      for (const [field, keywords] of Object.entries(specMapping)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          specs[field] = el.textContent.trim();
          break;
        }
      }
    });
    
    return specs;
  }
}

module.exports = ScraperErrorHandler;
