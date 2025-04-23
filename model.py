import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Load the dataset
data = pd.read_csv('BCA.1.csv')

# Verify the dataset contains required columns
required_features = [
    'concave_points_mean', 'concave_points_worst', 'radius_worst',
    'perimeter_worst', 'area_worst', 'concavity_mean',
    'perimeter_mean', 'area_mean'
]

# Check if all required features exist in the dataset
missing_features = [f for f in required_features if f not in data.columns]
if missing_features:
    raise ValueError(f"Dataset is missing required features: {missing_features}")

# Separate features and target
X = data[required_features]  # Use only the required features
y = data['diagnosis']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize and train the model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)

# Save the model
joblib.dump(model, 'breast_cancer_model.pkl')

# Print feature names
print("Model trained with features:", list(X.columns))

# Visualization 1: Confusion Matrix Heatmap
plt.figure(figsize=(8, 6))
cm = confusion_matrix(y_test, y_pred)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=['Predicted Benign', 'Predicted Malignant'],
            yticklabels=['Actual Benign', 'Actual Malignant'])
plt.title('Confusion Matrix Heatmap')
plt.ylabel('True label')
plt.xlabel('Predicted label')
plt.show()

# Visualization 2: Correlation Heatmap of Features
plt.figure(figsize=(10, 8))
corr = X.corr()
sns.heatmap(corr, annot=True, cmap='coolwarm', center=0)
plt.title('Feature Correlation Heatmap')
plt.show()

from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

# Assuming y_test (true labels) and y_pred (predictions)
print(f"Model Accuracy: {accuracy_score(y_test, y_pred):.2f}")
print(f"Precision: {precision_score(y_test, y_pred, pos_label='M'):.2f}")
print(f"Recall: {recall_score(y_test, y_pred, pos_label='M'):.2f}")
print(f"F1-Score: {f1_score(y_test, y_pred, pos_label='M'):.2f}")
print(f"ROC-AUC: {roc_auc_score(y_test, model.predict_proba(X_test)[:, 1]):.2f}")