import sqlite3
import json

DB_PATH = "patient_metadata.db"

def insert_patient(name, age, gender, family_history, symptoms, previous_cancer, clinical_data, diagnosis, confidence):
    """Insert patient data into the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''INSERT INTO patients 
                      (name, age, gender, family_history, symptoms, previous_cancer, clinical_data, prediction_result, confidence) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
                   (name, age, gender, family_history, symptoms, previous_cancer, json.dumps(clinical_data), diagnosis, confidence))
    conn.commit()
    conn.close()

def get_latest_patient():
    """Retrieve the most recent patient entry from the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM patients ORDER BY timestamp DESC LIMIT 1")
    patient = cursor.fetchone()
    conn.close()
    
    if patient:
        return {
            'id': patient[0],
            'name': patient[1],
            'age': patient[2],
            'gender': patient[3],
            'family_history': patient[4],
            'symptoms': patient[5],
            'previous_cancer': patient[6],
            'clinical_data': json.loads(patient[7]),
            'diagnosis': patient[8],
            'confidence': patient[9],
            'timestamp': patient[10]
        }
    return None

