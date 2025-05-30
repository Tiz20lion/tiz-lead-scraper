
// Component Demonstration and Usage Examples

class ComponentDemos {
    static init() {
        this.setupDemoButtons();
        this.setupComponentExamples();
    }

    static setupDemoButtons() {
        // Add demo buttons to test components
        const demoContainer = document.createElement('div');
        demoContainer.className = 'demo-container';
        demoContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        const demoButtons = [
            { text: 'Show Success Toast', action: () => this.demoToast('success') },
            { text: 'Show Error Toast', action: () => this.demoToast('error') },
            { text: 'Show Modal', action: () => this.demoModal() },
            { text: 'Show Dropdown', action: () => this.demoDropdown() },
            { text: 'Animate Counter', action: () => this.demoCounter() }
        ];

        demoButtons.forEach(demo => {
            const btn = document.createElement('button');
            btn.textContent = demo.text;
            btn.className = 'demo-btn';
            btn.style.cssText = `
                padding: 8px 12px;
                background: hsl(var(--accent-primary));
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s ease;
            `;
            btn.onclick = demo.action;
            demoContainer.appendChild(btn);
        });

        document.body.appendChild(demoContainer);
    }

    static demoToast(type) {
        const messages = {
            success: { title: 'Success!', message: 'Operation completed successfully' },
            error: { title: 'Error!', message: 'Something went wrong' },
            warning: { title: 'Warning!', message: 'Please check your input' },
            info: { title: 'Info', message: 'Here is some information' }
        };

        const msg = messages[type] || messages.info;
        UIComponents.showToast(msg.title, msg.message, type);
    }

    static demoModal() {
        // Create a demo modal if it doesn't exist
        if (!document.getElementById('demoModal')) {
            const modal = document.createElement('div');
            modal.id = 'demoModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Demo Modal</h3>
                        <button class="modal-close" onclick="UIComponents.hideModal('demoModal')">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>This is a demo modal using your UI component system!</p>
                        <div class="form-group">
                            <label>Sample Input:</label>
                            <input type="text" placeholder="Enter something..." class="form-input">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="UIComponents.hideModal('demoModal')">Cancel</button>
                        <button class="btn btn-primary">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        UIComponents.showModal('demoModal');
    }

    static demoDropdown() {
        // Create a demo dropdown if it doesn't exist
        if (!document.querySelector('.demo-dropdown')) {
            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown demo-dropdown';
            dropdown.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
            `;
            dropdown.innerHTML = `
                <button class="dropdown-trigger btn btn-primary">
                    Demo Options
                    <span class="material-symbols-outlined">arrow_drop_down</span>
                </button>
                <div class="dropdown-menu">
                    <a href="#" class="dropdown-item">
                        <span class="material-symbols-outlined">settings</span>
                        Settings
                    </a>
                    <a href="#" class="dropdown-item">
                        <span class="material-symbols-outlined">person</span>
                        Profile
                    </a>
                    <a href="#" class="dropdown-item">
                        <span class="material-symbols-outlined">logout</span>
                        Logout
                    </a>
                </div>
            `;
            document.body.appendChild(dropdown);
            
            // Re-initialize dropdowns to include the new one
            UIComponents.initDropdowns();
        }
    }

    static demoCounter() {
        // Create a demo counter if it doesn't exist
        if (!document.getElementById('demoCounter')) {
            const counter = document.createElement('div');
            counter.id = 'demoCounter';
            counter.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: hsl(var(--bg-panel));
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                z-index: 9999;
                border: 1px solid hsl(var(--border-color));
                box-shadow: var(--shadow-lg);
            `;
            counter.innerHTML = `
                <h3>Animated Counter Demo</h3>
                <div id="counterValue" style="font-size: 48px; font-weight: bold; color: hsl(var(--accent-primary)); margin: 20px 0;">0</div>
                <button onclick="ComponentDemos.animateCounterDemo()" class="btn btn-primary">Start Animation</button>
                <button onclick="document.getElementById('demoCounter').remove()" class="btn btn-secondary" style="margin-left: 10px;">Close</button>
            `;
            document.body.appendChild(counter);
        }

        this.animateCounterDemo();
    }

    static animateCounterDemo() {
        const counterElement = document.getElementById('counterValue');
        const randomTarget = Math.floor(Math.random() * 10000) + 100;
        UIComponents.animateCounter(counterElement, randomTarget, 2000);
    }

    // Advanced component examples
    static createProgressCard(title, progress, description) {
        const card = document.createElement('div');
        card.className = 'progress-card animated-card';
        card.innerHTML = `
            <div class="card-header">
                <h4>${title}</h4>
                <span class="progress-percentage">${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p class="card-description">${description}</p>
        `;
        return card;
    }

    static createStatCard(icon, label, value, trend) {
        const card = document.createElement('div');
        card.className = 'stat-card animated-card';
        card.innerHTML = `
            <div class="stat-icon">
                <span class="material-symbols-outlined">${icon}</span>
            </div>
            <div class="stat-content">
                <div class="stat-value">${value}</div>
                <div class="stat-label">${label}</div>
                ${trend ? `<div class="stat-trend ${trend > 0 ? 'positive' : 'negative'}">
                    <span class="material-symbols-outlined">${trend > 0 ? 'trending_up' : 'trending_down'}</span>
                    ${Math.abs(trend)}%
                </div>` : ''}
            </div>
        `;
        return card;
    }

    static createNotificationCard(type, title, message, timestamp) {
        const card = document.createElement('div');
        card.className = `notification-card ${type}`;
        card.innerHTML = `
            <div class="notification-icon">
                <span class="material-symbols-outlined">${{
                    success: 'check_circle',
                    error: 'error',
                    warning: 'warning',
                    info: 'info'
                }[type]}</span>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
                <div class="notification-timestamp">${timestamp}</div>
            </div>
            <button class="notification-close">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        return card;
    }
}

// Enhanced UI Components with additional utilities
class EnhancedUIComponents extends UIComponents {
    // Loading states for specific elements
    static showElementLoading(element, loadingText = 'Loading...') {
        const originalContent = element.innerHTML;
        element.dataset.originalContent = originalContent;
        
        element.innerHTML = `
            <div class="element-loading">
                <div class="loading-spinner">
                    <span class="material-symbols-outlined spinning">refresh</span>
                </div>
                <span class="loading-text">${loadingText}</span>
            </div>
        `;
        
        element.style.pointerEvents = 'none';
        element.classList.add('loading-state');
    }

    static hideElementLoading(element) {
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }
        
        element.style.pointerEvents = '';
        element.classList.remove('loading-state');
    }

    // Confirmation dialog
    static showConfirmDialog(title, message, onConfirm, onCancel) {
        const dialog = document.createElement('div');
        dialog.className = 'modal confirmation-dialog active';
        dialog.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">Cancel</button>
                    <button class="btn btn-danger confirm-btn">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        document.body.style.overflow = 'hidden';

        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');

        const cleanup = () => {
            dialog.remove();
            document.body.style.overflow = '';
        };

        confirmBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        // Close on overlay click
        dialog.querySelector('.modal-overlay').onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        return dialog;
    }

    // Form validation helper
    static validateForm(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;
        const errors = [];

        inputs.forEach(input => {
            const value = input.value.trim();
            
            if (!value) {
                isValid = false;
                input.classList.add('error');
                errors.push(`${input.name || input.id} is required`);
            } else {
                input.classList.remove('error');
            }

            // Email validation
            if (input.type === 'email' && value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    input.classList.add('error');
                    errors.push('Please enter a valid email address');
                }
            }

            // URL validation
            if (input.type === 'url' && value) {
                try {
                    new URL(value);
                    input.classList.remove('error');
                } catch {
                    isValid = false;
                    input.classList.add('error');
                    errors.push('Please enter a valid URL');
                }
            }
        });

        return { isValid, errors };
    }

    // Debounced search helper
    static createDebouncedSearch(input, callback, delay = 300) {
        let timeout;
        
        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                callback(e.target.value);
            }, delay);
        });
    }

    // Smooth scroll to element
    static scrollToElement(element, offset = 0) {
        const elementPosition = element.offsetTop - offset;
        
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }

    // Copy to clipboard with feedback
    static async copyToClipboard(text, feedbackElement) {
        try {
            await navigator.clipboard.writeText(text);
            
            if (feedbackElement) {
                const originalText = feedbackElement.textContent;
                feedbackElement.textContent = 'Copied!';
                feedbackElement.classList.add('copied');
                
                setTimeout(() => {
                    feedbackElement.textContent = originalText;
                    feedbackElement.classList.remove('copied');
                }, 2000);
            }
            
            this.showToast('Success', 'Copied to clipboard!', 'success', 2000);
            return true;
        } catch (error) {
            this.showToast('Error', 'Failed to copy to clipboard', 'error');
            return false;
        }
    }
}

// Initialize component demos when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    ComponentDemos.init();
    
    // Make enhanced components globally available
    window.EnhancedUIComponents = EnhancedUIComponents;
    window.ComponentDemos = ComponentDemos;
});
