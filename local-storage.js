export class localStorageManager {
    constructor(storageName) {
        this.name = storageName;
    }

    // ------------Transaction local storage and retrieval functions -----------------
    // Save scanned transaction to localStorage
    addTransaction(transactionRow) {
        let scans = JSON.parse(localStorage.getItem(this.name)) || [];
        scans.push(transactionRow);
        localStorage.setItem(this.name, JSON.stringify(scans));   
    }
    //Get all the transactions from localStorage
    getTransactions() {
        let scans = JSON.parse(localStorage.getItem(this.name)) || [];
        return scans;
    }       
    // Clear all stored transactions
    clearTransactions() {
        localStorage.removeItem(this.name);
    }
    // ------------End of transaction local storage and retrieval functions -----------------
}