from typing import List, Dict, Any, Optional
import asyncio
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from core.config import settings

logger = structlog.get_logger(__name__)

class GoogleSheetsClient:
    def __init__(self):
        self.service = None
        self._initialize_service()
    
    def _initialize_service(self):
        """Initialize Google Sheets service with credentials"""
        try:
            if not settings.google_sheets_credentials:
                logger.warning("Google Sheets credentials not configured")
                return
            
            credentials = Credentials.from_service_account_info(
                settings.google_sheets_credentials,
                scopes=['https://www.googleapis.com/auth/spreadsheets']
            )
            
            self.service = build('sheets', 'v4', credentials=credentials)
            logger.info("Google Sheets service initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize Google Sheets service", error=str(e))
            self.service = None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def append_to_sheet(
        self, 
        spreadsheet_id: str, 
        sheet_name: str, 
        data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Append data to Google Sheet
        """
        if not self.service:
            return {
                "status": "error",
                "message": "Google Sheets service not initialized. Please configure GOOGLE_SHEETS_CREDENTIALS."
            }
        
        try:
            logger.info("Appending data to Google Sheet", 
                       spreadsheet_id=spreadsheet_id, 
                       sheet_name=sheet_name, 
                       rows=len(data))
            
            # Prepare data for sheets
            if not data:
                return {
                    "status": "error",
                    "message": "No data provided to append"
                }
            
            # Get headers from first row
            headers = list(data[0].keys())
            
            # Convert data to values list
            values = []
            values.append(headers)  # Header row
            
            for row in data:
                row_values = [str(row.get(header, "")) for header in headers]
                values.append(row_values)
            
            # Check if sheet exists, create if not
            await self._ensure_sheet_exists(spreadsheet_id, sheet_name)
            
            # Append data
            range_name = f"{sheet_name}!A1"
            
            # First check if sheet is empty and add headers
            result = self.service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=range_name
            ).execute()
            
            existing_values = result.get('values', [])
            
            if not existing_values:
                # Sheet is empty, append with headers
                body = {
                    'values': values
                }
            else:
                # Sheet has data, append without headers
                body = {
                    'values': values[1:]  # Skip header row
                }
            
            append_range = f"{sheet_name}!A:Z"
            result = self.service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=append_range,
                valueInputOption='RAW',
                insertDataOption='INSERT_ROWS',
                body=body
            ).execute()
            
            logger.info("Successfully appended to Google Sheet", 
                       updates=result.get('updates', {}))
            
            return {
                "status": "success",
                "message": f"Successfully appended {len(data)} rows to {sheet_name}",
                "updated_rows": result.get('updates', {}).get('updatedRows', 0)
            }
            
        except Exception as e:
            logger.error("Failed to append to Google Sheet", error=str(e))
            return {
                "status": "error",
                "message": f"Failed to append to Google Sheet: {str(e)}"
            }
    
    async def _ensure_sheet_exists(self, spreadsheet_id: str, sheet_name: str):
        """Ensure the sheet exists, create if it doesn't"""
        try:
            # Get spreadsheet metadata to check if sheet exists
            spreadsheet = self.service.spreadsheets().get(
                spreadsheetId=spreadsheet_id
            ).execute()
            
            sheet_names = [sheet['properties']['title'] for sheet in spreadsheet['sheets']]
            
            if sheet_name not in sheet_names:
                # Create the sheet
                request_body = {
                    'requests': [{
                        'addSheet': {
                            'properties': {
                                'title': sheet_name
                            }
                        }
                    }]
                }
                
                self.service.spreadsheets().batchUpdate(
                    spreadsheetId=spreadsheet_id,
                    body=request_body
                ).execute()
                
                logger.info("Created new sheet", sheet_name=sheet_name)
                
        except Exception as e:
            logger.error("Failed to ensure sheet exists", error=str(e))
            raise

# Initialize client
sheets_client = GoogleSheetsClient()
