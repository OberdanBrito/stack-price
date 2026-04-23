-- Migration: Add tracking columns to ModeloNotebook table
-- Date: 2026-04-22

-- Add UltimaVerificacao column
ALTER TABLE dbo.ModeloNotebook 
ADD UltimaVerificacao date NULL;

-- Add MotivoFalha column
ALTER TABLE dbo.ModeloNotebook 
ADD MotivoFalha varchar(255) NULL;

PRINT 'Migration completed: Added UltimaVerificacao and MotivoFalha columns to ModeloNotebook';
