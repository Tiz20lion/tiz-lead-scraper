import asyncio
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
        """Process and clean scraped items"""
        processed = []
        
        for item in items:
            processed_item = {}
            
            # Map common fields
            field_mapping = {
                "name": ["name", "full_name", "firstName", "lastName"],
                "email": ["email", "email_address"],
                "phone": ["phone", "phone_number", "phoneNumber"],
                "company": ["company", "organization", "companyName"],
                "title": ["title", "job_title", "position"],
                "location": ["location", "city", "country"],
                "industry": ["industry", "sector"],
                "linkedin": ["linkedin", "linkedin_url", "linkedinUrl"],
                "twitter": ["twitter", "twitter_url", "twitterUrl"],
                "website": ["website", "company_website", "websiteUrl"]
            }
            
            for field in requested_fields:
                value = None
                if field in field_mapping:
                    for key in field_mapping[field]:
                        if key in item and item[key]:
                            value = item[key]
                            break
                
                processed_item[field] = value or ""
            
            if any(processed_item.values()):  # Only add if has some data
                processed.append(processed_item)
        
        return processed

# Initialize client
apify_client = ApifyApolloClient()
