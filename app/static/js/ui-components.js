
class UIComponents {
    constructor() {
        this.contextMenu = document.getElementById('context-menu');
        this.initializeContextMenu();
        this.initializeThemeControls();
        this.initializeTabs();
        this.initializeInteractiveCards();
        this.initializeFieldSelection();
        this.initializeSliders();
        this.initializeViewControls();
    }

    initializeContextMenu() {
        const menu = this.contextMenu;
        const menuItems = menu.querySelectorAll('.menu-item');

        // Context menu positioning and display
        document.addEventListener('contextmenu', (event) => {
            const target = event.target;
            const isInteractiveCard = target.closest('.interactive-card');
            
            if (!isInteractiveCard) return;
            
            event.preventDefault();
            
            const menuBox = menu.getBoundingClientRect();
            const bodyBox = { width: window.innerWidth, height: window.innerHeight };
            const targetPos = { x: event.clientX, y: event.clientY };
            const padding = { x: 30, y: 20 };
            
            // Adjust position if menu would go off screen
            if (targetPos.x + menuBox.width >= bodyBox.width - padding.x) {
                targetPos.x = bodyBox.width - menuBox.width - padding.x;
            }
            
            if (targetPos.y + menuBox.height >= bodyBox.height - padding.y) {
                targetPos.y = bodyBox.height - menuBox.height - padding.y;
            }
            
            menu.style.left = targetPos.x + 'px';
            menu.style.top = targetPos.y + 'px';
            menu.classList.add('open');
            
            // Store reference to the target card
            menu.dataset.targetCard = isInteractiveCard.dataset.config;
        });

        // Hide context menu on click outside
        document.addEventListener('pointerdown', (event) => {
            const target = event.target;
            const isMenu = menu.contains(target);
            const isSlider = target.matches('input[type="range"]');
            
            if (!isMenu && !isSlider) {
                menu.classList.remove('open');
            } else if (isMenu) {
                menuItems.forEach(item => item.classList.remove('selected'));
                if (target.matches('.menu-item')) {
                    target.classList.add('selected');
                }
            }
        });

        // Handle menu item clicks
        menuItems.forEach(item => {
            item.addEventListener('click', (event) => {
                const action = item.dataset.action;
                const targetCard = menu.dataset.targetCard;
                this.handleContextMenuAction(action, targetCard);
                menu.classList.remove('open');
            });
        });
    }

    handleContextMenuAction(action, targetCard) {
        switch (action) {
            case 'copy-url':
                if (targetCard === 'urls') {
                    const urlInput = document.getElementById('urlInput');
                    navigator.clipboard.writeText(urlInput.value);
                    toastr.success('URLs copied to clipboard');
                }
                break;
                
            case 'edit-params':
                this.openEditDialog(targetCard);
                break;
                
            case 'duplicate':
                this.duplicateConfiguration(targetCard);
                break;
                
            case 'clear':
                this.clearConfiguration(targetCard);
                break;
        }
    }

    initializeThemeControls() {
        const hue1Slider = document.getElementById('h1');
        const hue2Slider = document.getElementById('h2');
        
        // Set random initial values
        const rand1 = 120 + Math.floor(Math.random() * 240);
        const rand2 = rand1 - 80 + (Math.floor(Math.random() * 60) - 30);
        
        hue1Slider.value = rand1;
        hue2Slider.value = rand2;
        document.body.style.setProperty('--hue1', rand1);
        document.body.style.setProperty('--hue2', rand2);

        hue1Slider.addEventListener('input', (event) => {
            requestAnimationFrame(() => {
                document.body.style.setProperty('--hue1', event.target.value);
            });
        });

        hue2Slider.addEventListener('input', (event) => {
            requestAnimationFrame(() => {
                document.body.style.setProperty('--hue2', event.target.value);
            });
        });
    }

    initializeTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab + 'Tab') {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    initializeInteractiveCards() {
        const cards = document.querySelectorAll('.interactive-card');
        
        cards.forEach(card => {
            // Add hover effects with GSAP
            card.addEventListener('mouseenter', () => {
                gsap.to(card, {
                    duration: 0.3,
                    y: -5,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    ease: 'power2.out'
                });
            });

            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    duration: 0.3,
                    y: 0,
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                    ease: 'power2.out'
                });
            });
        });
    }

    initializeFieldSelection() {
        const fieldCheckboxes = document.querySelectorAll('.field-item input[type="checkbox"]');
        const fieldCountDisplay = document.getElementById('fieldCount');
        const selectAllBtn = document.getElementById('selectAll');
        const selectNoneBtn = document.getElementById('selectNone');

        const updateFieldCount = () => {
            const checkedCount = document.querySelectorAll('.field-item input[type="checkbox"]:checked').length;
            fieldCountDisplay.textContent = checkedCount;
        };

        fieldCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateFieldCount);
        });

        selectAllBtn.addEventListener('click', () => {
            fieldCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateFieldCount();
        });

        selectNoneBtn.addEventListener('click', () => {
            fieldCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateFieldCount();
        });

        // Initial count
        updateFieldCount();
    }

    initializeSliders() {
        const leadCountSlider = document.getElementById('leadCountSlider');
        const leadCountDisplay = document.getElementById('leadCountDisplay');
        const presetButtons = document.querySelectorAll('.preset-btn');

        const updateLeadCount = (value) => {
            leadCountDisplay.textContent = value >= 1000 ? 
                (value / 1000).toFixed(value % 1000 === 0 ? 0 : 1) + 'K' : 
                value;
        };

        leadCountSlider.addEventListener('input', (event) => {
            updateLeadCount(event.target.value);
        });

        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const value = button.dataset.value;
                leadCountSlider.value = value;
                updateLeadCount(value);
                
                // Visual feedback
                gsap.to(button, {
                    duration: 0.1,
                    scale: 0.95,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut'
                });
            });
        });

        // URL count tracking
        const urlInput = document.getElementById('urlInput');
        const urlCountDisplay = document.getElementById('urlCount');

        const updateUrlCount = () => {
            const urls = urlInput.value.trim().split('\n').filter(url => url.trim().length > 0);
            urlCountDisplay.textContent = urls.length;
            
            // Update validation status
            const urlStatus = document.getElementById('urlStatus');
            if (urls.length === 0) {
                urlStatus.textContent = '';
            } else if (urls.length > 10) {
                urlStatus.innerHTML = '<span style="color: var(--error-color)">⚠️ Maximum 10 URLs allowed</span>';
            } else {
                urlStatus.innerHTML = '<span style="color: var(--success-color)">✓ URLs ready</span>';
            }
        };

        urlInput.addEventListener('input', updateUrlCount);
        
        // URL validation and clear buttons
        document.getElementById('validateUrls').addEventListener('click', () => {
            const urls = urlInput.value.trim().split('\n').filter(url => url.trim().length > 0);
            let validCount = 0;
            
            urls.forEach(url => {
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    validCount++;
                }
            });
            
            toastr.info(`${validCount} of ${urls.length} URLs are valid`);
        });

        document.getElementById('clearUrls').addEventListener('click', () => {
            urlInput.value = '';
            updateUrlCount();
        });
    }

    initializeViewControls() {
        const viewButtons = document.querySelectorAll('.view-btn');
        const resultViews = document.querySelectorAll('.results-view');

        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetView = button.dataset.view;
                
                // Update active view button
                viewButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update active view
                resultViews.forEach(view => {
                    view.style.display = 'none';
                    if (view.id === targetView + 'View') {
                        view.style.display = 'block';
                    }
                });
            });
        });
    }

    openEditDialog(targetCard) {
        // Placeholder for edit dialog functionality
        toastr.info(`Edit dialog for ${targetCard} - Feature coming soon!`);
    }

    duplicateConfiguration(targetCard) {
        // Placeholder for duplication functionality
        toastr.success(`Configuration duplicated for ${targetCard}`);
    }

    clearConfiguration(targetCard) {
        switch (targetCard) {
            case 'urls':
                document.getElementById('urlInput').value = '';
                document.getElementById('urlCount').textContent = '0';
                break;
            case 'fields':
                document.querySelectorAll('.field-item input[type="checkbox"]').forEach(cb => cb.checked = false);
                document.getElementById('fieldCount').textContent = '0';
                break;
            case 'api':
                document.getElementById('apifyToken').value = '';
                break;
        }
        toastr.info(`${targetCard} configuration cleared`);
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    updateProgress(percent, title, message) {
        const progressSection = document.getElementById('progressSection');
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        const progressTitle = document.getElementById('progressTitle');
        const progressMessage = document.getElementById('progressMessage');

        progressSection.style.display = 'block';
        progressFill.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        progressTitle.textContent = title;
        progressMessage.textContent = message;
    }

    hideProgress() {
        document.getElementById('progressSection').style.display = 'none';
    }

    showResults(data) {
        const emptyState = document.getElementById('emptyState');
        const exportActions = document.getElementById('exportActions');
        
        emptyState.style.display = 'none';
        exportActions.style.display = 'block';
        
        // Update stats
        document.getElementById('totalResults').textContent = data.length;
        document.getElementById('validEmails').textContent = data.filter(item => item.email && item.email.includes('@')).length;
        
        // Show in table view by default
        this.renderTableView(data);
    }

    renderTableView(data) {
        if (!data || data.length === 0) return;
        
        const tableHead = document.getElementById('tableHead');
        const tableBody = document.getElementById('tableBody');
        const tableView = document.getElementById('tableView');
        
        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Create header
        const headers = Object.keys(data[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header.charAt(0).toUpperCase() + header.slice(1);
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);
        
        // Create rows
        data.forEach(item => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = item[header] || '';
                row.appendChild(td);
            });
            tableBody.appendChild(row);
        });
        
        tableView.style.display = 'block';
    }
}

// Initialize UI Components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiComponents = new UIComponents();
});
