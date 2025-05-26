from typing import List, Dict, Any, Optional
import asyncio
from notion_client import AsyncClient
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from core.config import settings

logger = structlog.get_logger(__name__)

class NotionClient:
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Notion client with token"""
        try:
            if not settings.notion_token:
                logger.warning("Notion token not configured")
                return
            
            self.client = AsyncClient(auth=settings.notion_token)
            logger.info("Notion client initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize Notion client", error=str(e))
            self.client = None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def create_database_entries(
        self, 
        data: List[Dict[str, Any]], 
        database_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create entries in Notion database
        """
        if not self.client:
            return {
                "status": "error",
                "message": "Notion client not initialized. Please configure NOTION_TOKEN."
            }
        
        db_id = database_id or settings.notion_database_id
        if not db_id:
            return {
                "status": "error",
                "message": "Notion database ID not configured. Please set NOTION_DATABASE_ID."
            }
        
        try:
            logger.info("Creating Notion database entries", 
                       database_id=db_id, 
                       entries=len(data))
            
            created_count = 0
            errors = []
            
            for i, entry in enumerate(data):
                try:
                    # Convert data to Notion properties format
                    properties = self._convert_to_notion_properties(entry)
                    
                    # Create page in database
                    await self.client.pages.create(
                        parent={"database_id": db_id},
                        properties=properties
                    )
                    
                    created_count += 1
                    
                    # Rate limiting compliance
                    if i < len(data) - 1:  # Don't wait after last item
                        await asyncio.sleep(0.5)
                        
                except Exception as e:
                    error_msg = f"Failed to create entry {i + 1}: {str(e)}"
                    logger.error("Notion entry creation failed", 
                               entry_index=i, 
                               error=str(e))
                    errors.append(error_msg)
            
            if created_count > 0:
                logger.info("Successfully created Notion entries", 
                           created=created_count, 
                           errors=len(errors))
                
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
            logger.error("Failed to create Notion entries", error=str(e))
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
                properties["Phone"] = {
                    "phone_number": str(value)
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
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_database_info(self, database_id: Optional[str] = None) -> Dict[str, Any]:
        """Get database information and schema"""
        if not self.client:
            return {
                "status": "error",
                "message": "Notion client not initialized"
            }
        
        db_id = database_id or settings.notion_database_id
        if not db_id:
            return {
                "status": "error",
                "message": "Database ID not provided"
            }
        
        try:
            database = await self.client.databases.retrieve(database_id=db_id)
            
            return {
                "status": "success",
                "database": {
                    "id": database["id"],
                    "title": database.get("title", [{}])[0].get("text", {}).get("content", "Untitled"),
                    "properties": database.get("properties", {})
                }
            }
            
        except Exception as e:
            logger.error("Failed to get database info", error=str(e))
            return {
                "status": "error",
                "message": f"Failed to get database info: {str(e)}"
            }

# Initialize client
notion_client = NotionClient()
