export class ItemSearch {
  constructor(itemsData) {
    this.itemsMap = new Map();
    this.lowercaseIndex = new Map();
    this.workingArray = []; // Allocate once, reuse forever
    this.lastSearchId = 0;
    if (!itemsData || itemsData[0].length === 0) {
      setMessage("Search source not present - download first then reopen app!");
      return;
    }
    itemsData.forEach(([code, description, price]) => {
      this.addItem(code, description, price);
    });
  }

  refreshData(itemsData) {
    if (!itemsData || itemsData[0].length === 0) {
      setMessage("Search source not present - download first then reopen app!");
      return;
    }
    this.itemsMap.clear();
    this.lowercaseIndex.clear();
    itemsData.forEach(([code, description, price]) => {
      this.addItem(code, description, price);
    });
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
