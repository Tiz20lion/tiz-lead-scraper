// app/static/js/core_scraping.js

// These functions are intended to be methods of the ApolloScraper class or part of a ScrapingManager class.
// 'this' is expected to refer to an ApolloScraper instance.

function saveSettings() {
    // 'this' refers to ApolloScraper instance
    console.log("Save Settings clicked");
    
    // Get UI elements
    const saveBtn = document.getElementById('saveSettings');
    const saveStatus = document.getElementById('saveStatus');
    const btnIcon = saveBtn?.querySelector('.btn-icon');
    const btnText = saveBtn?.querySelector('.btn-text');
    
    // Validate Apify token before saving
    const apifyToken = document.getElementById('apifyToken')?.value.trim();
    if (!apifyToken) {
        this.showSaveStatus('error', 'Apify API token is required to continue');
        toastr.error("Apify API token is required!");
        
        // Focus on the Apify token input
        const apifyInput = document.getElementById('apifyToken');
        if (apifyInput) {
            apifyInput.focus();
            apifyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    if (!apifyToken.startsWith('apify_api_')) {
        this.showSaveStatus('error', 'Invalid Apify token format (should start with apify_api_)');
        toastr.error("Invalid Apify token format!");
        
        // Focus on the Apify token input
        const apifyInput = document.getElementById('apifyToken');
        if (apifyInput) {
            apifyInput.focus();
            apifyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    // Start loading state
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
        if (btnIcon) {
            btnIcon.style.opacity = '1';
            btnIcon.classList.add('spinning');
        }
        if (btnText) btnText.textContent = 'Saving Configuration...';
    }
    
    // Collect form data
    const formData = this.collectSettingsData();
    
    // Show loading status
    this.showSaveStatus('info', 'Validating and saving configuration...');
    
    // Simulate save operation with validation
    setTimeout(() => {
        try {
            // Additional validation for integrations
            let validationErrors = [];
            
            // Validate Google Sheets if enabled
            if (formData.googleSheets.enabled) {
                if (!formData.googleSheets.credentials) {
                    validationErrors.push('Google Sheets credentials are required');
                }
                if (!formData.googleSheets.spreadsheetId) {
                    validationErrors.push('Google Sheets spreadsheet ID is required');
                }
                
                // Validate JSON format for credentials
                if (formData.googleSheets.credentials) {
                    try {
                        const parsed = JSON.parse(formData.googleSheets.credentials);
                        if (!parsed.type || !parsed.private_key || !parsed.client_email) {
                            validationErrors.push('Invalid Google Sheets service account credentials');
                        }
                    } catch (e) {
                        validationErrors.push('Google Sheets credentials must be valid JSON');
                    }
                }
            }
            
            // Validate Notion if enabled - FIXED: Clean database ID parsing
            if (formData.notion.enabled) {
                if (!formData.notion.token) {
                    validationErrors.push('Notion token is required');
                }
                if (!formData.notion.databaseId) {
                    validationErrors.push('Notion database ID is required');
                }
            }
            
            // Show validation errors if any
            if (validationErrors.length > 0) {
                this.showSaveStatus('error', validationErrors[0]);
                this.resetSaveButton();
                toastr.error(validationErrors[0]);
                return;
            }
            
            // Save to localStorage
            this.saveToLocalStorage(formData);
            
            // Show success state
            this.showSaveStatus('success', 'Configuration saved successfully! Redirecting to configuration page...');
            
            // Update button to success state
            if (saveBtn) {
                saveBtn.classList.remove('loading');
                saveBtn.classList.add('success');
                if (btnIcon) {
                    btnIcon.classList.remove('spinning');
                    btnIcon.textContent = 'check_circle';
                }
                if (btnText) btnText.textContent = 'Configuration Saved!';
            }
            
            toastr.success("Settings saved successfully!");
            
            // Navigate to configure page after successful save
            setTimeout(() => {
                console.log('🚀 Navigating to configuration page...');
        this.navigationManager.navigateToPage('configure');
            }, 1500);
            
        } catch (error) {
            console.error('Save error:', error);
            this.showSaveStatus('error', 'Failed to save configuration');
            this.resetSaveButton();
            toastr.error("Failed to save settings");
        }
    }, 1500); // Simulate API delay
}

// Collect all settings data from the form
function collectSettingsData() {
    const data = {
        apifyToken: '',
        googleSheets: {
            enabled: false,
            credentials: '',
            spreadsheetId: '',
            sheetName: 'Leads'
        },
        notion: {
            enabled: false,
            token: '',
            databaseId: ''
        }
    };
    
    // Collect Apify token
    const apifyInput = document.getElementById('apifyToken');
    if (apifyInput) {
        data.apifyToken = apifyInput.value.trim();
    }
    
    // Collect Google Sheets settings
    const sheetsToggle = document.getElementById('enableSheets');
    if (sheetsToggle && sheetsToggle.checked) {
        data.googleSheets.enabled = true;
        
        const credentialsInput = document.getElementById('googleCredentials');
        const spreadsheetInput = document.getElementById('spreadsheetId');
        const sheetNameInput = document.getElementById('sheetName');
        
        if (credentialsInput) data.googleSheets.credentials = credentialsInput.value.trim();
        if (spreadsheetInput) data.googleSheets.spreadsheetId = spreadsheetInput.value.trim();
        if (sheetNameInput) data.googleSheets.sheetName = sheetNameInput.value.trim() || 'Leads';
    }
    
    // Collect Notion settings with improved database ID parsing
    const notionToggle = document.getElementById('enableNotion');
    if (notionToggle && notionToggle.checked) {
        data.notion.enabled = true;
        
        const tokenInput = document.getElementById('notionToken');
        const dbIdInput = document.getElementById('notionDatabaseId');
        
        if (tokenInput) data.notion.token = tokenInput.value.trim();
        if (dbIdInput) {
            const rawDbId = dbIdInput.value.trim();
            // Use the improved extraction function
            data.notion.databaseId = extractNotionDatabaseId(rawDbId);
        }
    }
    
    return data;
}

// Save data to localStorage
function saveToLocalStorage(data) {
    // Save individual fields
    if (data.apifyToken) {
        localStorage.setItem('apifyToken', data.apifyToken);
    }
    
    // Save Google Sheets settings
    if (data.googleSheets.enabled) {
        if (data.googleSheets.credentials) {
            localStorage.setItem('googleCredentials', data.googleSheets.credentials);
        }
        if (data.googleSheets.spreadsheetId) {
            localStorage.setItem('spreadsheetId', data.googleSheets.spreadsheetId);
        }
        localStorage.setItem('sheetName', data.googleSheets.sheetName);
        localStorage.setItem('googleSheetsEnabled', 'true');
    } else {
        localStorage.removeItem('googleSheetsEnabled');
    }
    
    // Save Notion settings with cleaned database ID
    if (data.notion.enabled) {
        if (data.notion.token) {
            localStorage.setItem('notionToken', data.notion.token);
        }
        if (data.notion.databaseId) {
            localStorage.setItem('notionDatabaseId', data.notion.databaseId);
        }
        localStorage.setItem('notionEnabled', 'true');
    } else {
        localStorage.removeItem('notionEnabled');
    }
    
    console.log('✅ Settings saved to localStorage:', data);
}

// Show save status message
function showSaveStatus(type, message) {
    const saveStatus = document.getElementById('saveStatus');
    if (!saveStatus) return;
    
    saveStatus.className = `save-status ${type}`;
    const indicator = saveStatus.querySelector('.status-indicator');
    const text = saveStatus.querySelector('.status-text');
    
    if (text) text.textContent = message;
    saveStatus.style.display = 'flex';
    
    // Hide after 4 seconds for success/info, keep visible for errors
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            if (saveStatus.classList.contains(type)) {
                saveStatus.style.display = 'none';
            }
        }, 4000);
    }
}

// Reset save button to normal state
function resetSaveButton() {
    const saveBtn = document.getElementById('saveSettings');
    const btnIcon = saveBtn?.querySelector('.btn-icon');
    const btnText = saveBtn?.querySelector('.btn-text');
    
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading', 'success', 'error');
        if (btnIcon) {
            btnIcon.style.opacity = '1';
            btnIcon.classList.remove('spinning');
            btnIcon.textContent = 'save';
        }
        if (btnText) btnText.textContent = 'Save Configuration';
    }
}

async function startScraping() {
    // 'this' refers to ApolloScraper instance
    console.log("Start Scraping main button clicked");
    
    // Reset any previous state flags
    this._resultsFetchAttempted = false;
    this.currentExportData = [];
    
    const apifyToken = localStorage.getItem('apifyToken');
    const mainUrlInput = document.getElementById('urlInput'); 
    const leadCountInput = document.getElementById('leadCountInput'); 
    
    if (!apifyToken) {
        toastr.error("Apify token not set. Please go to Settings.");
        this.navigationManager.navigateToPage('settings'); return;
    }
    if (!mainUrlInput || !mainUrlInput.value.trim()) {
        toastr.error("No URLs provided for scraping. Use the AI assistant or enter URLs manually if that feature is restored.");
        this.navigationManager.navigateToPage('configure'); 
        return;
    }

    const urls = mainUrlInput.value.trim().split('\n').filter(url => url.trim().startsWith('http'));
    if (urls.length === 0) {
        toastr.error("No valid URLs found for scraping."); return;
    }
    const leadCount = leadCountInput ? parseInt(leadCountInput.value) : 100;
    const fields = this.getSelectedFields();

    console.log("Starting scraping with:", { urls, leadCount, fields, apifyToken: '***' });
    this.showLoadingOverlay("Initiating scraping task...");
    this.navigationManager.navigateToPage('progress');

    try {
        const response = await fetch('/api/v1/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.csrfToken 
            },
            body: JSON.stringify({
                urls: urls,
                lead_count: leadCount,
                fields: fields,
                apify_token: apifyToken
            })
        });
        const data = await response.json();
        this.hideLoadingOverlay();
        if (response.ok && data.task_id) {
            this.currentTaskId = data.task_id;
            toastr.success('Scraping task started successfully!');
            this.setupEventSource(); // Changed from startPolling
        } else {
            throw new Error(data.detail || 'Failed to start scraping task');
        }
    } catch (error) {
        this.hideLoadingOverlay();
        toastr.error(`Scraping start failed: ${error.message}`);
        this.navigationManager.navigateToPage('configure'); 
    }
}

function getSelectedFields() {
    // 'this' refers to ApolloScraper instance
    const configSection = document.getElementById('configurationSection');
    if (!configSection) {
        console.warn("Configuration section not found to get selected fields. Using defaults.");
        return ["name", "email", "company", "title"]; 
    }
    const fieldCheckboxes = configSection.querySelectorAll('.field-toggle-card.active input[type="checkbox"]');
    if (!fieldCheckboxes || fieldCheckboxes.length === 0) {
         console.warn("No fields selected, using default.");
         return ["name", "email", "company", "title"]; 
    }
    return Array.from(fieldCheckboxes).map(cb => cb.value);
}

function setupEventSource() {
    // 'this' refers to ApolloScraper instance
    if (!this.currentTaskId) return;
    if (this.eventSource) {
        this.eventSource.close();
    }
    console.log(`Setting up SSE for task: ${this.currentTaskId}`);
    this.eventSource = new EventSource(`/api/v1/sse/progress/${this.currentTaskId}`);

    this.eventSource.onmessage = (event) => {
        const eventData = JSON.parse(event.data);
        console.log('🔄 SSE Progress Update:', eventData);
        this.updateProgress(eventData.percentage, eventData.message, eventData.status); // Pass status too

        if (eventData.status === 'completed' || eventData.status === 'failed') {
            this.eventSource.close();
            this.eventSource = null;
            
            if (eventData.status === 'completed') {
                // Reset the fetch attempt flag before fetching
                this._resultsFetchAttempted = false;
                this.fetchFinalResults();
            } else {
                this.hideLoadingOverlay?.(); // If defined in ui_helpers
                this.hideProgressSection?.(); // If defined
                toastr.error(`Scraping failed: ${eventData.message}`);
                
                // Navigate back to configure after failure
                setTimeout(() => {
                    this.navigationManager.navigateToPage('configure');
                }, 2000);
            }
        }
    };

    this.eventSource.onerror = (error) => {
        console.error('🚨 SSE connection error:', error);
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        toastr.error("Real-time progress update failed. Please check results manually later.");
        // Optionally implement a fallback to polling here if desired
    };
}

async function fetchFinalResults() {
    // 'this' refers to ApolloScraper instance
    if (!this.currentTaskId) return;
    console.log(`Fetching final results for task ${this.currentTaskId}`);
    this.showLoadingOverlay?.('Fetching final results...');
    try {
        const response = await fetch(`/api/v1/scrape/${this.currentTaskId}`);
        const data = await response.json();
        this.hideLoadingOverlay?.();
        
        if (response.ok && data.status === 'completed') {
            this.currentExportData = data.data || [];
            
            // Check if we actually have data
            if (this.currentExportData.length > 0) {
                this.showResults(this.currentExportData, data.total_count);
                toastr.success(`Scraping completed! Found ${data.total_count || 0} leads`);
            } else {
                // Task completed but with no data
                console.warn('Task completed but no leads were found');
                toastr.warning('Scraping completed but no leads were found. Try different URLs or check your target criteria.', {
                    timeOut: 8000,
                    extendedTimeOut: 3000
                });
                
                // Reset the fetch attempt flag and navigate to configure
                this._resultsFetchAttempted = false;
                setTimeout(() => {
                    this.navigationManager.navigateToPage('configure');
                }, 2000);
            }
        } else if (response.status === 404 || data.detail?.includes('Task not found')) {
            // Task not found - likely server restart or task expired
            console.warn('Task not found - likely server restart or task expired');
            toastr.error('Task not found. The server may have been restarted or the task expired. Please start a new scraping task.', {
                timeOut: 8000,
                extendedTimeOut: 3000
            });
            
            // Clear the current task ID and reset flags
            this.currentTaskId = null;
            this.currentExportData = [];
            this._resultsFetchAttempted = false;
            
            // Navigate to configure page
            setTimeout(() => {
                this.navigationManager.navigateToPage('configure');
            }, 2000);
        } else {
            throw new Error(data.detail || "Failed to fetch final results");
        }
    } catch (error) {
        this.hideLoadingOverlay?.();
        console.error('Failed to fetch final results:', error);
        
        // Reset the fetch attempt flag
        this._resultsFetchAttempted = false;
        
        toastr.error('Failed to retrieve final results: ' + error.message, {
            timeOut: 8000,
            extendedTimeOut: 3000
        });
        
        // Navigate back to configure after error
        setTimeout(() => {
            this.navigationManager.navigateToPage('configure');
        }, 2000);
    }
}

function showResults(data, totalCount) {
    // 'this' refers to ApolloScraper instance
    console.log('🎯 showResults called with:', { dataLength: data?.length, totalCount });
    
    // Prevent infinite loops when called with empty data
    if (!data || data.length === 0) {
        console.warn('⚠️ showResults called with empty data - preventing navigation loop');
        return;
    }
    
    this.currentExportData = data || [];
    const resultsCountEl = document.getElementById('resultsCount');
    if (resultsCountEl) resultsCountEl.textContent = `${totalCount || 0} leads found`;
    
    this.navigationManager.navigateToPage('results');
    this.displayCurrentResults(); 
}

function displayCurrentResults() {
    // 'this' refers to ApolloScraper instance
    console.log('🎯 Displaying current results. View:', this.currentView, 'Data length:', this.currentExportData?.length);
    
    const cardsGrid = document.getElementById('cardsGrid');
    const cardsEmpty = document.getElementById('cardsEmpty');
    const resultsTableBodyEl = document.getElementById('resultsTableBody');
    const resultsTableHeadEl = document.getElementById('resultsTableHead');
    const tableEmpty = document.getElementById('tableEmpty');
    
    // Initialize view toggle functionality
    this.initializeViewToggle();

    if (!this.currentExportData || this.currentExportData.length === 0) {
        this.showEmptyState();
        return;
    }

    // Hide empty states
    if (cardsEmpty) cardsEmpty.style.display = 'none';
    if (tableEmpty) tableEmpty.style.display = 'none';
    
    // Render both views (limited to first 20 leads for preview)
    this.renderCardView();
    this.renderTableView();
    
    // Update results count
    const resultsCountEl = document.getElementById('resultsCount');
    if (resultsCountEl) {
        resultsCountEl.textContent = `${this.currentExportData.length} leads found`;
    }
    
    console.log(`✅ ${this.currentExportData.length} leads displayed in both views`);
}

function updateProgress(percentage, message, status) {
    // 'this' refers to ApolloScraper instance
    const fill = document.getElementById('progressFill');
    const percentageEl = document.getElementById('progressPercentage');
    const messageEl = document.getElementById('progressMessage');

    if (fill) fill.style.width = percentage + "%";
    if (percentageEl) percentageEl.textContent = percentage + "%";
    if (messageEl) messageEl.textContent = message;
    console.log(`🔄 Progress: ${percentage}% - ${message} (Status: ${status})`);
}

async function exportCsv() {
    // 'this' refers to ApolloScraper instance
    if (!this.currentTaskId) { toastr.error('No task data to export'); return; }
    console.log("Exporting CSV for task:", this.currentTaskId);
    window.location.href = `/api/v1/export/csv/${this.currentTaskId}`;
    toastr.success("CSV download initiated.");
}

async function exportJson() {
    // 'this' refers to ApolloScraper instance
    if (!this.currentTaskId) { toastr.error('No task data to export'); return; }
    console.log("Exporting JSON for task:", this.currentTaskId);
    window.location.href = `/api/v1/export/json/${this.currentTaskId}`;
    toastr.success("JSON download initiated.");
}

async function exportToSheets() {
    // 'this' refers to ApolloScraper instance
    if (!this.currentExportData || this.currentExportData.length === 0) { 
        toastr.error('No data to export to Google Sheets'); 
        return; 
    }
    
    // Check localStorage for saved Google Sheets settings
    const googleCredentials = localStorage.getItem('googleCredentials');
    const spreadsheetId = localStorage.getItem('spreadsheetId');
    const sheetName = localStorage.getItem('sheetName') || 'Leads';
    const isGoogleSheetsEnabled = localStorage.getItem('googleSheetsEnabled') === 'true';

    if (!isGoogleSheetsEnabled || !googleCredentials || !spreadsheetId) {
        toastr.error('Google Sheets integration not configured. Please go to Settings to set up Google Sheets credentials and spreadsheet ID.');
        // Optionally navigate to settings
        setTimeout(() => {
            if (confirm('Would you like to go to Settings to configure Google Sheets integration?')) {
                this.navigationManager.navigateToPage('settings');
            }
        }, 100);
        return;
    }

    let parsedCreds;
    try { 
        parsedCreds = JSON.parse(googleCredentials); 
    } catch (e) { 
        toastr.error('Invalid Google Credentials saved. Please reconfigure in Settings.'); 
        return; 
    }

    console.log("Exporting to Sheets:", { spreadsheetId, sheetName });
    
    // Add visual feedback to the button
    const sheetsBtn = document.getElementById('exportSheets');
    const originalContent = sheetsBtn ? sheetsBtn.innerHTML : '';
    if (sheetsBtn) {
        sheetsBtn.disabled = true;
        sheetsBtn.innerHTML = `
            <div class="export-icon-compact">
                <span class="material-symbols-outlined spinning">sync</span>
            </div>
            <div class="export-info-compact">
                <div class="export-title-compact">Syncing...</div>
                <div class="export-desc-compact">Please wait</div>
            </div>
        `;
        sheetsBtn.style.opacity = '0.7';
    }
    
    this.showLoadingOverlay?.('Exporting to Google Sheets...');
    try {
        const response = await fetch('/api/v1/export/sheets', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': this.csrfToken },
            body: JSON.stringify({ spreadsheet_id: spreadsheetId, sheet_name: sheetName, data: this.currentExportData, google_credentials: parsedCreds })
        });
        const result = await response.json();
        this.hideLoadingOverlay?.();
        
        if (response.ok && result.status === 'success') {
            toastr.success(`Successfully exported ${result.updated_rows || result.created_count || 0} rows to Google Sheets!`);
            // Show success state briefly
            if (sheetsBtn) {
                sheetsBtn.innerHTML = `
                    <div class="export-icon-compact">
                        <span class="material-symbols-outlined">check_circle</span>
                    </div>
                    <div class="export-info-compact">
                        <div class="export-title-compact">Success!</div>
                        <div class="export-desc-compact">Synced</div>
                    </div>
                `;
                sheetsBtn.style.opacity = '1';
                setTimeout(() => {
                    if (sheetsBtn) {
                        sheetsBtn.innerHTML = originalContent;
                        sheetsBtn.disabled = false;
                    }
                }, 3000);
            }
        } else {
            throw new Error(result.message || result.detail || 'Failed to export to Sheets');
        }
    } catch (error) {
        this.hideLoadingOverlay?.();
        toastr.error(`Sheets export failed: ${error.message}`);
        // Restore button state on error
        if (sheetsBtn) {
            sheetsBtn.innerHTML = originalContent;
            sheetsBtn.disabled = false;
            sheetsBtn.style.opacity = '1';
        }
    }
}

async function exportToNotion() {
    // 'this' refers to ApolloScraper instance
    if (!this.currentExportData || this.currentExportData.length === 0) { 
        toastr.error('No data to export to Notion'); 
        return; 
    }

    // Check localStorage for saved Notion settings
    const notionToken = localStorage.getItem('notionToken');
    let databaseId = localStorage.getItem('notionDatabaseId');
    const isNotionEnabled = localStorage.getItem('notionEnabled') === 'true';

    if (!isNotionEnabled || !notionToken || !databaseId) {
        toastr.error('Notion integration not configured. Please go to Settings to set up Notion token and database ID.');
        // Optionally navigate to settings
        setTimeout(() => {
            if (confirm('Would you like to go to Settings to configure Notion integration?')) {
                this.navigationManager.navigateToPage('settings');
            }
        }, 100);
        return;
    }

    // Clean the database ID before sending (handle URLs and view parameters)
    databaseId = extractNotionDatabaseId(databaseId);

    console.log("Exporting to Notion:", { databaseId });
    
    // Add visual feedback to the button
    const notionBtn = document.getElementById('exportNotion');
    const originalContent = notionBtn ? notionBtn.innerHTML : '';
    if (notionBtn) {
        notionBtn.disabled = true;
        notionBtn.innerHTML = `
            <div class="export-icon-compact">
                <span class="material-symbols-outlined spinning">sync</span>
            </div>
            <div class="export-info-compact">
                <div class="export-title-compact">Syncing...</div>
                <div class="export-desc-compact">Please wait</div>
            </div>
        `;
        notionBtn.style.opacity = '0.7';
    }
    
    this.showLoadingOverlay?.('Exporting to Notion...');
    try {
        const response = await fetch('/api/v1/export/notion', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': this.csrfToken },
            body: JSON.stringify({ database_id: databaseId, data: this.currentExportData, notion_token: notionToken })
        });
        const result = await response.json();
        this.hideLoadingOverlay?.();
        
        if (response.ok && (result.status === 'success' || result.status === 'partial_success')) {
            toastr.success(`Successfully created ${result.created_count || 0} entries in Notion!`);
            if (result.errors && result.errors.length > 0) {
                toastr.warning(`${result.errors.length} entries had issues. Check that your Notion database has these properties: Email, Phone, Location, Company, Title, Industry, Linkedin, Twitter, Website`, {
                    timeOut: 8000,
                    extendedTimeOut: 2000
                });
            }
            // Show success state briefly
            if (notionBtn) {
                notionBtn.innerHTML = `
                    <div class="export-icon-compact">
                        <span class="material-symbols-outlined">check_circle</span>
                    </div>
                    <div class="export-info-compact">
                        <div class="export-title-compact">Success!</div>
                        <div class="export-desc-compact">Synced</div>
                    </div>
                `;
                notionBtn.style.opacity = '1';
                setTimeout(() => {
                    if (notionBtn) {
                        notionBtn.innerHTML = originalContent;
                        notionBtn.disabled = false;
                    }
                }, 3000);
            }
        } else {
            // Handle schema mismatch errors specifically
            if (result.message && result.message.includes('is not a property that exists')) {
                const errorMsg = 'Database schema mismatch. Please ensure your Notion database has these properties: Email, Phone, Location, Company, Title, Industry, Linkedin, Twitter, Website';
                toastr.error(errorMsg, {
                    timeOut: 10000,
                    extendedTimeOut: 3000
                });
                throw new Error(errorMsg);
            } else {
                throw new Error(result.message || result.detail || 'Failed to export to Notion');
            }
        }
    } catch (error) {
        this.hideLoadingOverlay?.();
        toastr.error(`Notion export failed: ${error.message}`, {
            timeOut: 8000,
            extendedTimeOut: 2000
        });
        // Restore button state on error
        if (notionBtn) {
            notionBtn.innerHTML = originalContent;
            notionBtn.disabled = false;
            notionBtn.style.opacity = '1';
        }
    }
}

// Helper function to initialize view toggle
function initializeViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn-compact');
    const cardsView = document.getElementById('cardsView');
    const tableView = document.getElementById('tableView');
    
    if (!viewButtons.length || !cardsView || !tableView) return;
    
    // Set initial view if not set (default to cards)
    if (!this.currentView) {
        this.currentView = 'cards';
    }
    
    // Update view buttons and containers
    viewButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === this.currentView) {
            btn.classList.add('active');
        }
        
        // Remove existing listeners and add new ones
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            this.currentView = newBtn.dataset.view;
            this.updateViewDisplay();
        });
    });
    
    this.updateViewDisplay();
}

// Helper function to update view display
function updateViewDisplay() {
    const cardsView = document.getElementById('cardsView');
    const tableView = document.getElementById('tableView');
    const viewButtons = document.querySelectorAll('.view-btn-compact');
    
    if (!cardsView || !tableView) return;
    
    // Update button states
    viewButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === this.currentView) {
            btn.classList.add('active');
        }
    });
    
    // Update view visibility
    if (this.currentView === 'cards') {
        cardsView.style.display = 'block';
        tableView.style.display = 'none';
    } else {
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
    }
}

// Helper function to show empty state
function showEmptyState() {
    const cardsEmpty = document.getElementById('cardsEmpty');
    const tableEmpty = document.getElementById('tableEmpty');
    const cardsGrid = document.getElementById('cardsGrid');
    const resultsTableBodyEl = document.getElementById('resultsTableBody');
    
    if (cardsGrid) cardsGrid.innerHTML = '';
    if (resultsTableBodyEl) resultsTableBodyEl.innerHTML = '';
    
    if (cardsEmpty) cardsEmpty.style.display = 'block';
    if (tableEmpty) tableEmpty.style.display = 'block';
    
    console.log("📊 No data to display - showing empty state");
}

// Helper function to render card view (LIMITED TO FIRST 20)
function renderCardView() {
    const cardsGrid = document.getElementById('cardsGrid');
    const template = document.getElementById('leadCardTemplate');
    
    if (!cardsGrid || !template) {
        console.error("❌ Cards elements not found");
        return;
    }
    
    // Clear existing cards
    cardsGrid.innerHTML = '';
    
    // Limit to first 20 leads for preview
    const previewData = this.currentExportData.slice(0, 20);
    
    previewData.forEach((lead, index) => {
        try {
            const cardClone = template.content.cloneNode(true);
            const card = cardClone.querySelector('.lead-card-compact');
            
            // Populate card data
            this.populateCardData(card, lead);
            
            // Add to grid
            cardsGrid.appendChild(cardClone);
        } catch (error) {
            console.error(`❌ Error creating card ${index}:`, error, lead);
        }
    });
    
    console.log(`✅ ${previewData.length} cards rendered (limited to first 20)`);
}

// Helper function to populate card data
function populateCardData(card, lead) {
    if (!card || !lead) return;
    
    // Basic info using new class names
    const nameEl = card.querySelector('.lead-name-compact');
    const titleEl = card.querySelector('.lead-title-compact');
    const companyEl = card.querySelector('.company-text');
    const locationEl = card.querySelector('.location-text');
    const industryEl = card.querySelector('.industry-text');
    
    if (nameEl) nameEl.textContent = this.formatValue(lead.name) || 'Unknown';
    if (titleEl) titleEl.textContent = this.formatValue(lead.title) || 'No title';
    if (companyEl) companyEl.textContent = this.formatValue(lead.company) || 'Unknown company';
    if (locationEl) locationEl.textContent = this.formatValue(lead.location) || 'No location';
    if (industryEl) industryEl.textContent = this.formatValue(lead.industry) || 'No industry';
    
    // Hide details that are empty
    const companyDetail = card.querySelector('.company-detail');
    const locationDetail = card.querySelector('.location-detail');
    const industryDetail = card.querySelector('.industry-detail');
    
    if (companyDetail && (!lead.company || this.formatValue(lead.company) === 'Unknown company')) {
        companyDetail.style.display = 'none';
    }
    if (locationDetail && (!lead.location || this.formatValue(lead.location) === 'No location')) {
        locationDetail.style.display = 'none';
    }
    if (industryDetail && (!lead.industry || this.formatValue(lead.industry) === 'No industry')) {
        industryDetail.style.display = 'none';
    }
    
    // Contact links using new class names
    const emailLink = card.querySelector('.email-btn');
    const phoneLink = card.querySelector('.phone-btn');
    const linkedinLink = card.querySelector('.linkedin-btn');
    const websiteLink = card.querySelector('.website-btn');
    
    if (emailLink && lead.email) {
        emailLink.href = `mailto:${lead.email}`;
        emailLink.style.display = 'flex';
        emailLink.title = `Email: ${lead.email}`;
    } else if (emailLink) {
        emailLink.style.display = 'none';
    }
    
    if (phoneLink && lead.phone) {
        const cleanPhone = String(lead.phone).replace(/['"]/g, '');
        phoneLink.href = `tel:${cleanPhone}`;
        phoneLink.style.display = 'flex';
        phoneLink.title = `Call: ${cleanPhone}`;
    } else if (phoneLink) {
        phoneLink.style.display = 'none';
    }
    
    if (linkedinLink && lead.linkedin) {
        linkedinLink.href = lead.linkedin;
        linkedinLink.style.display = 'flex';
        linkedinLink.title = 'View LinkedIn Profile';
    } else if (linkedinLink) {
        linkedinLink.style.display = 'none';
    }
    
    if (websiteLink && lead.website) {
        websiteLink.href = lead.website;
        websiteLink.style.display = 'flex';
        websiteLink.title = 'Visit Website';
    } else if (websiteLink) {
        websiteLink.style.display = 'none';
    }
}

// Helper function to render table view (LIMITED TO FIRST 20)
function renderTableView() {
    const resultsTableBodyEl = document.getElementById('resultsTableBody');
    const resultsTableHeadEl = document.getElementById('resultsTableHead');
    
    if (!resultsTableBodyEl || !resultsTableHeadEl) {
        console.error("❌ Table elements not found for displaying results.");
        return;
    }
    
    // Clear previous results
    resultsTableBodyEl.innerHTML = '';
    resultsTableHeadEl.innerHTML = '';

    // Limit to first 20 leads for preview
    const previewData = this.currentExportData.slice(0, 20);

    // Create headers from the first item's keys
    const firstLead = previewData[0];
    if (!firstLead || typeof firstLead !== 'object') {
        console.error("❌ Invalid lead data format:", firstLead);
        resultsTableBodyEl.innerHTML = '<tr><td colspan="100%" class="text-center p-4">Invalid data format.</td></tr>';
        return;
    }
    
    const headers = Object.keys(firstLead);
    console.log('📋 Creating table headers:', headers);
    
    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = this.formatKey(header);
        headerRow.appendChild(th);
    });
    resultsTableHeadEl.appendChild(headerRow);

    // Populate data rows
    previewData.forEach((lead, index) => {
        try {
            const row = resultsTableBodyEl.insertRow();
            headers.forEach(header => {
                const cell = row.insertCell();
                const value = lead[header];
                
                // Handle different data types and apply formatting
                if (header.includes('email') && value) {
                    cell.innerHTML = `<a href="mailto:${value}" class="text-blue-600 hover:underline">${value}</a>`;
                } else if (header.includes('linkedin') && value) {
                    cell.innerHTML = `<a href="${value}" target="_blank" class="text-blue-600 hover:underline">LinkedIn</a>`;
                } else if (header.includes('website') && value) {
                    cell.innerHTML = `<a href="${value}" target="_blank" class="text-blue-600 hover:underline">Website</a>`;
                } else if (header.includes('phone') && value) {
                    const cleanPhone = String(value).replace(/['"]/g, ''); // Remove quotes
                    cell.innerHTML = `<a href="tel:${cleanPhone}" class="text-green-600 hover:underline">${cleanPhone}</a>`;
                } else {
                    cell.textContent = this.formatValue(value);
                }
            });
        } catch (error) {
            console.error(`❌ Error creating row ${index}:`, error, lead);
        }
    });
    
    console.log(`✅ ${previewData.length} leads displayed in table with ${headers.length} columns (limited to first 20)`);
} 