/**
 * Unified Horizon Engine v1.0
 * 
 * Centralized logic for mapping HUD Horizons to API parameters, 
 * UI labels, and Benchmarking windows.
 */

export const HORIZONS = {
    7: {
        id: 'week',
        days: 7,
        label: 'Weekly',
        granularity: 'weekly',
        roiSublabel: 'Weekly Operational Burn',
        comparisonLabel: 'Week-over-Week'
    },
    30: {
        id: 'month',
        days: 30,
        label: 'Monthly',
        granularity: 'monthly',
        roiSublabel: 'Monthly Operational Burn',
        comparisonLabel: 'Month-over-Month'
    },
    90: {
        id: 'quarter',
        days: 90,
        label: 'Quarterly',
        granularity: 'quarterly',
        roiSublabel: 'Quarterly Operational Burn',
        comparisonLabel: 'Quarter-over-Quarter'
    },
    365: {
        id: 'year',
        days: 365,
        label: 'Yearly',
        granularity: 'monthly', // Yearly view uses monthly buckets
        roiSublabel: 'Annual Operational Burn',
        comparisonLabel: 'Year-over-Year'
    }
};

export const getHorizonConfig = (days) => HORIZONS[days] || HORIZONS[30];

/**
 * Calculates date ranges for Period Comparison based on a pivot date.
 * Pivot is usually the end of the selected fiscal year or 'now'.
 */
export const calculateComparisonWindows = (days, pivotDate = new Date()) => {
    const endA = new Date(pivotDate);
    const startA = new Date(pivotDate);
    startA.setDate(startA.getDate() - days);

    const endB = new Date(startA);
    const startB = new Date(endB);
    startB.setDate(startB.getDate() - days);

    return {
        periodA: { start: startA.toISOString().slice(0, 10), end: endA.toISOString().slice(0, 10) },
        periodB: { start: startB.toISOString().slice(0, 10), end: endB.toISOString().slice(0, 10) }
    };
};
