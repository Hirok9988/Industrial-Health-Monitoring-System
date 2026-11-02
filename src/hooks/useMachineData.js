import { useState, useEffect, useRef, useCallback } from 'react';
import { endpoints, getWebSocketUrl, fetchApi } from '../services/api';

export function useMachineData(machineId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [machine, setMachine] = useState(null);
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [machineData, latestData, historyData, alertsData] = await Promise.all([
        fetchApi(endpoints.getMachine(machineId)),
        fetchApi(endpoints.getMachineLatest(machineId)),
        fetchApi(endpoints.getMachineHistory(machineId, 20)),
        fetchApi(endpoints.getMachineAlerts(machineId, 5)),
      ]);

      setMachine(machineData);
      setLatest({
          ...latestData,
          status: machineData.status || 'UNKNOWN',
          health_score: machineData.health_score || 0
      });
      // History from API is usually descending (newest first). 
      // Our charts expect left-to-right (oldest to newest), so we reverse it.
      setHistory((historyData.readings || []).reverse());
      setAlerts(alertsData.alerts || []);
      
      
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = getWebSocketUrl(machineId);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected to ${machineId}`);
      setWsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'machine_update') {
          // 1. Update Latest
          setLatest(data);
          
          // 2. Update Machine state minimally
          setMachine(prev => prev ? { ...prev, status: data.status, health_score: data.health_score } : null);

          // 3. Update History for charts (keep last 20)
          setHistory(prev => {
            const newHistory = [...prev, data];
            if (newHistory.length > 20) {
              return newHistory.slice(newHistory.length - 20);
            }
            return newHistory;
          });

          // 4. If there are new alerts/conditions in the payload, we can push them to alerts
          // Since conditions don't have IDs like Firestore alerts, we might fetch alerts if status drops to warning/critical
          // Or just dynamically set them. For simplicity, if conditions exist, we'll format them as alerts.
          if (data.possible_conditions && data.possible_conditions.length > 0) {
             const newAlerts = data.possible_conditions.map(c => ({
                 severity: c.severity,
                 message: c.message,
                 timestamp: data.timestamp
             }));
             setAlerts(newAlerts);
          } else {
             setAlerts([]);
          }
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected from ${machineId}`);
      setWsConnected(false);
      // Attempt reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      ws.close();
    };
  }, [machineId]);

  useEffect(() => {
    fetchInitialData().then(() => {
        // Connect WebSocket only after initial data is fetched to ensure smooth handoff
        connectWebSocket();
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [machineId, fetchInitialData, connectWebSocket]);

  return {
    loading,
    error,
    machine,
    latest,
    history,
    alerts,
    wsConnected,
    retry: fetchInitialData
  };
}
