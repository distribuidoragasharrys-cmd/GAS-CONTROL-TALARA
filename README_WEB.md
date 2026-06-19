# SISTEMA GAS WEB

Esta carpeta es una copia independiente de `SISTEMA-GAS` preparada para ejecutarse en Render con PostgreSQL.

La version local original queda como respaldo y no debe subirse ni modificarse para produccion.

## 1. Probar la copia web localmente

```powershell
cd "C:\Users\JHON MACHARÉ\Desktop\SISTEMA-GAS-WEB"
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe app.py
```

Si no configuras `DATABASE_URL`, la copia web puede seguir usando SQLite local para pruebas.

## 2. Crear repositorio en GitHub

1. Entra a GitHub.
2. Crea un repositorio nuevo, por ejemplo `sistema-gas-web`.
3. En PowerShell:

```powershell
cd "C:\Users\JHON MACHARÉ\Desktop\SISTEMA-GAS-WEB"
git init
git add .
git commit -m "Version web Flask PostgreSQL"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/sistema-gas-web.git
git push -u origin main
```

No subas archivos `.env` ni bases `.db`.

## 3. Crear PostgreSQL en Render

1. En Render, crea un servicio `PostgreSQL`.
2. Nombre sugerido: `sistema-gas-db`.
3. Copia el valor `External Database URL` o usa el blueprint `render.yaml`.

## 4. Crear Web Service en Render

Opcion recomendada: usar `render.yaml`.

1. Render -> New -> Blueprint.
2. Conecta el repositorio de GitHub.
3. Render detectara:
   - Web service `sistema-gas`.
   - Database `sistema-gas-db`.
4. Configura variables:

```text
SECRET_KEY=una-clave-larga-y-secreta
ADMIN_USER=admin
ADMIN_PASSWORD=una-clave-segura
DATABASE_URL=la-url-de-postgresql
FLASK_DEBUG=0
```

El comando de inicio ya esta configurado:

```text
gunicorn --workers 2 --threads 4 --timeout 120 app:app
```

## 5. Migrar datos de SQLite a PostgreSQL

Primero haz una copia del archivo local:

```powershell
Copy-Item "C:\Users\JHON MACHARÉ\Desktop\SISTEMA-GAS\database\sistema_gas.db" "C:\Users\JHON MACHARÉ\Desktop\sistema_gas_backup_local.db"
```

Luego ejecuta la migracion desde la carpeta web:

```powershell
cd "C:\Users\JHON MACHARÉ\Desktop\SISTEMA-GAS-WEB"
$env:SQLITE_PATH="C:\Users\JHON MACHARÉ\Desktop\SISTEMA-GAS\database\sistema_gas.db"
$env:DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST:5432/BASE"
.\venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py
```

Para reemplazar datos de una base PostgreSQL de prueba:

```powershell
$env:MIGRATION_REPLACE="1"
.\venv\Scripts\python.exe scripts\migrate_sqlite_to_postgres.py
```

Usa `MIGRATION_REPLACE=1` solo en una base nueva o de prueba.

## 6. Backups

Render PostgreSQL ofrece backups administrados segun el plan contratado. Activalos desde el panel de la base de datos.

Tambien puedes generar un backup JSON:

```powershell
cd "C:\Users\JHON MACHARÉ\Desktop\SISTEMA-GAS-WEB"
$env:DATABASE_URL="postgresql://USUARIO:PASSWORD@HOST:5432/BASE"
.\venv\Scripts\python.exe scripts\backup_postgres.py
```

El archivo se guardara en `backups/`.

## 7. URL publica

Cuando Render termine el despliegue, la aplicacion quedara disponible en una URL parecida a:

```text
https://sistema-gas.onrender.com
```

La app funcionara aunque tu computadora este apagada.
