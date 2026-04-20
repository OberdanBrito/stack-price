# SQL Server Express no Linux - Guia de Instalação

Este guia explica como instalar e configurar o **SQL Server 2022 Express** no Linux para o projeto de precificação de hardware.

## Opção 1: Instalação Nativa (Ubuntu/Debian)

### 1. Importar chaves GPG da Microsoft

```bash
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
```

### 2. Adicionar repositório

```bash
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list)"
```

### 3. Instalar SQL Server Express

```bash
sudo apt update
sudo apt install -y mssql-server
```

### 4. Configurar a instância

```bash
sudo /opt/mssql/bin/mssql-conf setup
```

Selecione a opção **(3) Express** quando solicitado.

### 5. Verificar status

```bash
systemctl status mssql-server
```

---

## Opção 2: Docker (Recomendado para desenvolvimento)

### 1. Instalar Docker (se não tiver)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

### 2. Rodar SQL Server Express em container

```bash
docker run -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=SuaSenhaForte123!" \
  -e "MSSQL_PID=Express" \
  -p 1433:1433 \
  --name sqlserver-express \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

### 3. Verificar container

```bash
docker ps
docker logs sqlserver-express
```

---

## Configuração do Projeto

### 1. Criar arquivo `.env`

```bash
cd /home/oberdan/WebstormProjects/precificacao_hardware/scraper
cp .env.example .env
```

### 2. Editar `.env` conforme a instalação

**Para instalação nativa:**
```env
DB_SERVER=localhost
DB_NAME=PrecificacaoHardware
DB_USER=sa
DB_PASSWORD=SuaSenhaForte123!
DB_PORT=1433
```

**Para Docker:**
```env
DB_SERVER=localhost
DB_NAME=PrecificacaoHardware
DB_USER=sa
DB_PASSWORD=SuaSenhaForte123!
DB_PORT=1433
```

---

## Criar o Banco de Dados

### 1. Instalar sqlcmd (ferramenta CLI)

```bash
sudo apt install -y mssql-tools unixodbc-dev
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
source ~/.bashrc
```

### 2. Criar banco

```bash
sqlcmd -S localhost -U sa -P 'SuaSenhaForte123!' -Q "CREATE DATABASE PrecificacaoHardware"
```

### 3. Executar script de criação de tabelas

```bash
cd /home/oberdan/WebstormProjects/precificacao_hardware
sqlcmd -S localhost -U sa -P 'SuaSenhaForte123!' -d PrecificacaoHardware -i insert_modelos_notebooks.sql
```

---

## Comandos Úteis

| Ação | Comando |
|------|---------|
| Status do serviço | `sudo systemctl status mssql-server` |
| Iniciar serviço | `sudo systemctl start mssql-server` |
| Parar serviço | `sudo systemctl stop mssql-server` |
| Acessar sqlcmd | `sqlcmd -S localhost -U sa -P 'senha'` |
| Ver logs | `sudo cat /var/opt/mssql/log/errorlog` |

---

## Troubleshooting

### Erro: "Cannot connect to SQL Server"

1. Verifique se o serviço está rodando:
   ```bash
   sudo systemctl status mssql-server
   ```

2. Verifique a porta:
   ```bash
   sudo netstat -tlnp | grep 1433
   ```

3. Verifique firewall:
   ```bash
   sudo ufw allow 1433/tcp
   ```

### Erro de senha fraca

A senha do SA deve ter:
- Mínimo 8 caracteres
- Letras maiúsculas e minúsculas
- Números
- Caracteres especiais

### Resetar senha SA

```bash
sudo systemctl stop mssql-server
sudo /opt/mssql/bin/mssql-conf set-sa-password
sudo systemctl start mssql-server
```

---

## Recursos

- [Documentação SQL Server no Linux](https://docs.microsoft.com/pt-br/sql/linux/)
- [Imagem Docker SQL Server](https://hub.docker.com/_/microsoft-mssql-server)
