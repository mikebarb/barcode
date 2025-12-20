export class GoogleSheetsJSONPClient {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
  }
  
  // Append data using JSONP
  appendData(sheetName, rows) {
    console.log('Preparing to append data via appendData:', rows); // DEBUG
    return new Promise((resolve, reject) => {
      const callbackName = 'appendData_callback_' + Math.round(100000 * Math.random());
      const script = document.createElement('script');
      
      // Create callback function
      window[callbackName] = (data) => {
        console.log('appendData response received:', data);
        // Clean up
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      // Encode data to be used as a URL parameter
      console.log("rows: ", rows);
      const encodedData = encodeURIComponent(JSON.stringify({ rows: rows }));
      const encodedData2 = encodeURIComponent(JSON.stringify({ sheet: sheetName }));
      //?param1=${encodeURIComponent(JSON.stringify(data1))}&param2=${encodeURIComponent(JSON.stringify(data2))}`;

      
      // Build the URL
      const url = `${this.scriptUrl}?callback=${callbackName}&sheet=${sheetName}&data=${encodedData}`;
      //const url = `${this.scriptUrl}?callback=${callbackName}`;
      console.log('Making appendData request to:', url); // DEBUG
      script.src = url;
      console.log('appendData request sent:'); // DEBUG
      
      // Error handling
      script.onerror = (error) => {
        console.error('appendData Script load error details:', error);
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('appendData request failed to: ' +  url));
      };

      script.onload = () => {
        console.log('appendData script loaded successfully and waiting for callback for URL:', url);
      }
      
      // Add to page
      document.body.appendChild(script);
      
      // Timeout after 60 seconds
      setTimeout(() => {
        if (window[callbackName]) {
          console.log('appendData timeout - callback never called');
          delete window[callbackName];
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          reject(new Error('appendData timeout'));
        }
      }, 60000);
    });
  }
  
  // Read data using JSONP
  readData(sheetName) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      const script = document.createElement('script');
      
      window[callbackName] = (data) => {
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };
      
      //const encodedData = encodeURIComponent(JSON.stringify({ sheet: sheetName }));
      console.log("sheetname: ", sheetName);
      // Build the URL
      const url = `${this.scriptUrl}?callback=${callbackName}&sheet=${sheetName}`;
      console.log("making google read request url", url);
      //const url = `${this.scriptUrl}?callback=${callbackName}`;
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



