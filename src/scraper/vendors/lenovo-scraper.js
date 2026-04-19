const BaseScraper = require('../base-scraper');

/**
 * Scraper específico para o site da Lenovo
 */
class LenovoScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.vendorName = 'Lenovo';
  }

  async scrapeUrl(url, sku) {
    const page = await this.context.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Aguarda scripts carregarem (Lenovo tem carregamento dinâmico)
      await page.waitForTimeout(6000);

      // Aceitar cookies
      await this.handleCookieConsent(page);

      // Aguardar preço carregar
      await this.waitForPriceContent(page);

      const configs = await this.extractConfigurations(page);
      const html = await page.content();
      
      return {
        url,
        sku,
        configs,
        html,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        url,
        sku,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      await page.close();
    }
  }

  async waitForPriceContent(page) {
    const selectors = [
      '[data-testid="price"]',
      '.pricing-price__price',
      '.price',
      '[class*="price"]',
      '[class*="preco"]'
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch (e) {
        continue;
      }
    }
  }

  async extractConfigurations(page) {
    const configs = await page.evaluate(() => {
      const results = [];
      
      // Lenovo geralmente tem uma configuração por página de SKU
      // mas pode ter variantes em dropdowns
      
      // Tenta encontrar preço principal
      const priceSelectors = [
        '.pricing-price__price',
        '[data-testid="price"]',
        '.price',
        '[class*="price"]:not([class*="old"])',
        '[itemprop="price"]'
      ];
      
      let priceEl = null;
      for (const selector of priceSelectors) {
        priceEl = document.querySelector(selector);
        if (priceEl) break;
      }
      
      if (priceEl) {
        const priceText = priceEl.textContent.trim();
        // Formato brasileiro: R$ 3.644,99 ou R$3644,99
        const priceMatch = priceText.match(/R?\$?\s*([\d.]+),?(\d*)/);
        if (priceMatch) {
          const integerPart = priceMatch[1].replace(/\./g, '');
          const decimalPart = priceMatch[2] || '00';
          const price = parseFloat(`${integerPart}.${decimalPart}`);
          
          results.push({
            price: price,
            isMainPrice: true,
            rawPrice: priceText
          });
        }
      }

      // Tentar extrair specs da página (se disponíveis)
      const specs = {};
      
      // SO - geralmente em tabela de specs
      const osElements = document.querySelectorAll(
        '[class*="spec"], [class*="configuration"], td'
      );
      
      osElements.forEach(el => {
        const text = el.textContent.toLowerCase();
        if (text.includes('windows') || text.includes('linux') || text.includes('ubuntu')) {
          specs.os = el.textContent.trim();
        }
        if (text.match(/\d+\s*gb/) && text.includes('ddr')) {
          specs.memory = el.textContent.trim();
        }
        if (text.includes('ssd') || text.includes('tb')) {
          specs.storage = el.textContent.trim();
        }
      });

      if (results.length > 0) {
        Object.assign(results[0], specs);
      }

      return results;
    });

    return configs;
  }

  /**
   * Override para cookie consent específico da Lenovo
   */
  async handleCookieConsent(page) {
    try {
      // Lenovo usa OneTrust
      const selectors = [
        '#onetrust-accept-btn-handler',
        'button[class*="accept"]',
        '[data-testid="cookie-accept"]'
      ];
      
      for (const selector of selectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          await page.waitForTimeout(1000);
          console.log(`[${this.vendorName}] Cookie consent aceito`);
          return;
        }
      }
    } catch (e) {
      // Silencioso
    }
  }
}

module.exports = LenovoScraper;
