export class localStorageManager {
    constructor(storageName) {
        this.name = storageName;
        //this.clearTransactions();
    }

    // ------------Transaction local storage and retrieval functions -----------------
    // Save transaction to localStorage
    addTransaction(transactionRow) {
        let transactions = JSON.parse(localStorage.getItem(this.name)) || [];
        transactions.push(transactionRow);
        localStorage.setItem(this.name, JSON.stringify(transactions));
    }
    setObject(settings) {
        localStorage.setItem(this.name, JSON.stringify(settings));        
        console.log("localStorage-after set: ", localStorage);       
    }

    //Get all the transactions from localStorage
    getTransactions() {
        let transactions = JSON.parse(localStorage.getItem(this.name)) || [];
        return transactions;
    }       

    getObject() {
        const stored = localStorage.getItem(this.name);
        try {
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null; // Handle corrupted JSON
        }
    }

    // Clear all stored transactions
    clearTransactions() {
        localStorage.removeItem(this.name);
    }
    // ------------End of transaction local storage and retrieval functions -----------------
}