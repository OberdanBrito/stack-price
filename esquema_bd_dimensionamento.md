# Esquema de Banco de Dados – Dimensionamento de Hardware por Consumo de Software

DDL em **SQL Server (T-SQL)** cobrindo todas as entidades necessárias.

---

## 1. CategoriaSoftware
```sql
CREATE TABLE CategoriaSoftware (
    Id CHAR(2) PRIMARY KEY, -- A, B, C, C+, D, E
    Nome        VARCHAR(40)  NOT NULL,
    Descricao   VARCHAR(255) NULL
);
```

## 2. Software
```sql
CREATE TABLE Software (
    Id INT IDENTITY PRIMARY KEY,
    Nome        VARCHAR(100) NOT NULL,
    Versao      VARCHAR(30)  NULL,
    SpecUrl     VARCHAR(255) NULL, -- link oficial ou fonte da especificação
    CategoriaId CHAR(2) NOT NULL REFERENCES CategoriaSoftware(Id)
);
CREATE INDEX IX_Software_Nome ON Software(Nome);
```

## 3. MetricasSoftware (consumo real)
```sql
CREATE TABLE MetricasSoftware (
    Id INT IDENTITY PRIMARY KEY,
    SoftwareId INT NOT NULL REFERENCES Software(Id),
    Cenario     VARCHAR(100) NOT NULL,
    CpuCores    DECIMAL(4,1) NULL,
    RamGb       DECIMAL(5,2) NULL,
    VramGb      DECIMAL(5,2) NULL,
    DiscoIOps   INT          NULL,
    DataColeta  DATE DEFAULT GETDATE()
);
CREATE INDEX IX_MetricasSoftware_SoftwareId_Cenario ON MetricasSoftware(SoftwareId, Cenario);
```

## 4. ConfiguracaoHardware
```sql
CREATE TABLE ConfiguracaoHardware (
    Id VARCHAR(2) PRIMARY KEY, -- A-E, permite expansão futura
    Nome      VARCHAR(40),
    CpuModelo VARCHAR(50),
    RamGb     INT,
    Disco     VARCHAR(50),
    GpuModelo VARCHAR(50)
);
```

## 5. Compatibilidade (matriz)
```sql
CREATE TABLE Compatibilidade (
    SoftwareId     INT    NOT NULL REFERENCES Software(Id),
    ConfiguracaoId VARCHAR(2) NOT NULL REFERENCES ConfiguracaoHardware(Id),
    Nivel          CHAR(1) NOT NULL CHECK (Nivel IN ('X','W','I','S')),
    CONSTRAINT PK_Compatibilidade PRIMARY KEY (SoftwareId, ConfiguracaoId)
);
-- X=Inadequado, W=Atende, I=Ideal, S=Superdimensionado
CREATE INDEX IX_Compatibilidade_ConfiguracaoId ON Compatibilidade(ConfiguracaoId);
```

## 6. ModeloNotebook
```sql
CREATE TABLE ModeloNotebook (
    Sku                 VARCHAR(30) PRIMARY KEY,
    Fabricante          VARCHAR(20) CHECK (Fabricante IN ('Dell','Lenovo')),
    Serie               VARCHAR(40),
    Processador         VARCHAR(50),
    SistemaOperacional  VARCHAR(30),
    PlacaVideo          VARCHAR(50),
    Memoria             VARCHAR(20),
    Armazenamento       VARCHAR(30),
    Tela                VARCHAR(100),
    UrlSpec             VARCHAR(255),
    Preco               DECIMAL(10,2) NULL,
    DataInclusao        DATE DEFAULT GETDATE(),
    ConfiguracaoId      VARCHAR(2) NULL REFERENCES ConfiguracaoHardware(Id)
);
```

## 6.1 ModeloNotebookPrecoHistorico (auditoria de custos)
```sql
CREATE TABLE ModeloNotebookPrecoHistorico (
    Id INT IDENTITY PRIMARY KEY,
    Sku VARCHAR(30) NOT NULL REFERENCES ModeloNotebook(Sku),
    Preco DECIMAL(10,2) NOT NULL,
    Moeda CHAR(3) DEFAULT 'BRL',
    DataInicio DATE NOT NULL DEFAULT GETDATE(),
    DataFim DATE NULL, -- NULL = preço vigente
    Fonte VARCHAR(255) NULL -- URL de onde o preço foi coletado
);
CREATE INDEX IX_PrecoHistorico_Sku_DataInicio ON ModeloNotebookPrecoHistorico(Sku, DataInicio);

-- Trigger: fecha preço anterior automaticamente ao inserir novo
CREATE TRIGGER TRG_FechaPrecoAnterior
ON ModeloNotebookPrecoHistorico
AFTER INSERT
AS
BEGIN
    UPDATE h
    SET DataFim = GETDATE()
    FROM ModeloNotebookPrecoHistorico h
    INNER JOIN inserted i ON h.Sku = i.Sku
    WHERE h.DataFim IS NULL
      AND h.Id NOT IN (SELECT Id FROM inserted);
END;
```

## 7. UsoColaborador (histórico de stacks)
```sql
CREATE TABLE Colaborador (
    Id INT IDENTITY PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL
);

CREATE TABLE UsoColaborador (
    Id INT IDENTITY PRIMARY KEY,
    ColaboradorId INT NOT NULL REFERENCES Colaborador(Id),
    DataUso DATE NOT NULL,
    Observacao VARCHAR(255)
);

CREATE TABLE UsoColaboradorSoftware (
    UsoId INT NOT NULL REFERENCES UsoColaborador(Id),
    SoftwareId INT NOT NULL REFERENCES Software(Id),
    PRIMARY KEY (UsoId, SoftwareId)
);
```

---

### Notas
- `MetricasSoftware` guarda métricas empíricas por cenário.
- `Compatibilidade` materializa a matriz do documento.
- `ModeloNotebook` armazena especificações técnicas completas de cada SKU (processador, memória, armazenamento, etc.).
- Coluna `SpecUrl` em `Software` guarda o link de origem da especificação oficial.
- `UsoColaborador*` permite auditoria e ajuste fino da matriz.

## Views de Auditoria e Análise

### VW_PrecoHistoricoEvolucao
Evolução de preço de um SKU ao longo do tempo com dias de vigência.
```sql
CREATE VIEW VW_PrecoHistoricoEvolucao AS
SELECT 
    Sku,
    Preco,
    Moeda,
    DataInicio,
    DataFim,
    DATEDIFF(DAY, DataInicio, COALESCE(DataFim, GETDATE())) AS DiasVigencia,
    Fonte
FROM ModeloNotebookPrecoHistorico;
```

### VW_SKUsVariacaoPreco90Dias
SKUs com variação de preço nos últimos 90 dias.
```sql
CREATE VIEW VW_SKUsVariacaoPreco90Dias AS
SELECT 
    Sku, 
    COUNT(*) AS NumeroAlteracoes,
    MIN(Preco) AS PrecoMinimo,
    MAX(Preco) AS PrecoMaximo,
    MAX(Preco) - MIN(Preco) AS DiferencaAbsoluta
FROM ModeloNotebookPrecoHistorico
WHERE DataInicio >= DATEADD(DAY, -90, GETDATE())
GROUP BY Sku
HAVING COUNT(*) > 1;
```

## Procedure de Recomendação de Hardware (TODO)
```sql
-- TODO: Reescrever procedure para nova estrutura sem ConfigId
-- A lógica de recomendação deve comparar especificações reais do software
-- com as specs dos notebooks disponíveis em ModeloNotebook
```

### Próximos Passos
1. Popular `CategoriaSoftware` + `ConfiguracaoHardware`.
2. Importar SKUs via PSREF/Dell CSV para `ModeloNotebook`.
3. Coletar métricas e popular `MetricasSoftware`.
4. View/proc para recomendar configuração a partir de um conjunto de softwares.
