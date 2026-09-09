import sqlite3
from datetime import datetime

conn = sqlite3.connect('backend/db.sqlite3')
conn.row_factory = sqlite3.Row
cur = conn.cursor()

BOOLEAN_FIELDS_BY_TABLE = {
    'accounts_user': {'is_superuser', 'is_staff', 'is_active'},
    'inventory_device': {'demo_unit', 'loaner_device', 'replacement_device', 'replaced_device', 'refurbished'},
    'inventory_deviceassignment': {'is_active'},
}

def format_val(table_name, col, val):
    if val is None:
        return 'NULL'
    bool_cols = BOOLEAN_FIELDS_BY_TABLE.get(table_name, set())
    if col in bool_cols:
        return 'TRUE' if val in (1, '1', True, 'true', 't') else 'FALSE'
    if isinstance(val, (int, float)):
        return str(val)
    # String / Text
    s = str(val).replace("'", "''")
    return f"'{s}'"

def dump_table(table_name, conflict_key=None, custom_id=True):
    rows = cur.execute(f"SELECT * FROM {table_name}").fetchall()
    if not rows:
        return ""
    
    cols = [desc[0] for desc in cur.description]
    sql_lines = [f"-- DATA RESTORE FOR {table_name} ({len(rows)} rows)"]
    
    for row in rows:
        col_names = ", ".join(cols)
        values = ", ".join([format_val(table_name, col, row[col]) for col in cols])
        
        if conflict_key:
            sql_lines.append(f"INSERT INTO {table_name} ({col_names}) VALUES ({values}) ON CONFLICT ({conflict_key}) DO NOTHING;")
        else:
            sql_lines.append(f"INSERT INTO {table_name} ({col_names}) VALUES ({values}) ON CONFLICT DO NOTHING;")
            
    # Reset sequence if custom_id
    if custom_id and 'id' in cols:
        sql_lines.append(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE((SELECT MAX(id) FROM {table_name}), 1));")
    
    sql_lines.append("")
    return "\n".join(sql_lines)

output = []
output.append("-- ==============================================================================")
output.append("-- GADGET DELUXE - DATA RESTORATION SCRIPT")
output.append(f"-- Exported on {datetime.now().isoformat()} from local sqlite backup")
output.append("-- ==============================================================================\n")

# Order of tables for foreign key constraints:
output.append(dump_table('accounts_user', 'id'))
output.append(dump_table('shipments_supplier', 'id'))
output.append(dump_table('shipments_shipment', 'id'))
output.append(dump_table('customers_customer', 'id'))
output.append(dump_table('inventory_device', 'id'))
output.append(dump_table('inventory_deviceassignment', 'id'))
output.append(dump_table('inventory_devicehistory', 'id'))
output.append(dump_table('repairs_repair', 'id'))
output.append(dump_table('sickw_sickwreport', 'id'))

output.append("""
-- Ensure admin jubaer has password 787898 and full admin privileges
UPDATE accounts_user SET 
    password = 'pbkdf2_sha256$1500000$8PgcRq8pxdNMtqYYy4R3Xf$TWRvTnYqwUFtabgI7DR0BQSJRrCjfm89iZKH/uLZrko=',
    is_staff = TRUE,
    is_superuser = TRUE,
    role = 'ADMIN',
    is_active = TRUE
WHERE username = 'jubaer';
""")

with open('restore_data.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(output))

print("Successfully generated clean restore_data.sql")
