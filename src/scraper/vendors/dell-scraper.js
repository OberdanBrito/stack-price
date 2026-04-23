const BaseScraper = require('../base-scraper');
const ScraperErrorHandler = require('../scraper-error-handler');

/**
 * Scraper específico para o site da Dell
 */
class DellScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.vendorName = 'Dell';
    this.config = {
      productIndicators: [
        '[data-testid="product-title"]',
        '.ps-product-title',
        'h1[class*="product"]',
        '.product-title',
        '[class*="sku"]',
        '.product-details'
      ],
      priceSelectors: [
        '[data-testid="price"]',
        '.ps-dell-price',
        '.sr-only:has-text("R$")',
        '[class*="price"]'
      ],
      waitTime: 5000
    };
  }

  async scrapeUrl(url, sku) {
    const page = await this.context.newPage();
    
    try {
      const response = await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Verificar status HTTP usando ScraperErrorHandler
      const httpError = ScraperErrorHandler.checkHttpStatus(response, url, sku);
      if (httpError) return httpError;
      
      // Aguarda scripts carregarem
      await page.waitForTimeout(this.config.waitTime);

      // Aceitar cookies se necessário
      await this.handleCookieConsent(page);

      // Verificar se o produto existe na página
      const productExists = await ScraperErrorHandler.checkProductExists(
        page, 
        this.config.productIndicators
      );
      if (!productExists) {
        return ScraperErrorHandler.createErrorResponse(
          ScraperErrorHandler.ERROR_CODES.PRODUCT_REMOVED,
          ScraperErrorHandler.ERROR_MESSAGES.PRODUCT_REMOVED,
          url,
          sku,
          'PRODUCT_NOT_FOUND'
        );
      }

      // Aguardar carregamento do conteúdo de preço
      await ScraperErrorHandler.waitForPriceContent(page, this.config.priceSelectors);

      const configs = await this.extractConfigurations(page);
      const html = await page.content();
      
      // Verificar se configs está vazio
      if (ScraperErrorHandler.checkEmptyConfigs(configs)) {
        return ScraperErrorHandler.createErrorResponse(
          ScraperErrorHandler.ERROR_CODES.SELECTOR_NOT_FOUND,
          ScraperErrorHandler.ERROR_MESSAGES.SELECTOR_NOT_FOUND,
          url,
          sku,
          'NO_CONFIGS',
          configs,
          html
        );
      }
      
      // Verificar se configs tem preço válido
      if (!ScraperErrorHandler.checkValidPrice(configs)) {
        return ScraperErrorHandler.createErrorResponse(
          ScraperErrorHandler.ERROR_CODES.PRICE_REMOVED,
          ScraperErrorHandler.ERROR_MESSAGES.PRICE_REMOVED,
          url,
          sku,
          'NO_VALID_PRICE',
          configs,
          html
        );
      }
      
      return ScraperErrorHandler.createSuccessResponse(url, sku, configs, html);
    } catch (error) {
      return ScraperErrorHandler.classifyError(error, url, sku);
    } finally {
      await page.close();
    }
  }

  async extractConfigurations(page) {
    const configs = await page.evaluate(() => {
      const results = [];
      
      const configCards = document.querySelectorAll(
        '[data-testid="config-option"], .config-card, [class*="configuration"]'
      );

      if (configCards.length > 0) {
        configCards.forEach(card => {
          const specs = {};
          
          const specElements = card.querySelectorAll(
            '[data-testid="spec"], .spec-item, td, dd'
          );
          
          specElements.forEach(el => {
            const text = el.textContent.trim().toLowerCase();
            if (text.includes('windows') || text.includes('ubuntu') || text.includes('linux')) {
              specs.os = el.textContent.trim();
            }
            if (text.includes('gb') && text.includes('ddr')) {
              specs.memory = el.textContent.trim();
            }
            if (text.includes('ssd') || text.includes('tb') || text.includes('gb') && text.includes('storage')) {
              specs.storage = el.textContent.trim();
            }
          });

          const priceEl = card.querySelector(
            '[data-testid="price"], .ps-dell-price, [class*="price"]'
          );
          
          if (priceEl) {
            const priceText = priceEl.textContent.trim();
            const priceMatch = priceText.match(/[\d.]+,?[\d]+/);
            if (priceMatch) {
              specs.price = parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.'));
            }
          }

          if (specs.price) {
            results.push(specs);
          }
        });
      }

      if (results.length === 0) {
        const mainPrice = document.querySelector(
          '[data-testid="price"], .ps-dell-price, [class*="price"]'
        );
        
        if (mainPrice) {
          const priceText = mainPrice.textContent.trim();
          const priceMatch = priceText.match(/[\d.]+,?[\d]+/);
          if (priceMatch) {
            results.push({
              price: parseFloat(priceMatch[0].replace(/\./g, '').replace(',', '.')),
              isMainPrice: true
            });
          }
        }
      }

      return results;
    });

    return configs;
  }

  /**
   * Extrai SKUs e links de detalhes de uma página de categoria/busca da Dell
   * @param {string} categoryUrl - URL da página de categoria
   * @param {number} maxPages - Número máximo de páginas para navegar (default: 1)
   * @returns {Promise<Array<{sku: string, productUrl: string, productName: string}>>}
   */
  async extractSkusFromCategoryPage(categoryUrl, maxPages = 1) {
    const page = await this.context.newPage();
    const allProducts = [];

    try {
      console.log(`[${this.vendorName}] Extraindo SKUs de página de categoria: ${categoryUrl}`);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        // Construir URL com paginação
        const url = pageNum === 1 ? categoryUrl : `${categoryUrl}&p=${pageNum}`;
        
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });

        // Verificar status HTTP
        const httpError = ScraperErrorHandler.checkHttpStatus(response, url, null);
        if (httpError) {
          console.log(`[${this.vendorName}] Erro ao carregar página ${pageNum}: ${httpError.errorMessage}`);
          break;
        }

        // Aguarda scripts carregarem
        await page.waitForTimeout(this.config.waitTime);

        // Aceitar cookies se necessário
        await this.handleCookieConsent(page);

        // Extrair produtos da página
        const products = await page.evaluate(() => {
          const results = [];
          
          // Selecionar todos os links de produtos
          const productLinks = document.querySelectorAll('h3.ps-title a');
          
          productLinks.forEach(link => {
            try {
              const href = link.getAttribute('href');
              const dataMetrics = link.getAttribute('data-metrics');
              
              if (!href) return;
              
              // Extrair SKU do data-metrics (JSON)
              let sku = null;
              if (dataMetrics) {
                const metrics = JSON.parse(dataMetrics);
                sku = metrics.productid;
              }
              
              // Se SKU não encontrado no data-metrics, tentar extrair da URL
              if (!sku) {
                const urlParts = href.split('/');
                const lastPart = urlParts[urlParts.length - 1];
                if (lastPart && lastPart.includes('_')) {
                  sku = lastPart;
                }
              }
              
              const productName = link.textContent.trim();
              
              if (sku && href) {
                // Tratar protocol-relative URLs (começam com //)
                let productUrl = href;
                if (href.startsWith('//')) {
                  productUrl = `https:${href}`;
                } else if (!href.startsWith('http')) {
                  productUrl = `https://www.dell.com${href}`;
                }
                
                results.push({
                  sku: sku,
                  productUrl: productUrl,
                  productName: productName
                });
              }
            } catch (e) {
              // Ignorar erros de parsing individual
            }
          });
          
          return results;
        });

        console.log(`[${this.vendorName}] Página ${pageNum}: ${products.length} produtos encontrados`);
        allProducts.push(...products);

        // Verificar se há mais produtos (se a página está vazia, para)
        if (products.length === 0) {
          console.log(`[${this.vendorName}] Página ${pageNum} vazia, encerrando paginação`);
          break;
        }

        // Delay entre páginas
        if (pageNum < maxPages) {
          await this.delay();
        }
      }

      console.log(`[${this.vendorName}] Total de SKUs extraídos: ${allProducts.length}`);
      return allProducts;
    } catch (error) {
      console.error(`[${this.vendorName}] Erro ao extrair SKUs da categoria:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }
}

module.exports = DellScraper;
