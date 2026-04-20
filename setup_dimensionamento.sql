-- =============================================
-- SCRIPT: Criar tabelas de dimensionamento
-- Banco: PrecificacaoHardware
-- Data: 2026-04-20
-- =============================================

USE PrecificacaoHardware;
GO

-- =============================================
-- 1. CategoriaSoftware
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CategoriaSoftware')
BEGIN
    CREATE TABLE CategoriaSoftware (
        Id CHAR(2) PRIMARY KEY,
        Nome VARCHAR(40) NOT NULL,
        Descricao VARCHAR(255) NULL
    );
    PRINT 'Tabela CategoriaSoftware criada';
END
ELSE
    PRINT 'Tabela CategoriaSoftware ja existe';
GO

-- =============================================
-- 2. ConfiguracaoHardware
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConfiguracaoHardware')
BEGIN
    CREATE TABLE ConfiguracaoHardware (
        Id VARCHAR(2) PRIMARY KEY,
        Nome VARCHAR(40),
        CpuModelo VARCHAR(50),
        RamGb INT,
        Disco VARCHAR(50),
        GpuModelo VARCHAR(50)
    );
    PRINT 'Tabela ConfiguracaoHardware criada';
END
ELSE
    PRINT 'Tabela ConfiguracaoHardware ja existe';
GO

-- =============================================
-- 3. Software
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Software')
BEGIN
    CREATE TABLE Software (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Nome VARCHAR(100) NOT NULL,
        Versao VARCHAR(30) NULL,
        SpecUrl VARCHAR(255) NULL,
        CategoriaId CHAR(2) NOT NULL REFERENCES CategoriaSoftware(Id)
    );
    CREATE INDEX IX_Software_Nome ON Software(Nome);
    PRINT 'Tabela Software criada';
END
ELSE
    PRINT 'Tabela Software ja existe';
GO

-- =============================================
-- 4. MetricasSoftware
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MetricasSoftware')
BEGIN
    CREATE TABLE MetricasSoftware (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        SoftwareId INT NOT NULL REFERENCES Software(Id),
        Cenario VARCHAR(100) NOT NULL,
        CpuCores DECIMAL(4,1) NULL,
        RamGb DECIMAL(5,2) NULL,
        VramGb DECIMAL(5,2) NULL,
        DiscoIOps INT NULL,
        DataColeta DATE DEFAULT GETDATE()
    );
    CREATE INDEX IX_MetricasSoftware_SoftwareId_Cenario ON MetricasSoftware(SoftwareId, Cenario);
    PRINT 'Tabela MetricasSoftware criada';
END
ELSE
    PRINT 'Tabela MetricasSoftware ja existe';
GO

-- =============================================
-- 5. Compatibilidade (Matriz)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Compatibilidade')
BEGIN
    CREATE TABLE Compatibilidade (
        SoftwareId INT NOT NULL REFERENCES Software(Id),
        ConfiguracaoId VARCHAR(2) NOT NULL REFERENCES ConfiguracaoHardware(Id),
        Nivel CHAR(1) NOT NULL CHECK (Nivel IN ('X','W','I','S')),
        CONSTRAINT PK_Compatibilidade PRIMARY KEY (SoftwareId, ConfiguracaoId)
    );
    -- X=Inadequado, W=Atende, I=Ideal, S=Superdimensionado
    CREATE INDEX IX_Compatibilidade_ConfiguracaoId ON Compatibilidade(ConfiguracaoId);
    PRINT 'Tabela Compatibilidade criada';
END
ELSE
    PRINT 'Tabela Compatibilidade ja existe';
GO

-- =============================================
-- 6. ModeloNotebookPrecoHistorico
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ModeloNotebookPrecoHistorico')
BEGIN
    CREATE TABLE ModeloNotebookPrecoHistorico (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Sku VARCHAR(30) NOT NULL REFERENCES ModeloNotebook(Sku),
        Preco DECIMAL(10,2) NOT NULL,
        Moeda CHAR(3) DEFAULT 'BRL',
        DataInicio DATE NOT NULL DEFAULT GETDATE(),
        DataFim DATE NULL,
        Fonte VARCHAR(255) NULL
    );
    CREATE INDEX IX_PrecoHistorico_Sku_DataInicio ON ModeloNotebookPrecoHistorico(Sku, DataInicio);
    PRINT 'Tabela ModeloNotebookPrecoHistorico criada';
END
ELSE
    PRINT 'Tabela ModeloNotebookPrecoHistorico ja existe';
GO

-- Trigger para fechar preco anterior
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'TRG_FechaPrecoAnterior')
    DROP TRIGGER TRG_FechaPrecoAnterior;
GO

CREATE TRIGGER TRG_FechaPrecoAnterior
ON ModeloNotebookPrecoHistorico
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE h
    SET DataFim = GETDATE()
    FROM ModeloNotebookPrecoHistorico h
    INNER JOIN inserted i ON h.Sku = i.Sku
    WHERE h.DataFim IS NULL
      AND h.Id NOT IN (SELECT Id FROM inserted);
END;
GO

PRINT 'Trigger TRG_FechaPrecoAnterior criado';
GO

-- =============================================
-- 7. UsoColaborador (3 tabelas)
-- =============================================

-- 7.1 Colaborador
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Colaborador')
BEGIN
    CREATE TABLE Colaborador (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Nome VARCHAR(100) NOT NULL
    );
    PRINT 'Tabela Colaborador criada';
END
ELSE
    PRINT 'Tabela Colaborador ja existe';
GO

-- 7.2 UsoColaborador
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UsoColaborador')
BEGIN
    CREATE TABLE UsoColaborador (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ColaboradorId INT NOT NULL REFERENCES Colaborador(Id),
        DataUso DATE NOT NULL,
        Observacao VARCHAR(255)
    );
    PRINT 'Tabela UsoColaborador criada';
END
ELSE
    PRINT 'Tabela UsoColaborador ja existe';
GO

-- 7.3 UsoColaboradorSoftware
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UsoColaboradorSoftware')
BEGIN
    CREATE TABLE UsoColaboradorSoftware (
        UsoId INT NOT NULL REFERENCES UsoColaborador(Id),
        SoftwareId INT NOT NULL REFERENCES Software(Id),
        PRIMARY KEY (UsoId, SoftwareId)
    );
    PRINT 'Tabela UsoColaboradorSoftware criada';
END
ELSE
    PRINT 'Tabela UsoColaboradorSoftware ja existe';
GO

-- =============================================
-- 8. Views de Auditoria
-- =============================================

-- 8.1 VW_PrecoHistoricoEvolucao
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VW_PrecoHistoricoEvolucao')
    DROP VIEW VW_PrecoHistoricoEvolucao;
GO

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
GO

PRINT 'View VW_PrecoHistoricoEvolucao criada';
GO

-- 8.2 VW_SKUsVariacaoPreco90Dias
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VW_SKUsVariacaoPreco90Dias')
    DROP VIEW VW_SKUsVariacaoPreco90Dias;
GO

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
GO

PRINT 'View VW_SKUsVariacaoPreco90Dias criada';
GO

PRINT '=============================================';
PRINT 'TODAS AS TABELAS DE DIMENSIONAMENTO CRIADAS';
PRINT '=============================================';
GO
