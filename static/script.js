// Fraud Detection System JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize forms
    initializeForms();
    
    // Update threshold display
    const thresholdSlider = document.getElementById('alertThreshold');
    if (thresholdSlider) {
        thresholdSlider.addEventListener('input', function() {
            document.getElementById('thresholdValue').textContent = this.value;
        });
    }
    
    // Check model status on metrics page
    if (window.location.pathname === '/metrics') {
        checkModelStatus();
    }
});

function initializeForms() {
    // Single prediction form
    const singlePredictionForm = document.getElementById('singlePredictionForm');
    if (singlePredictionForm) {
        singlePredictionForm.addEventListener('submit', handleSinglePrediction);
    }
    
    // Batch prediction form
    const batchPredictionForm = document.getElementById('batchPredictionForm');
    if (batchPredictionForm) {
        batchPredictionForm.addEventListener('submit', handleBatchPrediction);
    }
    
    // Alert configuration form
    const alertConfigForm = document.getElementById('alertConfig');
    if (alertConfigForm) {
        alertConfigForm.addEventListener('submit', handleAlertConfig);
    }
}

async function handleSinglePrediction(event) {
    event.preventDefault();
    
    // Get form elements directly by ID instead of using FormData
    const transactionData = {
        amount: parseFloat(document.getElementById('amount').value),
        hour: parseInt(document.getElementById('hour').value),
        day: parseInt(document.getElementById('day').value),
        merchant_category: parseInt(document.getElementById('merchant_category').value),
        customer_age: parseInt(document.getElementById('customer_age').value)
    };
    
    const resultDiv = document.getElementById('predictionResult');
    resultDiv.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> Analyzing transaction...';
    resultDiv.style.display = 'block';
    
    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayPredictionResult(result, resultDiv);
        } else {
            resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Network error: ${error.message}</div>`;
    }
}

async function handleBatchPrediction(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const resultDiv = document.getElementById('batchResult');
    
    resultDiv.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div> Processing batch...';
    resultDiv.style.display = 'block';
    
    try {
        const response = await fetch('/batch_predict', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayBatchResult(result, resultDiv);
        } else {
            resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="alert alert-danger">Network error: ${error.message}</div>`;
    }
}

function displayPredictionResult(result, resultDiv) {
    const isFraud = result.is_fraud;
    const probability = (result.probability * 100).toFixed(1);
    const confidence = result.confidence;
    
    const alertClass = isFraud ? 'alert-danger' : 'alert-success';
    const icon = isFraud ? '🚨' : '✅';
    const status = isFraud ? 'FRAUD DETECTED' : 'LEGITIMATE TRANSACTION';
    
    resultDiv.innerHTML = `
        <div class="alert ${alertClass}">
            <h5>${icon} ${status}</h5>
            <p><strong>Fraud Probability:</strong> ${probability}%</p>
            <p><strong>Confidence Level:</strong> ${confidence}</p>
            <div class="progress mt-2">
                <div class="progress-bar ${isFraud ? 'bg-danger' : 'bg-success'}" 
                     role="progressbar" style="width: ${probability}%">
                    ${probability}%
                </div>
            </div>
        </div>
    `;
}

function displayBatchResult(result, resultDiv) {
    const fraudRate = result.fraud_rate.toFixed(1);
    
    resultDiv.innerHTML = `
        <div class="alert alert-info">
            <h5>📊 Batch Processing Complete</h5>
            <p><strong>Batch ID:</strong> ${result.batch_id}</p>
            <p><strong>Total Transactions:</strong> ${result.total_transactions}</p>
            <p><strong>Fraud Detected:</strong> ${result.fraud_detected}</p>
            <p><strong>Fraud Rate:</strong> ${fraudRate}%</p>
            <p><strong>Average Probability:</strong> ${(result.average_fraud_probability * 100).toFixed(1)}%</p>
            <div class="progress mt-2">
                <div class="progress-bar bg-warning" role="progressbar" style="width: ${fraudRate}%">
                    ${fraudRate}% Fraud Rate
                </div>
            </div>
            <div class="mt-2">
                <a href="/transactions" class="btn btn-primary btn-sm">View Transactions</a>
                <a href="/alerts" class="btn btn-danger btn-sm">View Alerts</a>
            </div>
        </div>
    `;
}

async function handleAlertConfig(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const config = {
        threshold: parseFloat(formData.get('alertThreshold')),
        email_alerts: formData.get('emailAlerts') === 'on',
        auto_block: formData.get('autoBlock') === 'on'
    };
    
    // Here you would typically send this to a backend endpoint
    console.log('Alert configuration:', config);
    
    // Show success message
    showToast('Alert configuration saved successfully!', 'success');
}

async function checkModelStatus() {
    const statusElement = document.getElementById('modelStatus');
    if (!statusElement) return;
    
    try {
        // Try a simple prediction to check if model is loaded
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: 100,
                hour: 12,
                day: 1,
                merchant_category: 1,
                customer_age: 30
            })
        });
        
        if (response.ok) {
            statusElement.innerHTML = '✅ <strong>Model Status:</strong> Active and ready for predictions';
            statusElement.className = 'alert alert-success';
        } else {
            const error = await response.json();
            statusElement.innerHTML = `❌ <strong>Model Status:</strong> ${error.error}`;
            statusElement.className = 'alert alert-warning';
        }
    } catch (error) {
        statusElement.innerHTML = `❌ <strong>Model Status:</strong> Connection error - ${error.message}`;
        statusElement.className = 'alert alert-danger';
    }
}

async function generateChart(chartType) {
    const chartContainer = document.getElementById('generatedChart');
    const spinner = document.getElementById('chartSpinner');
    
    spinner.classList.remove('d-none');
    chartContainer.innerHTML = '';
    chartContainer.appendChild(spinner);
    
    try {
        // Here you would typically call a backend endpoint to generate the chart
        // For now, we'll simulate chart generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        spinner.classList.add('d-none');
        chartContainer.innerHTML = `
            <div class="alert alert-info">
                <h6>${getChartTitle(chartType)}</h6>
                <p>Chart generation feature coming soon!</p>
                <small class="text-muted">This would generate a ${chartType} based on your fraud data.</small>
            </div>
        `;
    } catch (error) {
        spinner.classList.add('d-none');
        chartContainer.innerHTML = `
            <div class="alert alert-danger">
                <p>Failed to generate ${chartType}: ${error.message}</p>
            </div>
        `;
    }
}

function getChartTitle(chartType) {
    const titles = {
        'confusion_matrix': 'Confusion Matrix',
        'roc_curve': 'ROC Curve',
        'precision_recall': 'Precision-Recall Curve',
        'probability_histogram': 'Probability Distribution',
        'time_series': 'Time Series Analysis'
    };
    return titles[chartType] || 'Chart';
}

// Transaction filtering functions
function filterTransactions() {
    const filterType = document.getElementById('filterType')?.value;
    const filterRisk = document.getElementById('filterRisk')?.value;
    const searchBatch = document.getElementById('searchBatch')?.value.toLowerCase();
    
    const rows = document.querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        let show = true;
        
        // Filter by type
        if (filterType !== 'all') {
            const badge = row.querySelector('.badge');
            if (badge) {
                const isFraud = badge.textContent.toLowerCase().includes('fraud');
                if (filterType === 'fraud' && !isFraud) show = false;
                if (filterType === 'legitimate' && isFraud) show = false;
            }
        }
        
        // Filter by risk
        if (filterRisk !== 'all') {
            const riskBadge = row.querySelectorAll('.badge')[1]; // Second badge is risk level
            if (riskBadge) {
                const riskText = riskBadge.textContent.toLowerCase();
                if (filterRisk === 'high' && !riskText.includes('high')) show = false;
                if (filterRisk === 'medium' && !riskText.includes('medium')) show = false;
                if (filterRisk === 'low' && !riskText.includes('low')) show = false;
            }
        }
        
        // Filter by batch ID
        if (searchBatch) {
            const batchCell = row.cells[row.cells.length - 1]; // Last cell is batch ID
            if (batchCell && !batchCell.textContent.toLowerCase().includes(searchBatch)) {
                show = false;
            }
        }
        
        row.style.display = show ? '' : 'none';
    });
}

function resetFilters() {
    document.getElementById('filterType').value = 'all';
    document.getElementById('filterRisk').value = 'all';
    document.getElementById('searchBatch').value = '';
    filterTransactions();
}

// Alert management functions
function markResolved(alertId) {
    // Here you would typically call a backend endpoint
    console.log(`Marking alert ${alertId} as resolved`);
    showToast(`Alert #${alertId} marked as resolved`, 'success');
}

function markFalsePositive(alertId) {
    // Here you would typically call a backend endpoint
    console.log(`Marking alert ${alertId} as false positive`);
    showToast(`Alert #${alertId} marked as false positive`, 'warning');
}

// Utility functions
function showToast(message, type = 'info') {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Auto-refresh for real-time updates (optional)
function startAutoRefresh(intervalMs = 30000) {
    setInterval(() => {
        if (window.location.pathname === '/alerts') {
            window.location.reload();
        }
    }, intervalMs);
}