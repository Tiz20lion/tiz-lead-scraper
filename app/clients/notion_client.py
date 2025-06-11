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
                logger.info("Notion token not configured - users must provide token through UI")
                return

            # Basic token format validation
            if not auth_token.startswith(('secret_', 'ntn_')):
                logger.warning("Notion token format may be invalid - expected to start with 'secret_' or 'ntn_'")
                return

            self.client = AsyncClient(
                auth=auth_token,
                notion_version="2022-06-28"  # Use stable API version
            )
            logger.info("Notion client initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Notion client: {str(e)}")
            self.client = None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def ensure_database_properties(self, database_id: str, fields: List[str]) -> Dict[str, Any]:
        """
        Ensure all required properties exist in the Notion database.
        Creates missing properties with appropriate types.
        """
        logger.info(f"Ensuring database properties for fields: {fields}")

        try:
            # Get current database schema
            current_schema = await self.get_database_schema(database_id)
            existing_properties = current_schema.get('properties', {})

            # Map fields to Notion property types with correct structure
            field_type_mapping = {
                'name': {'type': 'title', 'title': {}},
                'email': {'type': 'email', 'email': {}},
                'phone': {'type': 'phone_number', 'phone_number': {}},
                'company': {'type': 'rich_text', 'rich_text': {}},
                'title': {'type': 'rich_text', 'rich_text': {}},  # Job title
                'location': {'type': 'rich_text', 'rich_text': {}},
                'industry': {'type': 'rich_text', 'rich_text': {}},
                'linkedin': {'type': 'url', 'url': {}},
                'twitter': {'type': 'url', 'url': {}},
                'instagram': {'type': 'url', 'url': {}},
                'website': {'type': 'url', 'url': {}},
                'description': {'type': 'rich_text', 'rich_text': {}},
                'experience': {'type': 'rich_text', 'rich_text': {}},
                'skills': {'type': 'rich_text', 'rich_text': {}},
                'education': {'type': 'rich_text', 'rich_text': {}},
                'current_role': {'type': 'rich_text', 'rich_text': {}},
                'past_roles': {'type': 'rich_text', 'rich_text': {}},
                'contact_info': {'type': 'rich_text', 'rich_text': {}},
                'social_profiles': {'type': 'rich_text', 'rich_text': {}},
                'notes': {'type': 'rich_text', 'rich_text': {}}
            }

            # Use proper display names for Notion properties
            field_to_property_name = {
                'name': 'Name',
                'email': 'Email', 
                'phone': 'Phone',
                'company': 'Company',
                'title': 'Job_Title',  # Maps to Job_Title column in Notion
                'location': 'Location',
                'industry': 'Industry',
                'linkedin': 'LinkedIn',
                'twitter': 'Twitter', 
                'instagram': 'Instagram',
                'website': 'Website',
                'description': 'Description',
                'experience': 'Experience',
                'skills': 'Skills',
                'education': 'Education',
                'current_role': 'Current_Role',
                'past_roles': 'Past_Roles',
                'contact_info': 'Contact_Info',
                'social_profiles': 'Social_Profiles',
                'notes': 'Notes'
            }

            # Build update payload for missing properties
            properties_to_add = {}

            for field in fields:
                # Use proper property name mapping
                display_name = field_to_property_name.get(field, self._format_property_name(field).replace(' ', '_'))

                # Check if property already exists (case-insensitive)
                property_exists = any(
                    prop_name.lower() == display_name.lower() 
                    for prop_name in existing_properties.keys()
                )

                if not property_exists:
                    # Get the property type for this field with proper Notion API structure
                    property_config = field_type_mapping.get(field, {'type': 'rich_text', 'rich_text': {}})
                    
                    # Create properly structured property definition with both type and subtype
                    properties_to_add[display_name] = property_config

                    logger.info(f"Will add property: {display_name} with config: {property_config}")

            # If we have properties to add, update the database
            if properties_to_add:
                logger.info(f"Adding {len(properties_to_add)} new properties to database")

                # Get existing properties to merge (don't overwrite existing ones)
                existing_database = await self.client.databases.retrieve(database_id=database_id)
                existing_props = existing_database.get('properties', {})
                
                # Merge existing + new properties
                updated_properties = {**existing_props, **properties_to_add}

                update_payload = {
                    "properties": updated_properties
                }

                logger.debug(f"Update payload properties: {list(properties_to_add.keys())}")

                response = await self.client.databases.update(
                    database_id=database_id,
                    properties=updated_properties
                )

                logger.info(f"Successfully added {len(properties_to_add)} properties")
                return {"status": "success", "added_properties": list(properties_to_add.keys())}
            else:
                logger.info("All required properties already exist")
                return {"status": "success", "added_properties": []}

        except Exception as e:
            logger.error(f"Failed to ensure database properties: {str(e)}")
            raise Exception(f"Database property setup failed: {str(e)}")

    async def create_database_entries(
        self, 
        data: List[Dict[str, Any]], 
        database_id: Optional[str] = None,
        notion_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create entries in Notion database with automatic schema detection
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
                "message": "Notion database ID not provided. Please enter your database ID in the web interface."
            }

        # Clean the database ID
        db_id = settings.extract_notion_database_id(raw_db_id)
        if not db_id:
            return {
                "status": "error",
                "message": f"Invalid Notion database ID format: {raw_db_id}"
            }

        # Validate database ID length before formatting
        if len(db_id) != 32:
            return {
                "status": "error",
                "message": f"Invalid database ID length: expected 32 characters, got {len(db_id)} for ID: {db_id}"
            }

        # Format database ID with dashes for Notion API
        formatted_db_id = f"{db_id[:8]}-{db_id[8:12]}-{db_id[12:16]}-{db_id[16:20]}-{db_id[20:]}"

        logger.info(f"Formatted database ID: {formatted_db_id} from raw ID: {raw_db_id}")

        try:
            # Extract fields from data to understand what properties we need
            required_fields = set()
            for entry in data:
                required_fields.update(entry.keys())

            # Ensure all required properties exist in the database
            property_result = await self.ensure_database_properties(
                formatted_db_id, 
                list(required_fields)
            )

            if property_result["status"] == "error":
                return property_result

            # Now get the updated database schema
            database_info = await self.client.databases.retrieve(database_id=formatted_db_id)
            available_properties = database_info.get("properties", {})

            logger.info(f"Found {len(available_properties)} properties in Notion database: {list(available_properties.keys())}")

            # Create property mapping based on what's actually available
            property_mapping = self._create_property_mapping(available_properties)

            if not property_mapping:
                return {
                    "status": "error",
                    "message": f"No compatible properties found in database. Available properties: {list(available_properties.keys())}. Please ensure your database has at least a Title property for names.",
                    "available_properties": list(available_properties.keys())
                }

            logger.info(f"Creating Notion database entries - database_id: {formatted_db_id}, entries: {len(data)}")

            created_count = 0
            errors = []

            for i, entry in enumerate(data):
                try:
                    # Convert data to Notion properties format using detected schema
                    properties = self._convert_to_notion_properties(entry, property_mapping, available_properties)

                    if not properties:
                        logger.warning(f"Skipping entry {i + 1} - no compatible data found")
                        continue

                    # Create page in database
                    await self.client.pages.create(
                        parent={"database_id": formatted_db_id},
                        properties=properties
                    )

                    created_count += 1

                    # Rate limiting compliance - Notion allows 3 requests per second
                    if i < len(data) - 1:  # Don't wait after last item
                        await asyncio.sleep(0.35)

                except Exception as e:
                    error_msg = f"Failed to create entry {i + 1}: {str(e)}"
                    logger.error(f"Notion entry creation failed - entry_index: {i}, error: {str(e)}")
                    errors.append(error_msg)

            if created_count > 0:
                logger.info(f"Successfully created Notion entries - created: {created_count}, errors: {len(errors)}")

                return {
                    "status": "success" if not errors else "partial_success",
                    "message": f"Created {created_count} entries in Notion database",
                    "created_count": created_count,
                    "errors": errors if errors else None,
                    "total_attempted": len(data)
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to create any entries. Check that your database schema is compatible.",
                    "errors": errors,
                    "available_properties": list(available_properties.keys())
                }

        except Exception as e:
            # Log detailed error information for debugging
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "database_id": formatted_db_id,
                "token_provided": bool(notion_token),
                "data_count": len(data) if data else 0
            }

            # Try to extract Notion-specific error details
            if hasattr(e, 'body'):
                error_details["notion_error_body"] = e.body
            if hasattr(e, 'code'):
                error_details["notion_error_code"] = e.code
            if hasattr(e, 'response'):
                try:
                    error_details["status_code"] = e.response.status_code
                    error_details["response_text"] = e.response.text
                except:
                    pass

            logger.error(f"Failed to create Notion entries - details: {error_details}")
            return {
                "status": "error",
                "message": f"Failed to create Notion entries: {str(e)}"
            }

    def _create_property_mapping(self, available_properties: Dict[str, Any]) -> Dict[str, str]:
        """Create mapping between lead data fields and available Notion properties"""
        mapping = {}

        # Define possible property names for each field (case-insensitive)
        field_variations = {
            "name": ["name", "full name", "lead name", "contact name"],
            "email": ["email", "email address", "contact email", "e-mail"],
            "phone": ["phone", "phone number", "contact phone", "telephone", "mobile"],
            "company": ["company", "organization", "business", "employer"],
            "title": ["job_title", "job title", "position", "role", "job", "title"],  # Job title field - prioritize job_title
            "location": ["location", "address", "city", "region", "area"],
            "industry": ["industry", "sector", "business type", "field"],
            "linkedin": ["linkedin", "linkedin url", "linkedin profile"],
            "twitter": ["twitter", "twitter url", "twitter profile"],
            "instagram": ["instagram", "instagram url", "instagram profile"],
            "website": ["website", "url", "company website", "web"]
        }

        # Find best matches - prioritize exact name matches first
        for field, variations in field_variations.items():
            for prop_name, prop_config in available_properties.items():
                if prop_name.lower() in [v.lower() for v in variations]:
                    mapping[field] = prop_name
                    break

        # Special handling for name field - map to the title property (required by Notion)
        if "name" not in mapping:
            for prop_name, prop_config in available_properties.items():
                if prop_config.get("type") == "title":
                    mapping["name"] = prop_name
                    logger.info(f"Mapping 'name' field to title property: {prop_name}")
                    break

        logger.info(f"Created property mapping: {mapping}")
        return mapping

    def _convert_to_notion_properties(self, data: Dict[str, Any], property_mapping: Dict[str, str], available_properties: Dict[str, Any]) -> Dict[str, Any]:
        """Convert data to Notion properties format using detected schema"""
        properties = {}

        for field, value in data.items():
            if not value or field not in property_mapping:
                continue

            notion_property = property_mapping[field]
            property_config = available_properties.get(notion_property, {})
            property_type = property_config.get("type", "rich_text")

            try:
                # Convert based on actual property type in database
                if property_type == "title":
                    properties[notion_property] = {
                        "title": [{"text": {"content": str(value)[:2000]}}]  # Limit to 2000 chars
                    }
                elif property_type == "email":
                    # Validate email format
                    email_str = str(value).strip()
                    if "@" in email_str and "." in email_str:
                        properties[notion_property] = {"email": email_str}
                elif property_type == "phone_number":
                    # Clean phone number
                    phone_value = str(value).strip()
                    if phone_value.startswith("'"):
                        phone_value = phone_value[1:]  # Remove CSV prefix
                    if phone_value:
                        properties[notion_property] = {"phone_number": phone_value}
                elif property_type == "url":
                    url_str = str(value).strip()
                    if url_str.startswith(("http://", "https://")):
                        properties[notion_property] = {"url": url_str}
                elif property_type == "rich_text":
                    properties[notion_property] = {
                        "rich_text": [{"text": {"content": str(value)[:2000]}}]  # Limit to 2000 chars
                    }
                elif property_type == "select":
                    # For select properties, use the value as option name
                    properties[notion_property] = {
                        "select": {"name": str(value)[:100]}  # Limit option name length
                    }
                else:
                    # Default to rich text for unknown types
                    properties[notion_property] = {
                        "rich_text": [{"text": {"content": str(value)[:2000]}}]
                    }

            except Exception as e:
                logger.warning(f"Failed to convert field {field} to property {notion_property}: {str(e)}")
                continue

        return properties

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

        # Validate database ID length before formatting
        if len(db_id) != 32:
            return {
                "status": "error",
                "message": f"Invalid database ID length: expected 32 characters, got {len(db_id)} for ID: {db_id}"
            }

        # Format database ID with dashes for Notion API
        formatted_db_id = f"{db_id[:8]}-{db_id[8:12]}-{db_id[12:16]}-{db_id[16:20]}-{db_id[20:]}"

        logger.info(f"Formatted database ID: {formatted_db_id} from raw ID: {raw_db_id}")

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
            # Log detailed error information for debugging
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "database_id": formatted_db_id,
                "token_provided": bool(notion_token)
            }

            # Try to extract Notion-specific error details
            if hasattr(e, 'body'):
                error_details["notion_error_body"] = e.body
            if hasattr(e, 'code'):
                error_details["notion_error_code"] = e.code
            if hasattr(e, 'response'):
                try:
                    error_details["status_code"] = e.response.status_code
                    error_details["response_text"] = e.response.text
                except:
                    pass

            logger.error(f"Failed to get database info - details: {error_details}")
            return {
                "status": "error",
                "message": f"Failed to get database info: {str(e)}"
            }

    async def validate_database_schema(self, database_id: Optional[str] = None, notion_token: Optional[str] = None) -> Dict[str, Any]:
        """Validate database connectivity and get schema info"""
        try:
            db_info = await self.get_database_info(database_id, notion_token)

            if db_info["status"] != "success":
                return db_info

            properties = db_info["database"]["properties"]

            # Check if we have at least one title property for names
            title_properties = [name for name, config in properties.items() if config.get("type") == "title"]

            if not title_properties:
                return {
                    "status": "error",
                    "message": "Database must have at least one Title property for lead names",
                    "available_properties": list(properties.keys()),
                    "setup_help": "Add a Title property to your database for storing lead names"
                }

            # Count compatible properties
            compatible_fields = []
            for prop_name, prop_config in properties.items():
                prop_type = prop_config.get("type")
                if prop_type in ["title", "rich_text", "email", "phone_number", "url", "select"]:
                    compatible_fields.append(f"{prop_name} ({prop_type})")

            # If we only have a title field, mention that we can auto-create others
            auto_create_note = ""
            if len(compatible_fields) == 1 and any("title" in field for field in compatible_fields):
                auto_create_note = " (missing fields will be auto-created)"

            return {
                "status": "success",
                "message": f"Database is compatible with {len(compatible_fields)} fields{auto_create_note}",
                "database_id": db_info["database"]["id"],
                "database_title": db_info["database"]["title"],
                "compatible_fields": compatible_fields,
                "total_properties": len(properties),
                "can_auto_create": len(compatible_fields) == 1
            }

        except Exception as e:
            logger.error(f"Failed to validate database schema: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to validate database schema: {str(e)}"
            }

    def _format_property_name(self, field: str) -> str:
        """Format property name for display in Notion"""
        return field.replace("_", " ").title()

    async def get_database_schema(self, database_id: str) -> Dict[str, Any]:
        """Retrieve database schema from Notion"""
        try:
            database = await self.client.databases.retrieve(database_id)
            return database
        except Exception as e:
            logger.error(f"Failed to retrieve database schema: {str(e)}")
            raise Exception(f"Failed to retrieve database schema: {str(e)}")

# Initialize client
notion_client = NotionClient()