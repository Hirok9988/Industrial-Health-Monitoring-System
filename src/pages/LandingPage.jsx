import React, { useEffect, useRef, useState } from 'react';
import '../App.css';
import '../insight.css';
import '../system.css';
import '../fault.css';
import '../footer.css';

function useIntersection(threshold = 0.2) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );
    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [threshold]);

  return [ref, isVisible];
}

export default function LandingPage({ onOpenDashboard }) {
  const [heroRef, heroVisible] = useIntersection(0.4);
  const [s2Ref, s2Visible] = useIntersection(0.3);
  const [s3Ref, s3Visible] = useIntersection(0.3);
  const [s4Ref, s4Visible] = useIntersection(0.2);
  const [s6Ref, s6Visible] = useIntersection(0.2);
  const [finalRef, finalVisible] = useIntersection(0.4);

  return (
    <div className="landing-page-container">
      {/* LANDING NAVIGATION */}
      <header className={`nav-header ${heroVisible ? 'visible' : 'hidden'}`}>
        <div className="nav-brand">IHMS</div>
        <nav className="nav-links">
          <a href="#idea">The Idea</a>
          <a href="#sensors">Sensors</a>
          <a href="#system">Architecture</a>
          <a href="#faults">Fault Signals</a>
          <a href="#about">About</a>
        </nav>
        <button className="nav-cta" onClick={onOpenDashboard}>
          LIVE DASHBOARD &rarr;
        </button>
      </header>

      {/* SECTION 1 - HERO */}
      <section ref={heroRef} className={`hero-section ${heroVisible ? 'is-visible' : 'is-hidden'}`}>
        <div className="hero-bg">
          <img src="/picture/1st.jpg" alt="Industrial Facility" />
        </div>
        
        <div className="hero-content">
          <div className="hero-eyebrow">INDUSTRIAL MACHINE INTELLIGENCE</div>
          <h1 className="hero-title">
            <span>SEE THE MACHINE.</span>
            <span>BEFORE IT FAILS.</span>
          </h1>
          <p className="hero-desc">
            Real-time machine condition monitoring using temperature, acceleration, current, rotational speed and environmental data.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onOpenDashboard}>
              Launch Live Dashboard &rarr;
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => document.getElementById('idea')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How It Works &darr;
            </button>
          </div>
        </div>

        <div className="scroll-indicator">
          SCROLL TO EXPLORE
          <span>&darr;</span>
        </div>
      </section>

      {/* SECTION 2 - THE IDEA */}
      <section id="idea" ref={s2Ref} className={`story-section ${s2Visible ? 'is-visible' : ''}`}>
        <div className="story-content">
          <div className="story-eyebrow">THE IDEA</div>
          <h2 className="story-title">
            EVERY MACHINE<br/>LEAVES A SIGNAL.
          </h2>
          <div className="story-desc">
            <p>Industrial equipment constantly produces signals through heat, mechanical acceleration, electrical load and motion.</p>
            <p>Our system captures those changes and turns them into a clear picture of machine condition.</p>
          </div>

          <div className="workflow-steps">
            <div className="workflow-step">
              <span className="step-num">01</span>
              <div className="step-text">
                <strong>OBSERVE</strong>
                <p>Continuously capture machine behavior.</p>
              </div>
            </div>
            <div className="workflow-step">
              <span className="step-num">02</span>
              <div className="step-text">
                <strong>COMPARE</strong>
                <p>Identify changes from normal operation.</p>
              </div>
            </div>
            <div className="workflow-step">
              <span className="step-num">03</span>
              <div className="step-text">
                <strong>UNDERSTAND</strong>
                <p>Turn multiple signals into useful machine insight.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="story-image">
          <img src="/picture/2nd.jpg" alt="Industrial Sensors" />
        </div>
      </section>

      {/* SECTION 3 - CONDITION MONITORING */}
      <section id="sensors" ref={s3Ref} className={`insight-section ${s3Visible ? 'is-visible' : ''}`}>
        <div className="insight-image">
          <img src="/picture/3rd.jpg" alt="Machine Diagnostics" />
        </div>
        
        <div className="insight-content">
          <div className="insight-eyebrow">CONDITION MONITORING</div>
          <h2 className="insight-title">
            ONE MACHINE.<br/>MULTIPLE SIGNALS.
          </h2>
          <div className="insight-desc">
            <p>Temperature, acceleration (tri-axial), current and rotational speed reveal different parts of machine behavior.</p>
            <p>When these signals are considered together, changes that may be missed by a single measurement become easier to identify.</p>
          </div>

          <div className="parameter-grid">
            <div className="parameter-item">
              <span className="param-name">TEMPERATURE</span>
              <span className="param-desc">Thermal condition</span>
            </div>
            <div className="parameter-item">
              <span className="param-name">ACCELERATION</span>
              <span className="param-desc">Tri-axial motion (MPU-6050)</span>
            </div>
            <div className="parameter-item">
              <span className="param-name">CURRENT</span>
              <span className="param-desc">Electrical load</span>
            </div>
            <div className="parameter-item">
              <span className="param-name">RPM</span>
              <span className="param-desc">Rotational performance</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 - THE SYSTEM */}
      <section id="system" ref={s4Ref} className={`system-section ${s4Visible ? 'is-visible' : ''}`}>
        <div className="system-content">
          <div className="system-eyebrow">CIRCUIT & HARDWARE ARCHITECTURE</div>
          <h2 className="system-title">
            INDUSTRIAL HEALTH<br/>MONITORING SYSTEM.
          </h2>
          <div className="system-desc">
            <p>
              An integrated edge-to-cloud diagnostic circuit combining a 5-sensor telemetry array with an active hardware emergency trip relay.
            </p>
            <p>
              Dual isolated power rails safeguard the ESP32 microcontroller against motor back-EMF, while telemetry is streamed via Wi-Fi HTTP REST to FastAPI and Firestore.
            </p>
          </div>

          {/* HARDWARE MODULES BREAKDOWN */}
          <div className="system-modules-grid">
            <div className="module-item">
              <span className="module-tag">DS18B20</span>
              <span className="module-name">Motor Casing Temp Probe (4.7kΩ Pull-Up)</span>
            </div>
            <div className="module-item">
              <span className="module-tag">DHT22</span>
              <span className="module-name">Ambient Room Temp & Humidity</span>
            </div>
            <div className="module-item">
              <span className="module-tag">ACS712</span>
              <span className="module-name">Electrical Current & Motor Load (ADC)</span>
            </div>
            <div className="module-item">
              <span className="module-tag">FC-03</span>
              <span className="module-name">Optical Slotted Tachometer (Shaft RPM)</span>
            </div>
            <div className="module-item">
              <span className="module-tag">MPU6050</span>
              <span className="module-name">3-Axis Dynamic Acceleration & Tilt (I2C)</span>
            </div>
            <div className="module-item highlight-module">
              <span className="module-tag alert">RELAY</span>
              <span className="module-name">Hardware Cutoff Circuit Breaker (Active LOW)</span>
            </div>
            <div className="module-item highlight-module">
              <span className="module-tag power">DUAL RAILS</span>
              <span className="module-name">Isolated ESP32 Logic & Motor Supplies</span>
            </div>
          </div>

          {/* END-TO-END DATA PIPELINE */}
          <div className="system-pipeline-flow">
            <div className="pipeline-step"><span>01</span> SENSORS</div>
            <span className="pipeline-arrow">&rarr;</span>
            <div className="pipeline-step"><span>02</span> ESP32</div>
            <span className="pipeline-arrow">&rarr;</span>
            <div className="pipeline-step"><span>03</span> WI-FI REST</div>
            <span className="pipeline-arrow">&rarr;</span>
            <div className="pipeline-step"><span>04</span> FASTAPI</div>
            <span className="pipeline-arrow">&rarr;</span>
            <div className="pipeline-step"><span>05</span> FIRESTORE</div>
            <span className="pipeline-arrow">&rarr;</span>
            <div className="pipeline-step live-link" onClick={onOpenDashboard} title="Launch Real-time Dashboard">
              LIVE CONSOLE &rarr;
            </div>
          </div>
        </div>

        <div className="system-image">
          <img 
            src="/picture/circuit_diagram.png" 
            alt="Industrial Health Monitoring System Circuit Diagram" 
            onClick={() => window.open('/picture/circuit_diagram.png', '_blank')}
            style={{ cursor: 'pointer' }}
            title="Click to view full circuit diagram"
          />
        </div>
      </section>

      {/* SECTION 5 - FAULT SIGNATURES PREVIEW */}
      <section id="faults" ref={s6Ref} className={`fault-section ${s6Visible ? 'is-visible' : ''}`}>
        <div className="fault-header">
          <div className="fault-eyebrow">EARLY FAULT DETECTION</div>
          <h2 className="fault-title">
            DON'T WAIT<br/>FOR FAILURE.
          </h2>
          <div className="fault-desc">
            <p>Machine abnormalities rarely appear as a single number.</p>
            <p>Changes across temperature, current, RPM and acceleration reveal abnormal operating behavior long before catastrophe strikes.</p>
          </div>
        </div>

        <div className="fault-comparison">
          {/* Card 1 */}
          <div className="fault-card f-delay-1">
            <div className="fc-header">NORMAL CONDITION</div>
            <div className="fc-body">
              <div className="fc-row f-step-1"><span>TEMPERATURE</span> <strong>36 °C</strong></div>
              <div className="fc-row f-step-1"><span>CURRENT</span> <strong>0.65 A</strong></div>
              <div className="fc-row f-step-1"><span>RPM</span> <strong>1820</strong></div>
              <div className="fc-row f-step-1"><span>ACCELERATION</span> <strong>STABLE</strong></div>
            </div>
            <div className="fc-arrow f-step-4">&darr;</div>
            <div className="fc-status f-step-5 normal-status">NORMAL OPERATION</div>
          </div>

          {/* Card 2 */}
          <div className="fault-card f-delay-2">
            <div className="fc-header">POSSIBLE OVERLOAD</div>
            <div className="fc-body">
              <div className="fc-row f-step-2"><span>TEMPERATURE</span> <strong className="alert-text">&uarr;</strong></div>
              <div className="fc-row f-step-2"><span>CURRENT</span> <strong className="alert-text">&uarr;</strong></div>
              <div className="fc-row f-step-2"><span>RPM</span> <strong className="alert-text">&darr;</strong></div>
              <div className="fc-row f-step-2"><span>ACCELERATION</span> <strong className="alert-text">&uarr;</strong></div>
            </div>
            <div className="fc-arrow f-step-4">&darr;</div>
            <div className="fc-status f-step-5 warn-status">POSSIBLE OVERLOAD</div>
          </div>

          {/* Card 3 */}
          <div className="fault-card f-delay-3">
            <div className="fc-header">ABNORMAL ACCELERATION</div>
            <div className="fc-body">
              <div className="fc-row f-step-3"><span>ACCELERATION</span> <strong className="alert-text">&uarr;&uarr;&uarr;</strong></div>
              <div className="fc-row f-step-3"><span>RPM</span> <strong>&approx; NORMAL</strong></div>
              <div className="fc-row f-step-3"><span>TEMPERATURE</span> <strong>&approx; NORMAL</strong></div>
              <div className="fc-row f-step-3"><span>CURRENT</span> <strong>&approx; NORMAL</strong></div>
            </div>
            <div className="fc-arrow f-step-4">&darr;</div>
            <div className="fc-status f-step-5 warn-status">POSSIBLE MECHANICAL IMBALANCE</div>
          </div>
        </div>
      </section>

      {/* SECTION 6 - FINAL CTA */}
      <section ref={finalRef} className={`final-cta-section ${finalVisible ? 'is-visible' : ''}`}>
        <div className="final-content">
          <div className="final-eyebrow">INDUSTRIAL CONDITION MONITORING</div>
          <h2 className="final-title">
            UNDERSTAND THE MACHINE.<br/>BEFORE IT BECOMES A PROBLEM.
          </h2>
          <p className="final-desc">
            Real-time sensing, machine health analysis and early abnormality detection in one dedicated monitoring console.
          </p>
          <div className="final-actions">
            <button className="btn-primary" onClick={onOpenDashboard}>
              ENTER LIVE DASHBOARD &rarr;
            </button>
            <button 
              className="btn-secondary"
              onClick={() => document.getElementById('system')?.scrollIntoView({ behavior: 'smooth' })}
            >
              VIEW ARCHITECTURE &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="about" className="minimal-footer">
        <div className="footer-top">
          <div className="footer-brand">Industrial Machine Health Monitoring</div>
          <div className="footer-links">
            <a href="#idea">The Idea</a>
            <a href="#sensors">Sensors</a>
            <a href="#system">Architecture</a>
            <a href="#faults">Fault Signals</a>
            <button className="footer-link-btn" onClick={onOpenDashboard}>Live Dashboard</button>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-tech-line">
            IoT-Based Multi-Sensor Industrial Machine Condition Monitoring & Early Fault Detection System
          </p>
        </div>
      </footer>
    </div>
  );
}
