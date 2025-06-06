// ============================================
// AI PROMPT HANDLER - FIXED VERSION
// ============================================

console.log('🤖 AI Assistant script loading...');

class AIPromptHandler {
    constructor() {
        this.isInitialized = false;
        this.debugMode = true; // Set to false in production
        
        // Bind methods to preserve 'this' context
        this.handleExamplePill = this.handleExamplePill.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleEnhance = this.handleEnhance.bind(this);
        this.handleGenerate = this.handleGenerate.bind(this);
        this.handleCopyUrl = this.handleCopyUrl.bind(this);
        this.handleEditSearch = this.handleEditSearch.bind(this);
        this.handleUseUrl = this.handleUseUrl.bind(this);
        
        this.log('AIPromptHandler constructor called');
    }
    
    // Debug logging helper
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`🤖 [AIPromptHandler] ${message}`, data || '');
        }
    }
    
    // Initialize the AI prompt functionality
    init() {
        this.log('Attempting to initialize...');
        
        // Check if elements exist
        const elements = this.getElements();
        if (!elements.promptInput) {
            this.log('❌ Required elements not found, initialization failed');
            return false;
        }
        
        this.log('✅ All required elements found');
        
        // Remove existing listeners to prevent duplicates
        this.removeEventListeners();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial button state check
        this.updateButtonStates();
        
        this.isInitialized = true;
        this.log('✅ Initialization completed successfully');
        return true;
    }
    
    // Get all required DOM elements
    getElements() {
        const elements = {
            promptInput: document.getElementById('aiPromptInput'),
            enhanceBtn: document.getElementById('enhanceBtn'),
            generateBtn: document.getElementById('generateBtn'),
            examplePills: document.querySelectorAll('.example-pill'),
            aiResults: document.getElementById('aiResults'),
            generatedUrl: document.getElementById('generatedUrl'),
            copyUrlBtn: document.getElementById('copyUrlBtn'),
            editSearchBtn: document.getElementById('editSearchBtn'),
            useUrlBtn: document.getElementById('useUrlBtn')
        };
        
        this.log('Elements found:', {
            promptInput: !!elements.promptInput,
            enhanceBtn: !!elements.enhanceBtn,
            generateBtn: !!elements.generateBtn,
            examplePills: elements.examplePills.length,
            aiResults: !!elements.aiResults
        });
        
        return elements;
    }
    
    // Remove existing event listeners to prevent duplicates
    removeEventListeners() {
        const elements = this.getElements();
        
        // Remove input listeners
        if (elements.promptInput) {
            elements.promptInput.removeEventListener('input', this.handleInputChange);
            elements.promptInput.removeEventListener('keyup', this.handleInputChange);
        }
        
        // Remove button listeners
        if (elements.enhanceBtn) {
            elements.enhanceBtn.removeEventListener('click', this.handleEnhance);
        }
        if (elements.generateBtn) {
            elements.generateBtn.removeEventListener('click', this.handleGenerate);
        }
        if (elements.copyUrlBtn) {
            elements.copyUrlBtn.removeEventListener('click', this.handleCopyUrl);
        }
        if (elements.editSearchBtn) {
            elements.editSearchBtn.removeEventListener('click', this.handleEditSearch);
        }
        if (elements.useUrlBtn) {
            elements.useUrlBtn.removeEventListener('click', this.handleUseUrl);
        }
        
        // Remove example pill listeners
        elements.examplePills.forEach(pill => {
            pill.removeEventListener('click', this.handleExamplePill);
        });
        
        this.log('Existing event listeners removed');
    }
    
    // Setup all event listeners
    setupEventListeners() {
        const elements = this.getElements();
        
        // Input change listeners
        if (elements.promptInput) {
            elements.promptInput.addEventListener('input', this.handleInputChange);
            elements.promptInput.addEventListener('keyup', this.handleInputChange);
            this.log('✅ Input listeners attached');
        }
        
        // Button listeners
        if (elements.enhanceBtn) {
            elements.enhanceBtn.addEventListener('click', this.handleEnhance);
            this.log('✅ Enhance button listener attached');
        }
        
        if (elements.generateBtn) {
            elements.generateBtn.addEventListener('click', this.handleGenerate);
            this.log('✅ Generate button listener attached');
        }
        
        if (elements.copyUrlBtn) {
            elements.copyUrlBtn.addEventListener('click', this.handleCopyUrl);
            this.log('✅ Copy URL button listener attached');
        }
        
        if (elements.editSearchBtn) {
            elements.editSearchBtn.addEventListener('click', this.handleEditSearch);
            this.log('✅ Edit search button listener attached');
        }
        
        if (elements.useUrlBtn) {
            elements.useUrlBtn.addEventListener('click', this.handleUseUrl);
            this.log('✅ Use URL button listener attached');
        }
        
        // Example pill listeners
        elements.examplePills.forEach((pill, index) => {
            pill.addEventListener('click', this.handleExamplePill);
            this.log(`✅ Example pill ${index + 1} listener attached`);
        });
    }
    
    // Handle example pill clicks
    handleExamplePill(event) {
        this.log('Example pill clicked', event.target);
        
        const pill = event.target;
        const prompt = pill.getAttribute('data-prompt');
        
        if (!prompt) {
            this.log('❌ No data-prompt attribute found');
        return;
    }
    
        const elements = this.getElements();
        if (elements.promptInput) {
            elements.promptInput.value = prompt;
            elements.promptInput.focus();
            
            // Trigger input change to update button states
            this.handleInputChange();
            
            // Visual feedback
            pill.classList.add('selected');
            setTimeout(() => pill.classList.remove('selected'), 200);
            
            this.log('✅ Prompt filled from example pill:', prompt);
        }
    }
    
    // Handle input changes
    handleInputChange(event) {
        this.log('Input changed');
        this.updateButtonStates();
    }
    
    // Update button enabled/disabled states
    updateButtonStates() {
        const elements = this.getElements();
        const hasText = elements.promptInput && elements.promptInput.value.trim().length > 0;
        
        if (elements.enhanceBtn) {
            elements.enhanceBtn.disabled = !hasText;
        }
        if (elements.generateBtn) {
            elements.generateBtn.disabled = !hasText;
        }
        
        this.log('Button states updated:', { hasText, disabled: !hasText });
    }
    
    // Handle enhance button click
    async handleEnhance(event) {
        this.log('Enhance button clicked');
        
        const elements = this.getElements();
        const prompt = elements.promptInput?.value.trim();
        
        if (!prompt) {
            this.log('❌ No prompt text to enhance');
            return;
        }
        
        // Show loading state
        const originalText = elements.enhanceBtn.innerHTML;
        elements.enhanceBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Enhancing...';
        elements.enhanceBtn.disabled = true;
        
        try {
            // Call your enhance API here
            const enhancedPrompt = await this.callEnhanceAPI(prompt);
            
            if (enhancedPrompt && elements.promptInput) {
                elements.promptInput.value = enhancedPrompt;
                this.log('✅ Prompt enhanced successfully');
                
                if (typeof toastr !== 'undefined') {
                    toastr.success('Prompt enhanced successfully!', 'AI Assistant');
                }
            }
            
        } catch (error) {
            this.log('❌ Enhance failed:', error);
            if (typeof toastr !== 'undefined') {
                toastr.error('Failed to enhance prompt. Please try again.', 'AI Error');
            }
        } finally {
            // Restore original button state
            elements.enhanceBtn.innerHTML = originalText;
            this.updateButtonStates(); // This will properly set disabled state
        }
    }
    
    // Handle generate button click
    async handleGenerate(event) {
        this.log('Generate button clicked');
        
        const elements = this.getElements();
        const prompt = elements.promptInput?.value.trim();
        
        if (!prompt) {
            this.log('❌ No prompt text to generate from');
            return;
        }
        
        // Show loading state
        const originalText = elements.generateBtn.innerHTML;
        elements.generateBtn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Generating...';
        elements.generateBtn.disabled = true;
        
        try {
            // Call your generate API here
            const apolloUrl = await this.callGenerateAPI(prompt);
            
            if (apolloUrl) {
                this.showResults(apolloUrl);
                this.log('✅ URL generated successfully');
                
                if (typeof toastr !== 'undefined') {
                    toastr.success('Apollo URL generated successfully!', 'AI Assistant');
                }
            }
            
        } catch (error) {
            this.log('❌ Generate failed:', error);
            if (typeof toastr !== 'undefined') {
                toastr.error('Failed to generate URL. Please try again.', 'AI Error');
            }
        } finally {
            // Restore original button state
            elements.generateBtn.innerHTML = originalText;
            this.updateButtonStates(); // This will properly set disabled state
        }
    }
    
    // Show results section
    showResults(url) {
        const elements = this.getElements();
        
        if (elements.generatedUrl) {
            elements.generatedUrl.value = url;
        }
        
        if (elements.aiResults) {
            elements.aiResults.style.display = 'block';
            elements.aiResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        this.log('✅ Results shown with URL:', url);
    }
    
    // Handle copy URL button
    handleCopyUrl(event) {
        this.log('Copy URL button clicked');
        
        const elements = this.getElements();
        if (elements.generatedUrl && elements.generatedUrl.value) {
            // Modern clipboard API
            if (navigator.clipboard) {
                navigator.clipboard.writeText(elements.generatedUrl.value).then(() => {
                    this.showCopyFeedback(elements.copyUrlBtn);
                    if (typeof toastr !== 'undefined') {
                        toastr.success('URL copied to clipboard!', 'Success');
                    }
                }).catch(() => {
                    this.fallbackCopyToClipboard(elements.generatedUrl.value, elements.copyUrlBtn);
                });
            } else {
                this.fallbackCopyToClipboard(elements.generatedUrl.value, elements.copyUrlBtn);
            }
            
            this.log('✅ URL copied to clipboard');
        }
    }
    
    // Fallback copy method
    fallbackCopyToClipboard(text, button) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.showCopyFeedback(button);
            if (typeof toastr !== 'undefined') {
                toastr.success('URL copied to clipboard!', 'Success');
            }
        } catch (err) {
            if (typeof toastr !== 'undefined') {
                toastr.error('Failed to copy URL', 'Error');
            }
        }
        document.body.removeChild(textArea);
    }
    
    // Show copy feedback
    showCopyFeedback(button) {
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="material-symbols-outlined">check</span>';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 1000);
        }
    }
    
    // Handle edit search button
    handleEditSearch(event) {
        this.log('Edit search button clicked');
        
        const elements = this.getElements();
        if (elements.aiResults) {
            elements.aiResults.style.display = 'none';
        }
        
        if (elements.promptInput) {
            elements.promptInput.focus();
        }
        
        if (typeof toastr !== 'undefined') {
            toastr.info('Edit your search above', 'AI Assistant');
        }
    }
    
    // Handle use URL button
    handleUseUrl(event) {
        this.log('Use URL button clicked');
        
        const elements = this.getElements();
        const url = elements.generatedUrl?.value;
        
        if (url) {
            // Add to URL input field for scraping
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                const currentUrls = urlInput.value.trim();
                const newUrls = currentUrls ? currentUrls + '\n' + url : url;
                urlInput.value = newUrls;
                
                // Trigger input event to update UI
                urlInput.dispatchEvent(new Event('input'));
                
                if (typeof toastr !== 'undefined') {
                    toastr.success('URL added to scraping list!', 'Success');
                }
                
                // Hide results
                if (elements.aiResults) {
                    elements.aiResults.style.display = 'none';
                }
                
                this.log('✅ URL added to scraping list');
            } else {
                // Fallback: open URL in new tab
                window.open(url, '_blank');
                this.log('✅ URL opened in new tab');
                
                if (typeof toastr !== 'undefined') {
                    toastr.success('URL opened in new tab', 'Success');
                }
            }
        }
    }
    
    // API call for enhance functionality
    async callEnhanceAPI(prompt) {
        this.log('Calling enhance API with prompt:', prompt);
        
        // Use the new dedicated enhance-prompt endpoint
        const response = await fetch('/api/v1/ai/enhance-prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                user_id: window.apolloScraper?.userId || 'anonymous',
                session_id: window.apolloScraper?.sessionId || 'session_' + Date.now(),
                target_lead_count: 1000,
                current_lead_count: null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.enhanced_prompt) {
            this.log('✅ Prompt enhanced by AI:', {
                original: prompt,
                enhanced: data.enhanced_prompt,
                explanation: data.enhancement_explanation,
                techniques: data.enhancement_techniques
            });
            
            return data.enhanced_prompt;
        } else {
            throw new Error(data.error || 'Enhancement failed');
        }
    }
    
    // API call for generate functionality
    async callGenerateAPI(prompt) {
        this.log('Calling generate API with prompt:', prompt);
        
        const response = await fetch('/api/v1/ai/generate-apollo-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                user_id: window.apolloScraper?.userId || 'anonymous',
                session_id: window.apolloScraper?.sessionId || 'session_' + Date.now()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.apollo_url) {
            return data.apollo_url;
        } else {
            throw new Error(data.error || 'Generation failed');
        }
    }
    
    // Public method to check if initialized
    isReady() {
        return this.isInitialized;
    }
    
    // Public method to reinitialize (useful after page changes)
    reinit() {
        this.log('Reinitializing...');
        this.isInitialized = false;
        return this.init();
    }
}

// ============================================
// INTEGRATION WITH YOUR PAGE SYSTEM
// ============================================

// Create global instance
window.aiPromptHandler = new AIPromptHandler();

// ============================================
// DEBUG TESTING FUNCTIONS
// ============================================

// Add these to your browser console for testing
window.debugAI = {
    // Test if handler is ready
    checkReady: () => {
        console.log('AI Handler Ready:', window.aiPromptHandler.isReady());
    },
    
    // Test button states
    testButtons: () => {
        const elements = window.aiPromptHandler.getElements();
        console.log('Button States:', {
            enhanceDisabled: elements.enhanceBtn?.disabled,
            generateDisabled: elements.generateBtn?.disabled
        });
    },
    
    // Test example pill
    testPill: () => {
        const firstPill = document.querySelector('.example-pill');
        if (firstPill) {
            firstPill.click();
            console.log('Clicked first example pill');
        }
    },
    
    // Force reinitialize
    reinit: () => {
        window.aiPromptHandler.reinit();
    },
    
    // Check elements
    checkElements: () => {
        const elements = window.aiPromptHandler.getElements();
        console.table(elements);
    }
};

// ============================================
// AUTO-INITIALIZE ON DOM READY
// ============================================

// Auto-initialization is now handled by page_initializers.js
// The page system properly calls aiPromptHandler.init() when the configuration page loads
// This prevents premature initialization before DOM elements exist

console.log('🤖 AI Assistant script loaded successfully'); 