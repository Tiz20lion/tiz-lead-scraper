import asyncio
import re
from typing import List, Dict, Any, Optional
from apify_client import ApifyClient
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings
import ast
import json
import os
import logging
import httpx
from app.utils.logging_config import setup_logging

# Setup logging
logger = setup_logging()

class ApolloClient:
    def __init__(self):
        self.api_key = settings.APIFY_API_KEY
        self.base_url = "https://api.apify.com/v2"
        self.actor_id = settings.APIFY_ACTOR_ID
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info("ApolloClient initialized")

    async def scrape_apollo_leads(
        self,
        urls: List[str],
        fields: List[str] = ["name", "email", "phone", "company", "title", "location", "industry", "linkedin", "twitter", "instagram", "facebook", "website"]
    ) -> List[Dict[str, Any]]:
        """
        Scrape leads from Apollo.io using Apify actor
        """
        try:
            logger.debug(f"Starting Apollo lead scraping for {len(urls)} URLs")
            logger.debug(f"Requested fields: {fields}")

            # Prepare the run input
            run_input = {
                "startUrls": [{"url": url} for url in urls],
                "maxRequestRetries": 3,
                "maxConcurrency": 10,
                "fields": fields
            }

            # Start the actor run
            logger.info("Starting Apify actor run")
            run_response = await self.client.post(
                f"{self.base_url}/acts/{self.actor_id}/runs?token={self.api_key}",
                json=run_input
            )
            run_response.raise_for_status()
            run_data = run_response.json()
            run_id = run_data["data"]["id"]
            logger.info(f"Apify actor run started with ID: {run_id}")

            # Wait for the run to complete and get results
            logger.info("Waiting for Apify actor run to complete")
            results = await self._wait_for_run_completion(run_id)
            logger.info(f"Apify actor run completed. Retrieved {len(results)} results")
            
            return results

        except Exception as e:
            logger.error(f"Error in scrape_apollo_leads: {str(e)}", exc_info=True)
            raise

    async def _wait_for_run_completion(self, run_id: str) -> List[Dict[str, Any]]:
        """
        Wait for the Apify actor run to complete and return the results
        """
        try:
            while True:
                # Get run status
                status_response = await self.client.get(
                    f"{self.base_url}/actor-runs/{run_id}?token={self.api_key}"
                )
                status_response.raise_for_status()
                status_data = status_response.json()

                if status_data["data"]["status"] == "SUCCEEDED":
                    logger.info("Apify actor run succeeded")
                    # Get the results
                    results_response = await self.client.get(
                        f"{self.base_url}/actor-runs/{run_id}/dataset/items?token={self.api_key}"
                    )
                    results_response.raise_for_status()
                    return results_response.json()

                elif status_data["data"]["status"] in ["FAILED", "ABORTED", "TIMEOUT"]:
                    error_msg = f"Apify actor run {status_data['data']['status']}"
                    logger.error(error_msg)
                    raise Exception(error_msg)

                logger.debug(f"Apify actor run status: {status_data['data']['status']}")
                await asyncio.sleep(5)

        except Exception as e:
            logger.error(f"Error in _wait_for_run_completion: {str(e)}", exc_info=True)
            raise

    async def close(self):
        """
        Close the HTTP client
        """
        await self.client.aclose()
        logger.info("ApolloClient closed")

class ApifyApolloClient:
    def __init__(self, apify_token: Optional[str] = None):
        # Use provided token or fall back to settings
        token_to_use = apify_token or settings.apify_api_token
        
        if not token_to_use:
            logger.warning("Apify API token not configured (neither request token nor settings token)")
            self.client = None
        else:
            self.client = ApifyClient(token_to_use)
            if apify_token:
                logger.info("Using Apify API token from request")
            else:
                logger.info("Using Apify API token from settings")
        
        self.apollo_actor_id = "code_crafter/apollo-io-scraper"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def scrape_apollo_leads(
        self, 
        urls: List[str], 
        lead_count: int = 100,
        fields: List[str] = None
    ) -> Dict[str, Any]:
        """
        Scrape leads from Apollo.io URLs using Apify
        
        Expected URL formats:
        - https://app.apollo.io/#/people?finderViewId=...
        - https://app.apollo.io/#/people?...
        - Apollo search URLs with specific criteria
        """
        if not self.client:
            return {
                "status": "error",
                "data": [],
                "total_scraped": 0,
                "message": "Apify API token not configured. Please set APIFY_API_TOKEN environment variable."
            }
        
        logger.info(f"Starting Apollo scraping for {len(urls)} URLs with {lead_count} leads requested")
        logger.info(f"Requested fields: {fields}")
        
        # Validate URLs
        invalid_urls = []
        for url in urls:
            if not self._is_valid_apollo_url(url):
                invalid_urls.append(url)
                logger.warning(f"Potentially invalid Apollo.io URL: {url}")
        
        if invalid_urls:
            logger.warning("Some URLs may not be valid Apollo.io search URLs:")
            for url in invalid_urls:
                logger.warning(f"  - {url}")
            logger.warning("Expected format: https://app.apollo.io/#/people?finderViewId=... or similar search URLs")
        
        try:
            all_results = []
            
            for url in urls:
                # Prepare Actor input with comprehensive field list
                run_input = {
                    "url": url,
                    "maxResults": min(lead_count, 1000),  # Apify actor limit
                    "fields": fields or [
                        "name",
                        "email", 
                        "phone",
                        "company",
                        "title",
                        "location",
                        "industry",
                        "linkedin",
                        "twitter",
                        "instagram",
                        "facebook",
                        "website"
                    ],
                    # Enhanced Apify configuration to ensure all fields are extracted
                    "includeContactInfo": True,
                    "includeSocialProfiles": True,
                    "includeCompanyDetails": True
                }
                
                logger.info(f"Running Apify actor for url: {url} with input: {run_input}")
                
                # Run the Actor and wait for completion
                run = self.client.actor(self.apollo_actor_id).call(run_input=run_input)
                
                # Fetch results
                dataset_id = run["defaultDatasetId"]
                items = list(self.client.dataset(dataset_id).iterate_items())
                
                logger.info(f"Apify run completed - dataset_id: {dataset_id}, items_count: {len(items)}")
                
                # Enhanced debugging for empty results
                if len(items) == 0:
                    logger.warning(f"No items found for URL: {url}")
                    logger.warning(f"Run details - run_id: {run.get('id')}, status: {run.get('status')}")
                    
                    # Check if the run failed or had errors
                    if run.get('status') != 'SUCCEEDED':
                        logger.error(f"Apify run failed with status: {run.get('status')}")
                        logger.error(f"Run stats: {run.get('stats', 'No stats available')}")
                    
                    # Log any error messages from the run
                    if 'errorMessage' in run:
                        logger.error(f"Apify run error: {run['errorMessage']}")
                
                # LOG RAW DATA FOR DEBUGGING (first item only to avoid spam)
                if items:
                    logger.info(f"Sample raw item from Apify: {items[0]}")
                    
                    # Log available fields in raw data
                    raw_fields = set()
                    for item in items[:5]:  # Check first 5 items
                        raw_fields.update(item.keys())
                    logger.info(f"Available fields in raw Apify data: {sorted(raw_fields)}")
                else:
                    logger.warning(f"No raw items found for URL: {url}. This might indicate:")
                    logger.warning("1. The URL is not a valid Apollo.io search URL")
                    logger.warning("2. Apollo.io returned no results for the search criteria")
                    logger.warning("3. Apollo.io blocked the scraping attempt")
                    logger.warning("4. The Apify actor encountered an error")
                
                # Process and clean data
                processed_items = self._process_items(items, fields or [
                    "name", "email", "phone", "company", "title", "location", 
                    "industry", "linkedin", "twitter", "instagram", "facebook", "website"
                ])
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
            logger.error(f"Apify scraping failed: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "data": [],
                "total_scraped": 0,
                "message": f"Scraping failed: {str(e)}"
            }
    
    def _safe_get_field(self, item: dict, field_name: str, default: str = "") -> str:
        """Safely extract and clean field value from item"""
        try:
            value = item.get(field_name)
            if value is None:
                return default
            # Convert to string and strip whitespace
            return str(value).strip()
        except (AttributeError, TypeError):
            return default

    def _extract_phone(self, item: dict) -> str:
        """Extract phone number from various possible fields"""
        # Try direct phone field first
        phone = item.get("sanitized_phone") or item.get("phone")
        if phone:
            return self._format_phone(str(phone))
        
        # Try phone_numbers array
        phone_numbers = item.get("phone_numbers", [])
        if phone_numbers and isinstance(phone_numbers, list) and len(phone_numbers) > 0:
            first_phone = phone_numbers[0]
            if isinstance(first_phone, dict):
                phone_num = first_phone.get("sanitized_number") or first_phone.get("raw_number")
                if phone_num:
                    return self._format_phone(str(phone_num))
        
        # Try organization phone as fallback
        org = item.get("organization", {})
        if org:
            org_phone = org.get("phone") or org.get("sanitized_phone")
            if org_phone:
                return self._format_phone(str(org_phone))
        
        return ""

    def _process_items(self, items: List[Dict], requested_fields: List[str]) -> List[Dict]:
        """Process and clean scraped items with robust error handling"""
        processed = []
        logger.info(f"Processing {len(items)} items with requested fields: {requested_fields}")
        
        for i, item in enumerate(items):
            try:
                logger.debug(f"Processing raw item {i+1}: {item}")
                proc_item = {}
                
                # Get company data from organization field
                company_data = item.get("organization", {}) or {}
                logger.debug(f"Company data found: {company_data}")
                
                for field in requested_fields:
                    try:
                        value = ""
                        
                        if field == "name":
                            value = str(item.get("name") or "").strip()
                            
                        elif field == "email":
                            value = str(item.get("email") or "").strip()
                            
                        elif field == "phone":
                            value = self._extract_phone(item)
                            
                        elif field == "location":
                            # Build location from available fields
                            parts = []
                            if item.get("city"):
                                parts.append(str(item["city"]))
                            if item.get("state"):
                                parts.append(str(item["state"]))
                            if item.get("country"):
                                parts.append(str(item["country"]))
                            
                            # Also try present_raw_address if parts are empty
                            if not parts and item.get("present_raw_address"):
                                value = str(item["present_raw_address"]).strip()
                            else:
                                value = ", ".join(parts)
                            
                        elif field == "company":
                            # Try organization.name first, then organization_name
                            value = str(company_data.get("name") or item.get("organization_name") or "").strip()
                            
                        elif field == "title":
                            value = str(item.get("title") or "").strip()
                            
                        elif field == "industry":
                            # Try personal industry first, then company industry
                            personal_industry = str(item.get("industry") or "").strip()
                            company_industry = str(company_data.get("industry") or "").strip()
                            value = personal_industry or company_industry
                            
                        elif field == "linkedin":
                            linkedin_url = str(item.get("linkedin_url") or "").strip()
                            if linkedin_url:
                                value = self._format_url(linkedin_url, "linkedin")
                                
                        elif field == "twitter":
                            # Try personal twitter first, then company twitter
                            personal_twitter = str(item.get("twitter_url") or "").strip()
                            if personal_twitter:
                                value = self._format_url(personal_twitter, "twitter")
                                logger.debug(f"Using personal twitter for {item.get('name', 'Unknown')}: {value}")
                            else:
                                company_twitter = str(company_data.get("twitter_url") or "").strip()
                                if company_twitter:
                                    value = self._format_url(company_twitter, "twitter")
                                    logger.debug(f"Using company twitter for {item.get('name', 'Unknown')}: {value}")
                            
                        elif field == "instagram":
                            # Try personal instagram first
                            personal_instagram = str(item.get("instagram_url") or "").strip()
                            if personal_instagram:
                                value = self._format_url(personal_instagram, "instagram")
                                logger.debug(f"Using personal instagram for {item.get('name', 'Unknown')}: {value}")
                            # Instagram is rarely available in Apollo data, so often empty
                            
                        elif field == "facebook":
                            # Try personal facebook first, then company facebook
                            personal_facebook = str(item.get("facebook_url") or "").strip()
                            if personal_facebook:
                                value = self._format_url(personal_facebook, "facebook")
                                logger.debug(f"Using personal facebook for {item.get('name', 'Unknown')}: {value}")
                            else:
                                company_facebook = str(company_data.get("facebook_url") or "").strip()
                                if company_facebook:
                                    value = self._format_url(company_facebook, "facebook")
                                    logger.debug(f"Using company facebook for {item.get('name', 'Unknown')}: {value}")
                            
                        elif field == "website":
                            # Try personal website first, then company website
                            personal_website = str(item.get("website") or item.get("website_url") or "").strip()
                            if personal_website:
                                value = self._format_url(personal_website, "website")
                                logger.debug(f"Using personal website for {item.get('name', 'Unknown')}: {value}")
                            else:
                                # Try multiple company website fields
                                company_website = (str(company_data.get("website_url") or "").strip() or 
                                                 str(company_data.get("primary_domain") or "").strip() or
                                                 str(item.get("organization_website_url") or "").strip())
                                if company_website:
                                    if not company_website.startswith("http"):
                                        company_website = "https://" + company_website
                                    value = self._format_url(company_website, "website")
                                    logger.debug(f"Using company website for {item.get('name', 'Unknown')}: {value}")
                        
                        # Add the processed value to the result
                        proc_item[field] = value
                        logger.debug(f"Processed {field}: '{value}'")
                        
                    except Exception as field_error:
                        logger.warning(f"Error processing field '{field}' for item {i+1}: {str(field_error)}")
                        proc_item[field] = ""  # Ensure field exists even if processing fails
                
                processed.append(proc_item)
                logger.debug(f"Processed lead {i+1}: {proc_item}")
                
            except Exception as item_error:
                logger.error(f"Error processing item {i+1}: {str(item_error)}")
                logger.debug(f"Problematic item data: {item}")
                # Continue processing other items instead of failing completely
                continue
        
        logger.info(f"Processing finished. {len(processed)} leads processed successfully")
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
        """Format phone numbers with more lenient validation"""
        if not phone or not str(phone).strip():
            return ""
            
        phone = str(phone).strip()
        logger.debug(f"Formatting phone: '{phone}'")
        
        # Remove common separators but keep digits and + at start
        import re
        original_phone = phone
        
        # First, try to extract any phone-like pattern
        phone_pattern = re.search(r'[\+]?[\d\s\-\(\)\.]{7,}', phone)
        if phone_pattern:
            phone = phone_pattern.group()
        
        # Clean the phone number
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        if not cleaned:
            logger.debug(f"No digits found in phone: '{original_phone}'")
            return ""
        
        # Handle international format
        if cleaned.startswith('+'):
            digits = re.sub(r'[^\d]', '', cleaned[1:])
            if len(digits) >= 7:  # More lenient minimum
                if len(digits) == 11 and digits.startswith('1'):  # US number with country code
                    formatted = f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
                elif len(digits) == 10:  # US number without country code
                    formatted = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
                else:
                    formatted = f"+{digits}"
                logger.debug(f"Formatted international phone: '{original_phone}' -> '{formatted}'")
                return formatted
        else:
            # Domestic format
            digits = re.sub(r'[^\d]', '', cleaned)
            if len(digits) == 10:  # Standard US format
                formatted = f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
                logger.debug(f"Formatted US phone: '{original_phone}' -> '{formatted}'")
                return formatted
            elif len(digits) == 11 and digits.startswith('1'):  # US with leading 1
                formatted = f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
                logger.debug(f"Formatted US phone with leading 1: '{original_phone}' -> '{formatted}'")
                return formatted
            elif len(digits) >= 7:  # Accept any number with 7+ digits
                formatted = digits
                logger.debug(f"Formatted general phone: '{original_phone}' -> '{formatted}'")
                return formatted
        
        # If we can't format it nicely, return the cleaned version if it has enough digits
        if len(cleaned.replace('+', '')) >= 7:
            logger.debug(f"Returning cleaned phone: '{original_phone}' -> '{cleaned}'")
            return cleaned
        
        logger.debug(f"Phone rejected (too short): '{original_phone}'")
        return ""
    
    def _format_url(self, url: str, url_type: str) -> str:
        """Format URLs for different platforms with more lenient validation"""
        if not url or not str(url).strip():
            return ""
            
        url = str(url).strip()
        logger.debug(f"Formatting URL '{url}' for type '{url_type}'")
        
        # Basic URL cleaning
        if url.lower().startswith(('www.', 'http://www.', 'https://www.')):
            if not url.startswith('http'):
                url = 'https://' + url
        elif not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Platform-specific validation - more lenient
        if url_type == "linkedin":
            # Accept linkedin.com URLs - don't require specific path patterns
            if "linkedin.com" in url.lower():
                logger.debug(f"LinkedIn URL accepted: {url}")
                return url
            else:
                logger.debug(f"LinkedIn URL rejected (no linkedin.com): {url}")
                return ""
        
        elif url_type == "twitter":
            # Accept twitter.com or x.com URLs
            if any(domain in url.lower() for domain in ["twitter.com", "x.com"]):
                logger.debug(f"Twitter/X URL accepted: {url}")
                return url
            else:
                logger.debug(f"Twitter URL rejected (no twitter.com or x.com): {url}")
                return ""
        
        elif url_type == "instagram":
            # Accept instagram.com URLs
            if "instagram.com" in url.lower():
                logger.debug(f"Instagram URL accepted: {url}")
                return url
            else:
                logger.debug(f"Instagram URL rejected (no instagram.com): {url}")
                return ""
        
        elif url_type == "facebook":
            # Accept facebook.com URLs (for company social)
            if "facebook.com" in url.lower():
                logger.debug(f"Facebook URL accepted: {url}")
                return url
            else:
                logger.debug(f"Facebook URL rejected (no facebook.com): {url}")
                return ""
        
        elif url_type == "website":
            # Very lenient website validation - just check it looks like a URL
            import re
            # Accept any URL that has a domain pattern
            if re.search(r'https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', url) or \
               re.search(r'[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', url):
                logger.debug(f"Website URL accepted: {url}")
                return url
            else:
                logger.debug(f"Website URL rejected (invalid format): {url}")
                return ""
        
        # Default case - return the URL as-is if it looks like a URL
        logger.debug(f"Default URL handling for {url_type}: {url}")
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

    def _is_valid_apollo_url(self, url: str) -> bool:
        """Check if a URL is a valid Apollo.io search URL"""
        if not url or not isinstance(url, str):
            return False
        
        # Check if it's an Apollo.io URL
        apollo_domains = [
            "apollo.io",
            "app.apollo.io",
            "www.apollo.io"
        ]
        
        # Basic URL validation
        if not any(domain in url.lower() for domain in apollo_domains):
            return False
        
        # Check for common Apollo search patterns
        valid_patterns = [
            "/#/people",
            "/people",
            "finderViewId=",
            "/search",
            "/contacts"
        ]
        
        # If it contains Apollo domain, it's likely valid
        # More specific validation can be added based on Apollo's URL structure
        return any(pattern in url for pattern in valid_patterns) or "apollo.io" in url.lower()

# Initialize client
apify_client = ApifyApolloClient()
