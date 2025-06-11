# File: app/ai_agent/apollo_agent.py
# Purpose: LangGraph Apollo URL Builder agent + FastAPI integration endpoints

import json
import re
import os
import traceback
import uuid
from typing import Dict, List, Optional, TypedDict, Annotated, Any, Set
from urllib.parse import quote
from openai import OpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.utils.logging_config import setup_logging
from app.core.exceptions import AIAgentError, ExternalAPIError
from app.ai_agent.models import RefinedUrlResponse, RefinedUrlRequest, SuggestionOutput, EnhancePromptRequest, EnhancePromptResponse

# Setup logging
logger = setup_logging()

router = APIRouter()

# Pydantic Models for API validation
class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Natural language search query")
    user_id: Optional[str] = Field(None, description="Optional user identifier")
    session_id: Optional[str] = Field(None, description="Optional session identifier")
    search_type: Optional[str] = Field(None, description="Optional search type")

class ApolloURLResponse(BaseModel):
    success: bool
    apollo_url: str
    parsed_data: Dict[str, Any]
    suggestions: List[str]
    error: Optional[str] = None

class SuggestionRequest(BaseModel):
    original_prompt: str = Field(..., min_length=1)
    accepted_suggestions: List[str] = Field(default=[])
    rejected_suggestions: List[str] = Field(default=[])
    current_apollo_url: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class ScrapeLeadsRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    lead_count: int = Field(100, ge=1, le=50000)
    data_fields: List[str] = Field(default=["name", "email", "company", "title"])
    apify_token: Optional[str] = None

# State management for LangGraph
class AgentState(TypedDict):
    original_prompt: str
    parsed_data: Dict
    apollo_url: str
    suggestions: List[str]
    messages: Annotated[list, add_messages]

def safe_extract(data: dict, field_path: str, default: Any = "") -> Any:
    """Safely extract nested field from dictionary following debug.mdc rules"""
    try:
        current = data
        for part in field_path.split('.'):
            if not isinstance(current, dict) or part not in current:
                return default
            current = current[part]
        return current if current is not None else default
    except Exception:
        return default

class ApolloURLBuilder:
    """LangGraph Agent for building Apollo.io URLs from natural language"""
    
    # Default exclusion IDs that must always be included
    DEFAULT_EXCLUSIONS = [
        "54a1173069702d4926150100",
        "5d33d0d1a3ae6113e19b1674", 
        "57c4ace7a6da9867ee5599e7",
        "5f2a39cb77a7440112460cf5",
        "5fca408962ba9b00f6d3c961",
        "62337760d02af100a5ca2468",
        "54a1215e69702d77c2eee302",
        "67270df43ca5f700019c0a08",
        "6131f47c6f7265000138e775",
        "54a1233869702d8ed4ee5703"
    ]
    
    BASE_URL = "https://app.apollo.io/#/people?sortAscending=false&sortByField=recommendations_score&page=1&contactEmailStatusV2[]=verified&contactEmailStatusV2[]=unverified"
    
    def __init__(self, openrouter_api_key: str, correlation_id: str = None):
        """Initialize with OpenRouter API key and correlation ID for logging"""
        self.correlation_id = correlation_id or str(uuid.uuid4())
        
        if not openrouter_api_key:
            logger.error(f"OpenRouter API key missing - function: ApolloURLBuilder.__init__ - correlation_id: {self.correlation_id}")
            raise AIAgentError("OpenRouter API key is required")
            
        try:
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_api_key,
            )
            self.graph = self._build_graph()
            logger.info(f"ApolloURLBuilder initialized successfully - correlation_id: {self.correlation_id}")
        except Exception as e:
            logger.error(f"Failed to initialize ApolloURLBuilder: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            raise AIAgentError(f"Failed to initialize agent: {str(e)}") from e
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        try:
            workflow = StateGraph(AgentState)
            
            # Add nodes
            workflow.add_node("parse_prompt", self.parse_prompt_node)
            workflow.add_node("refine_data", self.refine_data_node) 
            workflow.add_node("build_url", self.build_url_node)
            workflow.add_node("suggest_improvements", self.suggest_improvements_node)
            
            # Define the flow
            workflow.set_entry_point("parse_prompt")
            workflow.add_edge("parse_prompt", "refine_data")
            workflow.add_edge("refine_data", "build_url")
            workflow.add_edge("build_url", "suggest_improvements")
            workflow.add_edge("suggest_improvements", END)
            
            return workflow.compile()
        except Exception as e:
            logger.error(f"Failed to build LangGraph workflow: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            raise AIAgentError(f"Failed to build workflow: {str(e)}") from e
    
    def parse_prompt_node(self, state: AgentState) -> AgentState:
        """Parse natural language prompt into structured data with safe extraction"""
        original_prompt = safe_extract(state, "original_prompt", "")
        
        if not original_prompt:
            logger.error(f"Empty prompt provided - function: parse_prompt_node - correlation_id: {self.correlation_id}")
            state = state.copy()
            state["parsed_data"] = {}
            return state
            
        prompt = f"""
        Parse this search request into structured Apollo.io search parameters:
        
        Query: "{original_prompt}"
        
        Extract and return JSON with these fields (use null if not specified):
        {{
            "person_titles": ["list of job titles/roles"],
            "person_locations": ["list of cities/regions"], 
            "company_keywords": ["list of company types/industries"],
            "company_size_ranges": ["list like '1-10', '11-50', '51-200', etc"],
            "additional_filters": ["any other relevant filters"]
        }}
        
        Examples:
        - "growth marketers" → person_titles: ["growth marketer", "growth marketing manager"]
        - "SaaS companies" → company_keywords: ["saas", "software"]
        - "New York" → person_locations: ["New York"]
        - "startups" → company_size_ranges: ["1-10", "11-50"]
        
        Return only valid JSON, no extra text.
        """
        
        try:
            logger.debug(f"Sending prompt to OpenAI for parsing - prompt: {original_prompt[:200]}... - correlation_id: {self.correlation_id}")
            
            response = self.client.chat.completions.create(
                model="google/gemma-3-27b-it:free",
                messages=[{"role": "user", "content": prompt}]
            )
            
            if not response or not response.choices:
                raise ExternalAPIError("Empty response from OpenAI")
                
            content = safe_extract(response.choices[0].message.__dict__, "content", "").strip()
            
            if not content:
                raise ExternalAPIError("Empty content in OpenAI response")
            
            # Extract JSON from response (handle cases where LLM adds extra text)
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group()
            
            parsed_data = json.loads(content)
            
            # Validate parsed data structure
            if not isinstance(parsed_data, dict):
                raise ValueError("Parsed data is not a dictionary")
            
            state = state.copy()
            state["parsed_data"] = parsed_data
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system", 
                "content": f"Parsed prompt: {json.dumps(parsed_data, indent=2)}"
            })
            state["messages"] = messages
            
            logger.debug(f"Successfully parsed prompt with fields: {list(parsed_data.keys())} - correlation_id: {self.correlation_id}")
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed, using fallback: {str(e)} - correlation_id: {self.correlation_id}")
            # Fallback parsing
            state = state.copy()
            state["parsed_data"] = self._fallback_parse(original_prompt)
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system",
                "content": f"Used fallback parsing due to JSON error: {str(e)}"
            })
            state["messages"] = messages
            
        except Exception as e:
            logger.error(f"Prompt parsing failed completely: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            # Fallback parsing
            state = state.copy()
            state["parsed_data"] = self._fallback_parse(original_prompt)
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system",
                "content": f"Used fallback parsing due to error: {str(e)}"
            })
            state["messages"] = messages
        
        return state
    
    def _fallback_parse(self, prompt: str) -> Dict:
        """Simple regex-based fallback parsing with safe defaults"""
        if not prompt:
            return {
                "person_titles": [],
                "person_locations": [],
                "company_keywords": [],
                "company_size_ranges": [],
                "additional_filters": []
            }
            
        prompt_lower = prompt.lower()
        
        # Common job title patterns
        titles = []
        title_patterns = [
            r'(\w*\s*marketing?\w*)',
            r'(\w*\s*sales?\w*)', 
            r'(\w*\s*engineer\w*)',
            r'(\w*\s*developer\w*)',
            r'(\w*\s*manager\w*)',
            r'(\w*\s*director\w*)',
            r'(\w*\s*founder\w*)',
            r'(\w*\s*ceo\w*)',
            r'(\w*\s*cto\w*)'
        ]
        
        for pattern in title_patterns:
            try:
                matches = re.findall(pattern, prompt_lower)
                titles.extend([m.strip() for m in matches if m.strip()])
            except Exception as e:
                logger.debug(f"Regex pattern failed: {pattern}, error: {str(e)}")
                continue
        
        # Location patterns
        locations = []
        location_words = ['new york', 'san francisco', 'london', 'berlin', 'toronto', 'boston', 'seattle', 'chicago']
        for loc in location_words:
            if loc in prompt_lower:
                locations.append(loc)
        
        # Company keywords
        keywords = []
        keyword_patterns = ['saas', 'software', 'startup', 'fintech', 'ecommerce', 'ai', 'blockchain']
        for kw in keyword_patterns:
            if kw in prompt_lower:
                keywords.append(kw)
        
        return {
            "person_titles": titles[:3],  # Limit to 3
            "person_locations": locations,
            "company_keywords": keywords,
            "company_size_ranges": [],
            "additional_filters": []
        }
    
    def refine_data_node(self, state: AgentState) -> AgentState:
        """Refine and validate the parsed data with safe extraction"""
        parsed_data = safe_extract(state, "parsed_data", {})
        
        if not isinstance(parsed_data, dict):
            logger.warning(f"Invalid parsed_data type: {type(parsed_data)}, resetting - correlation_id: {self.correlation_id}")
            parsed_data = {}
        
        # Clean and normalize data with safe extraction
        person_titles = safe_extract(parsed_data, "person_titles", [])
        if person_titles and isinstance(person_titles, list):
            # Remove duplicates and normalize
            titles = list(set([str(t).lower().strip() for t in person_titles if t]))
            parsed_data["person_titles"] = titles[:5]  # Limit to 5
        else:
            parsed_data["person_titles"] = []
        
        person_locations = safe_extract(parsed_data, "person_locations", [])
        if person_locations and isinstance(person_locations, list):
            locations = list(set([str(l).title().strip() for l in person_locations if l]))
            parsed_data["person_locations"] = locations[:3]  # Limit to 3
        else:
            parsed_data["person_locations"] = []
        
        company_keywords = safe_extract(parsed_data, "company_keywords", [])
        if company_keywords and isinstance(company_keywords, list):
            keywords = list(set([str(k).lower().strip() for k in company_keywords if k]))
            parsed_data["company_keywords"] = keywords[:5]  # Limit to 5
        else:
            parsed_data["company_keywords"] = []
        
        # Ensure all required fields exist
        if "company_size_ranges" not in parsed_data:
            parsed_data["company_size_ranges"] = []
        if "additional_filters" not in parsed_data:
            parsed_data["additional_filters"] = []
        
        state = state.copy()
        state["parsed_data"] = parsed_data
        messages = safe_extract(state, "messages", [])
        messages.append({
            "role": "system",
            "content": f"Refined data: {json.dumps(parsed_data, indent=2)}"
        })
        state["messages"] = messages
        
        logger.debug(f"Data refinement completed - titles: {len(parsed_data.get('person_titles', []))}, locations: {len(parsed_data.get('person_locations', []))}, keywords: {len(parsed_data.get('company_keywords', []))} - correlation_id: {self.correlation_id}")
        
        return state
    
    def build_url_node(self, state: AgentState) -> AgentState:
        """Build the final Apollo.io URL with safe extraction"""
        parsed = safe_extract(state, "parsed_data", {})
        url_parts = [self.BASE_URL]
        
        try:
            # Add person titles with safe extraction
            person_titles = safe_extract(parsed, "person_titles", [])
            if person_titles and isinstance(person_titles, list):
                for title in person_titles:
                    if title:  # Skip empty titles
                        url_parts.append(f"personTitles[]={quote(str(title))}")
            
            # Add person locations with safe extraction
            person_locations = safe_extract(parsed, "person_locations", [])
            if person_locations and isinstance(person_locations, list):
                for location in person_locations:
                    if location:  # Skip empty locations
                        url_parts.append(f"personLocations[]={quote(str(location))}")
            
            # Add company keywords as organization tags with safe extraction
            company_keywords = safe_extract(parsed, "company_keywords", [])
            if company_keywords and isinstance(company_keywords, list):
                for keyword in company_keywords:
                    if keyword:  # Skip empty keywords
                        url_parts.append(f"qOrganizationKeywordTags[]={quote(str(keyword))}")
                
                # Add the required organization keyword fields only if we have keywords
                if any(company_keywords):
                    url_parts.extend([
                        "includedOrganizationKeywordFields[]=tags",
                        "includedOrganizationKeywordFields[]=name", 
                        "includedOrganizationKeywordFields[]=social_media_description"
                    ])
            
            # Add company size ranges with safe extraction
            company_size_ranges = safe_extract(parsed, "company_size_ranges", [])
            if company_size_ranges and isinstance(company_size_ranges, list):
                for size_range in company_size_ranges:
                    if size_range:  # Skip empty ranges
                        url_parts.append(f"organizationNumEmployeesRanges[]={quote(str(size_range))}")
            
            # Always add default exclusions
            for exclusion_id in self.DEFAULT_EXCLUSIONS:
                url_parts.append(f"notOrganizationIds[]={exclusion_id}")
            
            # Join all parts
            apollo_url = "&".join(url_parts)
            
            state = state.copy()
            state["apollo_url"] = apollo_url
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system",
                "content": f"Built Apollo URL: {apollo_url[:200]}..."
            })
            state["messages"] = messages
            
            logger.info(f"Apollo URL built successfully - length: {len(apollo_url)} - correlation_id: {self.correlation_id}")
            
        except Exception as e:
            logger.error(f"Failed to build Apollo URL: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            # Fallback to base URL
            state = state.copy()
            state["apollo_url"] = self.BASE_URL
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system",
                "content": f"URL building failed, using base URL: {str(e)}"
            })
            state["messages"] = messages
        
        return state
    
    def suggest_improvements_node(self, state: AgentState) -> AgentState:
        """Generate suggestions to improve search results with safe extraction"""
        parsed = safe_extract(state, "parsed_data", {})
        suggestions = []
        
        try:
            # Suggest additional keywords with safe extraction
            company_keywords = safe_extract(parsed, "company_keywords", [])
            if company_keywords and isinstance(company_keywords, list):
                if "saas" in company_keywords:
                    suggestions.append("Add 'software' or 'cloud' keywords to expand SaaS results by ~2,000 leads")
                
                person_titles = safe_extract(parsed, "person_titles", [])
                if person_titles and "marketing" in str(person_titles).lower():
                    suggestions.append("Add 'growth' or 'digital marketing' to capture more marketing roles")
            
            # Suggest additional locations with safe extraction
            person_locations = safe_extract(parsed, "person_locations", [])
            if person_locations and isinstance(person_locations, list):
                current_locations = [str(loc).lower() for loc in person_locations]
                if "new york" in current_locations:
                    suggestions.append("Consider adding 'San Francisco' or 'Boston' for more tech hub coverage")
                if len(person_locations) == 1:
                    suggestions.append("Add 2-3 more cities to increase your lead pool by 40-60%")
            
            # Suggest company size if not specified
            company_size_ranges = safe_extract(parsed, "company_size_ranges", [])
            if not company_size_ranges or not isinstance(company_size_ranges, list) or len(company_size_ranges) == 0:
                suggestions.append("Specify company size (e.g., '11-50' for startups, '51-200' for mid-size) to refine results")
            
            # General suggestions based on data completeness
            person_titles = safe_extract(parsed, "person_titles", [])
            if not person_titles or not isinstance(person_titles, list) or len(person_titles) == 0:
                suggestions.append("Add specific job titles to target the right decision makers")
            
            if len(suggestions) == 0:
                suggestions.append("Your search looks comprehensive! Consider testing with broader locations if you need more leads.")
            
            state = state.copy()
            state["suggestions"] = suggestions[:3]  # Limit to 3 suggestions
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system", 
                "content": f"Generated {len(suggestions)} suggestions"
            })
            state["messages"] = messages
            
            logger.debug(f"Generated {len(suggestions)} suggestions - correlation_id: {self.correlation_id}")
            
        except Exception as e:
            logger.error(f"Failed to generate suggestions: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            # Fallback to default suggestion
            state = state.copy()
            state["suggestions"] = ["Consider refining your search criteria for better results."]
            messages = safe_extract(state, "messages", [])
            messages.append({
                "role": "system",
                "content": f"Suggestion generation failed: {str(e)}"
            })
            state["messages"] = messages
        
        return state
    
    def process_query(self, prompt: str) -> Dict[str, Any]:
        """Main entry point to process a natural language query"""
        try:
            logger.info(f"Starting query processing - prompt: {prompt[:100]}... - correlation_id: {self.correlation_id}")
            
            initial_state = {
                "original_prompt": prompt,
                "parsed_data": {},
                "apollo_url": "",
                "suggestions": [],
                "messages": []
            }
            
            # Run the graph
            final_state = self.graph.invoke(initial_state)
            
            result = {
                "apollo_url": safe_extract(final_state, "apollo_url", self.BASE_URL),
                "parsed_data": safe_extract(final_state, "parsed_data", {}), 
                "suggestions": safe_extract(final_state, "suggestions", []),
                "success": True
            }
            
            logger.info(f"Query processing completed successfully - correlation_id: {self.correlation_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Query processing failed: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            raise AIAgentError(f"Failed to process query: {str(e)}") from e

    async def refine_query(
        self,
        original_prompt: str,
        applied_suggestion_ids: List[str],
        current_params: Dict[str, Any],
        search_type: Optional[str] = "people",
        correlation_id: Optional[str] = None # For logging
    ) -> Dict[str, Any]:
        
        log_context = {
            "original_prompt": original_prompt,
            "applied_suggestion_ids": applied_suggestion_ids,
            "current_params_keys": list(current_params.keys()),
            "search_type": search_type,
            "correlation_id": correlation_id
        }
        logger.info("refine_query called", **log_context)

        if not self.client:
            logger.error("OpenAI client not initialized in refine_query due to missing API key.", **log_context)
            raise ValueError("LLM client is not available. OPENROUTER_API_KEY might be missing.")

        suggestion_blueprints = """
        Please customize these blueprints based on your application's needs:
        - "ADD_LOCATION_<LOC>": add location {LOC} to 'person_locations' or 'organization_locations' array.
        - "REMOVE_TITLE_<TITLE>": remove title {TITLE} from 'person_titles' array.
        - "EXPAND_KEYWORD_<KW>": add keyword {KW} to 'q_organization_keywords' or 'q_person_keywords' array for broader results.
        - "SET_EMPLOYEE_RANGE_<MIN>-<MAX>": set 'organization_num_employees_ranges' to ["{MIN}-{MAX}"].
        - "ADD_INDUSTRY_<IND>": add industry {IND} to 'q_organization_industries' array.
        - "REQUIRE_VERIFIED_EMAIL": set 'contact_email_status_v2' to ["verified"].
        - "ADD_COMPANY_HEADQUARTERS_<LOC>": add {LOC} to 'organization_hq_locations' array.
        - "SET_JOB_POSTING_RECENCY_<DAYS>": set 'job_posting_published_at_ranges' (e.g., "past_30_days").
        - "FILTER_TECHNOLOGY_<TECH>": add {TECH} to 'organization_technology_names'.
        (Example: "ADD_LOCATION_London", "EXPAND_KEYWORD_AI", "SET_EMPLOYEE_RANGE_50-200")
        """

        system_message = f"""
You are an expert Apollo.io URL builder. Your goal is to refine an existing search based on user-applied suggestions or generate an initial search if no parameters or suggestions are provided.
You will receive:
- original_prompt: {original_prompt!r}
- current_params: {json.dumps(current_params)}
- applied_suggestion_ids: {applied_suggestion_ids}
- search_type: {search_type or 'people'} (Assume 'people' if not specified)

Based on the 'original_prompt' and any 'applied_suggestion_ids', you must update the 'current_params' to reflect these changes.
Use the following blueprints to understand how suggestion IDs modify parameters:
{suggestion_blueprints}

Then, construct a new Apollo.io URL using the 'updated_params'.
The Apollo URL should be for {search_type or 'people'}. Key parameter arrays are:
For people: 'person_titles', 'person_locations', 'q_person_keywords', 'person_functions', 'person_seniorities'.
For companies: 'q_organization_industries', 'organization_locations', 'q_organization_keywords', 'organization_num_employees_ranges', 'organization_technology_names', 'organization_funding_series', 'organization_hq_locations'.
Always ensure parameter names are correct for Apollo.io.

Finally, generate a list of NEW, actionable, and diverse suggestions that have NOT been applied yet. These suggestions should help the user further refine their search. Each suggestion must have a unique 'id' (following the blueprint format), a 'type' (e.g., "add_filter", "expand_scope", "remove_filter", "modify_filter"), and user-facing 'text'.

Return ONLY a single valid JSON object with the following keys:
  {{
    "apollo_url": "<fully built Apollo URL based on updated_params>",
    "updated_params": {{ ... }},        // The complete and updated parameter dictionary reflecting all applied changes and original prompt elements.
    "new_suggestions": [              // An array of NEW suggestion objects: {{ "id": "...", "type":"...", "text":"..." }}
      // Example: {{ "id":"ADD_LOCATION_San Francisco", "type":"add_filter", "text":"Consider adding 'San Francisco' to expand West Coast search?" }}
    ]
  }}
Ensure 'updated_params' accurately reflects ALL active filters. If 'current_params' was empty and no suggestions applied, derive parameters from 'original_prompt'.
If 'applied_suggestion_ids' are present, modify 'current_params' accordingly before building the URL and generating new suggestions.
Do NOT return any extra text, explanations, or markdown formatting—only the valid JSON object.
"""
        user_interaction_prompt = f"Original query: {original_prompt}."
        if applied_suggestion_ids:
            user_interaction_prompt += f" User has applied these suggestions: {', '.join(applied_suggestion_ids)}. Please refine the parameters and generate a new URL and new suggestions."
        else:
            user_interaction_prompt += " This is an initial query. Please derive parameters from the prompt, generate an Apollo URL, and provide initial suggestions."

        logger.debug("Calling LLM for refined query", system_prompt_preview=system_message[:200]+"...", user_prompt=user_interaction_prompt, **log_context)

        response = await self.client.chat.completions.create(
            model="google/gemma-3-27b-it:free",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_interaction_prompt},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content.strip()
        logger.debug("LLM response for refined query", raw_content_preview=content[:200]+"...", **log_context)

        try:
            json_match = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error("LLM returned invalid JSON for refined query.", error=str(e), raw_content=content, **log_context)
            m = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL | re.IGNORECASE)
            if not m: # Try without backticks if not found
                 m = re.search(r"(\{.*?\})", content, re.DOTALL)

            if m:
                try:
                    json_text_blob = m.group(1)
                    json_match = json.loads(json_text_blob)
                    logger.info("Successfully extracted JSON blob from LLM's mixed response.", extracted_blob_preview=json_text_blob[:200]+"...", **log_context)
                except json.JSONDecodeError as e_blob:
                    logger.error("Failed to parse extracted JSON blob.", error_blob=str(e_blob), extracted_blob=json_text_blob, **log_context)
                    raise ValueError(f"LLM returned invalid JSON and blob extraction failed. Raw response snippet: {content[:500]}") from e_blob
            else:
                raise ValueError(f"LLM returned invalid JSON. Raw response snippet: {content[:500]}") from e
        
        apollo_url = json_match.get("apollo_url")
        raw_suggestions = json_match.get("new_suggestions", [])
        updated_params = json_match.get("updated_params", {})

        if not isinstance(apollo_url, str) or not apollo_url.startswith("https://app.apollo.io"):
            logger.warning("LLM did not return a valid Apollo URL string.", received_url=apollo_url, **log_context)
            # Potentially raise error or return a flag
        
        if not isinstance(updated_params, dict):
            logger.warning("LLM did not return valid updated_params dictionary. Using original params.", received_params_type=type(updated_params).__name__, **log_context)
            updated_params = current_params # Fallback
        
        parsed_new_suggestions = []
        if isinstance(raw_suggestions, list):
            for sugg_data in raw_suggestions:
                try:
                    if isinstance(sugg_data, dict):
                        # Ensure all required fields for SuggestionOutput are present
                        if "id" in sugg_data and "type" in sugg_data and "text" in sugg_data:
                             parsed_new_suggestions.append(SuggestionOutput(**sugg_data))
                        else:
                            logger.warning("Skipping suggestion due to missing fields", suggestion_data=sugg_data, **log_context)
                    else:
                        logger.warning("Skipping non-dict suggestion item", suggestion_item=sugg_data, **log_context)
                except Exception as e_sugg:
                    logger.warning("Failed to parse a suggestion from LLM", suggestion_data=sugg_data, error=str(e_sugg), **log_context)
        else:
            logger.warning("LLM 'new_suggestions' was not a list.", received_suggestions_type=type(raw_suggestions).__name__, **log_context)

        logger.info("refine_query successfully processed.",
                    apollo_url_present=bool(apollo_url),
                    num_new_suggestions=len(parsed_new_suggestions),
                    updated_params_keys=list(updated_params.keys()),
                    **log_context)

        return {
            "apollo_url": apollo_url,
            "new_suggestions": parsed_new_suggestions,
            "updated_params": updated_params,
        }

    def enhance_prompt(self, original_prompt: str, target_lead_count: int = 1000, current_lead_count: int = None) -> Dict[str, Any]:
        """Enhanced prompt rewriting for better lead generation"""
        try:
            logger.info(f"Starting prompt enhancement - original: {original_prompt[:100]}... - correlation_id: {self.correlation_id}")
            
            enhancement_prompt = f"""
You are an expert lead generation strategist and Apollo.io search specialist. Your goal is to rewrite user prompts to maximize lead discovery while maintaining targeting precision.

ORIGINAL PROMPT: "{original_prompt}"
TARGET LEAD COUNT: {target_lead_count}
CURRENT ESTIMATED LEADS: {current_lead_count or "Unknown"}

**Your Mission:** Rewrite this prompt to be significantly more effective for finding qualified leads.

**Lead Generation Enhancement Techniques:**
1. **Expand Job Title Variations**: Include synonyms, similar roles, and related positions
2. **Broaden Company Descriptions**: Add industry variations, business models, and company stage options  
3. **Geographic Expansion**: Suggest additional high-value locations and remote work considerations
4. **Seniority & Function Mixing**: Include decision-makers and influencers across relevant departments
5. **Technology & Industry Keywords**: Add relevant tech stacks, industries, and business models
6. **Size & Growth Stage Diversity**: Include various company sizes and growth stages
7. **Timing & Activity Filters**: Consider recent funding, hiring activity, or company changes

**Enhancement Rules:**
- Keep the core intent and target persona intact
- Expand reach WITHOUT sacrificing lead quality
- Focus on decision-makers and budget holders
- Prioritize companies likely to have purchasing power
- Include both established companies and high-growth startups
- Add geographic diversity in major business hubs
- Consider remote-first companies for broader reach

**Response Format (JSON):**
{{
    "enhanced_prompt": "Your dramatically improved prompt here",
    "enhancement_explanation": "Clear explanation of what you improved and why",
    "estimated_lead_increase": "Estimated percentage increase (e.g., '200-300% more leads')",
    "enhancement_techniques": ["List of specific techniques used"],
    "targeting_improvements": ["Specific targeting improvements made"],
    "why_better": "Why this will find more qualified leads"
}}

**Examples of Good Enhancements:**
- Original: "Marketing managers at SaaS companies"
- Enhanced: "Marketing managers, digital marketing directors, growth marketing leads, and VP of marketing at SaaS companies, software companies, cloud platforms, and B2B technology startups in North America and Europe"

- Original: "Sales directors at fintech startups"  
- Enhanced: "Sales directors, VP of sales, revenue operations managers, and business development leaders at fintech companies, financial services startups, payment platforms, lending companies, and insurtech firms with 10-500 employees"

Focus on dramatic expansion while maintaining quality. Return ONLY valid JSON.
"""
            
            logger.debug(f"Sending enhancement prompt to OpenAI - correlation_id: {self.correlation_id}")
            
            response = self.client.chat.completions.create(
                model="google/gemma-3-27b-it:free",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a world-class lead generation expert who specializes in Apollo.io searches. Your expertise is in rewriting search prompts to find 3-5x more qualified leads while maintaining targeting precision."
                    },
                    {"role": "user", "content": enhancement_prompt}
                ],
                temperature=0.7  # Slightly creative for better variations
            )
            
            if not response or not response.choices:
                raise ExternalAPIError("Empty response from OpenAI")
                
            content = safe_extract(response.choices[0].message.__dict__, "content", "").strip()
            
            if not content:
                raise ExternalAPIError("Empty content in OpenAI response")
            
            # Extract JSON from response (handle cases where LLM adds extra text)
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                content = json_match.group()
            
            enhancement_data = json.loads(content)
            
            # Validate enhancement data structure
            if not isinstance(enhancement_data, dict):
                raise ValueError("Enhancement data is not a dictionary")
            
            # Ensure required fields exist
            enhanced_prompt = safe_extract(enhancement_data, "enhanced_prompt", original_prompt)
            if not enhanced_prompt or enhanced_prompt == original_prompt:
                # Fallback enhancement
                enhanced_prompt = self._fallback_enhance(original_prompt)
                enhancement_data["enhanced_prompt"] = enhanced_prompt
                enhancement_data["enhancement_explanation"] = "Used fallback enhancement due to processing issues"
                enhancement_data["estimated_lead_increase"] = "50-100% more leads"
                enhancement_data["enhancement_techniques"] = ["Geographic expansion", "Job title variations"]
            
            logger.info(f"Prompt enhancement completed successfully - correlation_id: {self.correlation_id}")
            
            return {
                "success": True,
                "enhanced_prompt": enhanced_prompt,
                "enhancement_explanation": safe_extract(enhancement_data, "enhancement_explanation", "Enhanced for better lead discovery"),
                "estimated_lead_increase": safe_extract(enhancement_data, "estimated_lead_increase", "100-200% more leads"),
                "enhancement_techniques": safe_extract(enhancement_data, "enhancement_techniques", ["Expanded targeting"]),
                "targeting_improvements": safe_extract(enhancement_data, "targeting_improvements", []),
                "why_better": safe_extract(enhancement_data, "why_better", "Broader targeting while maintaining quality")
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed in enhancement, using fallback: {str(e)} - correlation_id: {self.correlation_id}")
            enhanced_prompt = self._fallback_enhance(original_prompt)
            return {
                "success": True,
                "enhanced_prompt": enhanced_prompt,
                "enhancement_explanation": "Used fallback enhancement due to parsing issues",
                "estimated_lead_increase": "50-100% more leads",
                "enhancement_techniques": ["Basic expansion", "Geographic diversity"],
                "targeting_improvements": [],
                "why_better": "Expanded targeting for more lead discovery"
            }
            
        except Exception as e:
            logger.error(f"Prompt enhancement failed: {str(e)} - correlation_id: {self.correlation_id}", exc_info=True)
            raise AIAgentError(f"Failed to enhance prompt: {str(e)}") from e
    
    def _fallback_enhance(self, prompt: str) -> str:
        """Simple fallback enhancement when AI processing fails"""
        if not prompt:
            return prompt
            
        prompt_lower = prompt.lower()
        
        # Add geographic expansion
        geographic_additions = []
        if "san francisco" in prompt_lower:
            geographic_additions.extend(["New York", "Seattle", "Austin"])
        elif "new york" in prompt_lower:
            geographic_additions.extend(["San Francisco", "Boston", "Chicago"])
        elif not any(city in prompt_lower for city in ["francisco", "york", "london", "berlin", "toronto"]):
            geographic_additions.extend(["San Francisco", "New York", "London"])
        
        # Add job title variations
        title_expansions = {}
        if "marketing manager" in prompt_lower:
            title_expansions["marketing manager"] = "marketing managers, digital marketing directors, growth marketing leads"
        if "sales director" in prompt_lower:
            title_expansions["sales director"] = "sales directors, VP of sales, revenue operations managers"
        if "software engineer" in prompt_lower:
            title_expansions["software engineer"] = "software engineers, full-stack developers, senior developers"
        
        enhanced = prompt
        
        # Apply title expansions
        for original, expanded in title_expansions.items():
            enhanced = enhanced.replace(original, expanded)
        
        # Add geographic expansion
        if geographic_additions:
            enhanced += f" in {', '.join(geographic_additions)} and surrounding areas"
        
        # Add company size diversity if not specified
        if not any(size in prompt_lower for size in ["startup", "enterprise", "small", "large", "employees"]):
            enhanced += " at companies ranging from startups to enterprise organizations"
        
        return enhanced

# FastAPI Endpoints
@router.post("/generate-apollo-url", response_model=ApolloURLResponse)
async def generate_apollo_url(request: PromptRequest, req: Request = None):
    """Generate Apollo.io URL from natural language prompt"""
    correlation_id = getattr(req.state, 'correlation_id', str(uuid.uuid4())) if req else str(uuid.uuid4())
    
    logger.info(f"Received Apollo URL generation request - prompt: {request.prompt[:100]}... - user_id: {request.user_id or 'anonymous'} - correlation_id: {correlation_id}")
    
    try:
        # Get OpenRouter API key from environment
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            logger.error(f"OpenRouter API key not configured - correlation_id: {correlation_id}")
            # Provide a fallback response with a basic Apollo URL
            fallback_url = "https://app.apollo.io/#/people?sortAscending=false&sortByField=recommendations_score&page=1&contactEmailStatusV2[]=verified&contactEmailStatusV2[]=unverified"
            return ApolloURLResponse(
                success=True,
                apollo_url=fallback_url,
                parsed_data={"fallback": True, "original_prompt": request.prompt},
                suggestions=["Set up OpenRouter API key for AI-powered URL generation", "Use manual Apollo.io search for more specific targeting"],
                error="AI service not configured - using basic fallback URL"
            )
        
        # Initialize agent
        agent = ApolloURLBuilder(openrouter_api_key, correlation_id)
        
        # Process query
        result = agent.process_query(request.prompt)
        
        return ApolloURLResponse(
            success=result["success"],
            apollo_url=result["apollo_url"],
            parsed_data=result["parsed_data"],
            suggestions=result["suggestions"]
        )
        
    except AIAgentError as e:
        logger.error(f"AI Agent error in URL generation: {str(e)} - correlation_id: {correlation_id}")
        return ApolloURLResponse(
            success=False,
            apollo_url="",
            parsed_data={},
            suggestions=[],
            error="AI service temporarily unavailable"
        )
        
    except Exception as e:
        logger.error(f"Unexpected error in URL generation: {str(e)} - correlation_id: {correlation_id}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/refine-apollo-url", response_model=ApolloURLResponse)
async def refine_apollo_url(request: SuggestionRequest, req: Request = None):
    """Refine Apollo.io URL based on user feedback"""
    correlation_id = getattr(req.state, 'correlation_id', str(uuid.uuid4())) if req else str(uuid.uuid4())
    
    logger.info(f"Received Apollo URL refinement request - prompt: {request.original_prompt[:100]}... - suggestions: {len(request.accepted_suggestions)} accepted, {len(request.rejected_suggestions)} rejected - correlation_id: {correlation_id}")
    
    try:
        # Combine original prompt with accepted suggestions
        refined_prompt = request.original_prompt
        if request.accepted_suggestions:
            refined_prompt += " " + " ".join(request.accepted_suggestions)
        
        # Get OpenRouter API key from environment
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            logger.error(f"OpenRouter API key not configured for refinement - correlation_id: {correlation_id}")
            # Provide a fallback response with a basic Apollo URL
            fallback_url = "https://app.apollo.io/#/people?sortAscending=false&sortByField=recommendations_score&page=1&contactEmailStatusV2[]=verified&contactEmailStatusV2[]=unverified"
            return ApolloURLResponse(
                success=True,
                apollo_url=fallback_url,
                parsed_data={"fallback": True, "original_prompt": request.original_prompt},
                suggestions=["Set up OpenRouter API key for AI-powered URL refinement", "Use manual Apollo.io search for more specific targeting"],
                error="AI service not configured - using basic fallback URL"
            )
        
        # Initialize agent and process refined query
        agent = ApolloURLBuilder(openrouter_api_key, correlation_id)
        result = agent.process_query(refined_prompt)
        
        return ApolloURLResponse(
            success=result["success"],
            apollo_url=result["apollo_url"],
            parsed_data=result["parsed_data"],
            suggestions=result["suggestions"]
        )
        
    except Exception as e:
        logger.error(f"Error in URL refinement: {str(e)} - correlation_id: {correlation_id}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/scrape-apollo-leads")
async def scrape_apollo_leads(request: ScrapeLeadsRequest, req: Request = None):
    """Generate Apollo URL and return scraper payload (integration stub)"""
    correlation_id = getattr(req.state, 'correlation_id', str(uuid.uuid4())) if req else str(uuid.uuid4())
    
    logger.info(f"Received Apollo scrape leads request - prompt: {request.prompt[:100]}... - lead_count: {request.lead_count} - correlation_id: {correlation_id}")
    
    try:
        # Generate URL first
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            raise HTTPException(status_code=503, detail="AI service not available")
        
        agent = ApolloURLBuilder(openrouter_api_key, correlation_id)
        url_result = agent.process_query(request.prompt)
        
        apollo_url = url_result["apollo_url"]
        
        # Build scraper payload for integration with existing scrape endpoint
        scraper_payload = {
            "urls": [apollo_url],
            "lead_count": request.lead_count,
            "fields": request.data_fields,
            "apify_token": request.apify_token  # TODO: Integrate with app.api.routes.scrape
        }
        
        return {
            "success": True,
            "apollo_url": apollo_url,
            "parsed_data": url_result["parsed_data"],
            "suggestions": url_result["suggestions"],
            "scraper_payload": scraper_payload,
            "message": "URL generated successfully. Integration with scraper pending."
        }
        
    except Exception as e:
        logger.error(f"Error in scrape leads endpoint: {str(e)} - correlation_id: {correlation_id}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/examples")
async def get_examples():
    """Return example prompts for the Apollo URL builder"""
    return {
        "examples": [
            "Find marketing managers at SaaS companies in New York",
            "Growth marketers at startups in San Francisco",
            "Software engineers at fintech companies in London",
            "Sales directors at e-commerce companies with 50-200 employees",
            "CTOs at AI companies in Boston",
            "Product managers at blockchain startups"
        ]
    }

@router.post("/enhance-prompt", response_model=EnhancePromptResponse)
async def enhance_prompt(request: EnhancePromptRequest, req: Request = None):
    """Enhance user prompt for better lead generation using AI"""
    correlation_id = getattr(req.state, 'correlation_id', str(uuid.uuid4())) if req else str(uuid.uuid4())
    
    logger.info(f"Received prompt enhancement request - prompt: {request.prompt[:100]}... - target_leads: {request.target_lead_count} - user_id: {request.user_id or 'anonymous'} - correlation_id: {correlation_id}")
    
    try:
        # Get OpenRouter API key from environment
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_api_key:
            logger.error(f"OpenRouter API key not configured for enhancement - correlation_id: {correlation_id}")
            # Provide a fallback enhancement
            fallback_enhancement = f"{request.prompt} with expanded targeting and geographic diversity for maximum lead generation"
            return EnhancePromptResponse(
                success=True,
                enhanced_prompt=fallback_enhancement,
                enhancement_explanation="Applied basic expansion due to AI service not being configured",
                estimated_lead_increase="50-100% more leads",
                enhancement_techniques=["Geographic expansion", "Basic targeting improvements"],
                error="AI service not configured - using basic fallback enhancement"
            )
        
        # Initialize agent
        agent = ApolloURLBuilder(openrouter_api_key, correlation_id)
        
        # Enhance prompt
        result = agent.enhance_prompt(
            original_prompt=request.prompt,
            target_lead_count=request.target_lead_count,
            current_lead_count=request.current_lead_count
        )
        
        return EnhancePromptResponse(
            success=result["success"],
            enhanced_prompt=result["enhanced_prompt"],
            enhancement_explanation=result["enhancement_explanation"],
            estimated_lead_increase=result["estimated_lead_increase"],
            enhancement_techniques=result["enhancement_techniques"]
        )
        
    except AIAgentError as e:
        logger.error(f"AI Agent error in prompt enhancement: {str(e)} - correlation_id: {correlation_id}")
        return EnhancePromptResponse(
            success=False,
            enhanced_prompt=request.prompt,
            enhancement_explanation="Enhancement service temporarily unavailable",
            estimated_lead_increase="0%",
            enhancement_techniques=[],
            error="AI service temporarily unavailable"
        )
        
    except Exception as e:
        logger.error(f"Unexpected error in prompt enhancement: {str(e)} - correlation_id: {correlation_id}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

# Note: Ensure this 'router' instance is included in your main app (e.g., in app/main.py)
# app.include_router(apollo_router, prefix="/api/v1/ai", tags=["Apollo URL Builder"])
# The prefix and tags are usually defined when including the router in main.py 