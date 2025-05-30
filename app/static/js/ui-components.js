
// UI Component Helper Functions

class UIComponents {
    // Modal Management
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Toast Notifications
    static showToast(title, message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <span class="material-symbols-outlined">${icons[type]}</span>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        const container = document.querySelector('.toast-container') || this.createToastContainer();
        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    }

    static createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    // Dropdown Management
    static initDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Close other dropdowns
                document.querySelectorAll('.dropdown.active').forEach(other => {
                    if (other !== dropdown) other.classList.remove('active');
                });
                
                dropdown.classList.toggle('active');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown.active').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        });
    }

    // Animated Counter
    static animateCounter(element, target, duration = 2000) {
        const start = parseInt(element.textContent) || 0;
        const range = target - start;
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (range * progress));
            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // Loading States
    static setLoading(element, loading = true) {
        if (loading) {
            element.style.opacity = '0.6';
            element.style.pointerEvents = 'none';
            element.style.cursor = 'wait';
        } else {
            element.style.opacity = '';
            element.style.pointerEvents = '';
            element.style.cursor = '';
        }
    }
}

// Initialize components when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    UIComponents.initDropdowns();
});

// Export for use in other files
window.UIComponents = UIComponents;
