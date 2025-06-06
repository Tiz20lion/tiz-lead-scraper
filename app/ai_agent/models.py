from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

class SuggestionOutput(BaseModel):
    """A single suggestion that the AI can apply."""
    id: str
    type: Literal["add_filter", "remove_filter", "modify_filter", "expand_scope"]
    text: str


class EnhancePromptRequest(BaseModel):
    """Request payload for enhancing a user's prompt"""
    prompt: str = Field(..., min_length=1, description="Original user prompt to enhance")
    user_id: Optional[str] = Field(None, description="Optional user identifier")
    session_id: Optional[str] = Field(None, description="Optional session identifier")
    target_lead_count: Optional[int] = Field(1000, description="Target number of leads desired")
    current_lead_count: Optional[int] = Field(None, description="Current estimated lead count (if known)")


class EnhancePromptResponse(BaseModel):
    """Response containing the enhanced prompt"""
    success: bool
    enhanced_prompt: str
    enhancement_explanation: str = Field(description="Explanation of what was improved")
    estimated_lead_increase: Optional[str] = Field(None, description="Estimated increase in leads")
    enhancement_techniques: List[str] = Field(default_factory=list, description="List of techniques used")
    error: Optional[str] = None


class RefinedUrlRequest(BaseModel):
    """Payload from frontend when generating or refining an Apollo URL."""
    original_prompt: str
    applied_suggestion_ids: List[str] = Field(default_factory=list)
    current_params: Dict[str, Any] = Field(default_factory=dict)
    search_type: Optional[str] = None  # e.g. "people", "founders", etc.


class RefinedUrlResponse(BaseModel):
    """What we return after AI builds/refines the Apollo URL."""
    success: bool
    apollo_url: Optional[str] = None
    new_suggestions: List[SuggestionOutput] = Field(default_factory=list)
    updated_params: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None 