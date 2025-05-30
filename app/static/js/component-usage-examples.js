
// Practical Usage Examples for UI Components

class ComponentUsageExamples {
    constructor() {
        this.initExamples();
    }

    initExamples() {
        this.setupFormValidation();
        this.setupSearchFunctionality();
        this.setupDataVisualization();
        this.setupUserInteractions();
    }

    // Example 1: Form Validation with UI Components
    setupFormValidation() {
        const exampleForm = document.createElement('form');
        exampleForm.id = 'exampleForm';
        exampleForm.innerHTML = `
            <div class="form-group">
                <label for="email">Email Address</label>
                <input type="email" id="email" name="email" required class="form-input">
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <textarea id="message" name="message" required class="form-textarea"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Submit</button>
        `;

        exampleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const validation = EnhancedUIComponents.validateForm(exampleForm);
            
            if (validation.isValid) {
                EnhancedUIComponents.showElementLoading(e.target.querySelector('button'), 'Submitting...');
                
                // Simulate API call
                setTimeout(() => {
                    EnhancedUIComponents.hideElementLoading(e.target.querySelector('button'));
                    UIComponents.showToast('Success!', 'Form submitted successfully', 'success');
                    exampleForm.reset();
                }, 2000);
            } else {
                validation.errors.forEach(error => {
                    UIComponents.showToast('Validation Error', error, 'error');
                });
            }
        });
    }

    // Example 2: Search with debouncing
    setupSearchFunctionality() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search leads...';
        searchInput.className = 'form-input';

        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';

        EnhancedUIComponents.createDebouncedSearch(searchInput, (query) => {
            if (query.length > 2) {
                this.performSearch(query, searchResults);
            } else {
                searchResults.innerHTML = '';
            }
        });
    }

    performSearch(query, resultsContainer) {
        EnhancedUIComponents.showElementLoading(resultsContainer, 'Searching...');

        // Simulate search API call
        setTimeout(() => {
            const mockResults = [
                { name: 'John Doe', email: 'john@example.com', company: 'Acme Corp' },
                { name: 'Jane Smith', email: 'jane@example.com', company: 'Tech Solutions' }
            ].filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase()) ||
                item.email.toLowerCase().includes(query.toLowerCase()) ||
                item.company.toLowerCase().includes(query.toLowerCase())
            );

            EnhancedUIComponents.hideElementLoading(resultsContainer);

            if (mockResults.length > 0) {
                resultsContainer.innerHTML = mockResults.map(result => `
                    <div class="search-result-item animated-card">
                        <strong>${result.name}</strong>
                        <div>${result.email}</div>
                        <small>${result.company}</small>
                    </div>
                `).join('');
            } else {
                resultsContainer.innerHTML = '<div class="no-results">No results found</div>';
            }
        }, 800);
    }

    // Example 3: Data Visualization with Progress Cards
    setupDataVisualization() {
        const container = document.createElement('div');
        container.className = 'data-visualization';

        const data = [
            { title: 'Leads Scraped', progress: 75, description: '750 out of 1,000 leads processed' },
            { title: 'Email Verification', progress: 60, description: '600 emails verified' },
            { title: 'Export Progress', progress: 90, description: 'Exporting to Google Sheets' }
        ];

        data.forEach(item => {
            const card = ComponentDemos.createProgressCard(item.title, item.progress, item.description);
            container.appendChild(card);
        });

        // Animate progress bars
        setTimeout(() => {
            container.querySelectorAll('.progress-fill').forEach((fill, index) => {
                fill.style.width = '0%';
                setTimeout(() => {
                    fill.style.width = `${data[index].progress}%`;
                }, index * 200);
            });
        }, 500);
    }

    // Example 4: User Interaction Examples
    setupUserInteractions() {
        // Copy to clipboard example
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy API Key';
        copyButton.className = 'btn btn-secondary';
        
        copyButton.addEventListener('click', () => {
            const apiKey = 'sk-1234567890abcdef';
            EnhancedUIComponents.copyToClipboard(apiKey, copyButton);
        });

        // Confirmation dialog example
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete All Data';
        deleteButton.className = 'btn btn-danger';
        
        deleteButton.addEventListener('click', () => {
            EnhancedUIComponents.showConfirmDialog(
                'Confirm Deletion',
                'Are you sure you want to delete all scraped data? This action cannot be undone.',
                () => {
                    UIComponents.showToast('Deleted', 'All data has been deleted', 'success');
                },
                () => {
                    UIComponents.showToast('Cancelled', 'Deletion cancelled', 'info');
                }
            );
        });
    }

    // Example 5: Dynamic Dashboard Creation
    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.className = 'dashboard';
        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h2>Lead Scraping Dashboard</h2>
                <div class="dashboard-actions">
                    <button class="btn btn-primary" onclick="this.refreshDashboard()">Refresh</button>
                </div>
            </div>
            <div class="dashboard-grid">
                <div class="dashboard-stats"></div>
                <div class="dashboard-chart"></div>
                <div class="dashboard-recent"></div>
            </div>
        `;

        // Add stat cards
        const statsContainer = dashboard.querySelector('.dashboard-stats');
        const stats = [
            { icon: 'groups', label: 'Total Leads', value: '12,543', trend: 12 },
            { icon: 'trending_up', label: 'This Month', value: '2,847', trend: 8 },
            { icon: 'verified', label: 'Verified', value: '9,234', trend: -3 },
            { icon: 'download', label: 'Exported', value: '8,901', trend: 15 }
        ];

        stats.forEach(stat => {
            const card = ComponentDemos.createStatCard(stat.icon, stat.label, stat.value, stat.trend);
            statsContainer.appendChild(card);
        });

        // Add recent activity
        const recentContainer = dashboard.querySelector('.dashboard-recent');
        recentContainer.innerHTML = '<h3>Recent Activity</h3>';
        
        const activities = [
            { type: 'success', title: 'Export Completed', message: 'Google Sheets export finished', timestamp: '2 minutes ago' },
            { type: 'info', title: 'Scraping Started', message: 'New Apollo.io scraping job started', timestamp: '15 minutes ago' },
            { type: 'warning', title: 'Rate Limit', message: 'API rate limit approaching', timestamp: '1 hour ago' }
        ];

        activities.forEach(activity => {
            const card = ComponentDemos.createNotificationCard(
                activity.type, 
                activity.title, 
                activity.message, 
                activity.timestamp
            );
            recentContainer.appendChild(card);
        });

        return dashboard;
    }

    refreshDashboard() {
        UIComponents.showToast('Refreshing', 'Dashboard data is being updated...', 'info');
        
        // Simulate refresh
        setTimeout(() => {
            UIComponents.showToast('Updated', 'Dashboard refreshed successfully', 'success');
        }, 1500);
    }
}

// Utility functions for component integration
class ComponentIntegration {
    // Integrate with existing scraper functionality
    static enhanceScraperUI() {
        const startButton = document.getElementById('startScraping');
        if (startButton) {
            startButton.addEventListener('click', (e) => {
                // Add enhanced loading state
                EnhancedUIComponents.showElementLoading(startButton, 'Initializing scraper...');
            });
        }

        // Enhance export buttons
        const exportButtons = ['exportCsv', 'exportJson', 'exportSheets', 'exportNotion'];
        exportButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    EnhancedUIComponents.showElementLoading(button, 'Exporting...');
                });
            }
        });
    }

    // Add real-time notifications for scraper events
    static setupScraperNotifications() {
        // Listen for scraper events (you would integrate this with your actual scraper)
        document.addEventListener('scraperProgress', (e) => {
            const { progress, message, type } = e.detail;
            
            if (type === 'error') {
                UIComponents.showToast('Scraper Error', message, 'error');
            } else if (type === 'warning') {
                UIComponents.showToast('Warning', message, 'warning');
            } else if (progress === 100) {
                UIComponents.showToast('Complete!', message, 'success');
            }
        });
    }

    // Enhanced form validation for scraper inputs
    static enhanceScraperForm() {
        const form = document.querySelector('.left-panel');
        if (form) {
            const urlInput = document.getElementById('urlInput');
            const apifyToken = document.getElementById('apifyToken');

            // Add real-time validation
            if (urlInput) {
                urlInput.addEventListener('blur', () => {
                    const urls = urlInput.value.split('\n').filter(url => url.trim());
                    const validUrls = urls.filter(url => url.includes('apollo.io'));
                    
                    if (urls.length > 0 && validUrls.length === 0) {
                        UIComponents.showToast('Invalid URLs', 'Please enter valid Apollo.io URLs', 'error');
                        urlInput.classList.add('error');
                    } else {
                        urlInput.classList.remove('error');
                    }
                });
            }

            if (apifyToken) {
                apifyToken.addEventListener('input', (e) => {
                    const value = e.target.value;
                    if (value.length > 0 && value.length < 10) {
                        e.target.classList.add('error');
                    } else {
                        e.target.classList.remove('error');
                    }
                });
            }
        }
    }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    new ComponentUsageExamples();
    ComponentIntegration.enhanceScraperUI();
    ComponentIntegration.setupScraperNotifications();
    ComponentIntegration.enhanceScraperForm();
});

// Make available globally
window.ComponentUsageExamples = ComponentUsageExamples;
window.ComponentIntegration = ComponentIntegration;
