# Sistema Gas

Sistema web local con Flask, SQLite, Bootstrap y dashboard profesional para Distribuidora Harrys.

## Flujo principal

1. Registrar pedido.
2. Gestionar el pedido desde un solo cuadro: asignar, entregar o liquidar.
3. Liquidar con pagos separados o combinados.
4. Registrar inventario, FISES, gastos y saldos del dia.
5. Revisar dashboard, cuentas, inventario, fiados y repartidores.

## Funciones

- Pedidos con estados: pendiente, en ruta, entregado y liquidado.
- Productos por pedido: balon/carga de gas 10 kg, balon/carga de gas 45 kg, bidon de agua y carga de agua.
- Selector automatico de valvula normal o premium solo para productos de gas.
- Precio de venta, costo y ganancia estimada desde el pedido.
- Pedidos mixtos con gas y agua en una sola venta.
- Despacho por repartidor con observaciones.
- Liquidacion por pedido con efectivo, Yape, Yape Marcos, Plin, FISE y fiado.
- Gestion rapida para asignar repartidor, entregar y liquidar desde un solo cuadro.
- Calculo automatico de total vendido, dinero entregado, diferencia, saldo pendiente y ganancia.
- Ingresos manuales de balones llenos que suman al inventario actual.
- Inventario separado de agua con bidones llenos, vacios, entradas y salidas.
- Registro de FISES reportados por repartidor con historial diario.
- Control de repartidores por fecha.
- Inventario con llenos, vacios, prestados a clientes y prestados a mayoristas.
- Stock inicial diario, ventas del dia, stock final y cuadre automatico.
- Saldos diarios para BCP, Interbank, cuenta FISE, efectivo en caja, Yape y Plin.
- Movimientos diarios de cuentas.
- Exportacion Excel de pedidos, ventas, gastos, inventario, liquidaciones, fiados y repartidores.
- Dashboard con ventas por producto, ventas por valvula y ganancias por producto.
- Edicion y eliminacion controlada de registros con confirmacion.
- Anulacion de pedidos sin borrar el historial operativo.
- Auditoria interna de cambios en SQLite.
- Login simple con usuario, contrasena, sesiones y cierre de sesion.
- Acceso desde celular u otras computadoras en la misma red WiFi.
- Preparado para despliegue online en Render o Railway.

## Instalar

Abre PowerShell:

```powershell
cd "$HOME\Desktop\SISTEMA-GAS"
```

Si ya tienes el entorno virtual:

```powershell
.\venv\Scripts\activate
python -m pip install -r requirements.txt
```

Si no existe `venv`:

```powershell
py -m venv venv
.\venv\Scripts\activate
python -m pip install -r requirements.txt
```

## Ejecutar localmente

```powershell
cd "$HOME\Desktop\SISTEMA-GAS"
.\venv\Scripts\activate
python app.py
```

En la misma computadora abre:

```text
http://127.0.0.1:5000
```

Usuario inicial local:

```text
usuario: admin
contrasena: admin123
```

Puedes cambiarlo con variables de entorno `ADMIN_USER` y `ADMIN_PASSWORD`.

## Acceder desde celular u otra PC

1. Conecta la computadora y el celular a la misma red WiFi.
2. En PowerShell ejecuta:

```powershell
ipconfig
```

3. Busca la direccion IPv4 de tu WiFi, por ejemplo `192.168.1.25`.
4. En el celular abre:

```text
http://192.168.1.25:5000
```

Si Windows pregunta por permiso de firewall para Python, permite el acceso en red privada.

## Acceso online con Render

1. Sube el proyecto a GitHub.
2. En Render crea un nuevo Web Service desde el repositorio.
3. Render detectara `render.yaml`.
4. Configura estas variables:

```text
ADMIN_USER=admin
ADMIN_PASSWORD=tu_contrasena_segura
SECRET_KEY=una_clave_larga_y_privada
DATABASE_PATH=/var/data/sistema_gas.db
```

5. Usa un disco persistente en `/var/data` para conservar SQLite.
6. Abre la URL publica de Render desde celular, tablet o PC.

## Acceso online con Railway

1. Sube el proyecto a GitHub.
2. Crea un proyecto en Railway y conecta el repositorio.
3. Railway usara `railway.json`.
4. Agrega variables:

```text
ADMIN_USER=admin
ADMIN_PASSWORD=tu_contrasena_segura
SECRET_KEY=una_clave_larga_y_privada
DATABASE_PATH=/data/sistema_gas.db
```

SQLite funciona para comenzar. Para trabajo con varios usuarios y crecimiento, el siguiente paso recomendado es migrar a PostgreSQL.

## Base de datos

No necesitas migraciones manuales. Al iniciar `app.py`, el sistema crea o actualiza automaticamente:

- `pedidos`
- `pedido_items`
- `ventas`
- `venta_items`
- `pagos_venta`
- `liquidaciones_repartidores`
- `fises_repartidores`
- `cuentas_bancarias`
- `saldos_diarios`
- `movimientos_cuentas`
- `inventario`
- `inventario_agua`
- `stock_diario`
- `prestamos`
- `movimientos_inventario`
- `movimientos_agua`
- `auditoria_cambios`

Tus datos existentes se conservan.

Los campos nuevos de producto, valvula, costo, precio y ganancia tambien se agregan solos al abrir el sistema. Los pedidos y ventas antiguos se completan como `BALON DE GAS 10 KG` y `VALVULA NORMAL` para mantener compatibilidad.

## Uso diario recomendado

1. Filtra la fecha en la parte superior.
2. Registra saldos iniciales de cuentas.
3. Registra precio del dia y stock inicial.
4. Registra pedidos con producto, valvula si es gas, costo y precio de venta.
5. Si es una venta mixta, usa el producto adicional opcional.
6. Usa Gestion rapida para asignar repartidor, entregar o liquidar.
7. Liquida pedidos con sus pagos reales.
8. Usa Editar para corregir datos y Eliminar o Anular cuando corresponda.
9. Descarga reportes Excel si necesitas cierre o respaldo.

## Edicion y anulacion

- Pedidos se anulan en lugar de borrarse completamente.
- Ventas eliminadas revierten pagos, ganancias y stock cuando corresponde.
- Liquidaciones eliminadas revierten movimientos de cuentas y dejan el pedido entregado si venia de un pedido.
- Gastos eliminados revierten el movimiento de caja.
- Repartidores se desactivan para no romper historiales antiguos.

## Reiniciar base de datos

Cierra Flask y elimina:

```text
database/sistema_gas.db
```

Luego ejecuta:

```powershell
python app.py
```
