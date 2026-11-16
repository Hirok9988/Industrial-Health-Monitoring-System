import React, { useState, useId, useMemo } from 'react';

/**
 * Generate a smooth Catmull-Rom cubic bezier SVG path from coordinate points
 */
function getCatmullRomSpline(points) {
  if (!points || points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function TelemetryChart({
  data = [],
  unit = '',
  color = '#0284c7',
  decimals = 1,
  title = 'Trend',
  warningThreshold = null,
  height = 64
}) {
  const gradientId = useId();
  const [hoverIdx, setHoverIdx] = useState(null);

  // Normalize data array
  const cleanData = useMemo(() => {
    if (!data || data.length === 0) return [0, 0, 0, 0, 0];
    if (data.length === 1) return [data[0], data[0]];
    return data.map(v => (typeof v === 'number' && !isNaN(v) ? v : 0));
  }, [data]);

  const stats = useMemo(() => {
    const minVal = Math.min(...cleanData);
    const maxVal = Math.max(...cleanData);
    const sum = cleanData.reduce((acc, val) => acc + val, 0);
    const avgVal = sum / cleanData.length;
    const latestVal = cleanData[cleanData.length - 1];
    const firstVal = cleanData[0];
    const delta = latestVal - firstVal;

    return {
      min: minVal,
      max: maxVal,
      avg: avgVal,
      latest: latestVal,
      delta: delta,
      range: maxVal - minVal || (maxVal !== 0 ? Math.abs(maxVal) * 0.1 : 1)
    };
  }, [cleanData]);

  // Coordinate mapping for SVG viewbox (300 x 65)
  const viewWidth = 300;
  const viewHeight = 65;
  const padTop = 8;
  const padBottom = 8;
  const chartHeight = viewHeight - padTop - padBottom;

  const points = useMemo(() => {
    return cleanData.map((val, idx) => {
      const x = (idx / (cleanData.length - 1)) * viewWidth;
      const normalized = (val - stats.min) / stats.range;
      const y = padTop + (1 - Math.max(0, Math.min(1, normalized))) * chartHeight;
      return { x, y, value: val, index: idx };
    });
  }, [cleanData, stats, viewWidth, chartHeight, padTop]);

  // Compute smooth bezier paths
  const pathD = useMemo(() => getCatmullRomSpline(points), [points]);

  const areaD = useMemo(() => {
    if (!pathD || points.length === 0) return '';
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    return `${pathD} L ${lastX},${viewHeight} L ${firstX},${viewHeight} Z`;
  }, [pathD, points, viewHeight]);

  // Threshold Y coordinate if provided
  const thresholdY = useMemo(() => {
    if (warningThreshold === null || warningThreshold < stats.min || warningThreshold > stats.max) {
      return null;
    }
    const normalized = (warningThreshold - stats.min) / stats.range;
    return padTop + (1 - Math.max(0, Math.min(1, normalized))) * chartHeight;
  }, [warningThreshold, stats, padTop, chartHeight]);

  // Mouse interaction handler
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const closestIdx = Math.round(ratio * (points.length - 1));
    setHoverIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIdx(null);
  };

  const activePoint = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="telemetry-chart-container" style={{ height: `${height + 28}px` }}>
      {/* Precision Chart SVG Surface */}
      <div 
        className="telemetry-svg-wrap" 
        style={{ height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg 
          viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
          preserveAspectRatio="none" 
          className="telemetry-svg"
        >
          <defs>
            <linearGradient id={`chart-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="85%" stopColor={color} stopOpacity="0.04" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Precision Reference Grid Lines */}
          <line x1="0" y1={padTop} x2={viewWidth} y2={padTop} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
          <line x1="0" y1={viewHeight / 2} x2={viewWidth} y2={viewHeight / 2} stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
          <line x1="0" y1={viewHeight - padBottom} x2={viewWidth} y2={viewHeight - padBottom} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />

          {/* Threshold Reference Line if within range */}
          {thresholdY !== null && (
            <g className="threshold-line-group">
              <line 
                x1="0" 
                y1={thresholdY} 
                x2={viewWidth} 
                y2={thresholdY} 
                stroke="#ef4444" 
                strokeWidth="1.2" 
                strokeDasharray="4 2" 
                opacity="0.8"
              />
              <text 
                x={viewWidth - 4} 
                y={thresholdY - 3} 
                textAnchor="end" 
                fill="#ef4444" 
                fontSize="7" 
                fontFamily="var(--font-mono)"
                fontWeight="700"
              >
                ALERT {warningThreshold}{unit}
              </text>
            </g>
          )}

          {/* Smooth Gradient Area Fill */}
          {areaD && (
            <path 
              d={areaD} 
              fill={`url(#chart-grad-${gradientId})`} 
            />
          )}

          {/* Smooth Spline Stroke Line */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* Interactive Inspection Crosshair */}
          {hoverIdx !== null && activePoint && (
            <g className="hover-crosshair-group">
              <line 
                x1={activePoint.x} 
                y1="0" 
                x2={activePoint.x} 
                y2={viewHeight} 
                stroke={color} 
                strokeWidth="1" 
                strokeDasharray="2 2" 
                opacity="0.8"
              />
              <circle 
                cx={activePoint.x} 
                cy={activePoint.y} 
                r="4.5" 
                fill={color} 
                stroke="#ffffff" 
                strokeWidth="2" 
              />
            </g>
          )}

          {/* Live Edge Pulsing Indicator (when not hovering) */}
          {hoverIdx === null && activePoint && (
            <g className="live-edge-indicator">
              <circle 
                cx={activePoint.x} 
                cy={activePoint.y} 
                r="7" 
                fill="none" 
                stroke={color} 
                strokeWidth="1.5" 
                className="chart-pulse-ring"
              />
              <circle 
                cx={activePoint.x} 
                cy={activePoint.y} 
                r="3.5" 
                fill="#ffffff" 
                stroke={color} 
                strokeWidth="2" 
              />
            </g>
          )}
        </svg>

        {/* Floating Precision Hover Tooltip */}
        {hoverIdx !== null && activePoint && (
          <div 
            className="chart-scrub-tooltip"
            style={{
              left: `${Math.min(85, Math.max(15, (activePoint.x / viewWidth) * 100))}%`
            }}
          >
            <span className="tooltip-sample">
              {hoverIdx === points.length - 1 ? 'Live Edge' : `T -${points.length - 1 - hoverIdx}s`}
            </span>
            <span className="tooltip-value">
              {activePoint.value.toFixed(decimals)} <small>{unit}</small>
            </span>
          </div>
        )}
      </div>

      {/* Engineering Scale & Dynamic Boundary Indicators */}
      <div className="telemetry-chart-meta">
        <span className="meta-tag">
          <span className="meta-dot"></span>
          MIN {stats.min.toFixed(decimals)}{unit}
        </span>
        <span className="meta-tag center">
          AVG {stats.avg.toFixed(decimals)}{unit}
        </span>
        <span className="meta-tag right">
          MAX {stats.max.toFixed(decimals)}{unit}
        </span>
      </div>
    </div>
  );
}
