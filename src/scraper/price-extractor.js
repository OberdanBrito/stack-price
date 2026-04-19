class PriceExtractor {
  /**
   * Faz matching entre configurações extraídas da página e SKU do banco
   */
  static matchConfigToSku(configs, modeloData) {
    const { Sku, SistemaOperacional, Memoria, Armazenamento } = modeloData;
    
    // Se só tem um preço principal, retorna ele
    if (configs.length === 1 && configs[0].isMainPrice) {
      return configs[0].price;
    }

    // Normaliza strings para comparação
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const osTarget = normalize(SistemaOperacional || '');
    const memTarget = normalize(Memoria || '');
    const storageTarget = normalize(Armazenamento || '');

    // Procura configuração que melhor corresponde ao SKU
    for (const config of configs) {
      let score = 0;
      
      if (config.os) {
        const configOs = normalize(config.os);
        if (osTarget.includes(configOs) || configOs.includes(osTarget)) {
          score += 3;
        }
      }
      
      if (config.memory) {
        const configMem = normalize(config.memory);
        // Extrai número de GB para comparar
        const memMatch = configMem.match(/(\d+)\s*gb/);
        const targetMemMatch = memTarget.match(/(\d+)\s*gb/);
        
        if (memMatch && targetMemMatch && memMatch[1] === targetMemMatch[1]) {
          score += 2;
        }
      }
      
      if (config.storage) {
        const configStorage = normalize(config.storage);
        const storageMatch = configStorage.match(/(\d+)\s*(gb|tb)/);
        const targetStorageMatch = storageTarget.match(/(\d+)\s*(gb|tb)/);
        
        if (storageMatch && targetStorageMatch) {
          const configSize = parseInt(storageMatch[1]);
          const targetSize = parseInt(targetStorageMatch[1]);
          const configUnit = storageMatch[2];
          const targetUnit = targetStorageMatch[2];
          
          // Normaliza para GB
          const configGb = configUnit === 'tb' ? configSize * 1024 : configSize;
          const targetGb = targetUnit === 'tb' ? targetSize * 1024 : targetSize;
          
          if (configGb === targetGb) {
            score += 2;
          }
        }
      }

      // Se score alto o suficiente, considera match
      if (score >= 3) {
        return config.price;
      }
    }

    // Fallback: retorna o primeiro preço encontrado
    if (configs.length > 0) {
      return configs[0].price;
    }

    return null;
  }

  /**
   * Extrai preço de texto formatado
   */
  static parsePrice(priceText) {
    if (!priceText) return null;
    
    // Remove R$, espaços, pontos de milhar
    const cleaned = priceText
      .replace(/R\$/g, '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    
    const match = cleaned.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }
}

module.exports = PriceExtractor;
