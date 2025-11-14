/**
 * Google Sheets operations for Partner Automation
 */

interface PartnerRecord {
  partnerId: string;
  partnerName: string;
  contactEmail: string;
  accountManager: string;
  mrr: number;
  lastActivity: Date;
  status: 'Active' | 'Inactive' | 'Pending';
}

class SheetsManager {
  private sheetId: string;
  
  constructor() {
    this.sheetId = getConfig('SHEET_ID');
  }
  
  getPartnerData(): PartnerRecord[] {
    try {
      const sheet = SpreadsheetApp.openById(this.sheetId);
      const dataSheet = sheet.getSheetByName('Partners');
      
      if (!dataSheet) {
        console.error('Partners sheet not found');
        return [];
      }
      
      const data = dataSheet.getDataRange().getValues();
      if (data.length < 2) return [];
      
      // Skip header row and map data
      return data.slice(1).map(row => ({
        partnerId: String(row[0]),
        partnerName: String(row[1]),
        contactEmail: String(row[2]),
        accountManager: String(row[3]),
        mrr: Number(row[4]) || 0,
        lastActivity: new Date(row[5]),
        status: row[6] as PartnerRecord['status']
      }));
    } catch (error) {
      console.error('Error reading partner data:', error);
      return [];
    }
  }
  
  updatePartnerRecord(partnerId: string, updates: Partial<PartnerRecord>): boolean {
    try {
      const sheet = SpreadsheetApp.openById(this.sheetId);
      const dataSheet = sheet.getSheetByName('Partners');
      
      if (!dataSheet) return false;
      
      const data = dataSheet.getDataRange().getValues();
      const headerRow = data[0];
      const partnerIndex = data.findIndex(row => row[0] === partnerId);
      
      if (partnerIndex === -1) return false;
      
      // Update the row
      Object.entries(updates).forEach(([key, value]) => {
        const colIndex = headerRow.indexOf(key);
        if (colIndex !== -1) {
          dataSheet.getRange(partnerIndex + 1, colIndex + 1).setValue(value);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error updating partner record:', error);
      return false;
    }
  }
  
  addPartnerRecord(partner: PartnerRecord): boolean {
    try {
      const sheet = SpreadsheetApp.openById(this.sheetId);
      const dataSheet = sheet.getSheetByName('Partners');
      
      if (!dataSheet) return false;
      
      dataSheet.appendRow([
        partner.partnerId,
        partner.partnerName,
        partner.contactEmail,
        partner.accountManager,
        partner.mrr,
        partner.lastActivity,
        partner.status
      ]);
      
      return true;
    } catch (error) {
      console.error('Error adding partner record:', error);
      return false;
    }
  }
}

// Export functions for use in other files
function getPartners(): PartnerRecord[] {
  return new SheetsManager().getPartnerData();
}

function updatePartner(partnerId: string, updates: Partial<PartnerRecord>): boolean {
  return new SheetsManager().updatePartnerRecord(partnerId, updates);
}

function addPartner(partner: PartnerRecord): boolean {
  return new SheetsManager().addPartnerRecord(partner);
}
