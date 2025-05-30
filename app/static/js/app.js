class ApolloScraper {
    constructor() {
        this.currentTaskId = null;
        this.pollInterval = null;
        this.csrfToken = null;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupToastr();
        await this.getCsrfToken();
        this.checkServiceStatus();
    }

    setupToastr() {
        toastr.options = {
            closeButton: true,
            debug: false,
            newestOnTop: true,
            progressBar: true,
            positionClass: "toast-top-right",
            preventDuplicates: true,
            onclick: null,
            showDuration: "300",
            hideDuration: "1000",
            timeOut: "5000",
            extendedTimeOut: "1000",
            showEasing: "swing",
            hideEasing: "linear",
            showMethod: "fadeIn",
            hideMethod: "fadeOut"
        };
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Dropdown menu functionality
        const dropdownTrigger = document.querySelector('.menu-dropdown-trigger');
        const dropdownContainer = document.querySelector('.menu-dropdown-container');

        if (dropdownTrigger && dropdownContainer) {
            dropdownTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContainer.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownContainer.contains(e.target)) {
                    dropdownContainer.classList.remove('show');
                }
            });
        }

        // Navigation
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateToPage(page);
                // Close dropdown after navigation
                const dropdown = document.querySelector('.menu-dropdown-container');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            });
        });
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');

                // Update button states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update content states
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    setupDashboardNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');
        const pages = {
            'home': 'homePage',
            'configure': 'configurationSection',
            'settings': 'settingsPage',
            'results': 'resultsSection'
        };

        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');

                // Update menu states
                menuItems.forEach(menuItem => menuItem.classList.remove('active'));
                item.classList.add('active');

                // Hide all pages
                Object.values(pages).forEach(pageId => {
                    const pageElement = document.getElementById(pageId);
                    if (pageElement) {
                        pageElement.style.display = 'none';
                    }
                });

                // Show selected page
                const targetPageId = pages[page];
                if (targetPageId) {
                    const targetPage = document.getElementById(targetPageId);
                    if (targetPage) {
                        targetPage.style.display = 'block';
                    }
                }
            });
        });
    }



    saveSettings() {
        const apifyToken = document.getElementById('apifyToken').value.trim();

        if (!apifyToken) {
            toastr.error('Please enter your Apify API token');
            return;
        }

        // Redirect to configuration page
        this.navigateToPage('configure');
        toastr.success('Settings saved! Now configure your scraping parameters.');
    }

    startAutomation() {
        const apifyToken = document.getElementById('apifyToken').value.trim();

        if (!apifyToken) {
            toastr.warning('Please configure your Apify API token first');
            this.navigateToPage('settings');
            return;
        }

        // If API key is set, go to configuration
        this.navigateToPage('configure');
        toastr.success('Ready to configure your scraping parameters!');
    }

    navigateToPage(pageName) {
        const menuItems = document.querySelectorAll('.menu-item');
        const pages = {
            'home': 'homePage',
            'configure': 'configurationSection',
            'settings': 'settingsPage',
            'results': 'resultsSection'
        };

        // Update menu states
        menuItems.forEach(menuItem => {
            menuItem.classList.remove('active');
            if (menuItem.getAttribute('data-page') === pageName) {
                menuItem.classList.add('active');
            }
        });

        // Hide all pages
        document.querySelectorAll('.dashboard-page').forEach(page => {
            page.style.display = 'none';
        });

        // Show selected page
        const targetPageId = pages[pageName];
        if (targetPageId) {
            const targetPage = document.getElementById(targetPageId);
            if (targetPage) {
                targetPage.style.display = 'block';
            }
        }
    }

    async getCsrfToken() {
        try {
            const response = await fetch('/api/v1/csrf-token');
            const data = await response.json();
            this.csrfToken = data.csrf_token;
        } catch (error) {
            console.error('Failed to get CSRF token:', error);
        }
    }

    async checkServiceStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();

            if (data.status === 'healthy') {
                this.updateStatusIndicator('Ready', 'success');
            } else {
                this.updateStatusIndicator('Service Issues', 'warning');
            }
        } catch (error) {
            this.updateStatusIndicator('Offline', 'error');
        }
    }

    updateStatusIndicator(text, status) {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');

        statusText.textContent = text;

        statusDot.style.background = {
            'success': 'hsl(var(--accent-secondary))',
            'warning': 'hsl(var(--accent-warning))',
            'error': 'hsl(var(--accent-danger))'
        }[status] || 'hsl(var(--accent-secondary))';
    }

    toggleTheme() {
        const body = document.body;
        const themeIcon = document.querySelector('#themeToggle i');

        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.add('dark-theme');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        }

        // Animate theme transition
        gsap.fromTo(body, 
            { opacity: 0.8 }, 
            { opacity: 1, duration: 0.3, ease: "power2.out" }
        );
    }

    validateUrls() {
        const urlInput = document.getElementById('urlInput');
        const urls = urlInput.value.split('\n').filter(url => url.trim());

        const validUrls = urls.filter(url => 
            url.trim().startsWith('http://') || url.trim().startsWith('https://')
        );

        if (urls.length > validUrls.length) {
            urlInput.style.borderColor = 'hsl(var(--accent-danger))';
        } else {
            urlInput.style.borderColor = 'hsl(var(--border-color))';
        }

        return validUrls;
    }

    getSelectedFields() {
        const checkboxes = document.querySelectorAll('#fieldSelection input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    async startScraping() {
        const urlInput = document.getElementById('urlInput');
        const leadCount = parseInt(document.getElementById('leadCountInput').value);
        const startButton = document.getElementById('startScraping');
        const apifyToken = document.getElementById('apifyToken').value.trim();

        // Validate API key first
        if (!apifyToken) {
            toastr.error('Please configure your Apify API token first');
            this.navigateToPage('settings');
            return;
        }

        // Validate inputs
        const urls = this.validateUrls();
        const fields = this.getSelectedFields();

        if (urls.length === 0) {
            toastr.error('Please enter at least one valid URL');
            return;
        }

        if (urls.length > 10) {
            toastr.error('Maximum 10 URLs allowed');
            return;
        }

        if (fields.length === 0) {
            toastr.error('Please select at least one field to extract');
            return;
        }

        // Update UI
        this.setButtonLoading(startButton, true);
        this.showProgressSection();
        this.updateProgress(0, 'Initializing scraper...');

        try {
            const response = await fetch('/api/v1/scrape', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    urls: urls,
                    lead_count: leadCount,
                    fields: fields,
                    apify_token: apifyToken
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentTaskId = data.task_id;
                toastr.success('Scraping started successfully!');
                this.startPolling();
            } else {
                throw new Error(data.detail || 'Failed to start scraping');
            }

        } catch (error) {
            toastr.error(`Failed to start scraping: ${error.message}`);
            this.hideProgressSection();
        } finally {
            this.setButtonLoading(startButton, false);
        }
    }

    setButtonLoading(button, loading) {
        const buttonText = button.querySelector('.button-text');
        const loadingSpinner = button.querySelector('.loading-spinner');

        if (loading) {
            buttonText.style.display = 'none';
            loadingSpinner.style.display = 'block';
            button.disabled = true;
        } else {
            buttonText.style.display = 'block';
            loadingSpinner.style.display = 'none';
            button.disabled = false;
        }
    }

    showProgressSection() {
        // Navigate to progress page
        this.navigateToPage('results');

        const progressSection = document.getElementById('progressSection');
        progressSection.style.display = 'block';

        gsap.fromTo(progressSection, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
    }

    hideProgressSection() {
        const progressSection = document.getElementById('progressSection');

        gsap.to(progressSection, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                progressSection.style.display = 'none';
            }
        });
    }

    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressMessage = document.getElementById('progressMessage');

        gsap.to(progressFill, {
            width: `${percentage}%`,
            duration: 0.5,
            ease: "power2.out"
        });

        progressPercentage.textContent = `${percentage}%`;
        progressMessage.textContent = message;
    }

    startPolling() {
        this.pollInterval = setInterval(() => {
            this.checkTaskStatus();
        }, 2000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async checkTaskStatus() {
        if (!this.currentTaskId) return;

        try {
            const response = await fetch(`/api/v1/scrape/${this.currentTaskId}`);
            const data = await response.json();

            if (response.ok) {
                this.updateProgress(data.progress, data.message);

                if (data.status === 'completed') {
                    this.stopPolling();
                    this.showResults(data.data, data.total_count);
                    toastr.success(`Scraping completed! Found ${data.total_count} leads`);
                } else if (data.status === 'failed') {
                    this.stopPolling();
                    this.hideProgressSection();
                    toastr.error(`Scraping failed: ${data.message}`);
                }
            }

        } catch (error) {
            console.error('Failed to check task status:', error);
        }
    }

    showResults(data, totalCount) {
        if (!data || data.length === 0) {
            toastr.warning('No results found');
            this.hideProgressSection();
            return;
        }

        // Hide progress section
        this.hideProgressSection();

        // Update results count
        document.getElementById('resultsCount').textContent = `${totalCount} leads found`;

        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';

        // Populate table
        this.populateResultsTable(data.slice(0, 5)); // Show first 5 results

        // Animate section
        gsap.fromTo(resultsSection, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
    }

    populateResultsTable(data) {
        const tableHead = document.getElementById('resultsTableHead');
        const tableBody = document.getElementById('resultsTableBody');

        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        if (data.length === 0) return;

        // Create headers
        const headers = Object.keys(data[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.charAt(0).toUpperCase() + header.slice(1);
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Create rows
        data.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';
                td.title = row[header] || ''; // Tooltip for long text
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }

    async exportCsv() {
        if (!this.currentTaskId) {
            toastr.error('No data to export');
            return;
        }

        try {
            const response = await fetch(`/api/v1/export/csv/${this.currentTaskId}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `leads_${this.currentTaskId}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                toastr.success('CSV downloaded successfully!');
            } else {
                throw new Error('Failed to export CSV');
            }

        } catch (error) {
            toastr.error(`CSV export failed: ${error.message}`);
        }
    }

    async exportJson() {
        if (!this.currentTaskId) {
            toastr.error('No data to export');
            return;
        }

        try {
            const response = await fetch(`/api/v1/export/json/${this.currentTaskId}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `leads_${this.currentTaskId}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                toastr.success('JSON downloaded successfully!');
            } else {
                throw new Error('Failed to export JSON');
            }

        } catch (error) {
            toastr.error(`JSON export failed: ${error.message}`);
        }
    }

    async exportToSheets() {
        if (!this.currentTaskId) {
            toastr.error('No data to export');
            return;
        }

        const googleCredentials = document.getElementById('googleCredentials').value.trim();
        const spreadsheetId = document.getElementById('spreadsheetId').value.trim();
        const sheetName = document.getElementById('sheetName').value.trim() || 'Leads';

        if (!googleCredentials) {
            toastr.error('Please enter your Google Service Account credentials');
            return;
        }

        if (!spreadsheetId) {
            toastr.error('Please enter a Google Sheets spreadsheet ID');
            return;
        }

        try {
            // Validate JSON credentials
            JSON.parse(googleCredentials);
        } catch (e) {
            toastr.error('Invalid Google credentials JSON format');
            return;
        }

        try {
            // Get task data
            const taskResponse = await fetch(`/api/v1/scrape/${this.currentTaskId}`);
            const taskData = await taskResponse.json();

            if (!taskData.data || taskData.data.length === 0) {
                toastr.error('No data available to export');
                return;
            }

            this.showLoadingOverlay('Exporting to Google Sheets...');

            const response = await fetch('/api/v1/export/sheets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    spreadsheet_id: spreadsheetId,
                    sheet_name: sheetName,
                    data: taskData.data,
                    google_credentials: JSON.parse(googleCredentials)
                })
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                toastr.success(`Successfully exported ${result.updated_rows} rows to Google Sheets!`);
            } else {
                throw new Error(result.message || 'Failed to export to Google Sheets');
            }

        } catch (error) {
            toastr.error(`Google Sheets export failed: ${error.message}`);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    async exportToNotion() {
        if (!this.currentTaskId) {
            toastr.error('No data to export');
            return;
        }

        const notionToken = document.getElementById('notionToken').value.trim();
        const databaseId = document.getElementById('notionDatabaseId').value.trim();

        if (!notionToken) {
            toastr.error('Please enter your Notion integration token');
            return;
        }

        if (!databaseId) {
            toastr.error('Please enter your Notion database ID');
            return;
        }

        try {
            // Get task data
            const taskResponse = await fetch(`/api/v1/scrape/${this.currentTaskId}`);
            const taskData = await taskResponse.json();

            if (!taskData.data || taskData.data.length === 0) {
                toastr.error('No data available to export');
                return;
            }

            this.showLoadingOverlay('Exporting to Notion...');

            const response = await fetch('/api/v1/export/notion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken
                },
                body: JSON.stringify({
                    database_id: databaseId,
                    data: taskData.data,
                    notion_token: notionToken
                })
            });

            const result = await response.json();

            if (response.ok && (result.status === 'success' || result.status === 'partial_success')) {
                toastr.success(`Successfully exported ${result.created_count} entries to Notion!`);

                if (result.errors && result.errors.length > 0) {
                    toastr.warning(`Some entries failed: ${result.errors.length} errors`);
                }
            } else {
                throw new Error(result.message || 'Failed to export to Notion');
            }

        } catch (error) {
            toastr.error(`Notion export failed: ${error.message}`);
        } finally {
            this.hideLoadingOverlay();
        }
    }

    showLoadingOverlay(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay.querySelector('.loading-text');

        loadingText.textContent = text;
        overlay.style.display = 'flex';

        gsap.fromTo(overlay, 
            { opacity: 0 }, 
            { opacity: 1, duration: 0.3, ease: "power2.out" }
        );
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');

        gsap.to(overlay, {
            opacity: 0,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                overlay.style.display = 'none';
            }
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }

    // Initialize the application and make it globally available
    window.apolloScraper = new ApolloScraper();

    // Setup save settings button
    const saveSettingsBtn = document.getElementById('saveSettings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            window.apolloScraper.saveSettings();
        });
    }
});

// Add some entrance animations
gsap.registerPlugin();

// Animate page load
window.addEventListener('load', () => {
    gsap.timeline()
        .fromTo('.header', 
            { y: -50, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
        )
        .fromTo('.dashboard-content', 
            { y: 30, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 
            "-=0.3"
        )
        .fromTo('.animated-card', 
            { y: 20, opacity: 0 }, 
            { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.1 }, 
            "-=0.4"
        );
});

// Start automation button click handler
document.addEventListener('DOMContentLoaded', () => {
    const startAutomationBtn = document.getElementById('startAutomationBtn');
    if (startAutomationBtn) {
        startAutomationBtn.addEventListener('click', function() {
            // Get the ApolloScraper instance and navigate to settings
            const scraper = window.apolloScraper;
            if (scraper) {
                scraper.navigateToPage('settings');
            }
        });
    }
});