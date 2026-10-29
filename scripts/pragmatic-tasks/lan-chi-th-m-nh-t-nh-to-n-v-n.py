import sqlite3
import json
from typing import Dict, List

def validate_database_schema(db_path: str, contract_path: str) -> bool:
    """
    Validates the database schema against the JSON contract.

    :param db_path: Path to the SQLite database file.
    :param contract_path: Path to the JSON contract file.
    :return: True if the schema is valid, False otherwise.
    """
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Read the JSON contract
        with open(contract_path, 'r') as file:
            contract = json.load(file)

        # Validate each table in the contract
        for table_name, table_info in contract['tables'].items():
            # Check if the table exists in the database
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
            table_exists = cursor.fetchone()

            if not table_exists:
                print(f"Error: Table '{table_name}' does not exist in the database.")
                return False

            # Validate columns
            for column_name, column_info in table_info['columns'].items():
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()

                column_exists = False
                for col in columns:
                    if col[1] == column_name:
                        column_exists = True
                        break

                if not column_exists:
                    print(f"Error: Column '{column_name}' does not exist in table '{table_name}'.")
                    return False

                # Validate data types and constraints
                if column_info['type'] != col[2]:
                    print(f"Error: Column '{column_name}' has an incorrect data type in table '{table_name}'.")
                    return False

                if 'constraints' in column_info:
                    for constraint in column_info['constraints']:
                        if constraint == 'NOT NULL':
                            if col[5] is None:
                                print(f"Error: Column '{column_name}' in table '{table_name}' is NULL.")
                                return False

        # Close the database connection
        conn.close()
        return True

    except Exception as e:
        print(f"An error occurred: {e}")
        return False

if __name__ == "__main__":
    db_path = 'path_to_your_database.db'
    contract_path = 'path_to_your_contract.json'

    if validate_database_schema(db_path, contract_path):
        print("Database schema and JSON contract are valid.")
    else:
        print("Database schema and JSON contract are not valid.")