import React, { useEffect, useState } from 'react';
import { useMachineData } from '../hooks/useMachineData';
import AiHealthReport from '../components/AiHealthReport';
import '../App.css';
import '../dashboard.css';
import '../aiReport.css';

const CountUp = ({ end, decimals = 0, duration = 1200 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTimestamp = null;
    const target = Number(end) || 0;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(ease * target);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);
  
  return <>{count.toFixed(decimals)}</>;
};

const MiniChart = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 -10 100 120" preserveAspectRatio="none" className="mini-chart animate-draw">
      <polyline
        fill="none"
        stroke={color || "var(--color-accent)"}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

export default function DashboardPage({ onBackToHome }) {
  const { loading, error, latest, history, alerts, wsConnected, retry } = useMachineData('MACHINE_01');

  // Disable scroll-snap on html when dashboard is active for smooth inspection
  useEffect(() => {
    document.documentElement.classList.add('no-scroll-snap');
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('no-scroll-snap');
    };
  }, []);

  const formatTime = (isoStr) => {
    if (!isoStr) return 'Awaiting signal...';
    const d = new Date(isoStr);
    return `${d.toLocaleDateString('en-US', {month:'short', day:'numeric'})} · ${d.toLocaleTimeString('en-US', {hour12: false})}`;
  };

  const getHistoryData = (key) => {
    if (!history || history.length === 0) return [0,0,0,0,0,0,0];
    return history.map(h => {
      if (key === 'acceleration') return h.acceleration ?? h.vibration ?? 0;
      return h[key] ?? 0;
    });
  };

  return (
    <div className="dashboard-page-container">
      {/* DASHBOARD DEDICATED CONTROL BAR */}
      <header className="dash-console-nav">
        <div className="dash-nav-left">
          <button className="dash-nav-back-btn" onClick={onBackToHome} title="Return to Landing Page">
            &larr; Exit to Home
          </button>
          <div className="dash-nav-divider"></div>
          <div className="dash-nav-identity">
            <span className="dash-nav-title">IHMS CONSOLE</span>
            <span className="dash-nav-target">MACHINE 01 &bull; PRIMARY TURBINE</span>
          </div>
        </div>

        <div className="dash-nav-center">
          <div className={`dash-telemetry-badge ${wsConnected ? 'connected' : 'connecting'}`}>
            <span className="pulse-dot"></span>
            <span>{wsConnected ? 'LIVE TELEMETRY (1 Hz)' : 'RECONNECTING...'}</span>
          </div>
          {latest && (
            <div className={`dash-status-pill ${latest.status.toLowerCase()}`}>
              {latest.status}
            </div>
          )}
        </div>

        <div className="dash-nav-right">
          <a href="#ai-report-view" className="dash-nav-link-btn">
            🤖 AI Health Report
          </a>
          <button className="dash-nav-refresh-btn" onClick={retry} title="Force Telemetry Reconnect">
            &#8635; Refresh Stream
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT BODY */}
      <main className="dash-page-content">
        {/* TOP STATUS OVERVIEW BANNER */}
        <section className="dash-overview-strip">
          <div className="overview-strip-left">
            <h1 className="strip-title">Live Machine Monitoring</h1>
            <p className="strip-meta">
              Continuous multi-sensor condition telemetry &bull; Last packet: <strong>{latest ? formatTime(latest.timestamp) : 'Connecting...'}</strong>
            </p>
          </div>
          <div className="overview-strip-right">
            {alerts && alerts.length > 0 ? (
              <div className="strip-alert-box warning">
                <span className="alert-icon">&#9888;</span>
                <div>
                  <strong>{alerts[0].severity}: {alerts[0].message}</strong>
                  <span>{alerts.length > 1 ? `+${alerts.length - 1} other active alert(s)` : 'Attention recommended'}</span>
                </div>
              </div>
            ) : (
              <div className="strip-alert-box safe">
                <span className="safe-icon">&#10003;</span>
                <div>
                  <strong>All Primary Diagnostics Nominal</strong>
                  <span>No active warnings detected across 6 core channels</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* LOADING & ERROR STATES */}
        {loading && !latest ? (
          <div className="dash-state-card loading">
            <div className="spinner"></div>
            <h3>Connecting to Machine 01 Telemetry Bus...</h3>
            <p>Establishing WebSocket stream with FastAPI broker (ws://localhost:8000/ws/v1/machines/MACHINE_01)</p>
          </div>
        ) : error && !latest ? (
          <div className="dash-state-card error">
            <div className="error-icon">&#9888;</div>
            <h3>Telemetry Stream Offline</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={retry}>Retry Telemetry Connection</button>
          </div>
        ) : latest ? (
          <>
            {/* SENSOR GAUGES & HEALTH MATRIX */}
            <div className="dash-grid-layout">
              {/* Card 1: Machine Overall Health Score */}
              <div className="dash-card health-card">
                <div className="health-circle">
                  <span className="health-num">
                    <CountUp end={latest.health_score} />
                    <small className="health-denominator">/100</small>
                  </span>
                  <svg className="circular-progress" viewBox="0 0 100 100">
                    <circle className="bg-circle" cx="50" cy="50" r="45"></circle>
                    <circle 
                      className="progress-circle fill-progress" 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      style={{ strokeDashoffset: `calc(283 - (283 * ${latest.health_score}) / 100)` }}
                    ></circle>
                  </svg>
                </div>
                <div className="health-info">
                  <span className="h-label">{latest.health_score > 80 ? 'HEALTHY' : latest.health_score > 60 ? 'WARNING' : 'CRITICAL'}</span>
                  <span className="h-desc">{latest.health_score > 80 ? 'Operating within nominal envelope.' : 'System anomaly detected.'}</span>
                </div>
              </div>

              {/* Card 2: Temperature */}
              <div className="dash-card metric-card">
                <div className="metric-header">
                  <span className="m-title">TEMPERATURE (MOTOR)</span>
                  <div className="m-main">
                    <span className="m-value"><CountUp end={latest.temperature} decimals={1} /> <small>°C</small></span>
                  </div>
                </div>
                <div className="metric-chart">
                  <span className="chart-label">Recent Trend (Last 10 Samples)</span>
                  <MiniChart data={getHistoryData('temperature')} />
                </div>
              </div>

              {/* Card 3: Current */}
              <div className="dash-card metric-card">
                <div className="metric-header">
                  <span className="m-title">CURRENT (ACS712)</span>
                  <div className="m-main">
                    <span className="m-value"><CountUp end={latest.current} decimals={2} /> <small>A</small></span>
                  </div>
                </div>
                <div className="metric-chart">
                  <span className="chart-label">Recent Trend (Last 10 Samples)</span>
                  <MiniChart data={getHistoryData('current')} />
                </div>
              </div>

              {/* Card 4: Rotational Speed (RPM) */}
              <div className="dash-card metric-card">
                <div className="metric-header">
                  <span className="m-title">RPM (OPTICAL / HALL)</span>
                  <div className="m-main">
                    <span className="m-value"><CountUp end={latest.rpm} /> <small>RPM</small></span>
                  </div>
                </div>
                <div className="metric-chart">
                  <span className="chart-label">Recent Trend (Last 10 Samples)</span>
                  <MiniChart data={getHistoryData('rpm')} />
                </div>
              </div>

              {/* Card 5: Accelerometer (MPU-6050) */}
              <div className="dash-card metric-card accel-card">
                <div className="metric-header">
                  <span className="m-title">ACCELEROMETER (MPU-6050)</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.acceleration ?? latest.vibration ?? 0} decimals={2} /> <small>g total</small>
                    </span>
                  </div>
                </div>
                <div className="accel-axes-row">
                  <div className="accel-axis">
                    <span className="axis-label">Ax</span>
                    <span className="axis-val"><CountUp end={latest.accel_x ?? 0} decimals={3} /> <small>g</small></span>
                  </div>
                  <div className="accel-axis">
                    <span className="axis-label">Ay</span>
                    <span className="axis-val"><CountUp end={latest.accel_y ?? 0} decimals={3} /> <small>g</small></span>
                  </div>
                  <div className="accel-axis">
                    <span className="axis-label">Az</span>
                    <span className="axis-val"><CountUp end={latest.accel_z ?? 0} decimals={3} /> <small>g</small></span>
                  </div>
                </div>
                <div className="metric-chart">
                  <span className="chart-label">Total Acceleration Trend (Last 10 Samples)</span>
                  <MiniChart data={getHistoryData('acceleration')} />
                </div>
              </div>

              {/* Card 6: Ambient Temperature */}
              <div className="dash-card metric-card">
                <div className="metric-header">
                  <span className="m-title">AMBIENT TEMPERATURE</span>
                  <div className="m-main">
                    <span className="m-value"><CountUp end={latest.ambient_temp} decimals={1} /> <small>°C</small></span>
                  </div>
                </div>
                <div className="metric-chart">
                  <span className="chart-label">Recent Trend (Last 10 Samples)</span>
                  <MiniChart data={getHistoryData('ambient_temp')} />
                </div>
              </div>

              {/* Card 7: Ambient Humidity */}
              <div className="dash-card metric-card">
                <div className="metric-header">
                  <span className="m-title">AMBIENT HUMIDITY</span>
                  <div className="m-main">
                    <span className="m-value"><CountUp end={latest.humidity} /> <small>% RH</small></span>
                  </div>
                </div>
                <div className="metric-chart">
                  <span className="chart-label">Recent Trend (Last 10 Samples)</span>
                  <MiniChart data={getHistoryData('humidity')} />
                </div>
              </div>

              {/* Card 8: Telemetry Bus Status */}
              <div className="dash-card system-status-card">
                <div className="metric-header">
                  <span className="m-title">TELEMETRY LINK STATUS</span>
                </div>
                <ul className="sys-list">
                  <li>
                    <span className={`dot ${wsConnected ? 'safe' : 'critical'}`}></span> 
                    {wsConnected ? 'WebSocket Channel Active' : 'Connecting to Server...'}
                  </li>
                  <li>
                    <span className={`dot ${latest.status === 'NORMAL' ? 'safe' : 'critical'}`}></span> 
                    Machine State: {latest.status}
                  </li>
                  <li>
                    <span className={`dot ${alerts.length === 0 ? 'safe' : 'critical'}`}></span> 
                    {alerts.length === 0 ? 'No Active Alarms' : `${alerts.length} Alert Triggered`}
                  </li>
                  <li>
                    <span className="dot safe"></span> 
                    Hardware Ingestion: ESP32 Node 01
                  </li>
                </ul>
              </div>
            </div>

            {/* AI HEALTH REPORT EMBEDDED IN DASHBOARD VIEW */}
            <div id="ai-report-view" className="dash-ai-report-container">
              <AiHealthReport 
                latestData={latest} 
                historyData={history} 
                alerts={alerts} 
                wsConnected={wsConnected}
                isVisible={true} 
              />
            </div>
          </>
        ) : null}
      </main>

      {/* DASHBOARD CONSOLE FOOTER */}
      <footer className="dash-console-footer">
        <div className="dash-footer-left">
          <span>Industrial Machine Health Monitoring System (IHMS)</span>
          <span className="footer-pipe">&bull;</span>
          <span>FastAPI Telemetry Bus</span>
          <span className="footer-pipe">&bull;</span>
          <span>ESP32 Dual-Core Node</span>
        </div>
        <div className="dash-footer-right">
          <button className="dash-footer-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            &uarr; Back to Top
          </button>
          <button className="dash-footer-btn exit" onClick={onBackToHome}>
            Exit to Home &rarr;
          </button>
        </div>
      </footer>
    </div>
  );
}
