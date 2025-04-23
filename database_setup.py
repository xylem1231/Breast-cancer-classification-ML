import sqlite3

# Connect to database
conn = sqlite3.connect("patient_metadata.db")
cursor = conn.cursor()

# Create table for patient metadata and clinical data
cursor.execute('''CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    age INTEGER,
    gender TEXT,
    family_history TEXT,
    previous_cancer TEXT,
    symptoms TEXT,
    concave_points_mean REAL,
    concave_points_worst REAL,
    radius_worst REAL,
    perimeter_worst REAL,
    area_worst REAL,
    concavity_mean REAL,
    perimeter_mean REAL,
    area_mean REAL,
    diagnosis TEXT
)''')

# Commit and close
conn.commit()
conn.close()

print("Database schema created successfully.")

import sqlite3

conn = sqlite3.connect("patient_metadata.db")
cursor = conn.cursor()

# Add the diagnosis column only if it doesn't already exist
try:
    cursor.execute("ALTER TABLE patients ADD COLUMN diagnosis TEXT")
    print("Column 'diagnosis' added successfully.")
except sqlite3.OperationalError as e:
    print("Could not add column (maybe it already exists):", e)

conn.commit()
conn.close()