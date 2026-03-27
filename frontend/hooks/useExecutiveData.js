import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';

/**
 * Custom hook for fetching and managing Executive Dashboard data.
 * Handles loading, error states, and polling.
 */
export const useExecutiveData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const summary = await apiClient.getExecutiveSummary();
            // Data normalization can happen here
            setData(summary);
        } catch (err) {
            console.error('Failed to fetch executive summary:', err);
            setError(err.message || 'An unexpected error occurred while fetching insights.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        
        // Optional: Implement polling every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return {
        data,
        loading,
        error,
        refresh: fetchData
    };
};
