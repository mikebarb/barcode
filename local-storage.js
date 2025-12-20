export class localStorageManager {
    constructor(storageName) {
        this.name = storageName;
        //this.clearTransactions();
    }

    // ------------Transaction local storage and retrieval functions -----------------
    // Save transaction to localStorage
    addTransaction(transactionRow) {
        let scans = JSON.parse(localStorage.getItem(this.name)) || [];
        console.log("Adding transaction to local storage: ", transactionRow);
        console.log("Current stored transactions: ", scans);
        scans.push(transactionRow);
        console.log("Updated stored transactions: ", scans);
        localStorage.setItem(this.name, JSON.stringify(scans));
        console.log("Now check what is stored after transaction saved to local storage.");
        let scansAfter = JSON.parse(localStorage.getItem(this.name)) || [];
        console.log("Check - Retrieved stored transactions: ", scansAfter);
        console.log("scansAfter[0]: ", scansAfter[0]);
        console.log("scansAfter[0][0]: ", scansAfter[0][0]);
    }
    //Get all the transactions from localStorage
    getTransactions() {
        let scans = JSON.parse(localStorage.getItem(this.name)) || [];
        console.log("Retrieved stored transactions: ", scans);
        return scans;
    }       
    // Clear all stored transactions
    clearTransactions() {
        localStorage.removeItem(this.name);
    }
    // ------------End of transaction local storage and retrieval functions -----------------
}