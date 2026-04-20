# Análise Completa do MVP – Dimensionamento de Hardware

*Versão 1 – 19/04/2026*

---

## Visão Geral

O MVP consiste em três pilares:

1. **Modelo de dados** (`esquema_bd_dimensionamento.md`) que formaliza categorias de software, métricas de consumo, matriz de compatibilidade e inventário de notebooks.
2. **Dados de carga inicial** (`insert_modelos_notebooks.sql`) com ~500 linhas de SKUs Dell.
3. **Metodologia funcional** (`metodologia_dimensionamento_hardware.md`) que descreve processo de coleta de métricas, cálculo de stack e seleção de configuração.

No conjunto, o MVP estabelece fundação sólida, mas ainda há lacunas técnicas, funcionais e operacionais antes de disponibilizar uma solução utilizável ao negócio.

---


## Lacunas Técnicas

- ~~**Chaves estrangeiras ausentes em `ModeloNotebook`** – Não há relacionamento com `ConfiguracaoHardware`; dificulta consultas de compatibilidade.~~ ✅ **Concluído** – Adicionada coluna `ConfiguracaoId CHAR(1) NULL REFERENCES ConfiguracaoHardware(Id)`.
- ~~**Índices adicionais** – Falta índice em `MetricasSoftware(SoftwareId, Cenario)` e em colunas de busca comuns (`Compatibilidade.ConfiguracaoId`).~~ ✅ **Concluído** – Criados `IX_MetricasSoftware_SoftwareId_Cenario` e `IX_Compatibilidade_ConfiguracaoId`.
- ~~**Tipos de dados limitantes**~~ ✅ **Concluído** – Alterado `ConfiguracaoHardware.Id`, `Compatibilidade.ConfiguracaoId` e `ModeloNotebook.ConfiguracaoId` de `CHAR(1)` para `VARCHAR(2)`, permitindo expansão futura.
- ~~**Carga inicial parcial** – Apenas SKUs Dell; falta Lenovo (PSREF) e demais marcas.~~ ✅ **Concluído** – 80 SKUs Dell + 86 SKUs Lenovo (V14, V15, ThinkPad E14, ThinkPad T14, etc.) totalizando 166 produtos.

---

## Lacunas Funcionais

- **Coleta de métricas** – Não há ferramentas/scripts para alimentar `MetricasSoftware`.
- ~~**Auditoria de custos** – Preços de SKUs podem variar; tabela não registra histórico de atualizações nem moeda.~~ ✅ **Concluído** – Criada tabela `ModeloNotebookPrecoHistorico` com rastreamento de preços, moeda (BRL default), período de vigência (DataInicio/DataFim) e fonte da informação.

---

## Riscos e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Dados desatualizados** (SKUs, preços) | Recomendação imprecisa | Automação de download PSREF/Dell CSV + job de atualização |
| **Limite 32 GB em notebooks corporativos** | Não atender categoria E | Prevê opção desktop ou VDI já descrita; incluir no algoritmo |
| **Falta de métricas reais** | Matriz baseada em estimativas | Priorizar coleta real em squads-piloto antes de rollout |
| **Procedure complexa** | Atraso na entrega | Implementar versão simplificada (baseline RAM/CPU) como primeiro marco |

---

## Recomendações & Roadmap

### M1 – MVP Funcional (4 semanas)

- **Implementar procedure de recomendação v0** considerando somente RAM e CPU agregados.
- Popular `CategoriaSoftware` e `ConfiguracaoHardware` com valores base.
- Criar índices mencionados acima.
- Ingestão automatizada de novos SKUs Dell via script.
- Script CLI simples (`.sql` ou Python) para registrar métricas em `MetricasSoftware`.

### M2 – Ampliação de Cobertura (4 semanas)

- Integração PSREF Lenovo (parser CSV → `ModeloNotebook`).
- Estender procedure para GPU/VRAM, Disco IOPS e custo.
- Views de análise de stack de softwares por colaborador (`UsoColaborador*`).
- API REST (FastAPI) para consultar recomendação.

### Pós-MVP

- Dashboard (React) para equipes de TI.
- Machine Learning para ajustar matriz de compatibilidade baseada em feedback real.
- Monitoramento contínuo de preços por scraping/CSV.

---

## Ações Imediatas Sugeridas

- Estruturar **scripts ETL** para popular métricas e SKUs.
- Definir **KPIs**: tempo médio de recomendação, economia de custo de hardware.
- Criar **data governance**: versionar matriz, registrar origem das métricas.

---

## Conclusão

O MVP fornece uma espinha dorsal robusta, porém requer preenchimento de dados, automação de carga e a implementação da lógica de recomendação para gerar valor real. Seguindo o roadmap, é viável alcançar uma solução prática em dois marcos de curta duração.
