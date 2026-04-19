const BaseScraper = require('../base-scraper');

/**
 * Scraper específico para o site da Dell
 */
class DellScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.vendorName = 'Dell';
  }

  async scrapeUrl(url, sku) {
    const page = await this.context.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      // Aguarda scripts carregarem
      await page.waitForTimeout(5000);

      // Aceitar cookies se necessário
      await this.handleCookieConsent(page);

      // Aguardar carregamento do conteúdo de preço
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
      '.ps-dell-price',
      '.sr-only:has-text("R$")',
      '[class*="price"]'
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
    // Tenta extrair múltiplas configurações da página
    const configs = await page.evaluate(() => {
      const results = [];
      
      // Seletor para cards de configuração
      const configCards = document.querySelectorAll(
        '[data-testid="config-option"], .config-card, [class*="configuration"]'
      );

      if (configCards.length > 0) {
        configCards.forEach(card => {
          const specs = {};
          
          // Extrair especificações do card
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

          // Extrair preço
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

      // Se não encontrou cards, tenta extrair preço principal
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
}

module.exports = DellScraper;
