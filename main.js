// Class for managing input fields with clear and fullscreen functionality
// ???  Seems to be in the details-area - email, name and comments???
class InputManager {
    constructor() {
        this.init();
    }
    init() {
        this.setupEventDelegation();
        this.initializeClearButtons();
    }
    setupEventDelegation() {
        document.addEventListener('click', (e) => {
            this.handleButtonClick(e);
        });
        document.addEventListener('input', (e) => {
            if (e.target.matches('.text-input, textarea[data-clearable]')) {
                this.handleInput(e.target);
            }
        });
    }
    handleButtonClick(e) {
        const btn = e.target.closest('.control-btn');
        if (!btn) return;

        const inputWrapper = btn.closest('.input-wrapper, .textarea-wrapper');
        const input = inputWrapper?.querySelector('.text-input, textarea');
        console.log("Button clicked: ", btn, " for input: ", input);
        if (btn.classList.contains('clear-btn')) {
            this.clearInput(input);
            if (btn.closest('.textarea-wrapper')) {
                this.autoResizeTextarea(input);
            }
        }
    }
    handleInput(input) {
        console.log(`${input.id} input:`, input.value);
        this.toggleClearButton(input);
        
        if (input.id === 'customTextarea') {
            this.autoResizeTextarea(input);
        }
    }
    clearInput(input) {
        if (!input) return;
        input.value = '';
        input.focus();
        input.dispatchEvent(new Event('input'));
    }
    toggleClearButton(input) {
        const clearBtn = input?.closest('.input-wrapper, .textarea-wrapper')
                           ?.querySelector('.clear-btn');
        if (clearBtn) {
            clearBtn.style.visibility = input.value ? 'visible' : 'hidden';
        }
    }
    initializeClearButtons() {
        document.querySelectorAll('.text-input, textarea[data-clearable]').forEach(input => {
            this.toggleClearButton(input);
        });
    }
    autoResizeTextarea(textarea) {        
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
    }
}

// Importing classes from other modules
import { GoogleSheetsJSONPClient } from './sheets-client.js';
import {localStorageManager} from './local-storage.js';
import {ItemSearch} from './search.js';


// Construct Service Worker URL with version parameter
const APP_VERSION = "1.3";
const APP_URL = './sw.js?v=' + APP_VERSION;

// Service Worker Registration
function registerServiceWorker() {
    console.log('Registering Service Worker with URL:', APP_URL);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          console.log('Active SW registrations:', registrations.length);
          registrations.forEach(reg => {
            console.log('SW scope:', reg.scope);
            console.log('SW state:', reg.active?.state);
          });
        });
        window.addEventListener('load', () => {
            console.log("in window add load listener");
            navigator.serviceWorker.register(APP_URL)
                .then(registration => {
                    console.log("registered", registration);
                    // Send version to SW after registration
                    if (registration.active) {
                        registration.active.postMessage({
                            type: 'SET_VERSION',
                            version: APP_VERSION
                        });
                    }
                    // Also send to waiting SW if any
                    if (registration.waiting) {
                        registration.waiting.postMessage({
                            type: 'SET_VERSION', 
                            version: APP_VERSION
                        });
                    }
                    // Optional: Check for updates
                    console.log('SW registered:', registration);
                    registration.update();
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    } else {
        console.log('Service Workers are not supported in this browser.');
    }
}

// Initialize the service worker
 registerServiceWorker();

// Initialize the text input manager
const inputManager = new InputManager();

// Test deployment
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyFlT_DxulowVoulqr53RTAhVNRVIEaJY8s6gIc5AA/dev';

//Production deployment
//const SCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbyd6HhkxfpKPPssB-N8zRJZDnMwyi7z3ZLs2XDc6Q6Vwk36aNzdKYz4ywXilsbSQi1L/exec';
const client = new GoogleSheetsJSONPClient(SCRIPT_URL);
const storeScans = new localStorageManager('scans');
const storeSales = new localStorageManager('sales');
const storedLastUpdateTime = new localStorageManager('lastUpdateTime');
const storeStock = new localStorageManager('stock');

// Export the function for module use
// and also attach to window for legacy scripts
window.processScanResults = processScanResults;
export function processScanResults(codeFormat, code) {
    // put into the inputCode field in the main data-entry area - Ausid field
    const inputField = document.getElementById('inputCode');
    inputField.value = code;
    // As a barcode is found, hide the scanning area and show details-display area.
    document.getElementById("scan-display").style.display = 'none';
    document.getElementById("details-display").style.display = 'block';
    // Check if the found code is in the stock data
    const foundItem = searchManager.searchByCode(code);
    console.log("foundItem from scan: ", foundItem);    
    if (foundItem){
        // keep this scan view open
        //document.getElementById("details-display").style.display = 'none';
        //document.getElementById("scan-display").style.display = 'block';
        //document.getElementById("scan-display").style.display = 'none';
        //document.getElementById("details-display").style.display = 'block';
        document.getElementById("details-wrapper").style.display = 'block';
        document.getElementById("details-cost").textContent = foundItem.price.toFixed(2);
        document.getElementById("details-description").textContent = foundItem.description;
    }
    // check what is selected in the dropdown 
    //getSelectedValue()
    ///////const selectedOption = getSelectedOption();
    //const selectedOption = msSelect.value;  
    //console.log("Selected option: ", selectedOption);  
    
    return;
}

function clearDetailsWrapper(){
    document.getElementById("details-wrapper").style.display = 'none';
    document.getElementById("details-cost").textContent = '';
    document.getElementById("details-description").textContent = '';
}

// Toggle pause/resume
pauseButton.addEventListener('click', function() {
    if (isPaused) {
        resumeScanning();
    } else {
        pauseScanning();
    }
});

// Button event listeners
startButton.addEventListener('click', startScanning);
stopButton.addEventListener('click', stopScanning);
scanButton.addEventListener('click', doScan);

function doScan(){
    clearMessage();
    clearDetailsWrapper();
    document.getElementById("details-display").style.display = 'none';
    document.getElementById("search-input").value = '';
    document.getElementById("search-container").style.display = 'none';
    triggerScan();
}

//--------drop down menu event listener and assoicated functions ----------------
// This is for the type of display - sales, returns, stock check etc.

// Toggle dropdown
const dropdownSelecteds = document.getElementsByClassName('dropdownSelected');
Array.from(dropdownSelecteds).forEach( dropdownSelected => {
    dropdownSelected.addEventListener('click', function() {
        event.stopPropagation(); // Prevent event from bubbling up
        dropdownSelected.nextElementSibling.classList.toggle('show');
    });
    console.log("next dropdownSelected.");
});

// Select option
const options = document.querySelectorAll('.dropdownOption');
console.log("options: ", options);
options.forEach(option => {
    option.addEventListener('click', function() {
        event.stopPropagation(); // Prevent event from bubbling up
        //const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownSelected = this.closest('.customDropdown').querySelector('.dropdownSelected');  
        console.log("dropdownSelected: ", dropdownSelected);
        dropdownSelected.textContent = this.textContent;
        dropdownSelected.setAttribute('data-value', this.getAttribute('data-value'));
        //const dropdownOptions = document.getElementById('dropdownOptions');
        const dropdownOptions = dropdownSelected.nextElementSibling;
        dropdownOptions.classList.remove('show');
        console.log('Selected:', this.getAttribute('data-value'));
        optionsDisplay();
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.customDropdown')) {
        const dropdownOptionss = document.getElementsByClassName('dropdownOptions');
        Array.from(dropdownOptionss).forEach( dropdownOptions => {
            dropdownOptions.classList.remove('show');
        });
    }
});

// Initialize dropdown with default value - Activity Type
document.getElementById("dropdownOptions").firstElementChild.click();

// Initialize dropdown with default value - Sale Type
document.getElementById("dropdownSaleTypeOptions").firstElementChild.click();

// Get the selected value when called from from anywhere
window.getSelectedOption = getSelectedOption;
export function getSelectedOption() {
    const selectedElement = document.getElementById('dropdownSelected');
    console.log("SelectedElement: ", selectedElement);
    const selectedOption = selectedElement.getAttribute('data-value');
    console.log("getSelectedValue: ", selectedOption);
    return selectedElement.getAttribute('data-value') || '';
}

// Get the sale type when called from from anywhere
window.getSaleTypeOption = getSaleTypeOption;
export function getSaleTypeOption() {
    const selectedElement = document.getElementById('dropdownSaleType');
    console.log("SelectedElement: ", selectedElement);
    const selectedOption = selectedElement.getAttribute('data-value');
    console.log("getSelectedValue: ", selectedOption);
    return selectedElement.getAttribute('data-value') || '';
}


//---End of-----drop down menu event listener and assoicated functions ----------------

//-------- numeric input event listener and assoicated functions ----------------
// Quantity of items to be purchased.
const customInput = document.getElementById('quantityNumbericInput');
const decrementBtn = document.querySelector('.numeric-decrement');
const incrementBtn = document.querySelector('.numeric-increment');

// Input validation
customInput.addEventListener('input', function() {
    this.value = this.value.replace(/[^0-9]/g, '');
});

// Decrement value
decrementBtn.addEventListener('click', function() {
    let value = parseFloat(customInput.value) || 0;
    customInput.value = value > 0 ? value - 1 : 0;
    customInput.dispatchEvent(new Event('change'));
});

// Increment value
incrementBtn.addEventListener('click', function() {
    let value = parseFloat(customInput.value) || 0;
    customInput.value = value + 1;
    customInput.dispatchEvent(new Event('change'));
});

// Change event
customInput.addEventListener('change', function() {
    console.log('Numeric value changed:', this.value);
});

//---End of----- numeric input event listener and associated functions ----------------

//------ add button event listener and associated functions ---------------------
// This adds the displayed item to the purchased items list - dynamic display area.
const addItemButton = document.getElementById('add-item-button');
addItemButton.addEventListener('click', function() {
    console.log('Add Item Button clicked.');
    addItem();
    hideDiscountArea();
    document.getElementById("quantityNumbericInput").value = 1;
});

//--------- adds an ausil item to the list
// calls on the addLineItem.
function addItem(){
    const code = document.getElementById("inputCode").value;
    console.log("code to check: ", code);
    if (checkCodePresent(code)){
        setMessage("This Ausid has already been added!");
        return;
    }else{
        clearMessage();
    }
    const quantity = Number(document.getElementById("quantityNumbericInput").value);
    const price = Number(document.getElementById("details-cost").textContent);
    //const price = Number("1.00");
    
    if((code.length == 0) || (quantity == 0) ){
        console.log("cannot add empty code or 0 quantity");
        return;
    }
    //const description = "This describes the item."
    const description = document.getElementById("details-description").textContent;
    addLineItem(code, quantity, price, description);
    // Now calculate th sales total
    calculateSaleTotal();
    // clear the details area for next item & ausid entry
    clearDetailsWrapper();
    document.getElementById("inputCode").value = '';
}

//--------- does the dom build for adding an item to the list.
// used by mutiple functions (addItem, addDiscount) that append to this list.
function addLineItem(code, quantity, price, description){    
    const eleProductList = document.getElementById("items-to-purchase"); 
    const eleProductItem = document.createElement('div');     // product item
    eleProductItem.classList.add("product-item");
    //creat the two html lines for this item.
    // create the first line for the item
    const eleItemLine1 = document.createElement('div');      // item-header
    eleItemLine1.classList.add("item-header");
    // create each column in this line
    const eleItemCode = document.createElement('span');      // code
    eleItemCode.classList.add("code");
    eleItemCode.textContent=code;
    eleItemLine1.appendChild(eleItemCode);
    const eleItemQty = document.createElement('span');       // quantity
    eleItemQty.classList.add("quantity");
    eleItemQty.textContent= quantity.toString();
    eleItemLine1.appendChild(eleItemQty);
    const eleItemPrice = document.createElement('span');    // price
    eleItemPrice.classList.add("price");
    eleItemPrice.textContent = price.toFixed(2);
    eleItemLine1.appendChild(eleItemPrice);
    const eleItemSubtotal = document.createElement('span');  // subtotal
    eleItemSubtotal.classList.add("subtotal");
    eleItemSubtotal.textContent = (price * quantity).toFixed(2);
    eleItemLine1.appendChild(eleItemSubtotal);
    const eleDeleteBtn = document.createElement('button');    // delete button
    eleDeleteBtn.classList.add("delete-btn");
    eleDeleteBtn.title = "Delete Item";
    eleDeleteBtn.textContent = "x";
    eleItemLine1.appendChild(eleDeleteBtn);
    eleProductItem.appendChild(eleItemLine1);
    // create the second line (description) for the item
    const eleItemLine2 = document.createElement('div');
    eleItemLine2.classList.add("description");
    eleItemLine2.textContent = description;
    eleProductItem.appendChild(eleItemLine2);
    // Now insert into the page / dom.
    document.getElementById("items-to-purchase").prepend(eleProductItem);
}

// Message display area is provide user feedback for the sales operations.
window.setMessage = setMessage;
export function setMessage(message){
    console.log("set message: ", message);
    const eleMessage = document.getElementById("message");
    console.log("eleMessage: ", eleMessage);
    document.getElementById("message").style.display = 'block';
    eleMessage.textContent = message;
    // Now want to remove message after a timeout period - 5 seconds.
    setTimeout(() => {
        clearMessage();
    }, 5000);
}

function clearMessage(){
    console.log("clear message: ");
    const eleMessage = document.getElementById("message");
    document.getElementById("message").style.display = 'none';
    eleMessage.textContent = "";
}

// Need code to act on this item's delete button being clicked.
document.getElementById("items-to-purchase").addEventListener('click', (e) => {
    console.log("event on items-to-purchase", e);
    clearMessage();
    if (e.target.matches('.delete-btn')) {
        e.target.closest('.product-item').remove();
        calculateSaleTotal();
        // need to check if any items left
        const eleItemsToPurchase = document.getElementById("items-to-purchase");
        const eleItems = eleItemsToPurchase.querySelectorAll('.subtotal');
        console.log("subtotals elements:", eleItems);
        if(eleItems.length == 0){
            document.getElementById("sale-total").style.display = 'none';
        }
    }
});
// on initialisation, hide the sale total area 
document.getElementById("sale-total").style.display = 'none';

// on initialisation, hide the message area.
document.getElementById("message").style.display = 'none';

// on initialisation, hide the discount area.
document.getElementById("discount-display").style.display='none';

// need code to act on the "discount" button which shows the discount area
document.getElementById("show-discount").addEventListener('click', (e) => {
    console.log("event on show-discount", e);
    document.getElementById("discount-display").style.display='flex';
});

// need code to act on the discount "exit" button which hides the discount area
document.getElementById("discount-cancel").addEventListener('click', (e) => {
    console.log("event on discount-cancel", e);
    hideDiscountArea();
});

function hideDiscountArea(){
    document.getElementById("discount-display").style.display='none';
    document.getElementById("discount-amount").value = "";
}

// need code to act on the "add discount" button
document.getElementById("discount-add").addEventListener('click', (e) => {
    console.log("event on discount-add", e);
    // add the line item - discount
    clearMessage();
    if (checkCodePresent("Discount")){
        setMessage("A discount has already been applied!");
        return;
    }
    const discountValue = -1 * document.getElementById("discount-amount").value;
    if (discountValue == 0){
        setMessage("Your discount is set to $0 - no discount!");
        return;
    }
    //const discountValue = Number("1.00") * -1;
    console.log ("discount value: ", discountValue);
    addLineItem("Discount", "1", discountValue, "");
    calculateSaleTotal();
    // need to check if any items left
    const eleItemsToPurchase = document.getElementById("items-to-purchase");
    const eleItems = eleItemsToPurchase.querySelectorAll('.subtotal');
    console.log("subtotals elements:", eleItems);
    if(eleItems.length == 0){
        document.getElementById("sale-total").style.display = 'none';
    }
    hideDiscountArea()
});

// Check if the Ausil barcode is already in the items list
function checkCodePresent(checkCode){
    // check each code field to see if checkCode is already present
    const eleItemsToPurchase = document.getElementById("items-to-purchase");
    const eleItems = Array.from(eleItemsToPurchase.querySelectorAll('.code'));
    console.log("check code is present in list: ", eleItems);
    const isPresent = eleItems.some(item =>
        item.innerText.includes(checkCode.trim())
    );
    console.log(isPresent ? "this code is already present" : "This code is not present");
    return isPresent;
}

function calculateSaleTotal(){
    // get all subtotals in the items to purchase
    const eleItemsToPurchase = document.getElementById("items-to-purchase");
    const eleItems = eleItemsToPurchase.querySelectorAll('.subtotal');
    console.log("subtotals elements:", eleItems);
    var saleTotal = 0;
    eleItems.forEach( (thisEle)=>{
        console.log("value:" + thisEle.innerText + ":");
        saleTotal += Number(thisEle.innerText);
        console.log("saleTotal: ", saleTotal.toFixed(2));
    });
    console.log("*saleTotal: ", saleTotal.toFixed(2));
    document.getElementById("sale-amount").textContent = "$" + saleTotal.toFixed(2);
    // Display or hide this total based on non-zero value
    if (eleItems.length == 0){
        document.getElementById("sale-total").style.display = 'none';
    }else{
        document.getElementById("sale-total").style.display = 'flex';
    }
}

// code to act on the Purchase button
document.getElementById("finalise-purchase").addEventListener('click', (e) => {
    console.log("event on finalise-purchase", e);
    // build the array 
    //[time-gmt, email, name, comment, items:[code,qty,price]]
    // Note: price is needed as discount has variable pricing!
    const arraySale = [];
    const arrayItems = [];
    const gmtDate = new Date();
    const thisDateTime = formatGmtDateTimeNumber(gmtDate);
    arraySale.push(thisDateTime);
    arraySale.push(getSaleTypeOption());
    arraySale.push(document.getElementById("emailTextInput").value);
    arraySale.push(document.getElementById("nameTextInput").value);
    arraySale.push(document.getElementById("commentTextarea").value);
    // get all the info from the items to purchase
    const eleItemsToPurchase = document.getElementById("items-to-purchase");
    const eleItems = eleItemsToPurchase.querySelectorAll('.item-header');
    eleItems.forEach( (thisEle)=>{
        arrayItems.push([thisEle.children[0].innerText,
                         thisEle.children[1].innerText,
                         thisEle.children[2].innerText]);
    });
    arraySale.push(arrayItems);
    console.log("arraySale: ", arraySale);
    // store this locally
    //** const storeSales = new localStorageManager('sales'); **
    storeSales.addTransaction(arraySale);
    
 
    // --*** diagnostic purposes only ***--
    // clear the local storage for testing
    //storeScans.clearTransactions();

    // Clear the Purchase area.
    document.getElementById("emailTextInput").value = "";
    document.getElementById("nameTextInput").value = "";
    document.getElementById("commentTextarea").value = "";
    document.getElementById("inputCode").value = "";
    eleItemsToPurchase.innerHTML = '';
    calculateSaleTotal();
    document.getElementById("quantityNumbericInput").value = 1;
    setMessage("Purchase Completed.");
})

function formatLocalDateTime(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const milliseconds = String(d.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function formatGmtDateTimeNumber(date) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}.${milliseconds}`;
}

//---End of--- add button event listener and associated functions ---------------------

//----add button event listener for sales upload to google sheets and associated functions ---------------------
document.getElementById("upload-sales").addEventListener('click', (e) => {
    //console.log("event on upload sales", e);
    let nowGmtDateTime = [];
    if (storedLastUpdateTime.getTransactions().length != 0) {
        nowGmtDateTime = storedLastUpdateTime.getTransactions()[0][0];
    } else {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        nowGmtDateTime = formatGmtDateTimeNumber(oneYearAgo);
    }
    //console.log("nowGmtDateTime", nowGmtDateTime);
    const salesStored = storeSales.getTransactions();
    if (salesStored.length == 0){
        setMessage("No sales to upload.");
        return;
    }
    //console.log("sales stored: ", salesStored);
    //console.log("Qty sales stored: ", salesStored.length);
    const transactions = [];
    const transaction = [];
    salesStored.forEach(sale=>{
        //if(sale[0] > nowGmtDateTime){
            transaction.length = 0;
            transaction[0] = sale[0];
            transaction[1] = sale[1];
            transaction[2] = sale[2];
            transaction[3] = sale[3];
            transaction[4] = sale[4];
            sale[5].forEach(item=>{
                transaction[5] = item[0];
                transaction[6] = item[1];
                transaction[7] = item[2];
                transactions.push([...transaction]);
            });
        //}
    });
    // store in google sheets on the web.
    appendGoogleSheet("transactions", transactions);
});

//----add button event listener to download stock info from google sheets and associated functions ---------------------
document.getElementById("download-stock").addEventListener('click', (e) => {
    console.log("event to download stock", e);
    const stockStored = storeStock.getTransactions();
    console.log("stock stored: ", stockStored);
    let stockInfo = readGoogleSheet("Stock");
});

// Initialize the search manager for searching against stock data
const searchManager = new ItemSearch(storeStock.getTransactions()[0] || [[]]);

// Clear the sold items display
function cleardisplayPurchases() {
    const purchasesContainer = document.getElementById('purchases-container');
    purchasesContainer.innerHTML = ''; // Clear previous content

}

// Clear the sold items display
function cleardisplaySold() {
    const soldContainer = document.getElementById('sold-container');
    soldContainer.innerHTML = ''; // Clear previous content

}


// This retrieves and displays all Purchases from local storage
function displaySold() {
    const soldContainer = document.getElementById('sold-container');
    soldContainer.innerHTML = ''; // Clear previous content

    // Get all the sales from local storage
    const soldItems = storeSales.getTransactions() || [];
    console.log("soldItems: ", soldItems);

    if (soldItems.length === 0) {
        soldContainer.innerHTML = '<p>No sold items to display.</p>';
        return;
    }

    // Keep track of all items sold
    const items = {};

    // Display all the sold items.
    // eleContainer
    //  -> eleItems (the items container)
    //     -> eleItem (for each sold item)
    soldItems.forEach(purchase => {
        console.log("purchase: ", purchase);
        purchase[5].forEach(item => {
            const itemCode = item[0];
            const itemQuantity = item[1];
            if (items[itemCode]){
                items[itemCode] += itemQuantity;
            }else{
                items[itemCode] = itemQuantity;
            }
        });
    });
    console.log("items", items);

    // Display all the items
    const eleItems = document.createElement('div');
    eleItems.classList.add('sold-items');
    for (const [key, value] of Object.entries(items).sort()) {
        // key = code, value = quantity of this item sold
        // Firt need to get item details
        //const thisItem = searchManager.searchByCode(key);
        //console.log("thisItem: ", thisItem); 
        eleItems.appendChild(createDomItem([key, value, 0]));
    }
    soldContainer.appendChild(eleItems);
}

// This retrieves and displays all Purchases from local storage
function displayPurchases() {
    // Keep track of totals
    const totals = {
        grandTotal: 0
    };
    const purchasesContainer = document.getElementById('purchases-container');
    purchasesContainer.innerHTML = ''; // Clear previous content

    // Get all the sales from local storage
    const soldItems = storeSales.getTransactions() || [];
    console.log("soldItems: ", soldItems);

    if (soldItems.length === 0) {
        purchasesContainer.innerHTML = '<p>No sold items to display.</p>';
        return;
    }

    // Display all the sales.
    // eleContainer
    // -> elePurchase (for each purchase)
    //    -> eleCommon (the infor common to the purchase)
    //       -> eleItems (the items container)
    //          -> eleItem (for each sold item)
    soldItems.reverse().forEach(purchase => {
        console.log("purchase: ", purchase);
        const elePurchase = document.createElement('div');
        elePurchase.classList.add('sold-purchase');

        const eleCommon = createDomPurchaseCommon(purchase);
        elePurchase.appendChild(eleCommon);
        const eleItemsContent = createDomItems(purchase[5]);
        elePurchase.appendChild(eleItemsContent);
        purchasesContainer.appendChild(elePurchase);

        const thisTotal = addItemsDollarTotals(purchase[5]);
        const saleType = purchase[1];
        //console.log("saleType: ", saleType, " thisTotal: ", thisTotal.toFixed(2));
        if (totals[saleType]){
            totals[saleType] += thisTotal;
        }else{
            totals[saleType] = thisTotal;
        }
        totals.grandTotal += thisTotal;
    });
    // Now display the totals`
    const eleTotals = createDomDisplayTotals(totals);
    eleTotals.classList.add('sold-totals');
    purchasesContainer.prepend(eleTotals);
}

function createDomDisplayTotals(totals) {
    // Display totals
    const eleTotals = document.createElement('div');
    eleTotals.classList.add('sold-totals');
    for (const [key, value] of Object.entries(totals)) {
        const eleTotal = document.createElement('div');
        eleTotal.classList.add('sold-total');
        eleTotal.innerText = `${key}: ${value.toFixed(2)}`;
        eleTotals.appendChild(eleTotal);
    }
    return eleTotals;
}

function formatDateTimeGMT(dateTimeStr) {
    console.log("dateTimeStr1", dateTimeStr);
    // Extract components from the GMT string
    const year = parseInt(dateTimeStr.substring(0, 4));
    const month = parseInt(dateTimeStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateTimeStr.substring(6, 8));
    const hours = parseInt(dateTimeStr.substring(8, 10));
    const minutes = parseInt(dateTimeStr.substring(10, 12));

    // Create Date object as UTC
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes));
    
    // Convert to local time
    const localDate = new Date(utcDate);

    // Format to "Tues DD/MM/YYYY HH:MM" in local time
    const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];
    const dayName = days[localDate.getDay()];
    
    const localDay = String(localDate.getDate()).padStart(2, '0');
    const localMonth = String(localDate.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const localYear = localDate.getFullYear();
    const localHours = String(localDate.getHours()).padStart(2, '0');
    const localMinutes = String(localDate.getMinutes()).padStart(2, '0');
    
    return `${dayName} ${localDay}/${localMonth}/${localYear} ${localHours}:${localMinutes}`;
}

function createDomPurchaseCommon(purchase) {
    const eleCommon = document.createElement('div');
    eleCommon.classList.add('sold-common');
    // Add common details - cash, email, name, comment
    for(let i = 0; i < 5; i++){
        const eleCommonDetail = document.createElement('div');
        //eleCommonDetail.classList.add('soldCommonDetail');
        if (i == 0){
            const storedDate = purchase[i];
            console.log("storedDate: ", storedDate);
            const extractedDatePart = storedDate.slice(0, 12); // "YYYYMMDDHHMM"
            const desiredDateTime = formatDateTimeGMT(extractedDatePart);
            console.log("desiredDateTime: ", desiredDateTime);
            eleCommonDetail.innerText = desiredDateTime;
        }else{
            eleCommonDetail.innerText = purchase[i];
        }
        eleCommon.appendChild(eleCommonDetail);
    }
    return eleCommon;
}

// Create DOM elements to diplay items over two lines.
//items: 
// //[[code, quantity, price], [code, quantity, price], ...]
function createDomItems(items) {
    console.log("Items: ", items);
    // add in a single line the item details - code, qty, price
    const eleItems = document.createElement('div');
    //eleItem.classList.add('item-header');
    items.forEach(item => {
        const eleItem = createDomItem(item);
        eleItems.appendChild(eleItem);
    });
    return eleItems;
}

function createDomItemDetail(value){
    const eleItemDetail = document.createElement('span');
    //eleItemDetail.classList.add('soldItemDetail');
    eleItemDetail.innerText = value;
    return eleItemDetail;
}

// item: [code, quantity, price]
function createDomItem(item){
        const eleItem = document.createElement('div');
        eleItem.classList.add('product-item');
        const eleItemLine1 = document.createElement('div');
        eleItemLine1.classList.add('item-header');
        // Search stock for non-changeable info about this item
        // description & price
        const itemCode = item[0];
        let description = "";
        let itemPrice = 0;
        if(itemCode === "Discount"){
            description = "Discount Applied";
            itemPrice = 1;
        }else{
            const searchResult = searchManager.searchByCode(itemCode);
            if (searchResult){
                description = searchResult.description;
                itemPrice = searchResult.price;
                
            }else{
                description = "This item is not in stock list.";
            }
        }
        eleItemLine1.appendChild(createDomItemDetail(item[0]));
        eleItemLine1.appendChild(createDomItemDetail(item[1]));
        eleItemLine1.appendChild(createDomItemDetail(itemPrice));
        // Need to add total for this item (qty * price)
        const itemQuantity = Number(item[1]);
        //const itemPrice = Number(item[2]);
        const itemTotal = itemQuantity * itemPrice;
        const eleItemDetail2 = document.createElement('span');
        //eleItemDetail2.classList.add('soldItemDetail');
        eleItemDetail2.innerText = itemTotal.toFixed(2);
        eleItemLine1.appendChild(eleItemDetail2);
        eleItem.appendChild(eleItemLine1);
 
        const eleItemLine2 = document.createElement('div');
        eleItemLine2.innerText = description;
        eleItem.appendChild(eleItemLine2);
        return eleItem;
    }

// Total up sales totals.
//items: 
// //[[code, quantity, price], [code, quantity, price], ...]
function addItemsDollarTotals(items) {
    console.log("Items: ", items);
    let itemsTotal = 0;
    items.forEach(item => {
        // Need to add total for this item (qty * price)
        const itemQuantity = Number(item[1]);
        const itemPrice = Number(item[2]);
        const itemTotal = itemQuantity * itemPrice;
        itemsTotal += itemTotal;
    });
    return itemsTotal;
}

// -------------------------  Settings  ----------------------------------
// We want to store some user settings in local storage



export class Settings {
    constructor() {
        this.storeSettings = new localStorageManager("settings");
        //this.storeSettings.clearTransactions();    //DIAGNOSTIC ONLY
        this.currentSettings = this.storeSettings.getObject() || {};
        if(!("spreadsheetid" in this.currentSettings)){   // need default value if not already set.
            this.currentSettings.spreadsheetid = '1CbLT8fYvRl_avdpGiSXzTKyaEuSgV55f4ZXCTJv-aME';
            this.storeSettings.setObject(this.currentSettings);
        }
        console.log("currentSettings", this.currentSettings);
        if(!("deviceid" in this.currentSettings)){   // need default value if not already set.
            this.currentSettings.deviceid = 'Not_Set';
            this.storeSettings.setObject(this.currentSettings);
        }
    }

    setSpreadSheetUrl(spreadSheetUrl){
        this.currentSettings.spreadsheetUrl = spreadSheetUrl;
        this.currentSettings.spreadsheetId = extractSpreadsheetId(spreadSheetUrl);
        this.storeSettings.setObject(this.currentSettings);
    }
    getSpreadSheetUrl(){
        return this.currentSettings.spreadsheetUrl;
    }
    getSpreadSheetId(){
        return this.currentSettings.spreadsheetid;
    }
    setDeviceId(deviceId){
        this.currentSettings.deviceid = deviceId;
        this.storeSettings.setObject(this.currentSettings);
    }
    getDeviceId(){
        return this.currentSettings.deviceid;
    }
}

const currentSettings = new Settings();
document.getElementById("settingsSpreadSheetUrlInput").value = currentSettings.getSpreadSheetUrl();
document.getElementById("settingsDeviceIdInput").value = currentSettings.getDeviceId();


document.getElementById("settingsAddSpreadSheetUrl").addEventListener('click', (e) => {
    const eleInputSpreadSheetUrl = document.getElementById("settingsSpreadSheetUrlInput");
    console.log("event to update spread sheet id", e);
    console.log("spread sheet id", eleInputSpreadSheetUrl.value);

    const result = confirm("Are you sure you want to proceed with updating the Spreadsheet Url?");
    if (result) {
        console.log("User clicked OK/Proceed");
        currentSettings.setSpreadSheetUrl(eleInputSpreadSheetUrl.value);
    }
});

document.getElementById("settingsAddDeviceId").addEventListener('click', (e) => {
//document.getElementById("download-stock").addEventListener('click', (e) => {
    const eleInputDeviceId = document.getElementById("settingsDeviceIdInput");
    console.log("event to update device id", e);
    console.log("device id", eleInputDeviceId.value);

    const result = confirm("Are you sure you want to proceed with updating the Device Id?");
    if (result) {
        console.log("User clicked OK/Proceed");
        currentSettings.setDeviceId(eleInputDeviceId.value);
    }
});

/* Test with different URL formats
const testUrls = [
    'https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl012mno345pqr678stu901/edit#gid=0',
    'https://docs.google.com/spreadsheets/d/1CbLT8fYvRl_avdpGiSXzTKyaEuSgV55f4ZXCTJv-aME/edit',
    'https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl012mno345pqr678stu901',
    'https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl012mno345pqr678stu901/edit?usp=sharing',
    'https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl012mno345pqr678stu901/#gid=0',
    'https://drive.google.com/file/d/1abc123def456ghi789jkl012mno345pqr678stu901/view',
    '1CbLT8fYvRl_avdpGiSXzTKyaEuSgV55f4ZXCTJv-aME' // Raw ID
];
*/

function extractSpreadsheetId(url) {
    if (!url) return null;
    
    // Pattern 2 FIRST: Check for key parameter (before cleaning)
    let match = url.match(/[?&]key=([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    // NOW remove parameters and fragments for path-based extraction
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Pattern 1: Standard share URL
    match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    // Pattern 3: Direct ID
    if (/^[a-zA-Z0-9-_]{44}$/.test(cleanUrl)) {
        return cleanUrl;
    }
    
    // Pattern 4: New Google Sheets URL format
    match = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    // Pattern 5: Google Drive URL
    match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    return null;
}



//-------------------- end of settings ----------------------------------

// ------------Google Sheets writing and reading functions -----------------
function getSpreadSheetId(){
    return currentSettings.getSpreadSheetId();
}
function getDeviceId(){
    return currentSettings.getDeviceId();
}

// Write data using JSONP
async function appendGoogleSheet(sheetName, transactions) {
    const spreadSheetId = getSpreadSheetId();
    const deviceId = getDeviceId();
    // prepend device id on all the transactions
    transactions.forEach(transaction =>{
        transaction.unshift(deviceId);
    })
    console.log("=======transactions=======: ", transactions);
    try {
        //console.log("Initiating appendGoogleSheet append request with transactions:", transactions);
        const gmtDate = Date();
        //console.log("transaction length", transactions.length);
        if (transactions.length > 0){
            const result = await client.appendData(spreadSheetId, sheetName, transactions);
            //console.log('appendGoogleSheet Success:', result);
            storedLastUpdateTime.clearTransactions();
            //console.log("**last update time to store: ", formatGmtDateTimeNumber(gmtDate));
            storedLastUpdateTime.addTransaction([formatGmtDateTimeNumber(gmtDate)]);
            const lastUpdated = storedLastUpdateTime.getTransactions();
            //console.log("===Last stored time: ", lastUpdated);
            clearMessage();
            setMessage("Sales data uploaded successfully.");  
        }
    }
    catch (error) {
        console.error('appendGoogleSheet Request Failed:', error);
        throw error;
    };
}
//Read data using JSONP
async function readGoogleSheet(sheetName) {
    //const spreadSheetId = '1CbLT8fYvRl_avdpGiSXzTKyaEuSgV55f4ZXCTJv-aME';
    const spreadSheetId = getSpreadSheetId();
    //console.log("Initiating readGoogleSheet read request...");
    try {
        //console.log('Starting readGoogleSheet read request...');
        const result = await client.readData(spreadSheetId, sheetName);
        //console.log ('readGoogleSheet Result: ', result);
        if (result.success) {
            //console.log('readGoogleSheet Data retrieved successfully:', result.data);
            let stockInfo = result.data;
            //console.log("stockInfo: ", stockInfo);
            //console.log("stockInfo[0]: ", stockInfo[0]);
            //console.log("stockInfo[0][0]: ", stockInfo[0][0]);
            stockInfo.shift();   // don't want the header
            // store the stock info locally.
            storeStock.clearTransactions();
            storeStock.addTransaction(stockInfo);
            //const stockStored = storeStock.getTransactions();
            //console.log("stock stored: ", stockStored);
            
            // Need to refresh the local stored instance of this data.
            //searchManager.refreshData(storeStock.getTransactions()[0]);
            searchManager.refreshData(stockInfo);
            clearMessage();
            setMessage("Stock data downloaded successfully.");  
            return result.data;
        } else {
            console.error('readGoogleSheet Failed to retrieve data:', result.message);
            return [];
        }
    } catch (error){
        console.error('readGoogleSheet Read Request Failed:', error);
        return [];
    }
}
// -----end of ------Google Sheets writing and reading functions -----------------

//---End of--- add button event listener for sales upload and associated functions ---------------------

// Add event listener on the Ausil code entry input field to clear search results
// when user alters the code. At this point, the displayed details become invalid.
document.getElementById("inputCode").addEventListener('input', (e) => {
    console.log("event on inputCode change - clear ausil item details", e);
    clearDetailsWrapper();
});

//-------add button event listener for search associated functions ---------------------

// ==================== SEARCH FUNCTIONS ====================
let globalResultsArray = [];

document.getElementById("detailsSearch").addEventListener('click', doSearchTextFromButton);
document.getElementById("search-input").addEventListener('input', doSearchText);
//document.getElementById("search-input").addEventListener('keydown', doSearchText);

// Hide the search results area on initialisation
document.getElementById("search-container").style.display = 'none';

function doSearchTextFromButton(){
    clearMessage();
    clearDetailsWrapper();
    const searchText = document.getElementById("inputCode").value;
    document.getElementById("search-input").value = searchText;
    document.getElementById("search-container").style.display = 'block';
    doSearchText().then(() => {
        console.log("doSearchTextFromButton completed.");
    }).catch((error) => {
        console.error("Error in doSearchTextFromButton:", error);
    });
}

async function doSearchText(){
    const searchText = document.getElementById("search-input").value;
    console.log("searchText: ", searchText);
    if (searchText.trim() == "") return;
    const foundItem = searchManager.searchByCode(searchText);
    console.log("foundItem: ", foundItem);
    if (foundItem){
        // update ausil Code entry with this foundItem details
        document.getElementById("inputCode").value = foundItem.code;
        document.getElementById("search-display-area").innerHTML = "";
        document.getElementById("search-container").style.display = 'none';
        document.getElementById("details-wrapper").style.display = 'block';
        document.getElementById("details-cost").innerText = foundItem.price.toFixed(2);
        document.getElementById("details-description").innerText = foundItem.description;
    }else{    // not a single item matching Ausid - need a full search
        //fullTextSearch(searchText, globalResultsArray = []);
        //const searchResult = searchManager.fullTextSearch(searchText);
        console.log("about to call genericSearch.");
        const searchResult = await searchManager.genericSearch(searchText);
        console.log("return from call to genericSearch.", searchResult);
        updateResultsDisplay(searchResult);
    }
}

// Export the function for module use
// and also attach to window for legacy scripts
window.updateResultsDisplay = updateResultsDisplay;
export function updateResultsDisplay(searchResults) {
    console.log("updateResultsDisplay: ", searchResults);
    document.getElementById("search-container").style.display = 'block';
    const searchDisplayArea = document.getElementById("search-display-area");
    const searchInput = document.getElementById("search-input");
    searchDisplayArea.innerHTML = '';
    
    if (searchResults.length === 0) {
      if (searchInput.value.trim()) {
        searchDisplayArea.innerHTML = '<div class="no-results">No items found</div>';
      }
      return;
    }

    searchResults.forEach((item, index) => {
        const searchDisplayArea = document.getElementById("search-display-area"); 
        const eleDisplayItem = document.createElement('div');     // list of found items
        eleDisplayItem.classList.add("search-result-item");
        //create each column for the three parameters for this item.
        const eleItemCode = document.createElement('span');
        eleItemCode.classList.add("code");
        eleItemCode.textContent=item.code;
        eleDisplayItem.appendChild(eleItemCode);
        const eleItemDescription = document.createElement('span');
        eleItemDescription.classList.add("description");
        eleItemDescription.textContent=item.description;
        eleDisplayItem.appendChild(eleItemDescription);
        const eleItemPrice = document.createElement('span');
        eleItemPrice.classList.add("price");
        eleItemPrice.textContent=item.price;
        eleDisplayItem.appendChild(eleItemPrice);
        eleDisplayItem.addEventListener('click', () => {
            selectItem(item);
        });
        searchDisplayArea.appendChild(eleDisplayItem);
    });
    
}

function selectItem(item) {
    // Handle item selection
    console.log("You have selected: ", item);
    //this.searchInput.value = item.code; // Or whatever you want to do
    document.getElementById("search-display-area").innerHTML = '';
    document.getElementById("inputCode").value = item.code;
    document.getElementById("details-wrapper").style.display = 'block';
    document.getElementById("details-cost").textContent = item.price.toFixed(2);
    document.getElementById("details-description").textContent = item.description;
    document.getElementById("search-container").style.display = 'none';
    document.getElementById("details-display").style.display = 'block';
}
  
// ==================== UI INTEGRATION ====================
class SearchComponent {
  constructor() {
    this.searchResults = []; // Persistent array for reuse
    this.lastSearchId = 0;
    this.initializeUI();
  }
  
  initializeUI() {
    // Create or get DOM elements
    this.searchInput = document.getElementById('search-input') || this.createSearchInput();
    this.resultsContainer = document.getElementById('results-container') || this.createResultsContainer();
    
    // Event listeners
    this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
    this.searchInput.addEventListener('keydown', this.handleKeyNavigation.bind(this));
  }
  
  handleSearchInput(event) {
    const searchTerm = event.target.value;
    const currentSearchId = ++this.lastSearchId;
    
    // Debounce the search
    setTimeout(() => {
      if (currentSearchId === this.lastSearchId) {
        this.performSearch(searchTerm);
      }
    }, 150);
  }
  
  performSearch(searchTerm) {
    // Reuse the same array for results
    fullTextSearch(searchTerm, this.searchResults);
    this.updateResultsUI();
  }
  
  
  handleKeyNavigation(event) {
    // Optional: Add keyboard navigation support
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      // Implement keyboard navigation logic here
    } else if (event.key === 'Enter') {
      // Select first result on enter
      if (this.searchResults.length > 0) {
        this.selectItem(this.searchResults[0]);
      }
    }
  }
  
  selectItem(item) {
    // Handle item selection
    console.log("You have selected: ", item);
    //this.searchInput.value = item.code; // Or whatever you want to do
    document.getElementById("search-display-area").innerHTML = '';   
  }
  
  onItemSelected(item) {
    // Override this method or add event listeners
    console.log('Item selected:', item);
  }
  
  // Barcode scanner integration
  scanBarcode(barcode) {
    const item = searchByCode(barcode);
    if (item) {
      this.searchInput.value = item.code;
      this.selectItem(item);
    } else {
      console.log('Barcode not found:', barcode);
    }
  }
}

//---End of--- add button event listener for search associated functions ---------------------



// Handle PWA lifecycle events
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isScanning && scanningActive) {
        pauseScanning(); // Pause when app is backgrounded
    }
});

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (isScanning) {
        stopScanning();
    }
});

// Export the function for module use
// and also attach to window for legacy scripts
window.optionsDisplay = optionsDisplay;
export function optionsDisplay() {
    //getSelectedOption()
    const selectedOption = getSelectedOption();
    //const selectedOption = msSelect.value;  
    console.log("Selected option: ", selectedOption);
    // show the appropriate areas

    //  <div id="control-display">  
    //  <div id="code-entry-display">
    //  <div id="entry-display">
    //  <div id="scan-display">

    const areaControlDisplay = document.getElementById('control-display');
    console.log(" areaControlDisplay: ", areaControlDisplay); 
    const areaCodeEntryDisplay = document.getElementById('code-entry-container');
    console.log(" areaCodeEntryDisplay: ", areaCodeEntryDisplay);
    const areaDetailsDisplay = document.getElementById('details-display');
    console.log("areaDetailsDisplay: ", areaDetailsDisplay);
    const areaScanDisplay = document.getElementById('scan-display');
    console.log(" areaScanDisplay: ", areaScanDisplay);
    const areaPurchasesDisplay = document.getElementById('purchases-display');
    console.log(" areaPurchasesDisplay: ", areaPurchasesDisplay);
    const areaSoldDisplay = document.getElementById('sold-display');
    console.log(" areaSoldDisplay: ", areaSoldDisplay);
    const areaSettingsDisplay = document.getElementById('settings-display');
    console.log(" areaSettingsDisplay: ", areaSettingsDisplay);
    if (selectedOption === "showScan") {
        console.log("Show control and scan areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'none';
        areaDetailsDisplay.style.display = 'none';
        areaScanDisplay.style.display = 'block';
        areaPurchasesDisplay.style.display = 'none';
        areaSoldDisplay.style.display = 'none';
        areaSettingsDisplay.style.display = 'none';
        cleardisplaySold();
        cleardisplayPurchases();
    } else if (selectedOption === "showSales") {
        console.log("Show ontrol, code_entry and data entry areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'block';
        areaDetailsDisplay.style.display = 'block';
        areaScanDisplay.style.display = 'none';
        areaPurchasesDisplay.style.display = 'none';
        areaSoldDisplay.style.display = 'none';
        areaSettingsDisplay.style.display = 'none';
        cleardisplaySold();
        cleardisplayPurchases();
    } else if (selectedOption === "showPurchases") {
        console.log("Show control, sold display areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'none';
        areaDetailsDisplay.style.display = 'none';
        areaScanDisplay.style.display = 'none';
        areaPurchasesDisplay.style.display = 'block';
        areaSoldDisplay.style.display = 'none';
        areaSettingsDisplay.style.display = 'none';
        cleardisplaySold();
        displayPurchases();
    } else if (selectedOption === "showSold") {
        console.log("Show control, sold display areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'none';
        areaDetailsDisplay.style.display = 'none';
        areaScanDisplay.style.display = 'none';
        areaPurchasesDisplay.style.display = 'none';
        areaSoldDisplay.style.display = 'block';
        areaSettingsDisplay.style.display = 'none';
        cleardisplayPurchases();
        displaySold();
    } else if (selectedOption === "showSettings") {
        console.log("Show control, sold display areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'none';
        areaDetailsDisplay.style.display = 'none';
        areaScanDisplay.style.display = 'none';
        areaPurchasesDisplay.style.display = 'none';
        areaSoldDisplay.style.display = 'none';
        areaSettingsDisplay.style.display = 'block';
        cleardisplaySold();
        cleardisplayPurchases();
    } else {
        console.log("Show all areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'block';
        areaDetailsDisplay.style.display = 'block';
        areaScanDisplay.style.display = 'block';
        areaSoldDisplay.style.display = 'block';
        cleardisplayPurchases();
    }
}

// Initialize UI
updateUI();





