/**
 * Simple Linear Regression Utility
 */
const linearRegression = (data) => {
    const n = data.length;
    if (n < 2) return data.length === 1 ? data[0] : 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }

    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return data[n - 1] || 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return Math.max(0, slope * n + intercept);
};

/**
 * Weighted Moving Average Utility (WMA)
 * Calculates average giving more weight to recent months.
 */
const weightedMovingAverage = (data, weights = [0.1, 0.2, 0.7]) => {
    if (!data || data.length === 0) return 0;

    const lastN = data.slice(-weights.length);
    if (lastN.length < weights.length) {
        // Simple average if not enough data
        return lastN.reduce((a, b) => a + b, 0) / lastN.length;
    }

    return lastN.reduce((acc, val, idx) => acc + (val * weights[idx]), 0);
};

module.exports = {
    linearRegression,
    weightedMovingAverage
};
