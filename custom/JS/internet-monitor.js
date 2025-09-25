// Internet Monitor Integration pro Homer Dashboard
(function() {
  'use strict';
  
  // NASTAV SPRÁVNOU IP ADRESU SVÉHO SERVERU
  const SERVER_IP = window.location.hostname; // Automaticky použije IP tvé stránky
  const MONITOR_PORT = '5001';
  
  class HomerInternetMonitor {
    constructor() {
      this.endpoint = `http://${SERVER_IP}:${MONITOR_PORT}/api/homer-service-status`;
      this.interval = 30000; // 30 sekund
      this.retries = 0;
      this.maxRetries = 3;
      this.debug = false; // Zapni pro debugging
      
      this.log('Inicializuji Internet Monitor pro Homer...');
      this.init();
    }

    log(message) {
      if (this.debug) console.log(`[InternetMonitor] ${message}`);
    }

    init() {
      // Počkej na načtení Vue aplikace
      this.waitForHomer(() => {
        this.log('Homer načten, injektuji styly a spouštím monitoring');
        this.injectStyles();
        this.start();
      });
    }

    waitForHomer(callback, attempts = 0) {
      // Čekej až se Homer načte (max 60 pokusů = 30 sekund)
      const cards = document.querySelectorAll('.card');
      if (cards.length > 0) {
        this.log(`Homer načten po ${attempts} pokusech`);
        callback();
      } else if (attempts < 60) {
        setTimeout(() => this.waitForHomer(callback, attempts + 1), 500);
      } else {
        console.warn('[InternetMonitor] Homer se nenačetl do 30 sekund, spouštím i tak...');
        callback();
      }
    }

    start() {
      this.updateStatus();
      setInterval(() => this.updateStatus(), this.interval);
      this.log(`Monitoring spuštěn s intervalem ${this.interval/1000}s`);
    }

    async updateStatus() {
      try {
        this.log(`Načítám status z ${this.endpoint}`);
        const response = await fetch(this.endpoint);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        this.log(`Status načten: ${data.status} - ${data.subtitle}`);
        this.renderStatus(data);
        this.retries = 0;
      } catch (error) {
        console.warn(`[InternetMonitor] Aktualizace selhala (pokus ${this.retries + 1}/${this.maxRetries}):`, error);
        this.retries++;
        
        if (this.retries >= this.maxRetries) {
          this.renderError();
        }
      }
    }

    findInternetMonitorCard() {
      // Hledá Internet Monitor službu různými způsoby
      const selectors = [
        // Podle title textu
        '.card .title:contains("Internet Monitor")',
        '.card .name:contains("Internet Monitor")',
        '.card h3:contains("Internet Monitor")',
        // Podle subtitle
        '.card .subtitle:contains("Měření kvality")',
        '.card p:contains("Měření kvality")'
      ];

      // Fallback - manuální hledání
      const cards = document.querySelectorAll('.card');
      for (const card of cards) {
        const titleElements = card.querySelectorAll('.title, .name, h3, .subtitle, p');
        for (const elem of titleElements) {
          if (elem.textContent.includes('Internet Monitor') || 
              elem.textContent.includes('Měření kvality')) {
            this.log('Našel Internet Monitor kartu');
            return card;
          }
        }
      }
      
      this.log('Internet Monitor karta nebyla nalezena');
      return null;
    }

    renderStatus(data) {
      const card = this.findInternetMonitorCard();
      if (!card) {
        console.warn('[InternetMonitor] Internet Monitor karta nebyla nalezena');
        return;
      }

      // Najdi subtitle element
      let subtitle = card.querySelector('.subtitle');
      if (!subtitle) {
        subtitle = card.querySelector('p');
      }
      if (!subtitle) {
        this.log('Subtitle element nenalezen, vytvářím nový');
        // Vytvoř subtitle pokud neexistuje
        const title = card.querySelector('.title, .name, h3');
        if (title) {
          subtitle = document.createElement('p');
          subtitle.className = 'subtitle';
          title.parentNode.insertBefore(subtitle, title.nextSibling);
        }
      }

      if (subtitle) {
        // Aktualizuj subtitle s novými daty
        subtitle.innerHTML = data.subtitle || '🔄 Načítám...';
        this.log(`Subtitle aktualizován: ${data.subtitle}`);
      }
      
      // Přidej CSS třídy pro styling
      card.classList.remove('im-status-ok', 'im-status-warning', 'im-status-critical', 'im-status-offline');
      
      switch (data.status) {
        case 'ok':
          card.classList.add('im-status-ok');
          break;
        case 'warning':
          card.classList.add('im-status-warning');
          break;
        case 'critical':
          card.classList.add('im-status-critical');
          break;
        case 'offline':
          card.classList.add('im-status-offline');
          break;
      }

      // Pulsing pro kritické stavy
      if (data.status === 'critical' || data.status === 'offline') {
        card.style.animation = 'im-pulse 2s infinite';
      } else {
        card.style.animation = '';
      }
    }

    renderError() {
      const card = this.findInternetMonitorCard();
      if (!card) return;

      const subtitle = card.querySelector('.subtitle') || card.querySelector('p');
      if (subtitle) {
        subtitle.innerHTML = '❌ Monitor nedostupný';
      }
      
      card.classList.remove('im-status-ok', 'im-status-warning', 'im-status-critical');
      card.classList.add('im-status-offline');
    }

    injectStyles() {
      if (document.getElementById('internet-monitor-styles')) {
        this.log('Styly už jsou načteny');
        return;
      }
      
      const styles = `
        <style id="internet-monitor-styles">
        /* Internet Monitor Status styly pro Homer */
        .card.im-status-ok {
          border-left: 4px solid #10b981 !important;
          transition: all 0.3s ease !important;
        }

        .card.im-status-warning {
          border-left: 4px solid #f59e0b !important;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), transparent) !important;
          transition: all 0.3s ease !important;
        }

        .card.im-status-critical {
          border-left: 4px solid #ef4444 !important;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.12), transparent) !important;
          transition: all 0.3s ease !important;
        }

        .card.im-status-offline {
          border-left: 4px solid #6b7280 !important;
          background: linear-gradient(135deg, rgba(107, 114, 128, 0.1), transparent) !important;
          opacity: 0.8 !important;
          transition: all 0.3s ease !important;
        }

        /* Pulsing animace pro kritické stavy */
        @keyframes im-pulse {
          0% { 
            transform: scale(1); 
            box-shadow: 0 2px 8px rgba(0,0,0,.1);
          }
          50% { 
            transform: scale(1.03); 
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
          }
          100% { 
            transform: scale(1); 
            box-shadow: 0 2px 8px rgba(0,0,0,.1);
          }
        }

        /* Homer tmavý režim */
        .is-dark .card.im-status-ok {
          border-left-color: #34d399 !important;
        }
        
        .is-dark .card.im-status-warning {
          border-left-color: #fbbf24 !important;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.12), transparent) !important;
        }
        
        .is-dark .card.im-status-critical {
          border-left-color: #f87171 !important;
          background: linear-gradient(135deg, rgba(248, 113, 113, 0.18), transparent) !important;
        }

        /* Responsivní design */
        @media (max-width: 768px) {
          .card.im-status-warning,
          .card.im-status-critical,
          .card.im-status-offline {
            border-left: none !important;
            border-top: 3px solid !important;
          }
          
          .card.im-status-warning {
            border-top-color: #f59e0b !important;
          }
          
          .card.im-status-critical {
            border-top-color: #ef4444 !important;
          }
          
          .card.im-status-offline {
            border-top-color: #6b7280 !important;
          }
        }

        /* Emoji v subtitle mají lepší podporu */
        .card .subtitle {
          font-family: system-ui, -apple-system, 'Segoe UI Emoji', 'Apple Color Emoji', 'Segoe UI Symbol', sans-serif !important;
        }
        </style>
      `;
      
      document.head.insertAdjacentHTML('beforeend', styles);
      this.log('Styly injektovány');
    }
  }

  // Spuštění po načtení DOMu
  function initMonitor() {
    if (window.homerInternetMonitor) {
      console.log('[InternetMonitor] Už běží, přeskakuji...');
      return;
    }
    
    window.homerInternetMonitor = new HomerInternetMonitor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMonitor);
  } else {
    initMonitor();
  }
})();
EOF

echo "✅ JavaScript soubor vytvořen"