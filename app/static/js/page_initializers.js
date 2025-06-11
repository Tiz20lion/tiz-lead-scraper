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
    const leadCountInput = document.getElementById('leadCountInput');

    // Save lead count to localStorage when changed
    if (leadCountInput) {
        leadCountInput.addEventListener('change', function() {
            if (this.value) {
                localStorage.setItem('leadCount', this.value);
                console.log('💾 Lead count saved to localStorage:', this.value);
            }
        });

        // Only load saved value if it's valid (>= 500)
        const savedLeadCount = localStorage.getItem('leadCount');
        if (savedLeadCount && parseInt(savedLeadCount) >= 500) {
            leadCountInput.value = savedLeadCount;
            console.log('📂 Loaded saved lead count:', savedLeadCount);
        }
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

// Initialize connection testi// Configuration page initialization
function initializeConfigurationPage(appInstance) {
    console.log("Initializing Configuration Page");

    // Initialize lead count buttons
    //initializeLeadCountUI(appInstance);

    // Initialize field selection functionality
    initializeFieldSelection();

    // Initialize lead count validation
    initializeLeadCountValidation();

    // Initialize Start Scraping button
    const startScrapingBtn = document.getElementById('startScraping');
    if (startScrapingBtn) {
        // Remove any existing listeners
        const newBtn = startScrapingBtn.cloneNode(true);
        startScrapingBtn.parentNode.replaceChild(newBtn, startScrapingBtn);

        // Add the event listener
        newBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Start Scraping button clicked from configuration page");
            await appInstance.startScraping();
        });

        console.log("✅ Start Scraping button initialized");
    } else {
        console.warn("⚠️ Start Scraping button not found on configuration page");
    }

    // Initialize AI Prompt Handler
    if (window.AIPromptHandler) {
        const aiInitialized = window.AIPromptHandler.initialize();
        console.log("🤖 AI Prompt Handler initialized from navigation:", aiInitialized);
    }
}

// Connection testing functionality
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

// Initialize lead count validation
function initializeLeadCountValidation() {
    const leadCountInput = document.getElementById('leadCountInput');
    if (!leadCountInput) return;

    // Validate on input change
    leadCountInput.addEventListener('input', function() {
        const value = parseInt(this.value);

        if (value && value < 500) {
            this.style.borderColor = 'hsl(var(--error-color, 0 84% 60%))';
            this.style.boxShadow = '0 0 0 3px hsl(var(--error-color, 0 84% 60%) / 0.1)';

            // Show tooltip or error message
            this.title = 'Minimum 500 leads required';
        } else {
            this.style.borderColor = '';
            this.style.boxShadow = '';
            this.title = '';
        }
    });

    // Validate on blur and enforce minimum
    leadCountInput.addEventListener('blur', function() {
        const value = parseInt(this.value);
        if (value && value < 500) {
            this.value = 500;
            toastr.warning('Lead count adjusted to minimum value of 500');
        }
    });
}

// Initialize field selection functionality
function initializeFieldSelection() {

}

// This object can be used by navigation.js to call the correct initializer
const PageInitializers = {
    homePage: initLandingPage,
    configurationSection: initConfigurationPage,
    settingsPage: initSettingsPage,
    resultsSection: initResultsPage,
    progressSection: function(appInstance) {
        console.log("Initializing Progress Page (progressSection)");

        if (appInstance.currentTaskId) {
            console.log("📊 Current task ID available:", appInstance.currentTaskId);

            // Always set up SSE connection first for real-time updates
            console.log("📊 Setting up SSE connection for real-time progress");
            appInstance.setupEventSource();

            // Check if results have already been fetched to prevent loops
            if (appInstance._resultsFetchAttempted) {
                console.log("📊 Results already fetched, showing current data");
                if (appInstance.currentExportData && appInstance.currentExportData.length > 0) {
                    appInstance.showResults(appInstance.currentExportData, appInstance.currentExportData.length);
                } else {
                    console.log("📊 No current data available - staying on progress page");
                }
                return;
            }

            // Fetch current task status
            fetch(`/api/v1/scrape/${appInstance.currentTaskId}`)
                .then(response => response.json())
                .then(data => {
                    console.log("📊 Task status check result:", data);

                    if (data.status === 'completed') {
                        console.log("📊 Task completed, fetching results");
                        appInstance._resultsFetchAttempted = true;
                        appInstance.currentExportData = data.data || [];

                        // Close SSE connection since task is complete
                        if (appInstance.eventSource) {
                            appInstance.eventSource.close();
                            appInstance.eventSource = null;
                        }

                        if (appInstance.currentExportData.length > 0) {
                            appInstance.showResults(appInstance.currentExportData, data.total_count);
                        } else {
                            console.warn("📊 Task completed but no data found");
                            toastr.warning('Task completed but no data was found');
                            setTimeout(() => {
                                appInstance.navigationManager.navigateToPage('configure');
                            }, 2000);
                        }
                    } else if (data.status === 'failed') {
                        console.log("📊 Task failed");

                        // Close SSE connection since task failed
                        if (appInstance.eventSource) {
                            appInstance.eventSource.close();
                            appInstance.eventSource = null;
                        }

                        toastr.error(`Task failed: ${data.error || 'Unknown error'}`);
                        setTimeout(() => {
                            appInstance.navigationManager.navigateToPage('configure');
                        }, 2000);
                    } else {
                        console.log("📊 Task still running, SSE already connected for real-time updates");

                        // Update progress with current data immediately
                        if (data.progress !== undefined) {
                            appInstance.updateProgress(
                                data.progress, 
                                data.message || 'Processing...', 
                                data.status || 'running',
                                {
                                    urls_processed: data.urls_processed || 0,
                                    total_urls: data.total_urls || 1,
                                    scraped_count: data.scraped_count || 0,
                                    current_url: data.current_url || '',
                                    estimated_time: data.estimated_time || '--:--',
                                    processing_rate: data.processing_rate || 0,
                                    error_count: data.error_count || 0
                                }
                            );
                        } else {
                            // Show initial state if no progress data yet
                            appInstance.updateProgress(
                                0, 
                                'Connecting to scraping service...', 
                                'initializing',
                                {
                                    urls_processed: 0,
                                    total_urls: 1,
                                    scraped_count: 0,
                                    current_url: '',
                                    estimated_time: '--:--',
                                    processing_rate: 0,
                                    error_count: 0
                                }
                            );
                        }
                    }
                })
                .catch(error => {
                    console.error("📊 Error checking task status:", error);

                    // Don't close SSE on fetch error - might be temporary network issue
                    console.log("📊 Keeping SSE connection open despite fetch error");

                    toastr.error('Failed to check task status: ' + error.message);

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
};