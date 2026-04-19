const { chromium } = require('playwright');
require('dotenv').config();

/**
 * Classe base abstrata para scrapers de e-commerce
 * Deve ser estendida por implementações específicas (Dell, Lenovo, etc.)
 */
class BaseScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.delayMs = parseInt(process.env.DELAY_MS || '3000');
    this.timeoutMs = parseInt(process.env.TIMEOUT_MS || '30000');
    this.browser = null;
    this.context = null;
    this.vendorName = this.constructor.name;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: this.headless
    });
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0'
    });
    console.log(`[${this.vendorName}] Browser inicializado`);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log(`[${this.vendorName}] Browser fechado`);
    }
  }

  /**
   * Método abstrato - deve ser implementado por subclasses
   * @param {string} url - URL do produto
   * @param {string} sku - SKU do produto
   * @returns {Promise<{url, sku, configs: Array, html?: string, error?: string}>}
   */
  async scrapeUrl(url, sku) {
    throw new Error('Método scrapeUrl deve ser implementado pela subclasse');
  }

  /**
   * Delay entre requisições (rate limiting)
   */
  async delay() {
    await new Promise(resolve => setTimeout(resolve, this.delayMs));
  }

  /**
   * Handler genérico para cookies - pode ser sobrescrito
   */
  async handleCookieConsent(page) {
    try {
      // Seletores comuns de cookie consent
      const selectors = [
        'button[data-testid="cookie-accept"]',
        'button[id*="cookie"][id*="accept"]',
        'button[class*="cookie"][class*="accept"]',
        '#onetrust-accept-btn-handler'
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
      // Silencioso - nem todas as páginas têm cookie consent
    }
  }

  /**
   * Parser genérico de preço brasileiro (R$ 1.234,56)
   */
  parsePrice(priceText) {
    if (!priceText) return null;
    
    const cleaned = priceText
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }
}

module.exports = BaseScraper;
