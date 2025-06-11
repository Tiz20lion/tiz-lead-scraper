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

    try {
        // Reset any previous state flags
        this._resultsFetchAttempted = false;
        this.currentExportData = [];

        const apifyToken = localStorage.getItem('apifyToken');
        const mainUrlInput = document.getElementById('urlInput'); 
        const leadCountInput = document.getElementById('leadCountInput'); 

        // Validate Apify token
        if (!apifyToken) {
            toastr.error("Apify token not set. Please go to Settings.", {
                timeOut: 5000,
                extendedTimeOut: 2000
            });
            this.navigationManager.navigateToPage('settings'); 
            return;
        }

        // Check if we have URLs - either from AI assistant or manual input
        let urls = [];
        if (mainUrlInput && mainUrlInput.value.trim()) {
            urls = mainUrlInput.value.trim().split('\n').filter(url => url.trim().startsWith('http'));
        }

        if (urls.length === 0) {
            // Check if AI results are visible but user hasn't clicked "Use this URL"
            const aiResults = document.getElementById('aiResults');
            const generatedUrl = document.getElementById('generatedUrl');
            const aiPromptInput = document.getElementById('aiPromptInput');

            // Priority 1: AI generated URL exists but not applied
            if (aiResults && aiResults.style.display !== 'none' && generatedUrl && generatedUrl.value.trim()) {
                toastr.error("⚠️ Generated URL found! Please click 'Use This URL' button to apply it before starting scraping.", {
                    timeOut: 8000,
                    extendedTimeOut: 3000,
                    closeButton: true
                });

                // Highlight the "Use This URL" button with enhanced animation
                const useUrlBtn = document.getElementById('useUrlBtn');
                if (useUrlBtn) {
                    useUrlBtn.style.animation = 'pulse 1.5s ease-in-out 4';
                    useUrlBtn.style.boxShadow = '0 0 0 4px hsl(var(--accent-primary) / 0.3), 0 0 20px hsl(var(--accent-primary) / 0.5)';
                    useUrlBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Remove highlight after animation
                    setTimeout(() => {
                        useUrlBtn.style.boxShadow = '';
                    }, 6000);
                }
                return;
            }
            // Priority 2: User has entered a prompt but hasn't generated URL yet
            else if (aiPromptInput && aiPromptInput.value.trim()) {
                toastr.error("💡 Please generate an Apollo URL first using the 'Generate Query' button, then click 'Use This URL'.", {
                    timeOut: 7000,
                    extendedTimeOut: 3000,
                    closeButton: true
                });

                // Highlight the generate button
                const generateBtn = document.getElementById('generateBtn');
                if (generateBtn && !generateBtn.disabled) {
                    generateBtn.style.animation = 'pulse 1s ease-in-out 3';
                    generateBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            // Priority 3: No prompt entered at all
            else {
                toastr.error("🚀 Get started! Enter your target audience in the AI prompt field and generate Apollo URLs.", {
                    timeOut: 6000,
                    extendedTimeOut: 2000,
                    closeButton: true
                });

                // Focus on AI prompt input
                if (aiPromptInput) {
                    aiPromptInput.focus();
                    aiPromptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Add subtle highlight to prompt area
                    const aiInputWrapper = aiPromptInput.closest('.ai-input-wrapper') || aiPromptInput.closest('.ai-prompt-simple');
                    if (aiInputWrapper) {
                        aiInputWrapper.style.boxShadow = '0 0 0 3px hsl(var(--accent-primary) / 0.2)';
                        setTimeout(() => {
                            aiInputWrapper.style.boxShadow = '';
                        }, 4000);
                    }
                }
                return;
            }
        }

        // Validate lead count input
        const leadCountValue = leadCountInput ? leadCountInput.value.trim() : '';
        if (!leadCountValue) {
            toastr.error("Please enter the number of leads you want to scrape.", {
                timeOut: 5000,
                extendedTimeOut: 2000
            });

            if (leadCountInput) {
                leadCountInput.focus();
                leadCountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add error styling temporarily
                leadCountInput.style.borderColor = 'hsl(var(--error-color, 0 84% 60%))';
                leadCountInput.style.boxShadow = '0 0 0 3px hsl(var(--error-color, 0 84% 60%) / 0.1)';

                setTimeout(() => {
                    leadCountInput.style.borderColor = '';
                    leadCountInput.style.boxShadow = '';
                }, 3000);
            }
            return;
        }

        const leadCount = parseInt(leadCountValue);

        // Validate lead count is a valid number
        if (isNaN(leadCount) || leadCount <= 0) {
            toastr.error("Please enter a valid number for lead count.", {
                timeOut: 5000,
                extendedTimeOut: 2000
            });

            if (leadCountInput) {
                leadCountInput.focus();
                leadCountInput.select();
                leadCountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Validate minimum lead count
        if (leadCount < 500) {
            toastr.error("Minimum lead count is 500. Please enter at least 500 leads.", {
                timeOut: 6000,
                extendedTimeOut: 2000
            });

            // Focus and highlight the lead count input
            if (leadCountInput) {
                leadCountInput.focus();
                leadCountInput.select();
                leadCountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Add error styling temporarily
                leadCountInput.style.borderColor = 'hsl(var(--error-color, 0 84% 60%))';
                leadCountInput.style.boxShadow = '0 0 0 3px hsl(var(--error-color, 0 84% 60%) / 0.1)';

                setTimeout(() => {
                    leadCountInput.style.borderColor = '';
                    leadCountInput.style.boxShadow = '';
                }, 3000);
            }
            return;
        }

        // Validate maximum lead count
        if (leadCount > 50000) {
            toastr.error("Maximum lead count is 50,000. Please enter a lower number.", {
                timeOut: 6000,
                extendedTimeOut: 2000
            });

            if (leadCountInput) {
                leadCountInput.focus();
                leadCountInput.select();
                leadCountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        const fields = this.getSelectedFields();

        // Validate that at least some fields are selected
        if (!fields || fields.length === 0) {
            toastr.error("Please select at least one field to extract.", {
                timeOut: 5000,
                extendedTimeOut: 2000
            });

            // Scroll to field selection section
            const fieldSection = document.querySelector('.field-category');
            if (fieldSection) {
                fieldSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        console.log("Starting scraping with:", { urls, leadCount, fields, apifyToken: '***' });

        // Disable the start button to prevent multiple clicks
        const startBtn = document.getElementById('startScraping');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.style.opacity = '0.7';
        }

        // Show loading and navigate to progress page
        this.showLoadingOverlay("Initiating scraping task...");
        this.navigationManager.navigateToPage('progress');

        try {
            console.log("Making API call to /api/v1/scrape...");
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

            console.log("API response status:", response.status);

            if (!response.ok) {
                // Handle HTTP errors
                let errorMessage = `Server error (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch (parseError) {
                    console.error("Failed to parse error response:", parseError);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log("API response data:", data);

            this.hideLoadingOverlay();

            if (data.task_id) {
                this.currentTaskId = data.task_id;
                console.log("Scraping task started successfully with ID:", data.task_id);
                toastr.success('Scraping task started successfully!');
                this.setupEventSource();
            } else {
                throw new Error(data.detail || data.message || 'No task ID returned from server');
            }
        } catch (fetchError) {
            console.error("Network or API error:", fetchError);
            this.hideLoadingOverlay();

            // Re-enable the start button
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
            }

            let userMessage = "Failed to start scraping task.";
            if (fetchError.message.includes('NetworkError') || fetchError.message.includes('fetch')) {
                userMessage = "Network error. Please check your connection and try again.";
            } else if (fetchError.message) {
                userMessage = `Scraping start failed: ${fetchError.message}`;
            }

            toastr.error(userMessage, {
                timeOut: 8000,
                extendedTimeOut: 3000
            });

            this.navigationManager.navigateToPage('configure'); 
        }

    } catch (generalError) {
        console.error("General error in startScraping:", generalError);
        this.hideLoadingOverlay?.();

        // Re-enable the start button
        const startBtn = document.getElementById('startScraping');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
        }

        toastr.error(`An unexpected error occurred: ${generalError.message}`, {
            timeOut: 8000,
            extendedTimeOut: 3000
        });

        // Stay on configure page for general errors
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
        console.log('🔄 Closing existing SSE connection');
        this.eventSource.close();
    }
    console.log(`Setting up SSE for task: ${this.currentTaskId}`);
    
    // Reset reconnection attempts when setting up new connection
    this.reconnectAttempts = 0;
    
    this.eventSource = new EventSource(`/api/v1/sse/progress/${this.currentTaskId}`);

    // Update connection status indicator
    updateConnectionStatus.call(this, 'connected');

    this.eventSource.onopen = (event) => {
        console.log('✅ SSE connection opened successfully');
        updateConnectionStatus.call(this, 'connected');
        this.reconnectAttempts = 0; // Reset on successful connection
    };

    this.eventSource.onmessage = (event) => {
        try {
            const eventData = JSON.parse(event.data);
            console.log('🔄 SSE Progress Update:', eventData);

            // Handle different types of SSE events
            if (eventData.connection === 'established') {
                console.log('✅ SSE connection established');
                updateConnectionStatus.call(this, 'connected');
                return;
            }

            if (eventData.error) {
                console.error('❌ SSE error received:', eventData.error);
                updateConnectionStatus.call(this, 'error');
                toastr.error(`Real-time update error: ${eventData.message || eventData.error}`);
                return;
            }

            // Update connection status based on data
            if (eventData.connection_status) {
                updateConnectionStatus.call(this, eventData.connection_status);
            } else {
                // Assume connected if we're receiving data
                updateConnectionStatus.call(this, 'connected');
            }

            // Pass all available data to updateProgress with enhanced real-time info
            this.updateProgress(
                eventData.percentage || 0, 
                eventData.message || 'Processing...', 
                eventData.status || 'running', 
                {
                    urls_processed: eventData.urls_processed || 0,
                    total_urls: eventData.total_urls || 1,
                    scraped_count: eventData.scraped_count || 0,
                    current_url: eventData.current_url || '',
                    estimated_time: eventData.estimated_time || '--:--',
                    processing_rate: eventData.processing_rate || 0,
                    error_count: eventData.error_count || 0,
                    elapsed_time: eventData.elapsed_time || 0,
                    timestamp: eventData.timestamp
                }
            );

            // Handle completion or failure
            if (eventData.status === 'completed' || eventData.status === 'failed' || eventData.final) {
                console.log(`🏁 SSE stream ending - status: ${eventData.status}`);

                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }

                updateConnectionStatus.call(this, 'disconnected');

                if (eventData.status === 'completed') {
                    // Reset the fetch attempt flag before fetching
                    this._resultsFetchAttempted = false;
                    setTimeout(() => {
                        this.fetchFinalResults();
                    }, 1000); // Brief delay to ensure all data is processed
                } else if (eventData.status === 'failed') {
                    this.hideLoadingOverlay?.();
                    toastr.error(`Scraping failed: ${eventData.message}`);

                    // Navigate back to configure after failure
                    setTimeout(() => {
                        this.navigationManager.navigateToPage('configure');
                    }, 2000);
                }
            }
        } catch (parseError) {
            console.error('❌ Error parsing SSE event data:', parseError, event.data);
            updateConnectionStatus.call(this, 'error');
        }
    };

    this.eventSource.onerror = (error) => {
        console.error('🚨 SSE connection error:', error);
        updateConnectionStatus.call(this, 'error');

        // Check the readyState to understand the error better
        if (this.eventSource) {
            console.log('SSE readyState:', this.eventSource.readyState);
            if (this.eventSource.readyState === EventSource.CLOSED) {
                console.log('SSE connection was closed');
            }
            this.eventSource.close();
            this.eventSource = null;
        }

        // Only show reconnection message if we have a task and haven't exceeded attempts
        if (this.currentTaskId) {
            // Show user-friendly error message
            toastr.warning("Real-time connection interrupted. Attempting to reconnect...", {
                timeOut: 3000
            });

            // Implement smart reconnection logic with backoff
            if (!this.reconnectAttempts) this.reconnectAttempts = 0;
            this.reconnectAttempts++;

            if (this.reconnectAttempts <= 5) {
                const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
                console.log(`🔄 Attempting SSE reconnection ${this.reconnectAttempts}/5 in ${backoffTime}ms...`);

                setTimeout(() => {
                    if (this.currentTaskId && !this.eventSource) {
                        console.log('🔄 Reconnecting SSE...');
                        this.setupEventSource();
                    }
                }, backoffTime);
            } else {
                console.log('❌ Max SSE reconnection attempts reached');
                toastr.error("Real-time updates unavailable. You can still check results manually.", {
                    timeOut: 5000
                });
            }
        }
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

function updateConnectionStatus(status) {
    // 'this' refers to ApolloScraper instance
    const connectionStatus = document.getElementById('connectionStatus');
    const apifyStatus = document.getElementById('apifyStatus');

    if (connectionStatus) {
        switch (status) {
            case 'connected':
                connectionStatus.style.background = '#4CAF50';
                connectionStatus.title = 'Connected to Apify logs';
                break;
            case 'disconnected':
                connectionStatus.style.background = '#9E9E9E';
                connectionStatus.title = 'Disconnected';
                break;
            case 'error':
                connectionStatus.style.background = '#F44336';
                connectionStatus.title = 'Connection error';
                break;
        }
    }

    if (apifyStatus) {
        switch (status) {
            case 'connected':
                apifyStatus.textContent = 'Connected to Apify scraper - receiving real-time updates from log stream';
                break;
            case 'disconnected':
                apifyStatus.textContent = 'Disconnected from Apify scraper logs';
                break;
            case 'error':
                apifyStatus.textContent = 'Connection error - attempting to reconnect to Apify logs...';
                break;
        }
    }
}

function updateProgress(percentage, message, status, extraData = {}) {
    // 'this' refers to ApolloScraper instance
    const fill = document.getElementById('progressFill');
    const percentageEl = document.getElementById('progressPercentage');
    const messageEl = document.getElementById('progressMessage');

    // Real-time stats elements
    const statusEl = document.getElementById('progressStatus');
    const urlsProcessedEl = document.getElementById('urlsProcessed');
    const leadsFoundEl = document.getElementById('leadsFound');
    const currentUrlEl = document.getElementById('currentUrl');
    const estimatedTimeEl = document.getElementById('estimatedTime');
    const processingRateEl = document.getElementById('processingRate');
    const errorCountEl = document.getElementById('errorCount');
    const apifyStatusEl = document.getElementById('apifyStatus');
    const elapsedTimeEl = document.getElementById('elapsedTime');
    const lastUpdateEl = document.getElementById('lastUpdate');

    // Update basic progress with smooth animation
    if (fill) {
        fill.style.transition = 'width 0.5s ease-in-out';
        fill.style.width = percentage + "%";
    }
    if (percentageEl) percentageEl.textContent = percentage + "%";
    if (messageEl) messageEl.textContent = message;

    // Update status with enhanced styling and animations
    if (statusEl) {
        const previousStatus = statusEl.getAttribute('data-status');
        statusEl.textContent = status || 'running';
        statusEl.setAttribute('data-status', status || 'running');
        statusEl.className = 'stat-value status-badge';
        
        // Add flash effect when status changes
        if (previousStatus !== status) {
            statusEl.style.transform = 'scale(1.1)';
            setTimeout(() => {
                statusEl.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Update real-time stats with animations
    if (extraData.urls_processed !== undefined && extraData.total_urls !== undefined && urlsProcessedEl) {
        const newValue = `${extraData.urls_processed} / ${extraData.total_urls}`;
        if (urlsProcessedEl.textContent !== newValue) {
            urlsProcessedEl.style.transform = 'scale(1.05)';
            urlsProcessedEl.textContent = newValue;
            setTimeout(() => {
                urlsProcessedEl.style.transform = 'scale(1)';
            }, 300);
        }
    }

    // Enhanced leads counter with animation
    if (extraData.scraped_count !== undefined && leadsFoundEl) {
        const currentCount = parseInt(leadsFoundEl.textContent.replace(/,/g, '')) || 0;
        const newCount = extraData.scraped_count;
        
        if (newCount !== currentCount) {
            leadsFoundEl.classList.add('updated');
            leadsFoundEl.textContent = newCount.toLocaleString();
            
            // Remove animation class after animation completes
            setTimeout(() => {
                leadsFoundEl.classList.remove('updated');
            }, 600);
        }
    }

    // Enhanced current URL display
    if (extraData.current_url && currentUrlEl) {
        // Extract meaningful parts of the URL
        let displayUrl = extraData.current_url;
        try {
            const url = new URL(extraData.current_url);
            const path = url.pathname + url.search;
            if (path.length > 80) {
                displayUrl = url.hostname + path.substring(0, 77) + '...';
            } else {
                displayUrl = url.hostname + path;
            }
        } catch (e) {
            // Fallback for invalid URLs
            if (displayUrl.length > 80) {
                displayUrl = displayUrl.substring(0, 77) + '...';
            }
        }
        
        if (currentUrlEl.textContent !== displayUrl) {
            currentUrlEl.style.opacity = '0.5';
            currentUrlEl.textContent = displayUrl;
            currentUrlEl.title = extraData.current_url; // Full URL on hover
            setTimeout(() => {
                currentUrlEl.style.opacity = '1';
            }, 200);
        }
    } else if (currentUrlEl && status === 'running') {
        currentUrlEl.textContent = 'Processing...';
    }

    // Update elapsed time
    if (extraData.elapsed_time !== undefined && elapsedTimeEl) {
        const elapsed = Math.floor(extraData.elapsed_time);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        elapsedTimeEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update estimated time
    if (extraData.estimated_time && estimatedTimeEl) {
        estimatedTimeEl.textContent = extraData.estimated_time;
    }

    // Enhanced processing rate display
    if (extraData.scraped_count && extraData.elapsed_time && processingRateEl) {
        const rate = Math.round((extraData.scraped_count / (extraData.elapsed_time / 60)));
        processingRateEl.textContent = `${rate} leads/min`;
    } else if (extraData.processing_rate && processingRateEl) {
        processingRateEl.textContent = `${extraData.processing_rate} leads/min`;
    }

    // Enhanced error count display
    if (extraData.error_count !== undefined && errorCountEl) {
        const previousErrors = parseInt(errorCountEl.textContent) || 0;
        errorCountEl.textContent = extraData.error_count;
        
        if (extraData.error_count > 0) {
            errorCountEl.classList.add('has-errors');
            if (extraData.error_count > previousErrors) {
                // Flash animation for new errors
                errorCountEl.style.background = 'hsl(var(--error-color, 0 84% 60%) / 0.1)';
                setTimeout(() => {
                    errorCountEl.style.background = '';
                }, 1000);
            }
        } else {
            errorCountEl.classList.remove('has-errors');
        }
    }

    // Update last update timestamp
    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleTimeString();
    }

    // Update Apify status indicator with enhanced messaging
    if (apifyStatusEl) {
        if (status === 'running') {
            apifyStatusEl.textContent = `Actively monitoring Apify scraper logs | ${extraData.scraped_count || 0} leads processed`;
            apifyStatusEl.style.color = 'hsl(var(--accent-primary))';
        } else if (status === 'completed') {
            apifyStatusEl.textContent = `Scraping completed successfully! Total: ${extraData.scraped_count || 0} leads collected`;
            apifyStatusEl.style.color = 'hsl(var(--success-color, 142 76% 36%))';
        } else if (status === 'failed') {
            apifyStatusEl.textContent = 'Scraping encountered errors. Check logs for details.';
            apifyStatusEl.style.color = 'hsl(var(--error-color, 0 84% 60%))';
        }
    }

    console.log(`🔄 Progress: ${percentage}% - ${message} (Status: ${status})`, extraData);
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
        console.log("Validating Notion database access...");
        const validateResponse = await fetch(`/api/v1/notion/validate-schema?database_id=${encodeURIComponent(databaseId)}&notion_token=${encodeURIComponent(notionToken)}`);
        const validateResult = await validateResponse.json();

        if (!validateResponse.ok || validateResult.status !== 'success') {
            console.error("Notion validation failed:", validateResult);
            toastr.error(`Database validation failed: ${validateResult.message || 'Invalid credentials or database'}`);
            return;
        }

        console.log("Notion database validation successful:", validateResult);
        toastr.success(`Connected to database: ${validateResult.database_title || 'Unknown'}`);
    } catch (error) {
        console.error("Error validating Notion database:", error);
        toastr.error('Failed to validate database connection. Please check your credentials.');
        return;
    }
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
                toastr.warning(`${result.errors.length} entries had issues during creation`, {
                    timeOut: 6000,
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
            // Handle specific error types
            if (result.available_properties) {
                const errorMsg = `Database schema issue: ${result.message}\n\nAvailable properties in your database: ${result.available_properties.join(', ')}\n\nTip: The integration will automatically map your lead data to compatible properties.`;
                toastr.error(errorMsg, {
                    timeOut: 12000,
                    extendedTimeOut: 4000
                });
                throw new Error(result.message);
            } else if (result.message && result.message.includes('Invalid Notion database ID')) {
                toastr.error('Invalid database ID format. Please check your Notion database URL in Settings.', {
                    timeOut: 8000,
                    extendedTimeOut: 3000
                });
                throw new Error('Invalid database ID');
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