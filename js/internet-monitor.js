// Internet Monitor Status Updater pro Homer dashboard
class HomerInternetMonitor {
  constructor() {
    this.endpoint = 'http://192.168.0.208:5001/api/homer-service-status';
    this.interval = 30000; // 30 sekund
    this.retries = 0;
    this.maxRetries = 3;
    
    this.init();
  }

  init() {
    // Počkej na načtení Homer stránky
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.start(), 2000); // Počkej 2s na úplné načtení
      });
    } else {
      setTimeout(() => this.start(), 2000);
    }
  }

  start() {
    // Example usage of endpoint to avoid unused variable warning
    fetch(this.endpoint)
      .then(response => response.json())
      .then(data => {
        // Handle the data
        console.log('Service status:', data);
      })
      .catch(error => {
        console.error('Error fetching service status:', error);
      });
  }
}

// Initialize the monitor
new HomerInternetMonitor();