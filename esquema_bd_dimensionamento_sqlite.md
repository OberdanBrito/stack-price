# Esquema de Banco de Dados – Dimensionamento de Hardware por Consumo de Software (SQLite)

DDL adaptado para **SQLite** cobrindo todas as entidades necessárias.

> **Nota**: Execute `PRAGMA foreign_keys = ON;` após conectar para garantir integridade referencial.

---

## 1. CategoriaSoftware
```sql
CREATE TABLE CategoriaSoftware (
    Id TEXT PRIMARY KEY, -- A, B, C, C+, D, E
    Nome        TEXT NOT NULL,
    Descricao   TEXT
);
```

## 2. Software
```sql
CREATE TABLE Software (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome        TEXT NOT NULL,
    Versao      TEXT,
    SpecUrl     TEXT, -- link oficial ou fonte da especificação
    CategoriaId TEXT NOT NULL REFERENCES CategoriaSoftware(Id)
);
CREATE INDEX IX_Software_Nome ON Software(Nome);
```

## 3. MetricasSoftware (consumo real)
```sql
CREATE TABLE MetricasSoftware (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    SoftwareId INTEGER NOT NULL REFERENCES Software(Id),
    Cenario     TEXT NOT NULL,
    CpuCores    REAL,
    RamGb       REAL,
    VramGb      REAL,
    DiscoIOps   INTEGER,
    DataColeta  TEXT DEFAULT (DATE('now'))
);
```

## 4. ConfiguracaoHardware
```sql
CREATE TABLE ConfiguracaoHardware (
    Id TEXT PRIMARY KEY, -- A-E
    Nome      TEXT,
    CpuModelo TEXT,
    RamGb     INTEGER,
    Disco     TEXT,
    GpuModelo TEXT
);
```

## 5. Compatibilidade (matriz)
```sql
CREATE TABLE Compatibilidade (
    SoftwareId     INTEGER NOT NULL REFERENCES Software(Id),
    ConfiguracaoId TEXT    NOT NULL REFERENCES ConfiguracaoHardware(Id),
    Nivel          TEXT    NOT NULL CHECK (Nivel IN ('X','W','I','S')),
    PRIMARY KEY (SoftwareId, ConfiguracaoId)
);
-- X=Inadequado, W=Atende, I=Ideal, S=Superdimensionado
```

## 6. ModeloNotebook
```sql
CREATE TABLE ModeloNotebook (
    Sku         TEXT PRIMARY KEY,
    Fabricante  TEXT CHECK (Fabricante IN ('Dell','Lenovo')),
    Serie       TEXT,
    ConfigId    TEXT NOT NULL REFERENCES ConfiguracaoHardware(Id),
    GarantiaMes INTEGER CHECK (GarantiaMes IN (12,24,36)),
    UrlSpec     TEXT
);
```

## 7. UsoColaborador (histórico de stacks)
```sql
CREATE TABLE Colaborador (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Nome TEXT NOT NULL
);

CREATE TABLE UsoColaborador (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ColaboradorId INTEGER NOT NULL REFERENCES Colaborador(Id),
    DataUso       TEXT NOT NULL,
    Observacao    TEXT
);

CREATE TABLE UsoColaboradorSoftware (
    UsoId      INTEGER NOT NULL REFERENCES UsoColaborador(Id),
    SoftwareId INTEGER NOT NULL REFERENCES Software(Id),
    PRIMARY KEY (UsoId, SoftwareId)
);
```

---

### Notas de conversão SQLite
| SQL Server | SQLite |
|------------|--------|
| `INT IDENTITY` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| `CHAR(n)` | `TEXT` |
| `VARCHAR(n)` | `TEXT` |
| `DECIMAL(p,s)` | `REAL` ou `NUMERIC` |
| `TINYINT` | `INTEGER` |
| `DATE` | `TEXT` (ISO 8601: YYYY-MM-DD) |
| `DEFAULT GETDATE()` | `DEFAULT (DATE('now'))` |
| `REFERENCES` | Idêntico (requer `PRAGMA foreign_keys = ON`) |

### Uso
1. Criar banco: `sqlite3 dimensionamento.db`
2. Habilitar FK: `PRAGMA foreign_keys = ON;`
3. Executar DDL acima.

### Próximos Passos
1. Popular `CategoriaSoftware` + `ConfiguracaoHardware`.
2. Importar SKUs via PSREF/Dell CSV para `ModeloNotebook`.
3. Coletar métricas e popular `MetricasSoftware`.
4. Criar view/query para recomendar configuração a partir de softwares.

---

## Query de Recomendação (sem procedure em SQLite)

Como SQLite não suporta stored procedures, use esta query parametrizada:

```sql
-- Substitua ? pelos IDs dos softwares (ou NULL para ignorar)
WITH SoftwareSelecionados AS (
    SELECT ? AS Id UNION ALL
    SELECT ? UNION ALL
    SELECT ? UNION ALL
    SELECT ? UNION ALL
    SELECT ?
),
Ranked AS (
    SELECT c.ConfiguracaoId,
           MIN(CASE c.Nivel WHEN 'X' THEN 1 WHEN 'W' THEN 2 WHEN 'I' THEN 3 ELSE 4 END) AS Score
    FROM Compatibilidade c
    JOIN SoftwareSelecionados s ON s.Id = c.SoftwareId
    WHERE s.Id IS NOT NULL
    GROUP BY c.ConfiguracaoId
)
SELECT r.ConfiguracaoId, ch.Nome, ch.CpuModelo, ch.RamGb, ch.GpuModelo,
       mn.Sku, mn.Fabricante, mn.Serie
FROM Ranked r
JOIN ConfiguracaoHardware ch ON ch.Id = r.ConfiguracaoId
LEFT JOIN ModeloNotebook mn ON mn.ConfigId = r.ConfiguracaoId
ORDER BY Score DESC, r.ConfiguracaoId
LIMIT 1;
```

> Execute via Python/Java/Node com prepared statements, passando IDs reais nos lugares dos `?`.
