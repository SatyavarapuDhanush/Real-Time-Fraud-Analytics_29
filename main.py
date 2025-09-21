import os
import base64
import io
import sqlite3
from datetime import datetime
import pandas as pd
import numpy as np
import joblib

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix
from flask import Flask, render_template, request, jsonify
from sqlalchemy import create_engine, text
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for Render

app = Flask(__name__)
app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key')

# Database configuration
DATABASE_URL = 'sqlite:///fraud_predictions.db'
engine = create_engine(DATABASE_URL, future=True)


# Initialize database
def init_db():
    with engine.begin() as conn:
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                transaction_data TEXT,
                prediction INTEGER,
                probability REAL,
                batch_id TEXT
            )
        '''))


# ML Model loading helper
def load_fraud_model():
    try:
        model_path = os.path.join('ml', 'fraud_model.pkl')
        if os.path.exists(model_path):
            return joblib.load(model_path)
        else:
            return None
    except Exception as e:
        print(f"Error loading model: {e}")
        return None


# Generate visualization helpers
def generate_confusion_matrix(y_true, y_pred):
    plt.figure(figsize=(8, 6))
    cm = confusion_matrix(y_true, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Not Fraud', 'Fraud'],
                yticklabels=['Not Fraud', 'Fraud'])
    plt.title('Confusion Matrix')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')

    img = io.BytesIO()
    plt.savefig(img, format='png', bbox_inches='tight')
    img.seek(0)
    plot_url = base64.b64encode(img.getvalue()).decode()
    plt.close()

    return plot_url


def generate_fraud_distribution():
    with engine.connect() as conn:
        df = pd.read_sql_query(
            "SELECT prediction, COUNT(*) as count FROM predictions GROUP BY prediction",
            conn
        )

    if not df.empty:
        plt.figure(figsize=(8, 6))
        labels = []
        colors = []
        for _, row in df.iterrows():
            if row['prediction'] == 0:
                labels.append('Legitimate')
                colors.append('lightblue')
            else:
                labels.append('Fraud')
                colors.append('salmon')

        plt.pie(df['count'], labels=labels, colors=colors, autopct='%1.1f%%')
        plt.title('Transaction Distribution')

        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        plot_url = base64.b64encode(img.getvalue()).decode()
        plt.close()

        return plot_url
    return None


# Routes
@app.route('/')
def dashboard():
    with engine.connect() as conn:
        total_predictions = conn.execute(text("SELECT COUNT(*) FROM predictions")).scalar() or 0
        fraud_count = conn.execute(text("SELECT COUNT(*) FROM predictions WHERE prediction = 1")).scalar() or 0

    fraud_rate = (fraud_count / total_predictions * 100) if total_predictions > 0 else 0

    return render_template('index.html',
                           total_predictions=total_predictions,
                           fraud_count=fraud_count,
                           fraud_rate=round(fraud_rate, 2))


@app.route('/transactions')
def transactions():
    with engine.connect() as conn:
        df = pd.read_sql_query(
            "SELECT * FROM predictions ORDER BY timestamp DESC LIMIT 50",
            conn
        )
    transactions_data = df.to_dict('records') if not df.empty else []
    return render_template('transactions.html', transactions=transactions_data)


@app.route('/alerts')
def alerts():
    with engine.connect() as conn:
        df = pd.read_sql_query(
            "SELECT * FROM predictions WHERE prediction = 1 OR probability > 0.7 ORDER BY timestamp DESC LIMIT 30",
            conn
        )
    alerts_data = df.to_dict('records') if not df.empty else []
    return render_template('alerts.html', alerts=alerts_data)


@app.route('/metrics')
def metrics():
    fraud_dist_plot = generate_fraud_distribution()

    with engine.connect() as conn:
        total_predictions = conn.execute(text("SELECT COUNT(*) FROM predictions")).scalar() or 0
        fraud_count = conn.execute(text("SELECT COUNT(*) FROM predictions WHERE prediction = 1")).scalar() or 0
        avg_probability = conn.execute(text("SELECT AVG(probability) FROM predictions")).scalar() or 0

    metrics_data = {
        'total_predictions': total_predictions,
        'fraud_count': fraud_count,
        'legitimate_count': total_predictions - fraud_count,
        'avg_probability': round(avg_probability, 3),
        'fraud_rate': round((fraud_count / total_predictions * 100), 2) if total_predictions > 0 else 0
    }

    return render_template('metrics.html',
                           metrics=metrics_data,
                           fraud_dist_plot=fraud_dist_plot)


# API Endpoints
@app.route('/predict', methods=['POST'])
def predict_single():
    try:
        model = load_fraud_model()
        if model is None:
            return jsonify({'error': 'ML model not found. Please upload fraud_model.pkl to ml/ folder'}), 404

        transaction_data = request.json
        if not transaction_data:
            return jsonify({'error': 'No transaction data provided'}), 400

        feature_names = ['amount', 'hour', 'day', 'merchant_category', 'customer_age']
        features = [float(transaction_data.get(f, 0.0)) for f in feature_names]

        prediction = model.predict([features])[0]
        probability = model.predict_proba([features])[0][1]

        with engine.begin() as conn:
            conn.execute(text('''
                INSERT INTO predictions (transaction_data, prediction, probability, batch_id)
                VALUES (:data, :pred, :prob, :batch)
            '''), {
                'data': str(transaction_data),
                'pred': int(prediction),
                'prob': float(probability),
                'batch': 'single_prediction'
            })

        return jsonify({
            'prediction': int(prediction),
            'probability': float(probability),
            'is_fraud': bool(prediction),
            'confidence': 'High' if probability > 0.8 else 'Medium' if probability > 0.5 else 'Low'
        })

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


@app.route('/batch_predict', methods=['POST'])
def batch_predict():
    try:
        model = load_fraud_model()
        if model is None:
            return jsonify({'error': 'ML model not found. Please upload fraud_model.pkl to ml/ folder'}), 404

        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'Please upload a CSV file'}), 400

        df = pd.read_csv(file.stream)
        batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        feature_columns = ['amount', 'hour', 'day', 'merchant_category', 'customer_age']
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0.0

        X = df[feature_columns].fillna(0).values
        predictions = model.predict(X)
        probabilities = model.predict_proba(X)[:, 1]

        results = []
        with engine.begin() as conn:
            for i, (pred, prob) in enumerate(zip(predictions, probabilities)):
                transaction_data = df.iloc[i].to_dict()
                conn.execute(text('''
                    INSERT INTO predictions (transaction_data, prediction, probability, batch_id)
                    VALUES (:data, :pred, :prob, :batch)
                '''), {
                    'data': str(transaction_data),
                    'pred': int(pred),
                    'prob': float(prob),
                    'batch': batch_id
                })

                results.append({
                    'row_index': i,
                    'prediction': int(pred),
                    'probability': float(prob),
                    'is_fraud': bool(pred)
                })

        fraud_count = int(sum(predictions))
        total_count = len(predictions)
        avg_probability = float(np.mean(probabilities))

        return jsonify({
            'batch_id': batch_id,
            'total_transactions': total_count,
            'fraud_detected': fraud_count,
            'fraud_rate': float(fraud_count / total_count * 100),
            'average_fraud_probability': avg_probability,
            'results': results[:100]
        })

    except Exception as e:
        return jsonify({'error': f'Batch prediction failed: {str(e)}'}), 500


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get("PORT", 5000))  # important for Render
    app.run(host='0.0.0.0', port=port, debug=True)
