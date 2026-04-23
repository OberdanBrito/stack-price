const BaseScraper = require('../base-scraper');
const ScraperErrorHandler = require('../scraper-error-handler');

/**
 * Scraper específico para o site da Lenovo
 */
class LenovoScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    this.vendorName = 'Lenovo';
    this.config = {
      productIndicators: [
        'h1[class*="product"]',
        '.product-title',
        '[class*="product-name"]',
        '.product-name',
        '[class*="sku"]',
        '.product-details',
        '.product-specs'
      ],
      priceSelectors: [
        '[data-testid="price"]',
        '.pricing-price__price',
        '.price',
        '[class*="price"]',
        '[class*="preco"]'
      ],
      waitTime: 6000
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
      
      // Aguarda scripts carregarem (Lenovo tem carregamento dinâmico)
      await page.waitForTimeout(this.config.waitTime);

      // Aceitar cookies
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

      // Aguardar preço carregar
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

      const specs = {};
      
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
   * Extrai especificações técnicas detalhadas da página do produto Lenovo
   * @param {string} url - URL da página do produto
   * @param {string} sku - SKU do produto
   * @returns {Promise<Object>} - Objeto com especificações técnicas
   */
  async extractDetailedSpecs(url, sku) {
    const page = await this.context.newPage();

    try {
      console.log(`[${this.vendorName}] Extraindo specs de: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Verificar status HTTP
      const httpError = ScraperErrorHandler.checkHttpStatus(response, url, sku);
      if (httpError) {
        return { error: true, errorMessage: httpError.errorMessage };
      }

      // Aguardar carregamento
      await page.waitForTimeout(this.config.waitTime);

      // Aceitar cookies
      await this.handleCookieConsent(page);

      // Extrair specs e preço da página
      const result = await page.evaluate(() => {
        const data = {
          processador: null,
          sistemaOperacional: null,
          placaVideo: null,
          memoria: null,
          armazenamento: null,
          tela: null,
          preco: null
        };

        // 1. Extrair de .specs > .spec-item (estrutura principal da Lenovo)
        // Primeiro tentar encontrar specs no produto atual (.current_bg ou dentro do container principal)
        const currentProduct = document.querySelector('.current_bg, [data-productcode] .specs, .product-detail .specs');
        let specItems;
        
        if (currentProduct) {
          // Se achou o produto atual, procurar specs apenas dentro dele
          specItems = currentProduct.querySelectorAll('.spec-item, li');
        } else {
          // Caso contrário, pegar todos os .specs mas parar no primeiro que tiver processador
          specItems = document.querySelectorAll('.specs .spec-item, ul.specs li, [class*="spec-list"] li');
        }
        
        for (const item of specItems) {
          const titleEl = item.querySelector('.title, [data-title-index]');
          const descEl = item.querySelector('.desc, [data-col-index], .description');
          
          if (titleEl && descEl) {
            const labelText = titleEl.textContent.toLowerCase().trim();
            const valueText = descEl.textContent.trim();
            
            // Pular se o valor contém "Up to" (indica produto similar, não o atual)
            if (valueText.toLowerCase().includes('up to')) {
              continue;
            }
            
            if (labelText.includes('processador') && !data.processador) {
              data.processador = valueText;
            }
            if ((labelText.includes('sistema operacional') || labelText.includes('operating system')) && !data.sistemaOperacional) {
              data.sistemaOperacional = valueText;
            }
            if ((labelText.includes('placa de vídeo') || labelText.includes('video card') || labelText.includes('graphics')) && !data.placaVideo) {
              data.placaVideo = valueText;
            }
            if ((labelText.includes('memória') || labelText.includes('memory')) && !data.memoria) {
              data.memoria = valueText;
            }
            if ((labelText.includes('armazenamento') || labelText.includes('storage')) && !data.armazenamento) {
              data.armazenamento = valueText;
            }
            if ((labelText.includes('tela') || labelText.includes('display') || labelText.includes('screen')) && !data.tela) {
              data.tela = valueText;
            }
          }
        }

        // 2. Extrair de tabelas de especificações (fallback)
        if (!data.processador || !data.memoria) {
          const specTables = document.querySelectorAll(
            'table, [class*="table"], [class*="tech-specs"], [class*="configurations"]'
          );
          
          specTables.forEach(table => {
            const rows = table.querySelectorAll('tr, [class*="row"], [class*="item"]');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th, [class*="cell"], [class*="label"], [class*="value"]');
              if (cells.length >= 2) {
                const labelText = cells[0].textContent.toLowerCase().trim();
                const valueText = cells[1].textContent.trim();
                
                if (labelText.includes('processador') || labelText.includes('processor')) {
                  data.processador = data.processador || valueText;
                }
                if (labelText.includes('sistema operacional') || labelText.includes('operating system') || labelText.includes('os')) {
                  data.sistemaOperacional = data.sistemaOperacional || valueText;
                }
                if (labelText.includes('placa de vídeo') || labelText.includes('graphics') || labelText.includes('gpu')) {
                  data.placaVideo = data.placaVideo || valueText;
                }
                if (labelText.includes('memória') || labelText.includes('memory')) {
                  data.memoria = data.memoria || valueText;
                }
                if (labelText.includes('armazenamento') || labelText.includes('storage')) {
                  data.armazenamento = data.armazenamento || valueText;
                }
                if (labelText.includes('tela') || labelText.includes('display')) {
                  data.tela = data.tela || valueText;
                }
              }
            });
          });
        }

        // 3. Extrair do título/nome do produto se ainda não tem specs
        if (!data.processador) {
          const titleEl = document.querySelector('[role="heading"][aria-level="1"], h1, [class*="product-title"]');
          if (titleEl) {
            const titleText = titleEl.textContent;
            const cpuMatch = titleText.match(/(Intel Core i[3579]-\w+|AMD Ryzen [357] \d{4}U|Intel Core Ultra \d)/i);
            if (cpuMatch) {
              data.processador = cpuMatch[0];
            }
            const memMatch = titleText.match(/(\d+GB|\d+ GB)/i);
            if (memMatch && !data.memoria) {
              data.memoria = memMatch[0];
            }
          }
        }

        // 4. Extrair preço do produto principal
        // Procurar no container principal do produto primeiro
        const mainProductContainer = document.querySelector('.product-detail, [data-productcode], .pdp-main, .current_bg');
        
        if (mainProductContainer) {
          const mainPriceEl = mainProductContainer.querySelector('.final-price.single-price, .final-price');
          if (mainPriceEl) {
            data.preco = mainPriceEl.textContent.trim();
          }
        }
        
        // Se não achou, procurar todos os preços e pegar o maior (produto principal vs acessórios)
        if (!data.preco) {
          const allPrices = document.querySelectorAll('.final-price.single-price, .final-price');
          let maxPrice = 0;
          let maxPriceText = null;
          
          for (const priceEl of allPrices) {
            const priceText = priceEl.textContent.trim();
            const match = priceText.match(/R\$\s*([\d.]+),\d{2}/);
            if (match) {
              const priceValue = parseFloat(match[1].replace(/\./g, ''));
              if (priceValue > maxPrice) {
                maxPrice = priceValue;
                maxPriceText = priceText;
              }
            }
          }
          
          data.preco = maxPriceText;
        }

        return data;
      });

      const specs = {
        processador: result.processador,
        sistemaOperacional: result.sistemaOperacional,
        placaVideo: result.placaVideo,
        memoria: result.memoria,
        armazenamento: result.armazenamento,
        tela: result.tela
      };
      
      const preco = result.preco;

      return { error: false, specs, preco };

    } catch (error) {
      return { error: true, errorMessage: error.message };
    } finally {
      await page.close();
    }
  }

  /**
   * Override para cookie consent específico da Lenovo
   */
  async handleCookieConsent(page) {
    try {
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

  /**
   * Extrai SKUs e links de detalhes de uma página de busca/categoria da Lenovo
   * @param {string} categoryUrl - URL da página de busca/categoria
   * @param {number} maxPages - Número máximo de páginas para navegar (default: 1)
   * @returns {Promise<Array<{sku: string, productUrl: string, productName: string}>>}
   */
  async extractSkusFromCategoryPage(categoryUrl, maxPages = 1) {
    const page = await this.context.newPage();
    const allProducts = [];

    try {
      console.log(`[${this.vendorName}] Extraindo SKUs de página de categoria: ${categoryUrl}`);

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        // Construir URL com paginação (Lenovo usa offset)
        let url = categoryUrl;
        if (pageNum > 1) {
          const rows = 20; // Padrão Lenovo
          const start = (pageNum - 1) * rows;
          url = categoryUrl.includes('?') 
            ? `${categoryUrl}&start=${start}` 
            : `${categoryUrl}?start=${start}`;
        }
        
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

        // Aguarda scripts carregarem (Lenovo tem carregamento dinâmico)
        await page.waitForTimeout(this.config.waitTime);

        // Aceitar cookies
        await this.handleCookieConsent(page);

        // Extrair produtos da página
        const products = await page.evaluate(() => {
          const results = [];
          
          // Seletores para cards de produto Lenovo
          const productItems = document.querySelectorAll('li.product_item, .product-item, [class*="product-item"]');
          
          productItems.forEach(item => {
            try {
              // Procurar link do produto
              const linkEl = item.querySelector('a[href*="/p/laptops/"], a[href*="/p/"], .product-title a, a.product-name');
              if (!linkEl) return;
              
              const href = linkEl.getAttribute('href');
              if (!href) return;
              
              // Extrair SKU da URL
              // Padrão: https://www.lenovo.com/br/pt/p/laptops/.../{sku}
              const urlParts = href.split('/');
              const lastPart = urlParts[urlParts.length - 1];
              
              // SKU Lenovo: começa com 2 dígitos + letras/números (ex: 82x5000mbr, 83ns0008br)
              let sku = null;
              if (lastPart && /^\d{2}[a-zA-Z0-9]{8}$/.test(lastPart)) {
                sku = lastPart.toLowerCase();
              }
              
              // Nome do produto - tentar múltiplas fontes específicas da Lenovo
              let productName = '';
              
              // 1. Tentar heading com aria-level="3" (nome completo do produto na Lenovo)
              const headingEl = item.querySelector('[role="heading"][aria-level="3"]');
              if (headingEl) {
                const headingText = headingEl.textContent.trim();
                // Remover o SKU do final do texto se presente
                const skuMatch = headingText.match(new RegExp(`\\s*${sku}\\s*$`, 'i'));
                productName = skuMatch ? headingText.replace(skuMatch[0], '').trim() : headingText;
              }
              
              // 2. Se não encontrou, tentar outros seletores
              if (!productName) {
                const nameSelectors = [
                  '.product-title',
                  '.product-name', 
                  '[class*="product-title"]',
                  '[class*="product-name"]',
                  '[data-testid="product-name"]'
                ];
                
                for (const selector of nameSelectors) {
                  const el = item.querySelector(selector);
                  if (el && el.textContent.trim()) {
                    const text = el.textContent.trim();
                    // Ignorar textos que parecem preço (começam com R$ ou têm % OFF)
                    if (!text.match(/^R\$/) && !text.includes('% OFF') && !text.match(/^\d/)) {
                      productName = text;
                      break;
                    }
                  }
                }
              }
              
              // 3. Se ainda não encontrou, tentar aria-label do link
              if (!productName && linkEl) {
                const ariaLabel = linkEl.getAttribute('aria-label');
                if (ariaLabel && !ariaLabel.includes('out of 5 stars') && !ariaLabel.includes('reviews')) {
                  productName = ariaLabel;
                }
              }
              
              // 4. Último recurso: extrair da URL (path)
              if (!productName) {
                const urlParts = href.split('/');
                const productPath = urlParts[urlParts.length - 2]; // Penúltimo segmento
                if (productPath) {
                  productName = productPath.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
              }
              
              if (sku && href) {
                // Construir URL completa
                let fullUrl = href;
                if (href.startsWith('//')) {
                  fullUrl = `https:${href}`;
                } else if (!href.startsWith('http')) {
                  fullUrl = `https://www.lenovo.com${href}`;
                }
                
                results.push({
                  sku: sku,
                  productUrl: fullUrl,
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

        // Verificar se há mais produtos
        if (products.length === 0) {
          console.log(`[${this.vendorName}] Página ${pageNum} vazia, encerrando paginação`);
          break;
        }

        // Delay entre páginas
        if (pageNum < maxPages) {
          await this.delay();
        }
      }

      // Remover duplicados por SKU
      const uniqueProducts = [];
      const seenSkus = new Set();
      for (const product of allProducts) {
        if (!seenSkus.has(product.sku)) {
          seenSkus.add(product.sku);
          uniqueProducts.push(product);
        }
      }

      console.log(`[${this.vendorName}] Total de SKUs únicos extraídos: ${uniqueProducts.length}`);
      return uniqueProducts;
    } catch (error) {
      console.error(`[${this.vendorName}] Erro ao extrair SKUs da categoria:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }
}

module.exports = LenovoScraper;
