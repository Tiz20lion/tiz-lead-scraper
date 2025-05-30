import asyncio
import re
from typing import List, Dict, Any, Optional
from apify_client import ApifyClient
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from core.config import settings

logger = structlog.get_logger(__name__)

class ApifyApolloClient:
    def __init__(self):
        if not settings.apify_api_token:
            logger.warning("Apify API token not configured")
            self.client = None
        else:
            self.client = ApifyClient(settings.apify_api_token)
        self.actor_id = "code_crafter/apollo-io-scraper"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def scrape_apollo_leads(
        self, 
        urls: List[str], 
        lead_count: int = 100,
        fields: List[str] = None
    ) -> Dict[str, Any]:
        """
        Scrape leads from Apollo.io URLs using Apify
        """
        if not self.client:
            return {
                "status": "error",
                "data": [],
                "total_scraped": 0,
                "message": "Apify API token not configured. Please set APIFY_API_TOKEN environment variable."
            }
        
        logger.info("Starting Apollo scraping", urls=urls, lead_count=lead_count)
        
        try:
            all_results = []
            
            for url in urls:
                # Prepare Actor input
                run_input = {
                    "url": url,
                    "maxResults": min(lead_count, 1000),  # Apify actor limit
                    "fields": fields or ["name", "email", "company", "title"]
                }
                
                logger.info("Running Apify actor", url=url, input=run_input)
                
                # Run the Actor and wait for completion
                run = self.client.actor(self.actor_id).call(run_input=run_input)
                
                # Fetch results
                dataset_id = run["defaultDatasetId"]
                items = list(self.client.dataset(dataset_id).iterate_items())
                
                logger.info("Apify run completed", 
                           dataset_id=dataset_id, 
                           items_count=len(items))
                
                # Process and clean data
                processed_items = self._process_items(items, fields)
                all_results.extend(processed_items)
                
                # Respect rate limits
                await asyncio.sleep(1)
            
            return {
                "status": "success",
                "data": all_results[:lead_count],  # Limit to requested count
                "total_scraped": len(all_results),
                "message": f"Successfully scraped {len(all_results)} leads"
            }
            
        except Exception as e:
            logger.error("Apify scraping failed", error=str(e))
            return {
                "status": "error",
                "data": [],
                "total_scraped": 0,
                "message": f"Scraping failed: {str(e)}"
            }
    
    def _process_items(self, items: List[Dict], requested_fields: List[str]) -> List[Dict]:
        """Process and clean scraped items with proper formatting"""
        processed = []
        
        for item in items:
            processed_item = {}
            
            # Map common fields
            field_mapping = {
                "name": ["name", "full_name", "firstName", "lastName", "fullName"],
                "email": ["email", "email_address", "emailAddress"],
                "phone": ["phone", "phone_number", "phoneNumber", "mobile"],
                "company": ["company", "organization", "companyName", "employer"],
                "title": ["title", "job_title", "position", "jobTitle"],
                "location": ["location", "city", "country", "address", "region"],
                "industry": ["industry", "sector", "vertical"],
                "linkedin": ["linkedin", "linkedin_url", "linkedinUrl", "linkedIn"],
                "twitter": ["twitter", "twitter_url", "twitterUrl", "x_url"],
                "website": ["website", "company_website", "websiteUrl", "companyWebsite"],
                "instagram": ["instagram", "instagram_url", "instagramUrl"]
            }
            
            for field in requested_fields:
                raw_value = None
                
                # Find the raw value
                if field in field_mapping:
                    for key in field_mapping[field]:
                        if key in item and item[key]:
                            raw_value = item[key]
                            break
                else:
                    # Direct field mapping
                    raw_value = item.get(field)
                
                # Format the value based on field type
                formatted_value = self._format_field_value(field, raw_value)
                processed_item[field] = formatted_value
            
            # Only add if has meaningful data (not all empty strings)
            if any(value.strip() for value in processed_item.values() if isinstance(value, str)):
                processed.append(processed_item)
        
        return processed
    
    def _format_field_value(self, field_type: str, raw_value) -> str:
        """Format field values based on their type"""
        if not raw_value:
            return ""
        
        value_str = str(raw_value).strip()
        if not value_str:
            return ""
        
        # Email formatting
        if field_type == "email":
            return self._format_email(value_str)
        
        # Phone number formatting
        elif field_type == "phone":
            return self._format_phone(value_str)
        
        # URL formatting (linkedin, twitter, instagram, website)
        elif field_type in ["linkedin", "twitter", "instagram", "website"]:
            return self._format_url(value_str, field_type)
        
        # Location/Address formatting
        elif field_type == "location":
            return self._format_location(value_str)
        
        # Name formatting
        elif field_type == "name":
            return self._format_name(value_str)
        
        # Company and title formatting
        elif field_type in ["company", "title", "industry"]:
            return self._format_text(value_str)
        
        # Default string formatting
        else:
            return self._format_text(value_str)
    
    def _format_email(self, email: str) -> str:
        """Format and validate email addresses"""
        import re
        
        email = email.lower().strip()
        
        # Basic email validation regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if re.match(email_pattern, email):
            return email
        
        # Try to extract email from text
        email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', email)
        if email_match:
            return email_match.group().lower()
        
        return ""
    
    def _format_phone(self, phone: str) -> str:
        """Format phone numbers"""
        import re
        
        # Remove all non-digit characters except + at the beginning
        phone = re.sub(r'[^\d+]', '', phone)
        
        if not phone:
            return ""
        
        # Handle international format
        if phone.startswith('+'):
            # Keep the + and format: +1 (555) 123-4567
            digits = re.sub(r'[^\d]', '', phone[1:])
            if len(digits) == 11 and digits.startswith('1'):  # US number
                return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
            elif len(digits) >= 10:
                return f"+{digits}"
        else:
            # US format without country code
            digits = re.sub(r'[^\d]', '', phone)
            if len(digits) == 10:
                return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
            elif len(digits) == 11 and digits.startswith('1'):
                return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
            elif len(digits) >= 7:
                return digits
        
        return phone if phone else ""
    
    def _format_url(self, url: str, url_type: str) -> str:
        """Format URLs for different platforms"""
        url = url.strip()
        
        if not url:
            return ""
        
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Platform-specific formatting
        if url_type == "linkedin":
            if "linkedin.com" not in url.lower():
                return ""
            # Ensure proper LinkedIn URL format
            if "/in/" not in url and "/company/" not in url:
                return ""
        
        elif url_type == "twitter":
            if "twitter.com" not in url.lower() and "x.com" not in url.lower():
                return ""
        
        elif url_type == "instagram":
            if "instagram.com" not in url.lower():
                return ""
        
        elif url_type == "website":
            # General website validation
            import re
            if not re.match(r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', url):
                return ""
        
        return url
    
    def _format_location(self, location: str) -> str:
        """Format location/address information"""
        location = location.strip()
        
        if not location:
            return ""
        
        # Capitalize each word properly
        words = location.split()
        formatted_words = []
        
        for word in words:
            # Handle common abbreviations
            if word.upper() in ['USA', 'UK', 'UAE', 'NYC', 'LA', 'SF', 'DC']:
                formatted_words.append(word.upper())
            elif word.lower() in ['and', 'or', 'of', 'the', 'in', 'at']:
                formatted_words.append(word.lower())
            else:
                formatted_words.append(word.capitalize())
        
        return ' '.join(formatted_words)
    
    def _format_name(self, name: str) -> str:
        """Format person names"""
        name = name.strip()
        
        if not name:
            return ""
        
        # Split and capitalize each part
        parts = name.split()
        formatted_parts = []
        
        for part in parts:
            # Handle prefixes and suffixes
            if part.lower() in ['jr', 'sr', 'ii', 'iii', 'iv']:
                formatted_parts.append(part.upper())
            elif part.lower() in ['dr', 'mr', 'mrs', 'ms', 'prof']:
                formatted_parts.append(part.capitalize() + '.')
            else:
                # Handle names with apostrophes or hyphens
                if "'" in part or "-" in part:
                    subparts = re.split(r"(['-])", part)
                    formatted_subparts = []
                    for subpart in subparts:
                        if subpart in ["'", "-"]:
                            formatted_subparts.append(subpart)
                        else:
                            formatted_subparts.append(subpart.capitalize())
                    formatted_parts.append(''.join(formatted_subparts))
                else:
                    formatted_parts.append(part.capitalize())
        
        return ' '.join(formatted_parts)
    
    def _format_text(self, text: str) -> str:
        """Format general text fields (company, title, industry)"""
        text = text.strip()
        
        if not text:
            return ""
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        # Capitalize appropriately
        # Keep certain words lowercase
        lowercase_words = ['and', 'or', 'of', 'the', 'in', 'at', 'to', 'for', 'with', 'by']
        
        words = text.split()
        formatted_words = []
        
        for i, word in enumerate(words):
            # First word is always capitalized
            if i == 0:
                formatted_words.append(word.capitalize())
            # Common abbreviations stay uppercase
            elif word.upper() in ['CEO', 'CTO', 'CFO', 'COO', 'VP', 'SVP', 'EVP', 'HR', 'IT', 'AI', 'ML', 'API', 'SaaS', 'B2B', 'B2C']:
                formatted_words.append(word.upper())
            # Keep certain words lowercase
            elif word.lower() in lowercase_words:
                formatted_words.append(word.lower())
            else:
                formatted_words.append(word.capitalize())
        
        return ' '.join(formatted_words)

# Initialize client
apify_client = ApifyApolloClient()
