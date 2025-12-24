export class GoogleSheetsJSONPClient {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
  }
  
  // Append data using JSONP
  appendData(spreadSheetId, sheetName, rows) {
    return new Promise((resolve, reject) => {
      console.log('Preparing to append data via appendData:', rows); // DEBUG
      console.log("spreadSheetId: " + spreadSheetId + " sheetName: " + sheetName);
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
      
      // Append script to DOM
      document.body.appendChild(script);

      // Encode data to be used as a URL parameter
      console.log("rows: ", rows);
      const encodedData = encodeURIComponent(JSON.stringify({ rows: rows }));

      // Build the URL
      //const url = `${this.scriptUrl}?callback=${callbackName}&sheet=${sheetName}&data=${encodedData}`;
      const url = `${this.scriptUrl}?callback=${callbackName}&spreadsheetid=${spreadSheetId}&sheet=${sheetName}&data=${encodedData}`;
      //const url = `${this.scriptUrl}?callback=${callbackName}`;
      console.log('Making appendData request to:', url); // DEBUG
      script.src = url;
      
      // Error handling
      script.onerror = (error) => {
        console.error('appendData Script load error details:', error);
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('appendData request failed to: ' +  url));
      }; 
       
      // Timeout after 30 seconds
      setTimeout(() => {
        if (window[callbackName]) {
          delete window[callbackName];
          if (document.body.contains(script)) {
            document.body.removeChild(script);
          }
          reject(new Error('appendData timeout'));
        }
      }, 30000);
    });
  }
  
  // Read data using JSONP
  readData(spreadSheetId, sheetName) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      const script = document.createElement('script');
      
      window[callbackName] = (data) => {
        // Add this right after creating the script element
        delete window[callbackName];
        document.body.removeChild(script);
        resolve(data);
      };

      // Append script to DOM 
      document.body.appendChild(script);
    
      //const encodedData = encodeURIComponent(JSON.stringify({ sheet: sheetName }));
      // Build the URL
      const url = `${this.scriptUrl}?callback=${callbackName}&spreadsheetid=${spreadSheetId}&sheet=${sheetName}`;
      script.src = url;
      
      script.onerror = (error) => {
        delete window[callbackName];
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
        reject(new Error('readData JSONP request failed:', error));
      };
      
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

