// pass in the items data to the search class, which will build a map 
// of code to description and price, and a lowercase index for code to original code. 
// The search class will then provide methods for searching by code or full text search
//  on code and description. The search class will also provide a method for refreshing
//  the data when the items data is updated.
//
// Pass in: [[code, description, price], [code, description, price], ...]
export class ItemSearch {
  constructor(itemsData) {
    this.itemsMap = new Map();
    this.lowercaseIndex = new Map();
    this.workingArray = []; // Allocate once, reuse forever
    this.lastSearchId = 0;
    console.log("ItemSearch - initialisation itemsData: ", itemsData);
    if (!itemsData || itemsData.length === 0 || itemsData[0].length === 0) {
      setMessage("Search source not present - download first then reopen app!");
      console.log("during itemSearch initialisation, search source not present: ", itemsData);
      this.itemsMap.clear();
      this.lowercaseIndex.clear();
      return;
    }
    itemsData.forEach(([code, description, price]) => {
      this.addItem(code, description, price);
    });
  }

  refreshData(itemsData) {
    console.log("itemsData: ", itemsData);
    if (!itemsData || itemsData.length === 0 || itemsData[0].length === 0) {
      setMessage("Search source not present - download first then reopen app!");
      console.log("search source not present: ", itemsData);
      this.itemsMap.clear();
      this.lowercaseIndex.clear();
      return;
    }
    this.itemsMap.clear();
    this.lowercaseIndex.clear();
    itemsData.forEach(([code, description, price]) => {
      this.addItem(code, description, price);
    });
  }

  logItemsData(){
    console.log("logging - itemsData: ", this.itemsMap);
  }

  clearData() {
      this.itemsMap.clear();
      this.lowercaseIndex.clear();
      return;
  }
  // Check that there is content to search on.
  isSearchContentPresent(){
    console.log("isSearchContentPresent- itemsMap: ", this.itemsMap);
    console.log("length: ", this.itemsMap.size);
    return this.itemsMap.size?true:false
  }

  addItem(code, description, price) {
    //console.log("Adding item to search index: ", code, description, price);
    const code1 = code.toString();
    this.itemsMap.set(code1, { description, price });
    //console.log("code: ", code, "description: ", description, "price: ", price);
    //console.log("code type: ", typeof code);
    //console.log("code type: ", typeof code1);
    this.lowercaseIndex.set(code1.toLowerCase(), code1);
  }

  fullTextSearch(searchTerm) {
    this.workingArray.length = 0; // Clear quickly
    console.log("workingArray: ", this.workingArray);
    const normalizedSearch = searchTerm.toLowerCase().trim();
    console.log("normalizedSearch: ", normalizedSearch);

    if (!normalizedSearch) return this.workingArray;
    console.log("itemsMap: ", this.itemsMap);
    this.itemsMap.forEach((itemData, code) => {
        console.log("code: ", code, "itemData: ", itemData);
        if (
            code.toLowerCase().includes(normalizedSearch) ||
            itemData.description.toLowerCase().includes(normalizedSearch)
        ) {
            console.log("we have a match.");
            this.workingArray.push({
            code: code,
            description: itemData.description,
            price: itemData.price
            });
            console.log("we have a match.", this.workingArray);
        }
    });
    console.log("we have a result.", this.workingArray);
    return this.workingArray;
  }
    
  searchByCode(code) {
    const code1 = code.toString();
    const normalizedCode = code1.toLowerCase();
    const originalCode = this.lowercaseIndex.get(normalizedCode);
    
    if (originalCode) {
      const itemData = this.itemsMap.get(originalCode);
      return {
        code: originalCode,
        description: itemData.description,
        price: itemData.price
      };
    }
    return null;
  }

 async genericSearch(searchTerm) {
    console.log("entering genericSearch: ", searchTerm);
    if (searchTerm.trim() == "") return null;
    
    const myItem = this.searchByCode(searchTerm);
    console.log("myItem", myItem);
    if(myItem !== null){
        return myItem;
    }
    
    const currentSearchId = ++this.lastSearchId;
    
    //let myResult = [];
    // Debounce the search
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("inside timeout of genericSearch: ", searchTerm);
        console.log("currentSearchId: ", currentSearchId, " this.lastSearchId: ", this.lastSearchId);
        let myResult = [];
        if (currentSearchId === this.lastSearchId) {
          //myResult = this.performSearch(searchTerm);
          console.log("execute timeout of genericSearch: ", searchTerm);
          myResult = this.fullTextSearch(searchTerm);
          console.log("genericSearch - myResult: ", myResult);
          resolve(myResult);
        }
      }, 150);
    });
  }
  
}
