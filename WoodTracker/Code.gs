/**
 * ==========================================
 * Rameez Scripts - Wood Trading POS System
 * ==========================================
 * Backend Google Apps Script (Code.gs)
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Wood Trading POS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  let result;
  try {
    const data = JSON.parse(e.postData.contents);
    switch (data.action) {
      case 'loginUser':      result = loginUser(data.email, data.password); break;
      case 'forgotPassword': result = forgotPassword(data.email); break;
      case 'resetPassword':  result = resetPassword(data.email, data.otp, data.newPassword); break;
      case 'getSWRData':     result = getSWRData(data.role); break;
      case 'processSale':    result = processSale(data.payload, data.userId, data.role); break;
      default: result = { success: false, message: 'Unknown action: ' + data.action };
    }
  } catch (err) {
    result = { success: false, message: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * UTILITY: Sheet Access
 */
function getSheetInfo(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName);
}

function getRowsAsObjects(sheetName) {
  const sheet = getSheetInfo(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rows.push(rowObj);
  }
  return rows;
}

/**
 * SETUP: Demo Data (April 2026)
 */
function setupDemoData() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsToCreate = [
      'Users', 'Categories', 'Sub_Categories', 'Suppliers', 'Customers',
      'Wood_Stocks', 'Purchases', 'Sales', 'Sale_Items', 'Payments',
      'Expenses', 'Import_Logs', 'Settings', 'Activity_Logs'
    ];

    sheetsToCreate.forEach(name => {
      let s = ss.getSheetByName(name);
      if (!s) s = ss.insertSheet(name);
      else s.clear();
    });

    // Users
    let sheet = ss.getSheetByName('Users');
    sheet.appendRow(['id', 'name', 'email', 'phone', 'password', 'role', 'avatar_drive_id', 'is_active', 'created_at', 'updated_at', 'otp', 'otp_expires']);
    sheet.appendRow(['u1', 'Admin User', 'admin@example.com', '1234567890', 'admin123', 'admin', '', true, '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z', '', '']);
    sheet.appendRow(['u2', 'Manager', 'manager@example.com', '1234567891', 'manager123', 'manager', '', true, '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z', '', '']);
    sheet.appendRow(['u3', 'Cashier', 'cashier@example.com', '1234567892', 'cashier123', 'cashier', '', true, '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z', '', '']);
    sheet.appendRow(['u4', 'Warehouse', 'warehouse@example.com', '1234567893', 'warehouse123', 'warehouse_staff', '', true, '2026-04-01T10:00:00Z', '2026-04-01T10:00:00Z', '', '']);

    // Settings
    sheet = ss.getSheetByName('Settings');
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['business_name', 'Premium Wood Co.']);
    sheet.appendRow(['address', '123 Timber Lane, Forest City']);
    sheet.appendRow(['phone', '+1 (555) 019-8372']);

    // Categories & Sub_Categories (Cars)
    sheet = ss.getSheetByName('Categories');
    sheet.appendRow(['id', 'name']);
    sheet.appendRow(['c1', 'Oak Wood']);
    sheet.appendRow(['c2', 'Pine Wood']);

    sheet = ss.getSheetByName('Sub_Categories');
    sheet.appendRow(['id', 'category_id', 'name']);
    sheet.appendRow(['sc1', 'c1', 'Car-A01']);
    sheet.appendRow(['sc2', 'c2', 'Car-B02']);

    // Suppliers & Customers
    sheet = ss.getSheetByName('Suppliers');
    sheet.appendRow(['id', 'name', 'phone']);
    sheet.appendRow(['sup1', 'Global Timbers', '555-1111']);

    sheet = ss.getSheetByName('Customers');
    sheet.appendRow(['id', 'name', 'phone', 'balance']);
    sheet.appendRow(['cust1', 'Local Builders', '555-2222', 0]);
    sheet.appendRow(['cust2', 'City Construction', '555-3333', 500]);

    // Wood Stocks
    sheet = ss.getSheetByName('Wood_Stocks');
    sheet.appendRow(['serial', 'sub_cat', 'purchase_id', 'width', 'length', 'cft', 'buy_rate', 'sell_rate', 'qty', 'status', 'image_drive_id']);
    sheet.appendRow(['W-001', 'sc1', 'p1', 10, 20, 5, 100, 150, 50, 'available', '']);
    sheet.appendRow(['W-002', 'sc2', 'p1', 12, 24, 6, 120, 180, 30, 'available', '']);
    sheet.appendRow(['W-003', 'sc1', 'p2', 15, 30, 8, 150, 220, 10, 'available', '']);

    // Sales & Items (April Dates)
    sheet = ss.getSheetByName('Sales');
    sheet.appendRow(['id', 'customer_id', 'total_amount', 'paid_amount', 'date', 'status']);
    sheet.appendRow(['s1', 'cust1', 1500, 1500, '2026-04-05T10:00:00Z', 'completed']);
    sheet.appendRow(['s2', 'cust2', 1800, 900, '2026-04-10T10:00:00Z', 'partial']);

    sheet = ss.getSheetByName('Sale_Items');
    sheet.appendRow(['id', 'sale_id', 'serial', 'qty', 'rate', 'amount']);
    sheet.appendRow(['si1', 's1', 'W-001', 10, 150, 1500]);
    sheet.appendRow(['si2', 's2', 'W-002', 10, 180, 1800]);

    // Payments
    sheet = ss.getSheetByName('Payments');
    sheet.appendRow(['id', 'ref_id', 'type', 'amount', 'method', 'date']);
    sheet.appendRow(['pay1', 's1', 'customer_payment', 1500, 'cash', '2026-04-05T10:00:00Z']);
    sheet.appendRow(['pay2', 's2', 'customer_payment', 900, 'bank', '2026-04-10T10:00:00Z']);

    // Expenses
    sheet = ss.getSheetByName('Expenses');
    sheet.appendRow(['id', 'title', 'amount', 'date']);
    sheet.appendRow(['e1', 'Transport', 200, '2026-04-02T10:00:00Z']);
    sheet.appendRow(['e2', 'Utilities', 150, '2026-04-15T10:00:00Z']);

    // Others
    sheet = ss.getSheetByName('Purchases');
    sheet.appendRow(['id', 'supplier_id', 'amount', 'date']);
    sheet.appendRow(['p1', 'sup1', 5000, '2026-04-01T10:00:00Z']);

    sheet = ss.getSheetByName('Activity_Logs');
    sheet.appendRow(['id', 'user_id', 'action', 'details', 'date']);
    sheet.appendRow(['al1', 'u1', 'SYSTEM_INIT', 'Created demo data', new Date().toISOString()]);

    sheet = ss.getSheetByName('Import_Logs');
    sheet.appendRow(['id', 'filename', 'date', 'status']);

    return { success: true, message: "Demo Data Setup Complete." };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * AUTHENTICATION & SECURITY
 */
function loginUser(email, password) {
  const users = getRowsAsObjects('Users');
  const user = users.find(u => u.email === email && u.password === password && u.is_active);
  if (user) {
    return { success: true, user: { id: user.id, name: user.name, role: user.role, email: user.email } };
  }
  return { success: false, message: "Invalid credentials or inactive user." };
}

function forgotPassword(email) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheetInfo('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIdx = headers.indexOf('email');
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIdx] === email) { rowIndex = i + 1; break; }
    }
    
    if (rowIndex === -1) return { success: false, message: "Email not found." };
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60000).toISOString();
    
    sheet.getRange(rowIndex, headers.indexOf('otp') + 1).setValue(otp);
    sheet.getRange(rowIndex, headers.indexOf('otp_expires') + 1).setValue(expiry);
    
    MailApp.sendEmail({
      to: email,
      subject: "Wood Tracker POS - Password Reset OTP",
      body: `Your OTP for password reset is: ${otp}\nIt expires in 10 minutes.`
    });
    
    return { success: true, message: "OTP sent to email." };
  } catch(e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function resetPassword(email, otp, newPassword) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheetInfo('Users');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIdx = headers.indexOf('email');
    let rowIndex = -1;
    let rowData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIdx] === email) { 
        rowIndex = i + 1; 
        rowData = data[i];
        break; 
      }
    }
    
    if (rowIndex === -1) return { success: false, message: "User not found." };
    
    const storedOtp = rowData[headers.indexOf('otp')];
    const expiryStr = rowData[headers.indexOf('otp_expires')];
    if (storedOtp != otp) return { success: false, message: "Invalid OTP." };
    if (new Date() > new Date(expiryStr)) return { success: false, message: "OTP expired." };
    
    sheet.getRange(rowIndex, headers.indexOf('password') + 1).setValue(newPassword);
    sheet.getRange(rowIndex, headers.indexOf('otp') + 1).setValue('');
    sheet.getRange(rowIndex, headers.indexOf('otp_expires') + 1).setValue('');
    
    return { success: true, message: "Password reset successfully." };
  } catch(e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * DATA FETCHER FOR SWR
 */
function getSWRData(role) {
  if (!role) return { success: false, message: "Unauthorized" };
  try {
    const data = {
      wood_stocks: getRowsAsObjects('Wood_Stocks'),
      categories: getRowsAsObjects('Categories'),
      sub_categories: getRowsAsObjects('Sub_Categories'),
      customers: getRowsAsObjects('Customers'),
      settings: getRowsAsObjects('Settings'),
      sales: getRowsAsObjects('Sales'),
      expenses: getRowsAsObjects('Expenses')
    };
    return { success: true, data: data };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * POS ACTIONS
 */
function processSale(payload, userId, role) {
  if (role !== 'admin' && role !== 'manager' && role !== 'cashier') {
    return { success: false, message: "Unauthorized to process sales." };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const salesSheet = ss.getSheetByName('Sales');
    const itemsSheet = ss.getSheetByName('Sale_Items');
    const paymentsSheet = ss.getSheetByName('Payments');
    const stockSheet = ss.getSheetByName('Wood_Stocks');
    const logsSheet = ss.getSheetByName('Activity_Logs');

    const saleId = 's' + new Date().getTime();
    const dateStr = new Date().toISOString();
    
    let status = payload.paid_amount >= payload.total_amount ? 'completed' : 
                 (payload.paid_amount > 0 ? 'partial' : 'pending');

    // 1. Record Sale
    salesSheet.appendRow([
      saleId, payload.customer_id, payload.total_amount, payload.paid_amount, dateStr, status
    ]);

    // 2. Record Items and Deduct Stock
    const stockData = stockSheet.getDataRange().getValues();
    const stockHeaders = stockData[0];
    const serialIdx = stockHeaders.indexOf('serial');
    const qtyIdx = stockHeaders.indexOf('qty');

    payload.items.forEach((item, index) => {
      itemsSheet.appendRow([
        'si' + new Date().getTime() + index,
        saleId, item.serial, item.qty, item.rate, item.qty * item.rate
      ]);

      // Deduct stock
      for (let i = 1; i < stockData.length; i++) {
        if (stockData[i][serialIdx] === item.serial) {
          const currentQty = parseInt(stockData[i][qtyIdx]);
          stockSheet.getRange(i + 1, qtyIdx + 1).setValue(currentQty - item.qty);
          break;
        }
      }
    });

    // 3. Record Payment
    if (payload.paid_amount > 0) {
      paymentsSheet.appendRow([
        'pay' + new Date().getTime(), saleId, 'customer_payment', payload.paid_amount, payload.method, dateStr
      ]);
    }

    // 4. Log Activity
    logsSheet.appendRow(['al' + new Date().getTime(), userId, 'SALE', `Processed sale ${saleId} for amount ${payload.total_amount}`, dateStr]);

    return { success: true, message: "Sale processed successfully.", sale_id: saleId };
  } catch (e) {
    return { success: false, message: e.message };
  } finally {
    lock.releaseLock();
  }
}
