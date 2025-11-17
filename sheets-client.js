class GoogleSheetsJSONPClient {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
  }
  
  // Append data using JSONP
  appendData(rows) {
    console.log('Preparing to append data via JSONP:', rows); // DEBUG
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      const script = document.createElement('script');
      
      // Create callback function
      window[callbackName] = (data) => {
        console.log('JSONP response received:', data);
        // Clean up
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      // Encode data to be used as a URL parameter
      const encodedData = encodeURIComponent(JSON.stringify({ rows: rows }));
      
      // Build the URL
      const url = `${this.scriptUrl}?callback=${callbackName}&data=${encodedData}`;
      console.log('Making JSONP request to:', url); // DEBUG
      script.src = url;
      
      // Error handling
      script.onerror = (error) => {
        console.error('Script load error details:', error);
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('JSONP request failed to: ' +  url));
      };

      script.onload = () => {
        console.log('Script loaded successfully and waiting for callback for URL:', url);
      }
      
      // Add to page
      document.body.appendChild(script);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (window[callbackName]) {
          console.log('JSONP timeout - callback never called');
          delete window[callbackName];
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          reject(new Error('JSONP timeout'));
        }
      }, 30000);
    });
  }
  
  // Read data using JSONP
  readData() {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      const script = document.createElement('script');
      
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      const url = `${this.scriptUrl}?callback=${callbackName}`;
      script.src = url;
      
      script.onerror = (error) => {
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('JSONP request failed', error));
      };
      
      document.body.appendChild(script);

      // timeout after 30 seconds
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          reject(new Error('JSONP read timeout'));
        }
      }, 30000);
    });
  }
}
