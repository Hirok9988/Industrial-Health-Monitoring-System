import React, { useState, useEffect } from 'react';
import '../installPrompt.css';

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('ihms_install_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      return;
    }

    // Capture standard PWA install prompt event (Chrome, Edge, Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect iOS devices (Safari does not fire beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice && !isStandalone) {
      setIsIos(true);
    }

    // Clean up when installed
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('IHMS PWA successfully installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User install choice: ${outcome}`);

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('ihms_install_dismissed', 'true');
  };

  // If already dismissed or already running as standalone, hide
  if (isDismissed) {
    return null;
  }

  // Show if browser captured install event, or if iOS detected
  if (!isInstallable && !isIos) {
    return null;
  }

  return (
    <div className="pwa-install-banner">
      <div className="pwa-banner-content">
        <img src="/icons/icon-192.png" alt="IHMS Logo" className="pwa-app-icon" />
        <div className="pwa-banner-text">
          <div className="pwa-badge">WEB APP READY</div>
          <strong className="pwa-banner-title">Install IHMS Application</strong>
          <p className="pwa-banner-desc">
            {isIos ? (
              <>Tap <span className="ios-share-icon">&#x2399;</span> Share and select <strong>&quot;Add to Home Screen&quot;</strong></>
            ) : (
              'Install on your device for full-screen monitoring and faster access.'
            )}
          </p>
        </div>
      </div>

      <div className="pwa-banner-actions">
        {!isIos && (
          <button className="pwa-install-btn" onClick={handleInstallClick}>
            <span className="pwa-btn-icon">&#x21E9;</span>
            Install App
          </button>
        )}
        <button className="pwa-dismiss-btn" onClick={handleDismiss} title="Dismiss prompt" aria-label="Dismiss">
          &#x2715;
        </button>
      </div>
    </div>
  );
}
