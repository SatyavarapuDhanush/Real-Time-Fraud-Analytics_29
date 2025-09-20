# Fraud Detection System

## Overview

This is a machine learning-powered fraud detection web application built with Flask. The system provides real-time fraud prediction capabilities for financial transactions, featuring a comprehensive dashboard for monitoring, analyzing, and managing fraud alerts. The application combines supervised machine learning models with an intuitive web interface to help financial institutions detect and prevent fraudulent activities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Traditional server-side rendered HTML templates using Jinja2
- **Styling**: Bootstrap 5.1.3 for responsive UI components and grid system
- **JavaScript**: Vanilla JavaScript with Bootstrap for interactive elements like tooltips, forms, and AJAX requests
- **Design Pattern**: Multi-page application with shared base template for consistent navigation and styling

### Backend Architecture
- **Framework**: Flask web framework with Python
- **Architecture Pattern**: Monolithic application with route-based controllers
- **Session Management**: Flask sessions with configurable secret key
- **Error Handling**: Try-catch blocks around ML model operations with fallback mechanisms
- **File Structure**: Single main.py file containing all route handlers and business logic

### Data Storage
- **Database**: SQLite for persistence with SQLAlchemy ORM
- **Schema**: Single `predictions` table storing transaction predictions with metadata
- **Connection Management**: SQLAlchemy engine with connection pooling
- **Data Types**: Supports structured transaction data, prediction results, and batch processing

### Machine Learning Integration
- **Model Format**: Scikit-learn models serialized with joblib
- **Model Loading**: Dynamic model loading with error handling for missing models
- **Prediction Pipeline**: Support for both single transaction and batch prediction workflows
- **Metrics Generation**: Built-in support for confusion matrices, ROC curves, and precision-recall analysis

### Analytics and Visualization
- **Plotting Library**: Matplotlib with Seaborn for statistical visualizations
- **Chart Types**: Support for confusion matrices, ROC curves, precision-recall curves, and fraud distribution plots
- **Image Handling**: Base64 encoding for embedding charts directly in HTML templates
- **Backend Configuration**: Non-interactive matplotlib backend for server environments

### User Interface Components
- **Dashboard**: Overview of key metrics including total predictions, fraud count, and fraud rate
- **Transaction Management**: Paginated transaction history with filtering and status indicators
- **Alert System**: Real-time fraud alerts with risk level categorization
- **Analytics**: Performance metrics with visual charts and model evaluation tools
- **Forms**: Single transaction prediction and batch file upload capabilities

## External Dependencies

### Core Framework Dependencies
- **Flask**: Web application framework and routing
- **SQLAlchemy**: Database ORM and connection management
- **Jinja2**: Template engine (included with Flask)

### Machine Learning Stack
- **scikit-learn**: ML model training, evaluation, and prediction algorithms
- **joblib**: Model serialization and loading
- **pandas**: Data manipulation and analysis
- **numpy**: Numerical computing and array operations

### Visualization and Analytics
- **matplotlib**: Core plotting and chart generation
- **seaborn**: Statistical data visualization built on matplotlib

### Frontend Libraries (CDN)
- **Bootstrap 5.1.3**: CSS framework and JavaScript components for responsive design
- **Bootstrap JavaScript**: Interactive components like tooltips and form validation

### Database
- **SQLite**: Embedded relational database (no external service required)
- **File-based storage**: Database stored as local file `fraud_predictions.db`

### Environment Configuration
- **Environment Variables**: Session secret key configuration
- **File System**: Local file storage for ML models in `ml/` directory
- **Static Assets**: CSS and JavaScript files served from `static/` directory