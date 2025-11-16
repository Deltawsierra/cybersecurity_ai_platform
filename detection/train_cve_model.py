# train_cve_model.py

import os
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# Synthetic training data (for now)
data = {
    "text": [
        "This vulnerability allows remote code execution via buffer overflow",
        "Denial of service triggered by malformed packet",
        "Escalates privileges using kernel flaw",
        "SQL injection in login form",
        "Cross-site scripting in comment box",
        "Information disclosure via verbose error message",
        "Benign update log",
        "Routine authentication flow"
    ],
    "label": [
        "rce", "dos", "privilege_escalation", "sql_injection",
        "xss", "info_disclosure", "benign", "benign"
    ]
}

df = pd.DataFrame(data)

# ML pipeline
pipeline = Pipeline([
    ("vectorizer", TfidfVectorizer()),
    ("classifier", MultinomialNB())
])

# Train
pipeline.fit(df["text"], df["label"])

# Save
model_path = os.path.join("detection", "ml_models", "cve_classifier.pkl")
os.makedirs(os.path.dirname(model_path), exist_ok=True)
joblib.dump(pipeline, model_path)

print(f"✅ Model saved to {model_path}")
