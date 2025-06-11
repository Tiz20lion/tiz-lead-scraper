function setupToastr() {
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
        timeOut: "5000",  // Increased from 3000ms to 5000ms
        extendedTimeOut: "3000", // Increased from 1000ms to 3000ms
        showEasing: "swing", 
        hideEasing: "linear", 
        showMethod: "fadeIn", 
        hideMethod: "fadeOut",
        tapToDismiss: true,
        toastClass: "toast-custom",
        iconClasses: {
            error: 'toast-error',
            info: 'toast-info',
            success: 'toast-success',
            warning: 'toast-warning'
        },
        titleClass: 'toast-title-custom',
        messageClass: 'toast-message-custom',
        target: 'body'
    };
    
    // Create responsive toastr container if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container-responsive';
        document.body.appendChild(container);
        toastr.options.target = '#toast-container';
    }
}

function generateRandomId() {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

function extractNotionDatabaseId(urlOrId) {
    /**
     * Extract Notion database ID from various URL formats or return the ID if already clean.
     * 
     * Supported formats:
     * - https://www.notion.so/209a7ac6580c8047b82eefd17ee26fe0?v=...
     * - https://notion.so/209a7ac6580c8047b82eefd17ee26fe0
     * - notion.so/myworkspace/209a7ac6580c8047b82eefd17ee26fe0
     * - 209a7ac6580c8047b82eefd17ee26fe0 (already clean)
     */
    if (!urlOrId) {
        return "";
    }
    
    // Clean the input
    const cleanInput = urlOrId.trim();
    
    // If it's already a clean database ID (32 characters, alphanumeric)
    const cleanId = cleanInput.replace(/-/g, '');
    if (/^[a-f0-9]{32}$/i.test(cleanId)) {
        return cleanId;
    }
    
    // Extract from various URL patterns
    const patterns = [
        // Standard Notion URLs
        /notion\.so\/([a-f0-9]{32})/i,
        /notion\.so\/.*?([a-f0-9]{32})/i,
        // URLs with dashes in database ID
        /notion\.so\/([a-f0-9-]{36})/i,
        /notion\.so\/.*?([a-f0-9-]{36})/i,
        // Direct database ID patterns
        /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i,
        /([a-f0-9]{32})/i,
    ];
    
    for (const pattern of patterns) {
        const match = cleanInput.match(pattern);
        if (match) {
            const databaseId = match[1];
            // Remove dashes if present
            return databaseId.replace(/-/g, '');
        }
    }
    
    // If no pattern matches, try to extract from the end of URL path
    const urlParts = cleanInput.split('?')[0].split('#')[0].split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const cleanLastPart = lastPart.replace(/-/g, '');
    
    // Check if the last part looks like a database ID
    if (/^[a-f0-9]{32}$/i.test(cleanLastPart)) {
        return cleanLastPart;
    }
    
    // Return the original input if nothing else works
    return cleanInput;
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle'); // Assumes themeToggle is static in index.html
    const themeIcon = themeToggle?.querySelector('i');

    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        if (themeIcon) themeIcon.className = 'fas fa-moon'; 
    } else {
        body.classList.add('dark-theme'); 
        if (themeIcon) themeIcon.className = 'fas fa-sun';
    }
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('i');
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    if (themeIcon) themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(body, { opacity: 0.8 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
    }
}

function escapeHtml(text) {
    if (text === null || typeof text === 'undefined') return '';
    return String(text).replace(/[&<>"'`]/g, match => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '`': '&#x60;'
    }[match]));
}

function formatKey(key) { 
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatValue(value) {
    if (Array.isArray(value)) return value.map(v => escapeHtml(v)).join(', ');
    return escapeHtml(value);
}

function showLoadingOverlay(text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    const loadingTextEl = overlay.querySelector('.loading-text');
    if(loadingTextEl) loadingTextEl.textContent = text;
    overlay.style.display = 'flex';
    if (typeof gsap !== 'undefined') {
        gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    if (typeof gsap !== 'undefined') {
        gsap.to(overlay, {
            opacity: 0, duration: 0.3, ease: "power2.out",
            onComplete: () => { overlay.style.display = 'none'; }
        });
    } else {
        overlay.style.display = 'none';
    }
}

// Make sure to call setupToastr and loadTheme once the main script (app.js) initializes.
// generateRandomId, escapeHtml, formatKey, formatValue are utility functions. 