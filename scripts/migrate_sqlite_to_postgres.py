import os
from pathlib import Path
import sqlite3

import psycopg


TABLES = [
    "repartidores",
    "pedidos",
    "pedido_items",
    "ventas",
    "venta_items",
    "auditoria_cambios",
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
]


def sqlite_columns(connection, table):
    return [row[1] for row in connection.execute(f"PRAGMA table_info({table})").fetchall()]


def postgres_columns(connection, table):
    rows = connection.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    ).fetchall()
    return [row[0] for row in rows]


def reset_identity(connection, table):
    row = connection.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
          AND column_default LIKE 'nextval%%'
        LIMIT 1
        """,
        (table,),
    ).fetchone()
    if not row:
        return
    column = row[0]
    max_id = connection.execute(f"SELECT COALESCE(MAX({column}), 0) FROM {table}").fetchone()[0]
    connection.execute(
        "SELECT setval(pg_get_serial_sequence(%s, %s), %s, true)",
        (table, column, max_id),
    )


def main():
    sqlite_path = Path(os.getenv("SQLITE_PATH", "database/sistema_gas.db"))
    database_url = os.getenv("DATABASE_URL", "")
    replace = os.getenv("MIGRATION_REPLACE", "0") == "1"

    if not sqlite_path.exists():
        raise SystemExit(f"No existe SQLite: {sqlite_path}")
    if not database_url:
        raise SystemExit("Falta DATABASE_URL para PostgreSQL.")

    import app

    app.init_db()

    sqlite_connection = sqlite3.connect(sqlite_path)
    sqlite_connection.row_factory = sqlite3.Row
    pg_connection = psycopg.connect(database_url)

    try:
        with pg_connection:
            if replace:
                for table in reversed(TABLES):
                    pg_connection.execute(f"DELETE FROM {table}")

            for table in TABLES:
                source_columns = sqlite_columns(sqlite_connection, table)
                target_columns = postgres_columns(pg_connection, table)
                columns = [column for column in source_columns if column in target_columns]
                if not columns:
                    continue
                rows = sqlite_connection.execute(f"SELECT {', '.join(columns)} FROM {table}").fetchall()
                if not rows:
                    continue
                placeholders = ", ".join(["%s"] * len(columns))
                column_sql = ", ".join(columns)
                query = f"INSERT INTO {table} ({column_sql}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                values = [tuple(row[column] for column in columns) for row in rows]
                pg_connection.executemany(query, values)
                reset_identity(pg_connection, table)
                print(f"{table}: {len(values)} filas migradas")
    finally:
        sqlite_connection.close()
        pg_connection.close()


if __name__ == "__main__":
    main()
