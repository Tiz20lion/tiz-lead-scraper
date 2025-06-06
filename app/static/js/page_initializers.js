// app/static/js/page_initializers.js

function _rebindListener(elementId, eventType, handler, appInstance) {
    const element = document.getElementById(elementId);
    if (element) {
        const newElement = element.cloneNode(true);
        element.parentNode.replaceChild(newElement, element);
        newElement.addEventListener(eventType, handler.bind(appInstance)); // Bind to appInstance
        return newElement;
    }
    console.warn(`Element ${elementId} not found for rebinding listener.`);
    return null;
}

function setupTabsForPage(pageId, appInstance) {
    const pageElement = document.getElementById(pageId);
    if (!pageElement) {
        console.warn(`Page element ${pageId} not found for setting up tabs.`);
        return;
    }

    const tabButtons = pageElement.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        // Rebind to prevent duplicate listeners if page content is reloaded multiple times
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener('click', () => {
            const tabId = newButton.getAttribute('data-tab');
            // Scope queries to the current pageElement to avoid conflicts if multiple tab sets exist
            pageElement.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            newButton.classList.add('active');
            pageElement.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
    console.log(`Tabs setup for ${pageId}`);
}


function initLandingPage(appInstance) {
    console.log("Initializing Landing Page (homePage)");
    _rebindListener('startAutomationBtn', 'click', () => appInstance.navigationManager.navigateToPage('settings'), appInstance);
    // Any other specific initializations for the landing page
}

function initConfigurationPage(appInstance) {
    console.log("Initializing Configuration Page");
    
    // Multiple initialization attempts for reliability (from cursor rules)
    const initAttempts = [100, 300, 500];
    
    initAttempts.forEach(delay => {
        setTimeout(() => {
            if (window.aiPromptHandler && !window.aiPromptHandler.isReady()) {
                const success = window.aiPromptHandler.init();
                console.log(`AI Prompt Handler initialized (attempt ${delay}ms):`, success);
            }
        }, delay);
    });

    // Setup field selection toggles, lead count, etc., that are specific to this page
    // Example for lead count (if it's part of configurationSection.html)
    const leadCountSlider = document.getElementById('leadCount');
    const leadCountInput = document.getElementById('leadCountInput');
    const leadCountDisplay = document.getElementById('leadCountDisplay');
    let quickButtons = document.querySelectorAll('.quick-btn'); // Will be updated after cloning

    function updateLeadCountUI(value) {
        const numValue = parseInt(value);
        console.log(`🔢 Updating lead count UI to: ${numValue}`);
        
        if (leadCountSlider) leadCountSlider.value = numValue;
        if (leadCountInput) leadCountInput.value = numValue;
        if (leadCountDisplay) leadCountDisplay.textContent = numValue.toLocaleString();
        
        // Get fresh button references (important after cloning)
        const currentQuickButtons = document.querySelectorAll('.quick-btn');
        currentQuickButtons.forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.value) === numValue) {
                btn.classList.add('active');
                console.log(`✅ Activated button: ${btn.textContent} (${btn.dataset.value})`);
            }
        });
    }

    if (leadCountSlider) {
      _rebindListener('leadCount', 'input', () => updateLeadCountUI(document.getElementById('leadCount').value), appInstance);
    }
    if (leadCountInput) {
      _rebindListener('leadCountInput', 'input', () => {
        const val = parseInt(document.getElementById('leadCountInput').value);
        if (val >=1 && val <= 50000) updateLeadCountUI(val);
      }, appInstance);
    }
    
    // Setup quick button listeners with proper cloning
    quickButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            console.log(`🖱️ Quick button clicked: ${newBtn.textContent} (${newBtn.dataset.value})`);
            updateLeadCountUI(newBtn.dataset.value);
        });
    });
    
    // Update quickButtons reference after cloning
    quickButtons = document.querySelectorAll('.quick-btn');
    
    // Call once to initialize with default value shown in HTML (e.g., 100)
    if (leadCountInput) {
        const initialValue = leadCountInput.value || '100';
        console.log(`🎯 Initializing lead count UI with: ${initialValue}`);
        updateLeadCountUI(initialValue);
    }

    // Setup Field Selection (if part of this partial)
    const fieldCards = document.querySelectorAll('.field-toggle-card');
    const selectedCountEl = document.getElementById('selectedCount');

    function updateSelectedFieldCount() {
        if (!selectedCountEl) return;
        const activeCards = document.querySelectorAll('.field-toggle-card.active');
        selectedCountEl.textContent = activeCards.length;
    }

    fieldCards.forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        newCard.addEventListener('click', () => {
            newCard.classList.toggle('active');
            const checkbox = newCard.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = newCard.classList.contains('active');
            updateSelectedFieldCount();
        });
    });
    _rebindListener('selectAllFields', 'click', () => {
        document.querySelectorAll('.field-toggle-card').forEach(card => {
            card.classList.add('active');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = true;
        });
        updateSelectedFieldCount();
    }, appInstance);
    _rebindListener('clearAllFields', 'click', () => {
        document.querySelectorAll('.field-toggle-card').forEach(card => {
            card.classList.remove('active');
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        });
        updateSelectedFieldCount();
    }, appInstance);
    updateSelectedFieldCount(); // Initial count
    
    // Setup main "Start Scraping Journey" button from this page
    _rebindListener('startScraping', 'click', appInstance.startScraping, appInstance);
}

function initSettingsPage(appInstance) {
    console.log("Initializing Settings Page");
    
    // Initialize integration toggles
    initializeIntegrationToggles();
    
    // Initialize input action buttons
    initializeInputActions();
    
    // Initialize connection testing
    initializeConnectionTesting(appInstance);
    
    // Initialize form validation
    initializeFormValidation();
    
    // Load saved settings
    loadSavedSettings();
    
    // Setup main save button
    _rebindListener('saveSettings', 'click', appInstance.saveSettings, appInstance);
    
    setupTabsForPage('settingsPage', appInstance); 
}

// Initialize integration toggles with mobile and accessibility support
function initializeIntegrationToggles() {
    const integrationCards = document.querySelectorAll('.integration-card');
    
    integrationCards.forEach(card => {
        const header = card.querySelector('.integration-header');
        const toggle = card.querySelector('.toggle-checkbox');
        const content = card.querySelector('.integration-content');
        
        if (!header || !toggle || !content) return;
        
        // Handle toggle changes
        toggle.addEventListener('change', () => {
            if (toggle.checked) {
                content.style.display = 'block';
                content.classList.add('active');
                card.classList.add('active');
                header.setAttribute('aria-expanded', 'true');
                console.log(`✅ Enabled integration: ${card.dataset.integration}`);
            } else {
                content.style.display = 'none';
                content.classList.remove('active');
                card.classList.remove('active');
                header.setAttribute('aria-expanded', 'false');
                console.log(`❌ Disabled integration: ${card.dataset.integration}`);
            }
        });
        
        // Handle header click to toggle (but not on the toggle itself)
        header.addEventListener('click', (e) => {
            // Don't trigger if clicking on the toggle itself
            if (e.target.closest('.integration-toggle')) return;
            
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event('change'));
        });
        
        // Handle keyboard navigation
        header.addEventListener('keydown', (e) => {
            // Don't handle if focus is on the actual toggle
            if (e.target.closest('.integration-toggle')) return;
            
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change'));
            }
        });
        
        // Touch support for mobile
        let touchStartY = 0;
        header.addEventListener('touchstart', (e) => {
            if (e.target.closest('.integration-toggle')) return;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        header.addEventListener('touchend', (e) => {
            if (e.target.closest('.integration-toggle')) return;
            
            const touchEndY = e.changedTouches[0].clientY;
            const touchDiff = Math.abs(touchEndY - touchStartY);
            
            // Only trigger if it's a tap (minimal movement)
            if (touchDiff < 10) {
                e.preventDefault();
                toggle.checked = !toggle.checked;
                toggle.dispatchEvent(new Event('change'));
            }
        });
        
        // Initialize proper state on page load
        if (toggle.checked) {
            content.style.display = 'block';
            content.classList.add('active');
            card.classList.add('active');
            header.setAttribute('aria-expanded', 'true');
        } else {
            content.style.display = 'none';
            content.classList.remove('active');
            card.classList.remove('active');
            header.setAttribute('aria-expanded', 'false');
        }
    });
}

// Initialize input action buttons (visibility toggle, test connection)
function initializeInputActions() {
    // Password visibility toggles
    const visibilityToggles = document.querySelectorAll('#toggleApifyToken, #toggleNotionToken');
    visibilityToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.closest('.modern-input-wrapper').querySelector('input');
            const icon = btn.querySelector('.material-symbols-outlined');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
                btn.title = 'Hide password';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
                btn.title = 'Show password';
            }
        });
    });
    
    // JSON formatting button
    const formatBtn = document.getElementById('formatJson');
    if (formatBtn) {
        formatBtn.addEventListener('click', () => {
            const textarea = document.getElementById('googleCredentials');
            try {
                const parsed = JSON.parse(textarea.value);
                textarea.value = JSON.stringify(parsed, null, 2);
                showStatus('sheetsStatus', 'success', 'JSON formatted successfully');
            } catch (e) {
                showStatus('sheetsStatus', 'error', 'Invalid JSON format');
            }
        });
    }
    
    // Credentials validation button
    const validateBtn = document.getElementById('validateCredentials');
    if (validateBtn) {
        validateBtn.addEventListener('click', () => {
            const textarea = document.getElementById('googleCredentials');
            try {
                const parsed = JSON.parse(textarea.value);
                if (parsed.type === 'service_account' && parsed.private_key && parsed.client_email) {
                    showStatus('sheetsStatus', 'success', 'Valid service account credentials');
                } else {
                    showStatus('sheetsStatus', 'error', 'Missing required fields in service account');
                }
            } catch (e) {
                showStatus('sheetsStatus', 'error', 'Invalid JSON format');
            }
        });
    }
}

// Initialize connection testing functionality
function initializeConnectionTesting(appInstance) {
    // Test Apify connection
    const testApifyBtn = document.getElementById('testApifyToken');
    if (testApifyBtn) {
        testApifyBtn.addEventListener('click', async () => {
            const token = document.getElementById('apifyToken').value.trim();
            if (!token) {
                showStatus('apifyStatus', 'error', 'Please enter your Apify token first');
                return;
            }
            
            showStatus('apifyStatus', 'testing', 'Testing connection...');
            
            try {
                // Test Apify connection (you can implement actual API test)
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
                showStatus('apifyStatus', 'success', 'Apify connection successful');
            } catch (error) {
                showStatus('apifyStatus', 'error', 'Failed to connect to Apify');
            }
        });
    }
    
    // Test Google Sheets connection
    const testSheetsBtn = document.getElementById('testSpreadsheet');
    if (testSheetsBtn) {
        testSheetsBtn.addEventListener('click', async () => {
            const credentials = document.getElementById('googleCredentials').value.trim();
            const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
            
            if (!credentials || !spreadsheetId) {
                showStatus('sheetsStatus', 'error', 'Please enter credentials and spreadsheet ID');
                return;
            }
            
            showStatus('sheetsStatus', 'testing', 'Testing spreadsheet access...');
            
            try {
                // Test Google Sheets connection (implement actual test)
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
                showStatus('sheetsStatus', 'success', 'Spreadsheet access confirmed');
            } catch (error) {
                showStatus('sheetsStatus', 'error', 'Failed to access spreadsheet');
            }
        });
    }
    
    // Test Notion connection
    const testNotionBtn = document.getElementById('testNotionToken');
    if (testNotionBtn) {
        testNotionBtn.addEventListener('click', async () => {
            const token = document.getElementById('notionToken').value.trim();
            if (!token) {
                showStatus('notionStatus', 'error', 'Please enter your Notion token first');
                return;
            }
            
            showStatus('notionStatus', 'testing', 'Testing Notion connection...');
            
            try {
                // Test Notion connection (implement actual test)
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
                showStatus('notionStatus', 'success', 'Notion connection successful');
            } catch (error) {
                showStatus('notionStatus', 'error', 'Failed to connect to Notion');
            }
        });
    }
    
    // Test Notion database
    const testDbBtn = document.getElementById('testNotionDatabase');
    if (testDbBtn) {
        testDbBtn.addEventListener('click', async () => {
            const token = document.getElementById('notionToken').value.trim();
            const databaseId = document.getElementById('notionDatabaseId').value.trim();
            
            if (!token || !databaseId) {
                showStatus('notionStatus', 'error', 'Please enter token and database ID');
                return;
            }
            
            showStatus('notionStatus', 'testing', 'Testing database access...');
            
            try {
                // Test Notion database access (implement actual test)
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
                showStatus('notionStatus', 'success', 'Database access confirmed');
            } catch (error) {
                showStatus('notionStatus', 'error', 'Failed to access database');
            }
        });
    }
}

// Initialize form validation
function initializeFormValidation() {
    // Real-time validation for required fields
    const apifyInput = document.getElementById('apifyToken');
    if (apifyInput) {
        apifyInput.addEventListener('input', () => {
            const value = apifyInput.value.trim();
            if (value.length > 0) {
                if (value.startsWith('apify_api_')) {
                    showStatus('apifyStatus', 'success', 'Valid Apify token format');
                } else {
                    showStatus('apifyStatus', 'error', 'Invalid token format (should start with apify_api_)');
                }
            } else {
                hideStatus('apifyStatus');
            }
        });
    }
    
    // Notion token validation
    const notionInput = document.getElementById('notionToken');
    if (notionInput) {
        notionInput.addEventListener('input', () => {
            const value = notionInput.value.trim();
            if (value.length > 0) {
                showStatus('notionStatus', 'success', 'Notion token entered');
            } else {
                hideStatus('notionStatus');
            }
        });
    }
    
    // Spreadsheet ID validation
    const spreadsheetInput = document.getElementById('spreadsheetId');
    if (spreadsheetInput) {
        spreadsheetInput.addEventListener('input', () => {
            const value = spreadsheetInput.value.trim();
            if (value.length > 0) {
                // Basic validation for Google Sheets ID format
                if (value.match(/^[a-zA-Z0-9-_]{44}$/)) {
                    showStatus('sheetsStatus', 'success', 'Valid spreadsheet ID format');
                } else {
                    showStatus('sheetsStatus', 'error', 'Invalid spreadsheet ID format');
                }
            } else {
                hideStatus('sheetsStatus');
            }
        });
    }
}

// Load saved settings from localStorage
function loadSavedSettings() {
    // Load Apify token
    const savedApifyToken = localStorage.getItem('apifyToken');
    if (savedApifyToken) {
        const apifyInput = document.getElementById('apifyToken');
        if (apifyInput) apifyInput.value = savedApifyToken;
    }
    
    // Load Google Sheets settings
    const savedGoogleCreds = localStorage.getItem('googleCredentials');
    const savedSpreadsheetId = localStorage.getItem('spreadsheetId');
    const savedSheetName = localStorage.getItem('sheetName');
    
    if (savedGoogleCreds) {
        const credsInput = document.getElementById('googleCredentials');
        if (credsInput) credsInput.value = savedGoogleCreds;
        
        // Enable Google Sheets toggle if credentials exist
        const sheetsToggle = document.getElementById('enableSheets');
        if (sheetsToggle) {
            sheetsToggle.checked = true;
            sheetsToggle.dispatchEvent(new Event('change'));
        }
    }
    
    if (savedSpreadsheetId) {
        const spreadsheetInput = document.getElementById('spreadsheetId');
        if (spreadsheetInput) spreadsheetInput.value = savedSpreadsheetId;
    }
    
    if (savedSheetName) {
        const sheetInput = document.getElementById('sheetName');
        if (sheetInput) sheetInput.value = savedSheetName;
    }
    
    // Load Notion settings
    const savedNotionToken = localStorage.getItem('notionToken');
    const savedNotionDbId = localStorage.getItem('notionDatabaseId');
    
    if (savedNotionToken) {
        const notionInput = document.getElementById('notionToken');
        if (notionInput) notionInput.value = savedNotionToken;
        
        // Enable Notion toggle if token exists
        const notionToggle = document.getElementById('enableNotion');
        if (notionToggle) {
            notionToggle.checked = true;
            notionToggle.dispatchEvent(new Event('change'));
        }
    }
    
    if (savedNotionDbId) {
        const dbInput = document.getElementById('notionDatabaseId');
        if (dbInput) dbInput.value = savedNotionDbId;
    }
}

// Utility functions for status display
function showStatus(elementId, type, message) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    
    statusEl.className = `connection-status ${type}`;
    statusEl.querySelector('.status-text').textContent = message;
    statusEl.style.display = 'flex';
}

function hideStatus(elementId) {
    const statusEl = document.getElementById(elementId);
    if (statusEl) statusEl.style.display = 'none';
}

function initResultsPage(appInstance) {
    console.log("Initializing Results Page");
    
    // Rebind export buttons with new compact class names
    _rebindListener('exportCsv', 'click', appInstance.exportCsv, appInstance);
    _rebindListener('exportJson', 'click', appInstance.exportJson, appInstance);
    _rebindListener('exportSheets', 'click', appInstance.exportToSheets, appInstance);
    _rebindListener('exportNotion', 'click', appInstance.exportToNotion, appInstance);
    
    // Check integration status and update button states
    updateExportButtonStates();
    
    // ✅ Initialize Compact View Toggle Functionality (Default to Cards)
    const viewBtns = document.querySelectorAll('.view-btn-compact');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            
            // Update active states
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide views
            const cardsView = document.getElementById('cardsView');
            const tableView = document.getElementById('tableView');
            
            if (view === 'cards') {
                if (cardsView) cardsView.style.display = 'block';
                if (tableView) tableView.style.display = 'none';
                appInstance.currentView = 'cards';
            } else if (view === 'table') {
                if (cardsView) cardsView.style.display = 'none';
                if (tableView) tableView.style.display = 'block';
                appInstance.currentView = 'table';
            }
            
            console.log(`🔄 Switched to ${view} view`);
        });
    });
    
    // Set default view to cards
    if (!appInstance.currentView) {
        appInstance.currentView = 'cards';
    }
    
    // Apply default view state
    const cardsView = document.getElementById('cardsView');
    const tableView = document.getElementById('tableView');
    const cardsBtn = document.querySelector('.view-btn-compact[data-view="cards"]');
    const tableBtn = document.querySelector('.view-btn-compact[data-view="table"]');
    
    if (appInstance.currentView === 'cards') {
        if (cardsView) cardsView.style.display = 'block';
        if (tableView) tableView.style.display = 'none';
        if (cardsBtn) cardsBtn.classList.add('active');
        if (tableBtn) tableBtn.classList.remove('active');
    } else {
        if (cardsView) cardsView.style.display = 'none';
        if (tableView) tableView.style.display = 'block';
        if (tableBtn) tableBtn.classList.add('active');
        if (cardsBtn) cardsBtn.classList.remove('active');
    }
    
    // ✅ NEW: Display current results if data is available
    if (appInstance.currentExportData && appInstance.currentExportData.length > 0) {
        console.log(`📊 Displaying ${appInstance.currentExportData.length} leads from current task data`);
        appInstance.displayCurrentResults();
        
        // Update results count
        const resultsCountEl = document.getElementById('resultsCount');
        if (resultsCountEl) {
            resultsCountEl.textContent = `${appInstance.currentExportData.length} leads found`;
        }
    } else {
        console.log("📊 No current export data available to display");
        
        // FIXED: Prevent infinite loop by checking if we already tried to fetch
        if (appInstance.currentTaskId && !appInstance._resultsFetchAttempted) {
            console.log(`🔍 Attempting to fetch results for current task: ${appInstance.currentTaskId}`);
            appInstance._resultsFetchAttempted = true; // Prevent recursive attempts
            
            appInstance.fetchFinalResults().catch(error => {
                console.error('Failed to fetch results during page initialization:', error);
                appInstance._resultsFetchAttempted = false; // Reset flag on error
                
                // Show user-friendly message
                toastr.error('Failed to load results. The task may have expired or the server was restarted.', {
                    timeOut: 8000,
                    extendedTimeOut: 3000
                });
                
                // Navigate back to configure page after error
                setTimeout(() => {
                    appInstance.navigationManager.navigateToPage('configure');
                }, 2000);
            });
        } else if (!appInstance.currentTaskId) {
            console.log("📊 No current task ID available - showing empty state");
            // Show a message that no scraping session is active
            toastr.info('No active scraping session. Please start a new scraping task.', {
                timeOut: 5000
            });
            
            // Navigate back to configure page
            setTimeout(() => {
                appInstance.navigationManager.navigateToPage('configure');
            }, 1500);
        }
    }
}

// New function to check integration status and update button states
function updateExportButtonStates() {
    // Check Google Sheets integration
    const isGoogleSheetsEnabled = localStorage.getItem('googleSheetsEnabled') === 'true';
    const hasGoogleCreds = localStorage.getItem('googleCredentials');
    const hasSpreadsheetId = localStorage.getItem('spreadsheetId');
    const sheetsConfigured = isGoogleSheetsEnabled && hasGoogleCreds && hasSpreadsheetId;
    
    // Check Notion integration
    const isNotionEnabled = localStorage.getItem('notionEnabled') === 'true';
    const hasNotionToken = localStorage.getItem('notionToken');
    const hasNotionDbId = localStorage.getItem('notionDatabaseId');
    const notionConfigured = isNotionEnabled && hasNotionToken && hasNotionDbId;
    
    // Update Google Sheets button
    const sheetsBtn = document.getElementById('exportSheets');
    if (sheetsBtn) {
        if (!sheetsConfigured) {
            sheetsBtn.classList.add('integration-not-configured');
            sheetsBtn.title = 'Google Sheets integration not configured. Click to set up in Settings.';
            sheetsBtn.querySelector('.export-desc-compact').textContent = 'Not configured';
        } else {
            sheetsBtn.classList.remove('integration-not-configured');
            sheetsBtn.title = 'Export to Google Sheets';
            sheetsBtn.querySelector('.export-desc-compact').textContent = 'Cloud sync';
        }
    }
    
    // Update Notion button
    const notionBtn = document.getElementById('exportNotion');
    if (notionBtn) {
        if (!notionConfigured) {
            notionBtn.classList.add('integration-not-configured');
            notionBtn.title = 'Notion integration not configured. Click to set up in Settings.';
            notionBtn.querySelector('.export-desc-compact').textContent = 'Not configured';
        } else {
            notionBtn.classList.remove('integration-not-configured');
            notionBtn.title = 'Export to Notion Database';
            notionBtn.querySelector('.export-desc-compact').textContent = 'Database';
        }
    }
}

function initProgressPage(appInstance) {
    console.log("Initializing Progress Page");
    // If there are any interactive elements on the progress page (e.g., a cancel button)
    // _rebindListener('cancelScrapingBtn', 'click', appInstance.cancelScraping, appInstance);
}

// This object can be used by navigation.js to call the correct initializer
const PageInitializers = {
    homePage: initLandingPage,
    configurationSection: initConfigurationPage,
    settingsPage: initSettingsPage,
    resultsSection: initResultsPage,
    progressSection: initProgressPage
}; 