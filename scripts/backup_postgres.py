from datetime import datetime
import json
import os
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


TABLES = [
    "repartidores",
    "pedidos",
    "pedido_items",
    "ventas",
    "venta_items",
    "gastos",
    "inventario",
    "inventario_agua",
    "pagos_repartidores",
    "liquidaciones_repartidores",
    "fises_repartidores",
    "fise_entregas",
    "fiado_pagos",
    "cuentas_bancarias",
    "saldos_diarios",
    "movimientos_cuentas",
    "ganancias",
    "precios_gas",
    "pagos_venta",
    "stock_diario",
    "prestamos",
    "movimientos_inventario",
    "movimientos_agua",
    "auditoria_cambios",
]


def main():
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        raise SystemExit("Falta DATABASE_URL.")

    backup_dir = Path(os.getenv("BACKUP_DIR", "backups"))
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output = backup_dir / f"sistema_gas_backup_{stamp}.json"

    data = {"created_at": datetime.now().isoformat(timespec="seconds"), "tables": {}}
    with psycopg.connect(database_url, row_factory=dict_row) as connection:
        for table in TABLES:
            rows = connection.execute(f"SELECT * FROM {table}").fetchall()
            data["tables"][table] = [dict(row) for row in rows]

    output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Backup creado: {output}")


if __name__ == "__main__":
    main()
