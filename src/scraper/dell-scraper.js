const { chromium } = require('playwright');
require('dotenv').config();

class DellScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.delayMs = parseInt(process.env.DELAY_MS || '3000');
    this.timeoutMs = parseInt(process.env.TIMEOUT_MS || '30000');
    this.browser = null;
    this.context = null;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: this.headless
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
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

  async handleCookieConsent(page) {
    try {
      const consentButton = await page.$('button[data-testid="cookie-accept"]');
      if (consentButton) {
        await consentButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Ignora se não encontrar botão de cookies
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
            if (text.includes('windows') || text.includes('ubuntu')) {
              specs.os = el.textContent.trim();
            }
            if (text.includes('gb') && text.includes('ddr')) {
              specs.memory = el.textContent.trim();
            }
            if (text.includes('ssd') || text.includes('tb')) {
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
              specs.price = parseFloat(priceMatch[0].replace('.', '').replace(',', '.'));
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
              price: parseFloat(priceMatch[0].replace('.', '').replace(',', '.')),
              isMainPrice: true
            });
          }
        }
      }

      return results;
    });

    return configs;
  }

  async delay() {
    await new Promise(resolve => setTimeout(resolve, this.delayMs));
  }
}

module.exports = DellScraper;
