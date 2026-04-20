# Metodologia de Dimensionamento de Hardware por Consumo de Software

## 1. Objetivo

Este documento descreve uma **metodologia técnica** para determinar a configuração de hardware mais adequada para um colaborador, com base no **consumo real** dos softwares que ele utiliza no trabalho.

O documento **não é**:
- Um modelo de precificação de produto
- Um software a ser construído
- Um cálculo de preços de venda

O documento **é**:
- Um guia de análise técnica
- Uma referência para decisão de compra/alocação de equipamentos
- Uma base de dados de consumo real observado

---

## 2. Metodologia de Análise

A decisão do hardware segue cinco passos:

```
1. Identificar softwares  →  2. Coletar consumo real  →  3. Agregar picos simultâneos
                                                                    ↓
         5. Escolher configuração  ←  4. Consultar matriz de compatibilidade
```

### Passo 1 — Identificar Softwares
Levantar todos os softwares que o colaborador executa rotineiramente, incluindo utilitários secundários (navegador, comunicadores, antivírus).

### Passo 2 — Coletar Consumo Real
Para cada software, medir em uso típico e de pico:
- **CPU**: cores usados e frequência sustentada
- **RAM**: memória residente em uso normal e em pico
- **GPU / VRAM**: ocupação e memória de vídeo
- **Disco**: IOPS, throughput e espaço ocupado
- **Rede** (quando relevante): banda consumida
- **Overhead SO**: reservar 8 GB de RAM para Windows 11

### Passo 3 — Agregar Picos Simultâneos
Softwares usados ao mesmo tempo têm consumos que se **somam** (RAM, VRAM, disco) ou se **concorrem** (CPU, GPU). Identificar quais cenários são executados em paralelo.

### Passo 4 — Consultar Matriz de Compatibilidade
Comparar o consumo agregado com as configurações disponíveis (seção 5).

### Passo 5 — Escolher Configuração
Selecionar a menor configuração classificada como **"Ideal"** para o stack de softwares do colaborador.

---

## 3. Categorização de Softwares por Perfil de Uso

Agrupamento de softwares por características de consumo. A categoria é apenas um rótulo de perfil — a decisão final vem da matriz (seção 6).

### Categoria A — Produtividade Básica
**Perfis de uso**: Navegação, edição de texto, planilhas simples.

### Categoria B — CAD 2D / Design Gráfico Leve
**Perfis de uso**: Desenho técnico, edição de imagens, modelagem 2D.

### Categoria C — CAD 3D / Modelagem
**Perfis de uso**: Modelagem 3D, projetos arquitetônicos médios, assemblies.

### Categoria C+ — Desenvolvimento de Software / IDEs Pesadas
**Perfis de uso**: Desenvolvimento com IDEs baseadas em JVM (IntelliJ IDEA, WebStorm, PyCharm), múltiplos containers Docker, bancos de dados locais, builds paralelos.
**Características**: Consumo elevado de RAM (IDE Java + indexação + caches), I/O intenso em disco (builds, indexação), CPU multi-core para compilação paralela.

### Categoria D — Renderização / Simulação
**Perfis de uso**: Renderização real-time, simulação FEA/CFD, projetos complexos.

### Categoria E — IA / Data Science / Produção Profissional
**Perfis de uso**: Treinamento de modelos, processamento de dados massivos, edição 8K.

---

## 4. Catálogo de Softwares e Consumo Medido

Tabela a ser preenchida com **medições reais** observadas em cenários de uso típicos da empresa.

| Categoria | Software | Cenário de Uso | CPU (cores / carga) | RAM (GB) | GPU / VRAM | Disco (I/O) |
|-----------|----------|----------------|---------------------|----------|------------|-------------|
| A | Microsoft Office | Planilhas médias | — | — | — | — |
| A | Google Chrome | 10+ abas | — | — | — | — |
| A | VS Code | Projeto pequeno | — | — | — | — |
| A | Microsoft Teams | Reunião online HD | — | — | — | — |
| A | Zoom | Reunião online HD | — | — | — | — |
| A | Slack | Chat + chamadas | — | — | — | — |
| A | WhatsApp Desktop | Comunicação | — | — | — | — |
| A | Microsoft Edge | 10 abas | — | — | — | — |
| A | Cisco Webex | Reunião online HD | — | — | — | — |
| B | AutoCAD 2D | Prancha técnica | — | — | — | — |
| B | SketchUp | Projeto pequeno | — | — | — | — |
| B | Photoshop | Arquivo < 100 MB | — | — | — | — |
| C | AutoCAD 3D | Modelo médio | — | — | — | — |
| C | Revit | Projeto médio | — | — | — | — |
| C | SolidWorks | Assembly < 500 peças | — | — | — | — |
| C | Blender | Modelagem | — | — | — | — |
| C+ | IntelliJ IDEA | Projeto Java/Gradle médio | — | — | — | — |
| C+ | WebStorm | Projeto React/Node.js | — | — | — | — |
| C+ | PyCharm | Projeto Python/ML | — | — | — | — |
| C+ | Docker Desktop | 5+ containers | — | — | — | — |
| D | Revit | Projeto grande | — | — | — | — |
| D | SolidWorks | Assembly > 1000 peças | — | — | — | — |
| D | ANSYS | Simulação FEA/CFD | — | — | — | — |
| D | Lumion | Render real-time | — | — | — | — |
| D | V-Ray | Render profissional | — | — | — | — |
| E | TensorFlow / PyTorch | Treinamento local | — | — | — | — |
| E | Premiere Pro | Edição 8K | — | — | — | — |
| E | After Effects | Composição / efeitos | — | — | — | — |
| E | Cinema 4D | Animação 3D | — | — | — | — |

> **Nota**: Preencher as colunas à medida que as medições forem coletadas. Adicionar novos softwares conforme necessidade.

### Fontes Públicas de SKUs (Dell & Lenovo)
| Fonte | URL | Formato | Observação |
|-------|-----|---------|------------|
| Lenovo PSREF Book | https://psref.lenovo.com/Book/ | XLSX (download) | Livro Excel atualizado ~3/sem; contém MTM/SKU e specs de todos os modelos globais |
| Lenovo PSREF Website | https://psref.lenovo.com/Search/ | HTML (export individual) | Cada página de produto permite exportar modelo em CSV/HTML manualmente |
| Dell Spec Finder | https://www.dell.com/support/mix-and-match/ | HTML/CSV via UI | Ferramenta web para filtrar sistemas e baixar planilha CSV; exige selecionar filtros mas não requer login |
| Dell Premier (Preview) | https://www.dell.com/premier/ade/ | CSV (public preview) | Oferece download CSV de listas de preços públicas; disponibilidade pode variar |

> Estas fontes são abertas e não exigem autenticação. Para integração automática, será necessário baixar e converter os arquivos periodicamente.

---

## 5. Configurações de Hardware Disponíveis (Mercado Brasileiro)

> **Nota importante**: As configurações abaixo refletem SKUs reais disponíveis no Brasil via Dell (Latitude/Vostro) e Lenovo (ThinkPad/V15). Configurações acima de 32 GB são atípicas, com lead time longo e preços superiores a R$ 15.000.

| Configuração | CPU | RAM | Disco | GPU | Preço Aprox. (2025) |
|--------------|-----|-----|-------|-----|---------------------|
| **Config A - Entry** | Intel Core i3-1315U / Ryzen 3 7330U | **8 GB** | 256 GB SSD | Intel UHD / Radeon Graphics | R$ 3.500 - 4.500 |
| **Config B - Standard** | Intel Core i5-1335U / Ryzen 5 7530U | **16 GB** | 512 GB SSD | Intel Iris Xe / Radeon 660M | R$ 5.000 - 6.500 |
| **Config C - Advanced** | Intel Core i7-1355U / Ryzen 7 7730U | **32 GB** | 512 GB NVMe | Intel Iris Xe / Radeon 680M | R$ 8.000 - 10.000 |
| **Config D - Workstation** | Intel Core i7-13700H / Ryzen 7 7840HS | **32 GB** | 1 TB NVMe | RTX 3050 4 GB / RTX A1000 | R$ 12.000 - 15.000 |
| **Config E - Mobile Workstation** | Intel Core i9-13950HX / Ryzen 9 Pro 7940HS | **64 GB** (máx prático) | 2 TB NVMe | RTX 4060 8 GB / RTX A2000 | R$ 18.000 - 22.000 |

### Alternativas para Cargas Pesadas (CAT D/E)

Quando o stack de trabalho excede as configurações acima:

| Alternativa | Quando Usar | Observação |
|-------------|-------------|------------|
| **Desktop/Workstation Fixa** | ANSYS, Revit grande, SolidWorks >1000 peças | Maior custo-benefício por TFLOP; não é portátil |
| **VDI/Cloud (AWS/Azure)** | TensorFlow, treinamento IA, renders ocasionais | Paga por uso; elimina capex de hardware topo de linha |
| **Upgrade de Desktop** | Desenvolvedor com 10+ containers Docker | Desktop com 64-128 GB RAM custa 1/3 do notebook equivalente |

> **Regra prática**: Se a configuração necessária custa mais que **R$ 15.000**, avaliar desktop fixo ou VDI antes de aprovar.

---

## 6. Matriz de Compatibilidade (Software × Configuração)

Para cada combinação, classificar como:

- **❌ Inadequado** — Não atende aos requisitos; risco de travamentos ou impossibilidade de execução
- **⚠️ Atende (mínimo)** — Executa com limitações; aceitável apenas para uso esporádico
- **✅ Ideal** — Executa com folga; recomendado para uso rotineiro
- **⬆️ Superdimensionado** — Capacidade muito acima do necessário; pode representar desperdício

| Software | Config A | Config B | Config C | Config D | Config E |
|----------|:--------:|:--------:|:--------:|:--------:|:--------:|
| Microsoft Office | ⚠️ | ✅ | ✅ | ⬆️ | ⬆️ |
| Google Chrome | ⚠️ | ✅ | ✅ | ⬆️ | ⬆️ |
| VS Code | ⚠️ | ✅ | ✅ | ⬆️ | ⬆️ |
| Microsoft Teams | ⚠️ | ✅ | ✅ | ⬆️ | ⬆️ |
| AutoCAD 2D | ❌ | ✅ | ✅ | ⬆️ | ⬆️ |
| SketchUp (pequeno) | ❌ | ✅ | ✅ | ⬆️ | ⬆️ |
| Photoshop (<100 MB) | ❌ | ✅ | ✅ | ⬆️ | ⬆️ |
| AutoCAD 3D | ❌ | ⚠️ | ✅ | ✅ | ⬆️ |
| Revit (médio) | ❌ | ⚠️ | ✅ | ✅ | ⬆️ |
| SolidWorks (<500 peças) | ❌ | ⚠️ | ✅ | ✅ | ⬆️ |
| Blender | ❌ | ⚠️ | ✅ | ✅ | ⬆️ |
| IntelliJ IDEA | ❌ | ⚠️ | ✅ | ✅ | ⬆️ |
| WebStorm | ❌ | ✅ | ✅ | ⬆️ | ⬆️ |
| PyCharm | ❌ | ⚠️ | ✅ | ✅ | ⬆️ |
| Docker Desktop (5+ containers) | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| Revit (grande) | ❌ | ❌ | ⚠️ | ⚠️ | ✅ |
| SolidWorks (>1000 peças) | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| ANSYS | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| Lumion | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| V-Ray | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| TensorFlow / PyTorch | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| Premiere Pro (8K) | ❌ | ❌ | ❌ | ❌ | ⚠️ |
| After Effects | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |
| Cinema 4D | ❌ | ❌ | ❌ | ⚠️ | ⚠️ |

> **Importante**: Esta matriz é uma estimativa inicial. Os valores devem ser **recalibrados** conforme as medições reais da seção 4 forem coletadas.

---

## 7. Combinação de Múltiplos Softwares (Stack de Trabalho)

Quando o colaborador usa mais de um software simultaneamente, aplicar as seguintes regras:

### 7.1 Recursos que Somam
- **RAM**: somar o consumo residente de cada software em execução
- **Overhead SO**: adicionar 8 GB de RAM para Windows 11
- **VRAM**: somar a memória de vídeo ocupada
- **Disco**: somar espaço em uso + cache

### 7.2 Recursos que Concorrem
- **CPU**: considerar o software mais exigente + 20–30% de overhead
- **GPU**: considerar o software mais exigente em carga gráfica
- **I/O de disco**: picos de leitura/escrita não são aditivos, mas competem por banda

### 7.3 Regra Prática
> A configuração escolhida deve ser **Ideal** para o software mais pesado do stack **e** comportar a soma de RAM/VRAM dos softwares executados em paralelo.

### Exemplo 1 — Arquiteto: Revit (médio) + Chrome + Photoshop
- Software mais pesado: Revit (médio) → exige Config C (32 GB)
- Soma de RAM estimada: Revit (12 GB) + Chrome (4 GB) + Photoshop (4 GB) + SO (8 GB) = **28 GB**
- Config C oferece 32 GB → **adequada com folga reduzida**

### Exemplo 2 — Engenheiro: Teams + Outlook + AutoCAD 3D + Chrome
- Softwares: Teams (video) + Outlook + AutoCAD 3D (modelo médio) + Chrome (10 abas)
- Software mais pesado: AutoCAD 3D → exige Config C
- RAM estimada: Teams 2 GB + Outlook 1 GB + AutoCAD 12 GB + Chrome 4 GB + SO 8 GB = **27 GB**
- VRAM estimada: 2-3 GB (AutoCAD leve + navegação)
- Config C (32 GB RAM, Iris Xe) → **adequada**
- Config D (32 GB RAM, RTX 3050) → **melhor opção se houver orçamento**

### Exemplo 3 — Desenvolvedor: IntelliJ + Docker (3 containers) + Chrome + Teams
- Software mais pesado: IntelliJ IDEA → exige Config B (mínimo) ou Config C (ideal)
- RAM estimada: IntelliJ 4 GB + Docker 6 GB + Chrome 4 GB + Teams 2 GB + SO 8 GB = **24 GB**
- Config B (16 GB) → ⚠️ ** inadequado** — Docker ficará limitado
- Config C (32 GB) → ✅ **ideal** — Docker com folga, build paralelo confiável

---

## 8. Processo de Coleta de Medições

### 8.1 Ferramentas Recomendadas
- **Windows**: Gerenciador de Tarefas, Monitor de Recursos, Process Explorer
- **Linux**: `htop`, `iotop`, `nvidia-smi`, `glances`
- **Cross-platform**: HWiNFO, Open Hardware Monitor

### 8.2 Procedimento
1. Abrir apenas o software a ser medido (baseline)
2. Executar cenário representativo do uso real (abrir arquivo típico, executar operação comum)
3. Registrar valores em três momentos:
   - **Ocioso** (software aberto, sem interação)
   - **Médio** (uso rotineiro)
   - **Pico** (operação mais pesada — render, cálculo, importação)
4. Repetir em ao menos 2–3 sessões distintas para validar consistência

### 8.3 Duração Mínima
- Sessões curtas (< 15 min): apenas uso rotineiro
- Sessões médias (30–60 min): capturar pico operacional
- Sessões longas (> 2h): validar comportamento sob uso prolongado (memory leaks, aquecimento)

---

## 9. Limitações da Metodologia

⚠️ As medições variam conforme o projeto/arquivo utilizado — um Revit de projeto pequeno consome muito menos que de projeto grande.
⚠️ A matriz de compatibilidade é uma estimativa inicial; precisa ser refinada com dados reais.
⚠️ Consumo futuro tende a crescer com novas versões dos softwares — considerar margem ao dimensionar.
⚠️ Hardware superdimensionado não é problema técnico, mas representa custo evitável.
⚠️ **Restrições do mercado brasileiro**: Notebooks acima de 32 GB são raros e caros. Softwares que exigem >32 GB (ANSYS, Lumion, TensorFlow local) podem ser inviáveis em notebooks corporativos — avaliar desktop fixo ou VDI.

---

*Documento técnico para dimensionamento de estações de trabalho com base no consumo real dos softwares utilizados.*
