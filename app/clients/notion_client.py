from typing import List, Dict, Any, Optional
import asyncio
from notion_client import AsyncClient
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotionClient:
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self, token: Optional[str] = None):
        """Initialize Notion client with token"""
        try:
            # Use provided token or fallback to settings
            auth_token = token or settings.notion_token
            
            if not auth_token:
                logger.warning("Notion token not configured")
                return
            
            self.client = AsyncClient(auth=auth_token)
            logger.info("Notion client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Notion client: {str(e)}")
            self.client = None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def create_database_entries(
        self, 
        data: List[Dict[str, Any]], 
        database_id: Optional[str] = None,
        notion_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create entries in Notion database
        """
        # Reinitialize client if a different token is provided
        if notion_token and notion_token != settings.notion_token:
            self._initialize_client(notion_token)
        
        if not self.client:
            return {
                "status": "error",
                "message": "Notion client not initialized. Please configure NOTION_TOKEN."
            }
        
        # Extract database ID from URL if needed
        raw_db_id = database_id or settings.notion_database_id
        if not raw_db_id:
            return {
                "status": "error",
                "message": "Notion database ID not configured. Please set NOTION_DATABASE_ID."
            }
        
        # Clean the database ID
        db_id = settings.extract_notion_database_id(raw_db_id)
        if not db_id:
            return {
                "status": "error",
                "message": f"Invalid Notion database ID format: {raw_db_id}"
            }
        
        # Format database ID with dashes for Notion API
        formatted_db_id = f"{db_id[:8]}-{db_id[8:12]}-{db_id[12:16]}-{db_id[16:20]}-{db_id[20:]}"
        
        try:
            logger.info(f"Creating Notion database entries - database_id: {formatted_db_id}, entries: {len(data)}")
            
            created_count = 0
            errors = []
            
            for i, entry in enumerate(data):
                try:
                    # Convert data to Notion properties format
                    properties = self._convert_to_notion_properties(entry)
                    
                    # Create page in database
                    await self.client.pages.create(
                        parent={"database_id": formatted_db_id},
                        properties=properties
                    )
                    
                    created_count += 1
                    
                    # Rate limiting compliance
                    if i < len(data) - 1:  # Don't wait after last item
                        await asyncio.sleep(0.5)
                        
                except Exception as e:
                    error_msg = f"Failed to create entry {i + 1}: {str(e)}"
                    
                    # Provide helpful error message for schema issues
                    if "is not a property that exists" in str(e):
                        error_msg = self._get_schema_error_message(str(e))
                    
                    logger.error(f"Notion entry creation failed - entry_index: {i}, error: {str(e)}")
                    errors.append(error_msg)
            
            if created_count > 0:
                logger.info(f"Successfully created Notion entries - created: {created_count}, errors: {len(errors)}")
                
                return {
                    "status": "success" if not errors else "partial_success",
                    "message": f"Created {created_count} entries in Notion database",
                    "created_count": created_count,
                    "errors": errors if errors else None
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to create any entries",
                    "errors": errors
                }
                
        except Exception as e:
            logger.error(f"Failed to create Notion entries: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to create Notion entries: {str(e)}"
            }
    
    def _convert_to_notion_properties(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert data to Notion properties format"""
        properties = {}
        
        for key, value in data.items():
            if not value:  # Skip empty values
                continue
                
            # Convert based on field type
            if key.lower() == "name":
                properties["Name"] = {
                    "title": [{"text": {"content": str(value)}}]
                }
            elif key.lower() == "email":
                properties["Email"] = {
                    "email": str(value)
                }
            elif key.lower() == "phone":
                # Clean phone number by removing apostrophe prefix added for CSV export
                phone_value = str(value)
                if phone_value.startswith("'"):
                    phone_value = phone_value[1:]  # Remove apostrophe prefix
                properties["Phone"] = {
                    "phone_number": phone_value
                }
            elif key.lower() in ["linkedin", "twitter", "website"]:
                properties[key.capitalize()] = {
                    "url": str(value)
                }
            else:
                # Default to rich text
                properties[key.capitalize()] = {
                    "rich_text": [{"text": {"content": str(value)}}]
                }
        
        return properties
    
    def _get_schema_error_message(self, error_message: str) -> str:
        """Generate helpful error message for schema issues"""
        if "is not a property that exists" in error_message:
            return f"""
Database Schema Error: {error_message}

To fix this issue, please add the following properties to your Notion database:

Required Properties:
1. Name (Title property) - for lead names
2. Email (Email property) - for email addresses  
3. Phone (Phone property) - for phone numbers
4. Company (Text property) - for company names
5. Title (Text property) - for job titles
6. Location (Text property) - for locations
7. Industry (Text property) - for industry information
8. Linkedin (URL property) - for LinkedIn profiles
9. Twitter (URL property) - for Twitter profiles
10. Website (URL property) - for websites

Steps to add properties:
1. Open your Notion database
2. Click the '+' button next to the last column
3. Select the appropriate property type
4. Name it exactly as shown above (case-sensitive)
5. Repeat for all missing properties

Property Type Guide:
- Name: Title
- Email: Email
- Phone: Phone number
- Company, Title, Location, Industry: Text
- Linkedin, Twitter, Website: URL
            """
        return error_message
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_database_info(self, database_id: Optional[str] = None, notion_token: Optional[str] = None) -> Dict[str, Any]:
        """Get database information and schema"""
        # Reinitialize client if a different token is provided
        if notion_token and notion_token != settings.notion_token:
            self._initialize_client(notion_token)
            
        if not self.client:
            return {
                "status": "error",
                "message": "Notion client not initialized"
            }
        
        # Extract database ID from URL if needed
        raw_db_id = database_id or settings.notion_database_id
        if not raw_db_id:
            return {
                "status": "error",
                "message": "Database ID not provided"
            }
        
        # Clean the database ID
        db_id = settings.extract_notion_database_id(raw_db_id)
        if not db_id:
            return {
                "status": "error",
                "message": f"Invalid Notion database ID format: {raw_db_id}"
            }
        
        # Format database ID with dashes for Notion API
        formatted_db_id = f"{db_id[:8]}-{db_id[8:12]}-{db_id[12:16]}-{db_id[16:20]}-{db_id[20:]}"
        
        try:
            database = await self.client.databases.retrieve(database_id=formatted_db_id)
            
            return {
                "status": "success",
                "database": {
                    "id": database["id"],
                    "title": database.get("title", [{}])[0].get("text", {}).get("content", "Untitled"),
                    "properties": database.get("properties", {})
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get database info: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to get database info: {str(e)}"
            }

    async def validate_database_schema(self, database_id: Optional[str] = None, notion_token: Optional[str] = None) -> Dict[str, Any]:
        """Validate that the database has all required properties"""
        try:
            db_info = await self.get_database_info(database_id, notion_token)
            
            if db_info["status"] != "success":
                return db_info
            
            required_properties = {
                "Name": "title",
                "Email": "email", 
                "Phone": "phone_number",
                "Company": "rich_text",
                "Title": "rich_text", 
                "Location": "rich_text",
                "Industry": "rich_text",
                "Linkedin": "url",
                "Twitter": "url", 
                "Website": "url"
            }
            
            existing_properties = db_info["database"]["properties"]
            missing_properties = []
            
            for prop_name, prop_type in required_properties.items():
                if prop_name not in existing_properties:
                    missing_properties.append(f"{prop_name} ({prop_type})")
            
            if missing_properties:
                return {
                    "status": "error",
                    "message": f"Missing required properties: {', '.join(missing_properties)}",
                    "missing_properties": missing_properties,
                    "setup_instructions": self._get_schema_error_message(f"Missing properties: {', '.join(missing_properties)}")
                }
            
            return {
                "status": "success",
                "message": "Database schema is valid",
                "database_id": db_info["database"]["id"],
                "database_title": db_info["database"]["title"]
            }
            
        except Exception as e:
            logger.error(f"Failed to validate database schema: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to validate database schema: {str(e)}"
            }

# Initialize client
notion_client = NotionClient()


