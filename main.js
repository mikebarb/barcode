
// Class for managing input fields with clear and fullscreen functionality
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

// Initialize the text input manager
const inputManager = new InputManager();

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzrKQSOwGsXcboLdsgJL7ex8SQ7NWJbf254UEXHr1tXAwKtvyG-AJT2vIcnTLeOI_sJ/exec';
const client = new GoogleSheetsJSONPClient(SCRIPT_URL);
const storeScans = new localStorageManager('scans');
const storedLastUpdateTime = new localStorageManager('lastUpdateTime');

// Export the function for module use
// and also attach to window for legacy scripts
window.processScanResults = processScanResults;
export function processScanResults(codeFormat, code) {
    // put into the inputCode field in the main data-entry area
    const inputField = document.getElementById('inputCode');
    inputField.value = code;
    // check what is selected in the dropdown 
    //getSelectedValue()

    const selectedOption = getSelectedOption();
    //const selectedOption = msSelect.value;  
    console.log("Selected option: ", selectedOption);  
    
    //miscProcessScanResults(codeFormat, code)
    return;
}
//****************************** stop here *****************************/

function miscProcessScanResults(codeFormat, code) {
    // store details locally
    const gmtDate = new Date();
    console.log("GMT Date: ", gmtDate.toISOString());
    console.log("Local Date: ", formatLocalDateTime(gmtDate),
                " as number: ", formatGmtDateTimeNumber(gmtDate));
    //const transactionRow = [codeFormat, code, formatGmtDateTimeNumber(gmtDate), formatLocalDateTime(gmtDate)];
    const transactionRow = [codeFormat, code, formatGmtDateTimeNumber(gmtDate), formatLocalDateTime(gmtDate)];
    console.log("Storing scanned data: ", transactionRow);

    // clear the local storage for testing
    //storeScans.clearTransactions();

    storeScans.addTransaction(transactionRow);
    console.log("Transaction stored.", storeScans.getTransactions());

    const lastUpdated = storedLastUpdateTime.getTransactions();
    const transactionsStored = storeScans.getTransactions();
    console.log("Last stored time: ", lastUpdated);
    console.log("Transactions already stored: ", transactionsStored);
    console.log("Qty Transactions stored: ", transactionsStored.length);

    // store in google sheets on the web.
    const sheetData = appendGoogleSheet([transactionRow]);
    console.log("Rows read from Google Sheets: ",  sheetData.length);    
    //appendGoogleSheet(storeScans.getTransactions());
    //sheetsClient.appendGoogleSheet(getTransactions());
}

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

// ------------Google Sheets writing and reading functions -----------------
// Write data using JSONP
async function appendGoogleSheet(transactions) {
    try {
        console.log("Initiating appendGoogleSheet append request with transactions:", transactions);
        result = await client.appendData(transactions);
        console.log('appendGoogleSheet Success:', result);
        storedLastUpdateTime.clearTransactions();
        console.log("**last update time to store: ", formatGmtDateTimeNumber(gmtDate));
        storedLastUpdateTime.addTransaction([formatGmtDateTimeNumber(gmtDate)]);
        lastUpdated = storedLastUpdateTime.getTransactions();
        console.log("===Last stored time: ", lastUpdated);
        
        // Read the updated data after appending is completed.
        const readSheetData = readGoogleSheet();
        console.log("Read sheet data using readGoogleSheet: ", readSheetData);
        return readSheetData;
    }
    catch (error) {
        console.error('appendGoogleSheet Request Failed:', error);
        throw error;
    };
}
//Read data using JSONP
async function readGoogleSheet() {
    console.log("Initiating readGoogleSheet read request...");
    try {
        console.log('Starting readGoogleSheet read request...');
        const result = await client.readData();
        console.log ('readGoogleSheet Result: ', result);
        if (result.success) {
            console.log('readGoogleSheet Data retrieved successfully:', result.data);
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
scanButton.addEventListener('click', triggerScan);

//--------drop down menu event listener and assoicated functions ----------------

// Toggle dropdown
dropdownSelected.addEventListener('click', function() {
    event.stopPropagation(); // Prevent event from bubbling up
    const dropdownOptions = document.getElementById('dropdownOptions');
    dropdownOptions.classList.toggle('show');
    //dropdownOptions.classList.add('show');
    console.log("dropdownOptions clicked: ", dropdownOptions);
});

// Select option
const options = document.querySelectorAll('.dropdownOption');
console.log("options: ", options);
options.forEach(option => {
    option.addEventListener('click', function() {
        event.stopPropagation(); // Prevent event from bubbling up
        const dropdownSelected = document.getElementById('dropdownSelected');
        console.log("dropdownSelected: ", dropdownSelected);
        dropdownSelected.textContent = this.textContent;
        dropdownSelected.setAttribute('data-value', this.getAttribute('data-value'));
        const dropdownOptions = document.getElementById('dropdownOptions');
        dropdownOptions.classList.remove('show');
        console.log('Selected:', this.getAttribute('data-value'));
        optionsDisplay();
    });
});

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.customMsDropdown')) {
        const dropdownOptions = document.getElementById('dropdownOptions');
        console.log("dropdownOptions - clicked outside: ", dropdownOptions);  
        dropdownOptions.classList.remove('show');
    }
});

// Get the selected value when called from from anywhere
window.getSelectedOption = getSelectedOption;
export function getSelectedOption() {
    const selectedElement = document.getElementById('dropdownSelected');
    console.log("SelectedElement: ", selectedElement);
    const selectedOption = selectedElement.getAttribute('data-value');
    console.log("getSelectedValue: ", selectedOption);
    return selectedElement.getAttribute('data-value') || '';
}

//---End of-----drop down menu event listener and assoicated functions ----------------

//-------- numeric input event listener and assoicated functions ----------------
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
const addItemButton = document.getElementById('add-item-button');
addItemButton.addEventListener('click', function() {
    console.log('Add Item Button clicked.');
    addItem();
    hideDiscountArea();
});

//--------- adds a ausil item to the list
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
    const price = Number("1.00");
    if((code.length == 0) || (quantity == 0) ){
        console.log("cannot add empty code or 0 quantity");
        return;
    }
    const description = "This describes the item."
    addLineItem(code, quantity, price, description);
    // Now calculate th sales total
    calculateSaleTotal();
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
    const eleItemCode = document.createElement('span');
    eleItemCode.classList.add("code");
    eleItemCode.textContent=code;
    eleItemLine1.appendChild(eleItemCode);
    const eleItemQty = document.createElement('span');
    eleItemQty.classList.add("quantity");
    eleItemQty.textContent= quantity.toString();
    eleItemLine1.appendChild(eleItemQty);
    const eleItemPrice = document.createElement('span');
    eleItemPrice.classList.add("price");
    eleItemPrice.textContent = price.toFixed(2);
    eleItemLine1.appendChild(eleItemPrice);
    const eleItemSubtotal = document.createElement('span');
    eleItemSubtotal.classList.add("subtotal");
    eleItemSubtotal.textContent = (price * quantity).toFixed(2);
    eleItemLine1.appendChild(eleItemSubtotal);
    const eleDeleteBtn = document.createElement('button');
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

function setMessage(message){
    console.log("set message: ", message);
    const eleMessage = document.getElementById("message");
    console.log("eleMessage: ", eleMessage);
    document.getElementById("message").style.display = 'block';
    eleMessage.textContent = message;
}

function clearMessage(){
    console.log("clear message: ");
    const eleMessage = document.getElementById("message");
    document.getElementById("message").style.display = 'none';
    eleMessage.textContent = "";
}

// Need code to act on this delete button being clicked.
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
    if (eleItems.count == 0){
        document.getElementById("sale-total").style.display = 'none';
    }else{
        document.getElementById("sale-total").style.display = 'flex';
    }
}



//---End of--- add button event listener and associated functions ---------------------


/*
//-------- text input event listener and assoicated functions ----------------
const textInputs = document.querySelectorAll('.text-input');
const clearBtns = document.querySelectorAll('.clear-btn');
console.log("clearBtn: ", clearBtns);

// Clear input
clearBtns.forEach(clearBtn => {
    const a = clearBtn.closest('.input-wrapper');
    if(a) {
        clearBtn.addEventListener('click', function(e) {
            console.log("Clear button clicked - event: ", e );
            const textInput = e.target.closest('.input-wrapper').querySelector('.text-input');
            textInput.value = '';
            textInput.focus();
            textInput.dispatchEvent(new Event('input'));
        });
    }
});

// Input events
textInputs.forEach(textInput => {
    textInput.addEventListener('input', function(e) {
        console.log('Text input:', e.target.value);
        const clearBtn = e.target.closest('.input-wrapper').querySelector('.clear-btn');
        console.log("Associated clear button: ", clearBtn);
        clearBtn.style.visibility = e.target.value ? 'visible' : 'hidden';
    });
});

// Show/hide clear button based on content
//textInput.addEventListener('input', function() {
//    clearBtn.style.visibility = this.value ? 'visible' : 'hidden';
//});

// Initialize
console.log("clearBtns", clearBtns);
clearBtns.forEach(clearBtn => {
    console.log("Initializing clear button visibility", clearBtn);
    const a = clearBtn.closest('.input-wrapper');
    if(a) {
        console.log("Associated input-wrapper: ", a);
        //const textInput = a.querySelector('.text-input');
        clearBtn.style.visibility = a.querySelector('.text-input').value ? 'visible' : 'hidden';
    }
});
//---End of----- text input event listener and assoicated functions ----------------

//----- multi-line text input with clear and expand buttons ------------
const textarea = document.getElementById('customTextarea');
const textareaWrapper = textarea.closest('.textarea-wrapper');
const textareaClearBtn = textareaWrapper.querySelector('.clear-btn');
const textareaCopyBtn = textareaWrapper.querySelector('.copy-btn');
const expandBtn = textareaWrapper.querySelector('.expand-btn');
const exitFullscreenBtn = textareaWrapper.querySelector('.exit-fullscreen-btn');

// Create overlay for fullscreen mode
const overlay = document.createElement('div');
overlay.className = 'fullscreen-overlay';
document.body.appendChild(overlay);

// Enter fullscreen
function enterFullscreen() {
    console.log("Entering fullscreen mode");
    textarea.classList.add('fullscreen');
    textareaWrapper.classList.add('fullscreen');
    overlay.classList.add('active');
    
    // Focus textarea and move cursor to end
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

// Exit fullscreen
function exitFullscreen() {
    console.log("Exiting fullscreen mode");
    textarea.classList.remove('fullscreen');
    textareaWrapper.classList.remove('fullscreen');
    overlay.classList.remove('active');
    
    // Reset textarea size
    textarea.style.height = 'auto';
}

// Expand/collapse fullscreen
expandBtn.addEventListener('click', function(){
    if (document.getElementById('customTextarea').classList.contains('fullscreen')) {
        exitFullscreen();
    }else{
        enterFullscreen();
    }
});

// Exit fullscreen
exitFullscreenBtn.addEventListener('click', exitFullscreen);

// Also exit on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && textarea.classList.contains('fullscreen')) {
        exitFullscreen();
    }
});

// Exit when clicking overlay
overlay.addEventListener('click', function(){
    console.log("Overlay clicked");
    exitFullscreen();
});

// Clear textarea
textareaClearBtn.addEventListener('click', function() {
    textarea.value = '';
    textarea.focus();
});

textarea.addEventListener('input', function() {
    console.log('Textarea input:', this.value);
});

// Auto-resize (optional)
textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 300) + 'px';
});

// Show/hide clear button
textarea.addEventListener('input', function() {
    textareaClearBtn.style.visibility = this.value ? 'visible' : 'hidden';
});

// Initialize
textareaClearBtn.style.visibility = textarea.value ? 'visible' : 'hidden';

// ---End of----- multi-line text input with clear and expand buttons ------------
*/

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

    if (selectedOption === "showScan") {
        console.log("Show control and scan areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'none';
        areaDetailsDisplay.style.display = 'none';
        areaScanDisplay.style.display = 'block';
    } else if (selectedOption === "showSales") {
        console.log("Show ontrol, code_entry and data entry areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'block';
        areaDetailsDisplay.style.display = 'block';
        areaScanDisplay.style.display = 'none';
    } else {
        console.log("Show all areas");
        areaControlDisplay.style.display = 'block';
        areaCodeEntryDisplay.style.display = 'block';
        areaDetailsDisplay.style.display = 'block';
        areaScanDisplay.style.display = 'block';
    }
}

// Initialize UI
updateUI();





