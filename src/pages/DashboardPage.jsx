import React, { useEffect, useState, useMemo } from 'react';
import { useMachineData } from '../hooks/useMachineData';
import AiHealthReport from '../components/AiHealthReport';
import TelemetryChart from '../components/TelemetryChart';
import '../App.css';
import '../dashboard.css';
import '../aiReport.css';

const CountUp = ({ end, decimals = 0, duration = 900 }) => {
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
    if (!history || history.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0];
    return history.map(h => {
      if (key === 'acceleration') return h.acceleration ?? h.vibration ?? 0;
      return h[key] ?? 0;
    });
  };

  // Determine machine health color scheme
  const healthMeta = useMemo(() => {
    const score = latest?.health_score ?? 0;
    if (score > 80) {
      return { label: 'OPTIMAL ENVELOPE', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: '#86efac' };
    }
    if (score > 60) {
      return { label: 'DEGRADED / WATCH', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: '#fde68a' };
    }
    return { label: 'CRITICAL ANOMALY', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: '#fca5a5' };
  }, [latest?.health_score]);

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
            <span className="dash-nav-title">IHMS COMMAND CONSOLE</span>
            <span className="dash-nav-target">UNIT 01 &bull; 12V DC TURBINE TEST-BENCH</span>
          </div>
        </div>

        <div className="dash-nav-center">
          <div className={`dash-telemetry-badge ${wsConnected ? 'connected' : 'connecting'}`}>
            <span className="pulse-dot"></span>
            <span>{wsConnected ? 'LIVE STREAM (1.0 Hz)' : 'RECONNECTING WS...'}</span>
          </div>
          {latest && (
            <div className={`dash-status-pill ${latest.status?.toLowerCase() || 'normal'}`}>
              <span className="pill-dot"></span>
              {latest.status || 'ONLINE'}
            </div>
          )}
        </div>

        <div className="dash-nav-right">
          <a href="#ai-report-view" className="dash-nav-link-btn">
            ⚡ AI Diagnostics
          </a>
          <button className="dash-nav-refresh-btn" onClick={retry} title="Force Telemetry Reconnect">
            &#8635; Sync Telemetry
          </button>
        </div>
      </header>

      {/* DASHBOARD CONTENT BODY */}
      <main className="dash-page-content">
        {/* TOP STATUS OVERVIEW BANNER */}
        <section className="dash-overview-strip">
          <div className="overview-strip-left">
            <div className="strip-title-row">
              <span className="strip-badge-live">LIVE TELEMETRY BUS</span>
              <h1 className="strip-title">Industrial Machine Health Matrix</h1>
            </div>
            <p className="strip-meta">
              Continuous 6-Channel Sensor Stream &bull; Node: <strong>ESP32-S3 (Dual-Core COM7)</strong> &bull; Last packet: <strong>{latest ? formatTime(latest.timestamp) : 'Connecting...'}</strong>
            </p>
          </div>
          <div className="overview-strip-right">
            {alerts && alerts.length > 0 ? (
              <div className="strip-alert-box warning">
                <span className="alert-pulsing-icon">&#9888;</span>
                <div className="alert-text-wrap">
                  <strong>{alerts[0].severity}: {alerts[0].message}</strong>
                  <span>{alerts.length > 1 ? `+${alerts.length - 1} other active alert(s) on telemetry bus` : 'Active sensor threshold excursion'}</span>
                </div>
                <a href="#ai-report-view" className="strip-alert-btn">
                  Analyze &rarr;
                </a>
              </div>
            ) : (
              <div className="strip-alert-box safe">
                <span className="safe-icon">&#10003;</span>
                <div className="alert-text-wrap">
                  <strong>All 6 Diagnostic Channels Nominal</strong>
                  <span>Operating within calibrated envelope &bull; Hardware relay armed</span>
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
                <div className="card-top-bar">
                  <span className="channel-chip primary">DIAGNOSTIC INDEX</span>
                  <span 
                    className="card-status-pill" 
                    style={{ color: healthMeta.color, background: healthMeta.bg, borderColor: healthMeta.border }}
                  >
                    {latest.health_score > 80 ? 'NOMINAL' : latest.health_score > 60 ? 'WATCH' : 'FAULT'}
                  </span>
                </div>

                <div className="health-gauge-center">
                  <div className="health-gauge-wrap">
                    <svg className="health-radial-svg" viewBox="0 0 100 100">
                      <circle 
                        className="health-radial-bg" 
                        cx="50" 
                        cy="50" 
                        r="42" 
                      />
                      <circle 
                        className="health-radial-meter" 
                        cx="50" 
                        cy="50" 
                        r="42" 
                        stroke={healthMeta.color}
                        style={{ 
                          strokeDasharray: 264,
                          strokeDashoffset: 264 - (264 * Math.max(0, Math.min(100, latest.health_score))) / 100
                        }}
                      />
                    </svg>
                    <div className="health-gauge-inner">
                      <span className="health-score-val" style={{ color: healthMeta.color }}>
                        <CountUp end={latest.health_score} />
                      </span>
                      <span className="health-score-denom">/ 100</span>
                    </div>
                  </div>

                  <div className="health-status-desc">
                    <span className="health-status-badge" style={{ color: healthMeta.color }}>
                      <span className="pulse-dot" style={{ backgroundColor: healthMeta.color }}></span>
                      {healthMeta.label}
                    </span>
                    <p className="health-status-subtext">
                      {latest.health_score > 80 
                        ? 'All operating harmonics and temperatures within safe limits.' 
                        : latest.health_score > 60
                        ? 'Minor variance detected. Continual telemetry analysis active.'
                        : 'Safety trip condition triggered. Inspection advised.'}
                    </p>
                  </div>
                </div>

                {/* Subsystem Health Matrix */}
                <div className="health-subsystem-matrix">
                  <div className="subsystem-item">
                    <span className="subsystem-label">THERMAL</span>
                    <span className={`subsystem-val ${latest.temperature > 45 ? 'warn' : 'ok'}`}>
                      {latest.temperature > 50 ? 'HOT' : latest.temperature > 40 ? 'ELEVATED' : 'NOMINAL'}
                    </span>
                  </div>
                  <div className="subsystem-item">
                    <span className="subsystem-label">VIBRATION</span>
                    <span className={`subsystem-val ${(latest.acceleration ?? latest.vibration ?? 0) > 0.8 ? 'warn' : 'ok'}`}>
                      {(latest.acceleration ?? latest.vibration ?? 0) > 1.2 ? 'SEVERE' : (latest.acceleration ?? latest.vibration ?? 0) > 0.6 ? 'WARN' : 'SMOOTH'}
                    </span>
                  </div>
                  <div className="subsystem-item">
                    <span className="subsystem-label">CURRENT</span>
                    <span className={`subsystem-val ${latest.current > 3.0 ? 'warn' : 'ok'}`}>
                      {latest.current > 3.0 ? 'OVERCURRENT' : latest.current > 2.6 ? 'HIGH' : 'NOMINAL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Temperature (Motor) */}
              <div className="dash-card metric-card">
                <div className="card-top-bar">
                  <span className="channel-chip">CH-01 &bull; DS18B20</span>
                  <span className={`card-status-pill ${latest.temperature > 45 ? 'warn' : 'nominal'}`}>
                    {latest.temperature > 50 ? 'CRITICAL TEMP' : latest.temperature > 40 ? 'ELEVATED' : 'NOMINAL'}
                  </span>
                </div>

                <div className="metric-header">
                  <span className="m-title">TEMPERATURE (MOTOR CASING)</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.temperature} decimals={1} />
                      <small>°C</small>
                    </span>
                    <span className="m-sub-context">
                      Delta vs Amb: +{Math.max(0, latest.temperature - (latest.ambient_temp ?? 25)).toFixed(1)}°C
                    </span>
                  </div>
                </div>

                <div className="metric-chart-wrapper">
                  <TelemetryChart 
                    data={getHistoryData('temperature')} 
                    unit="°C" 
                    color="#ea580c" 
                    decimals={1} 
                    warningThreshold={45.0}
                    title="Motor Casing Temp" 
                    height={62}
                  />
                </div>
              </div>

              {/* Card 3: Electrical Current (ACS712) */}
              <div className="dash-card metric-card">
                <div className="card-top-bar">
                  <span className="channel-chip">CH-02 &bull; ACS712</span>
                  <span className={`card-status-pill ${latest.current > 3.0 ? 'warn' : 'nominal'}`}>
                    {latest.current > 3.0 ? 'HIGH DRAW' : 'NOMINAL LOAD'}
                  </span>
                </div>

                <div className="metric-header">
                  <span className="m-title">ELECTRICAL CURRENT (LOAD)</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.current} decimals={2} />
                      <small>A</small>
                    </span>
                    <span className="m-sub-context">
                      Est. Power: {(latest.current * 12).toFixed(1)} W @ 12V
                    </span>
                  </div>
                </div>

                <div className="metric-chart-wrapper">
                  <TelemetryChart 
                    data={getHistoryData('current')} 
                    unit=" A" 
                    color="#d97706" 
                    decimals={2} 
                    warningThreshold={3.0}
                    title="Motor Current Draw" 
                    height={62}
                  />
                </div>
              </div>

              {/* Card 4: Rotational Speed (RPM) */}
              <div className="dash-card metric-card">
                <div className="card-top-bar">
                  <span className="channel-chip">CH-03 &bull; FC-03 OPTICAL</span>
                  <span className={`card-status-pill ${latest.rpm > 500 ? 'nominal' : 'subtle'}`}>
                    {latest.rpm > 1000 ? 'ACTIVE ROTATION' : 'IDLE / STOPPED'}
                  </span>
                </div>

                <div className="metric-header">
                  <span className="m-title">SHAFT VELOCITY (SPEED)</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.rpm} />
                      <small>RPM</small>
                    </span>
                    <span className="m-sub-context">
                      Shaft Frequency: {(latest.rpm / 60).toFixed(1)} Hz
                    </span>
                  </div>
                </div>

                <div className="metric-chart-wrapper">
                  <TelemetryChart 
                    data={getHistoryData('rpm')} 
                    unit=" RPM" 
                    color="#0284c7" 
                    decimals={0} 
                    title="Optical RPM" 
                    height={62}
                  />
                </div>
              </div>

              {/* Card 5: Accelerometer (MPU-6050) */}
              <div className="dash-card metric-card accel-card">
                <div className="card-top-bar">
                  <span className="channel-chip">CH-04 &bull; MPU-6050</span>
                  <span className={`card-status-pill ${(latest.acceleration ?? latest.vibration ?? 0) > 0.8 ? 'warn' : 'nominal'}`}>
                    {(latest.acceleration ?? latest.vibration ?? 0) > 1.0 ? 'EXCESSIVE VIB' : 'BALANCED'}
                  </span>
                </div>

                <div className="metric-header">
                  <span className="m-title">3-AXIS ACCELERATION / VIB</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.acceleration ?? latest.vibration ?? 0} decimals={2} />
                      <small>g total</small>
                    </span>
                    <span className="m-sub-context">
                      Vector Norm (RMS)
                    </span>
                  </div>
                </div>

                {/* Tri-Axial Visual Level Meters */}
                <div className="accel-meter-strip">
                  <div className="accel-meter-channel">
                    <div className="meter-label-row">
                      <span className="axis-id">Ax</span>
                      <span className="axis-num"><CountUp end={latest.accel_x ?? 0} decimals={3} /> g</span>
                    </div>
                    <div className="meter-track">
                      <div 
                        className="meter-fill" 
                        style={{ 
                          width: `${Math.min(100, Math.max(8, Math.abs(latest.accel_x ?? 0) * 100))}%`,
                          backgroundColor: Math.abs(latest.accel_x ?? 0) > 0.5 ? '#f59e0b' : '#64748b'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="accel-meter-channel">
                    <div className="meter-label-row">
                      <span className="axis-id">Ay</span>
                      <span className="axis-num"><CountUp end={latest.accel_y ?? 0} decimals={3} /> g</span>
                    </div>
                    <div className="meter-track">
                      <div 
                        className="meter-fill" 
                        style={{ 
                          width: `${Math.min(100, Math.max(8, Math.abs(latest.accel_y ?? 0) * 100))}%`,
                          backgroundColor: Math.abs(latest.accel_y ?? 0) > 0.5 ? '#f59e0b' : '#64748b'
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="accel-meter-channel">
                    <div className="meter-label-row">
                      <span className="axis-id">Az</span>
                      <span className="axis-num"><CountUp end={latest.accel_z ?? 0} decimals={3} /> g</span>
                    </div>
                    <div className="meter-track">
                      <div 
                        className="meter-fill" 
                        style={{ 
                          width: `${Math.min(100, Math.max(8, Math.abs((latest.accel_z ?? 1) - 1) * 100))}%`,
                          backgroundColor: Math.abs((latest.accel_z ?? 1) - 1) > 0.5 ? '#f59e0b' : '#64748b'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="metric-chart-wrapper">
                  <TelemetryChart 
                    data={getHistoryData('acceleration')} 
                    unit=" g" 
                    color="#8b5cf6" 
                    decimals={2} 
                    warningThreshold={0.8}
                    title="Acceleration Trend" 
                    height={54}
                  />
                </div>
              </div>

              {/* Card 6: Ambient Temperature */}
              <div className="dash-card metric-card">
                <div className="card-top-bar">
                  <span className="channel-chip">CH-05A &bull; DHT22</span>
                  <span className="card-status-pill nominal">
                    NOMINAL AMBIENT
                  </span>
                </div>

                <div className="metric-header">
                  <span className="m-title">AMBIENT ROOM TEMPERATURE</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.ambient_temp} decimals={1} />
                      <small>°C</small>
                    </span>
                    <span className="m-sub-context">
                      Room Base Level
                    </span>
                  </div>
                </div>

                <div className="metric-chart-wrapper">
                  <TelemetryChart 
                    data={getHistoryData('ambient_temp')} 
                    unit="°C" 
                    color="#0d9488" 
                    decimals={1} 
                    title="Ambient Temp" 
                    height={62}
                  />
                </div>
              </div>

              {/* Card 7: Ambient Humidity */}
              <div className="dash-card metric-card">
                <div className="card-top-bar">
                  <span className="channel-chip">CH-05B &bull; DHT22</span>
                  <span className={`card-status-pill ${latest.humidity > 70 ? 'warn' : 'nominal'}`}>
                    {latest.humidity > 70 ? 'HIGH MOISTURE' : 'OPTIMAL RH'}
                  </span>
                </div>

                <div className="metric-header">
                  <span className="m-title">AMBIENT RELATIVE HUMIDITY</span>
                  <div className="m-main">
                    <span className="m-value">
                      <CountUp end={latest.humidity} />
                      <small>% RH</small>
                    </span>
                    <span className="m-sub-context">
                      Non-Condensing Zone
                    </span>
                  </div>
                </div>

                <div className="metric-chart-wrapper">
                  <TelemetryChart 
                    data={getHistoryData('humidity')} 
                    unit="%" 
                    color="#0284c7" 
                    decimals={0} 
                    title="Room Humidity" 
                    height={62}
                  />
                </div>
              </div>

              {/* Card 8: Telemetry Bus & Safety Circuit */}
              <div className="dash-card system-status-card">
                <div className="card-top-bar">
                  <span className="channel-chip primary">SYSTEM GATEWAY</span>
                  <span className={`card-status-pill ${wsConnected ? 'nominal' : 'warn'}`}>
                    {wsConnected ? 'GATEWAY ONLINE' : 'DISCONNECTED'}
                  </span>
                </div>

                <div className="gateway-tiles-grid">
                  <div className="gateway-tile">
                    <span className="tile-label">WEBSOCKET BUS</span>
                    <div className="tile-value-row">
                      <span className={`status-pip ${wsConnected ? 'live' : 'offline'}`}></span>
                      <strong>{wsConnected ? '1.0 Hz Active' : 'Offline'}</strong>
                    </div>
                  </div>

                  <div className="gateway-tile">
                    <span className="tile-label">EDGE HARDWARE</span>
                    <div className="tile-value-row">
                      <span className="status-pip live"></span>
                      <strong>ESP32-S3 Node 01</strong>
                    </div>
                  </div>

                  <div className="gateway-tile">
                    <span className="tile-label">SAFETY RELAY</span>
                    <div className="tile-value-row">
                      <span className={`status-pip ${latest.status === 'CRITICAL' ? 'tripped' : 'live'}`}></span>
                      <strong>{latest.status === 'CRITICAL' ? 'TRIPPED (OPEN)' : 'ARMED (CLOSED)'}</strong>
                    </div>
                  </div>

                  <div className="gateway-tile">
                    <span className="tile-label">ACTIVE ALARMS</span>
                    <div className="tile-value-row">
                      <span className={`status-pip ${alerts.length > 0 ? 'tripped' : 'live'}`}></span>
                      <strong>{alerts.length === 0 ? '0 Alarms' : `${alerts.length} Flagged`}</strong>
                    </div>
                  </div>
                </div>

                <div className="gateway-bottom-meta">
                  <span>Transport: <code>/ws/v1/machines/MACHINE_01</code></span>
                  <a href="#ai-report-view" className="gateway-drill-btn">Full Telemetry Analysis &rarr;</a>
                </div>
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
          <span>Industrial Health Monitoring System (IHMS)</span>
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
