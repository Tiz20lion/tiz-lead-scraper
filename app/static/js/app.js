class ApolloScraper {
    constructor() {
        // Cache static DOM elements from index.html shell
        this.themeToggle = document.getElementById('themeToggle');
        this.globalNavDropdown = document.getElementById('globalNavDropdown');
        this.globalNavItems = document.querySelectorAll('#globalNavDropdown .nav-item');
        this.pages = document.querySelectorAll('.dashboard-page'); // Placeholders for dynamic content

        // Core State
        this.currentView = 'home';
        this.csrfToken = null;
        this.currentTaskId = null;
        this.eventSource = null;
        this.currentExportData = []; // Holds data for current task once fetched

        // AI Workflow State
        this.originalPrompt = "";
        this.appliedSuggestionIds = new Set();
        this.currentParams = {}; 
        this.isAIPromptInterfaceSetup = false; // To ensure AI listeners aren't re-added unnecessarily

        // User/Session Identifiers
        this.userId = localStorage.getItem('tls_user_id') || `user_${generateRandomId()}`;
        localStorage.setItem('tls_user_id', this.userId);
        this.sessionId = `session_${generateRandomId()}`;
        console.log(`User ID: ${this.userId}, Session ID: ${this.sessionId}`);

        // Initialize Navigation Manager
        this.navigationManager = new NavigationManager(this);
        
        // Bind methods to ensure proper 'this' context
        this.startScraping = this.startScraping.bind(this);
        this.getSelectedFields = this.getSelectedFields.bind(this);
        this.setupEventSource = this.setupEventSource.bind(this);
        this.fetchFinalResults = this.fetchFinalResults.bind(this);
    }
    
    // Import methods from core_scraping.js
    startScraping = startScraping;
    getSelectedFields = getSelectedFields;
    setupEventSource = setupEventSource;
    fetchFinalResults = fetchFinalResults;
    updateProgress = updateProgress;
    showResults = showResults;
    displayCurrentResults = displayCurrentResults;
    initializeViewToggle = initializeViewToggle;
    updateViewDisplay = updateViewDisplay;
    showEmptyState = showEmptyState;
    renderCardView = renderCardView;
    renderTableView = renderTableView;
    populateCardData = populateCardData;
    
    // Export methods
    exportCsv = exportCsv;
    exportJson = exportJson;
    exportToSheets = exportToSheets;
    exportToNotion = exportToNotion;
    
    // Settings methods  
    saveSettings = saveSettings;
    collectSettingsData = collectSettingsData;
    saveToLocalStorage = saveToLocalStorage;
    showSaveStatus = showSaveStatus;
    resetSaveButton = resetSaveButton;
    
    // Utility methods
    formatValue(value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }
        return String(value).trim();
    }
    
    formatKey(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    async init() {
        console.log("ApolloScraper initializing...");
        this.setupStaticEventListeners();
        
        setupToastr();
        await this.getCsrfToken(); 
        this.checkServiceStatus();
        loadTheme();
        
        const initialPage = 'home'; 
        await this.navigationManager.navigateToPage(initialPage, true);
        console.log("Application initialization completed.");
    }

    async getCsrfToken() {
        try {
            const response = await fetch('/api/v1/csrf-token');
            if (!response.ok) throw new Error(`CSRF token fetch failed: ${response.status}`);
            const data = await response.json();
            this.csrfToken = data.csrf_token;
            console.log("CSRF token obtained:", this.csrfToken ? "Yes" : "No");
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
            toastr.error("Could not obtain CSRF token. Some actions might fail.");
        }
    }

    async checkServiceStatus() {
        try {
            await fetch('/health'); // Just check reachability
        } catch (error) {
            console.error("Failed to check service status:", error);
        }
    }

    setupStaticEventListeners() {
        console.log("Setting up static event listeners for shell elements.");
        const navTrigger = this.globalNavDropdown?.querySelector('.nav-trigger');

        if (navTrigger && this.globalNavDropdown) {
            navTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.globalNavDropdown.classList.toggle('active');
            });
            document.addEventListener('click', (e) => {
                if (this.globalNavDropdown && !this.globalNavDropdown.contains(e.target)) {
                    this.globalNavDropdown.classList.remove('active');
                }
            });
            this.globalNavItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const pageName = item.getAttribute('data-page');
                    if (pageName) this.navigationManager.navigateToPage(pageName);
                    if (this.globalNavDropdown) this.globalNavDropdown.classList.remove('active');
                });
            });
        }
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => toggleTheme());
        }
    }

    // Methods from other files will be attached to ApolloScraper.prototype below
}

// --- Attach methods from other files to ApolloScraper prototype ---

// From ui_helpers.js (generateRandomId is used in constructor, others might be useful on instance)
ApolloScraper.prototype.generateRandomId = generateRandomId; // Already in constructor, but good for explicitness
ApolloScraper.prototype.escapeHtml = escapeHtml;
ApolloScraper.prototype.formatKey = formatKey;
ApolloScraper.prototype.formatValue = formatValue;
ApolloScraper.prototype.showLoadingOverlay = showLoadingOverlay;
ApolloScraper.prototype.hideLoadingOverlay = hideLoadingOverlay;

// From ai_assistant.js - Now handled by AIPromptHandler class
// ApolloScraper.prototype.setupAIPromptInterface = function() { ... };
// ApolloScraper.prototype.setAIActionsUIState = function() { ... };
// ApolloScraper.prototype.handleDirectURLGeneration = handleDirectURLGeneration; // Removed - now in AIPromptHandler
// ApolloScraper.prototype.updateParsingFeedback = updateParsingFeedback; // Removed - now in AIPromptHandler

// From core_scraping.js
ApolloScraper.prototype.saveSettings = saveSettings;
ApolloScraper.prototype.collectSettingsData = collectSettingsData;
ApolloScraper.prototype.saveToLocalStorage = saveToLocalStorage;
ApolloScraper.prototype.showSaveStatus = showSaveStatus;
ApolloScraper.prototype.resetSaveButton = resetSaveButton;
ApolloScraper.prototype.startScraping = startScraping;
ApolloScraper.prototype.getSelectedFields = getSelectedFields;
ApolloScraper.prototype.setupEventSource = setupEventSource;
ApolloScraper.prototype.fetchFinalResults = fetchFinalResults;
ApolloScraper.prototype.showResults = showResults;
ApolloScraper.prototype.displayCurrentResults = displayCurrentResults;
ApolloScraper.prototype.initializeViewToggle = initializeViewToggle;
ApolloScraper.prototype.updateViewDisplay = updateViewDisplay;
ApolloScraper.prototype.showEmptyState = showEmptyState;
ApolloScraper.prototype.renderCardView = renderCardView;
ApolloScraper.prototype.populateCardData = populateCardData;
ApolloScraper.prototype.renderTableView = renderTableView;
ApolloScraper.prototype.updateProgress = updateProgress;
ApolloScraper.prototype.exportCsv = exportCsv;
ApolloScraper.prototype.exportJson = exportJson;
ApolloScraper.prototype.exportToSheets = exportToSheets;
ApolloScraper.prototype.exportToNotion = exportToNotion;

// Helper for re-binding listeners in page_initializers.js, needs to be on prototype
ApolloScraper.prototype._rebindListener = function(elementId, eventType, handler) {
    const element = document.getElementById(elementId);
    if (element) {
        // Preserve current state before cloning
        const wasDisabled = element.disabled;
        const currentValue = element.value;
        const currentInnerHTML = element.innerHTML;
        const currentClasses = element.className;
        
        const newElement = element.cloneNode(true);
        
        // Restore the current state after cloning
        // Skip disabled state for AI buttons since we manage that explicitly
        if (!elementId.includes('enhancePromptBtn') && !elementId.includes('generateSearchQueryBtn')) {
            newElement.disabled = wasDisabled;
        }
        if (currentValue !== undefined) newElement.value = currentValue;
        if (currentInnerHTML !== undefined) newElement.innerHTML = currentInnerHTML;
        newElement.className = currentClasses;
        
        element.parentNode.replaceChild(newElement, element);
        newElement.addEventListener(eventType, handler.bind(this)); // Bind to this (ApolloScraper instance)
        
        console.log(`🔄 Rebound listener for ${elementId}, preserved disabled: ${elementId.includes('enhancePromptBtn') || elementId.includes('generateSearchQueryBtn') ? 'SKIPPED' : wasDisabled}`);
        return newElement;
    }
    console.warn(`Element ${elementId} not found for rebinding listener.`);
    return null;
};


// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded - Initializing application...");
    if (!window.apolloScraper) { 
        window.apolloScraper = new ApolloScraper();
        window.apolloScraper.init(); 
    } else {
        console.log("ApolloScraper instance already exists.");
    }
});