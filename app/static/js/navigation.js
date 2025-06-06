class NavigationManager {
    constructor(appInstance) {
        this.app = appInstance; // Reference to the main ApolloScraper instance
        this.pageIdMap = {
            'home': 'homePage', 
            'configure': 'configurationSection',
            'progress': 'progressSection',
            'settings': 'settingsPage',
            'results': 'resultsSection'
        };
    }

    async loadPageContent(pageId) {
        if (!pageId) {
            console.warn(`Invalid pageId: ${pageId} for loadPageContent.`);
            return false; 
        }
        
        const pageElement = document.getElementById(pageId);
        if (!pageElement) {
            console.error(`Placeholder div for page #${pageId} not found.`);
            return false;
        }

        try {
            console.log(`Fetching content for /static/pages/${pageId}.html`);
            const response = await fetch(`/static/pages/${pageId}.html?v=${new Date().getTime()}`); 
            if (!response.ok) {
                throw new Error(`Failed to load page content for ${pageId}: ${response.status} ${response.statusText}`);
            }
            const html = await response.text();
            pageElement.innerHTML = html;
            console.log(`✅ Content for ${pageId} loaded and injected.`);
            
            // Call page-specific initializer from PageInitializers object
            if (typeof PageInitializers !== 'undefined' && PageInitializers[pageId]) {
                PageInitializers[pageId](this.app); // Pass the app instance
            } else {
                console.warn(`No initializer found for pageId: ${pageId} in PageInitializers.`);
            }

            // Special handling for AI Prompt Handler (from cursor rules)
            if (pageId === 'configurationSection') {
                setTimeout(() => {
                    if (window.aiPromptHandler) {
                        const success = window.aiPromptHandler.init();
                        console.log('🤖 AI Prompt Handler initialized from navigation:', success);
                    }
                }, 150);
            }

            return true;
        } catch (error) {
            console.error(`Error loading page content for ${pageId}:`, error);
            pageElement.innerHTML = `<p class="text-red-500 p-4">Error loading content for this page. Please try again.</p>`;
            return false;
        }
    }
    
    async navigateToPage(pageName, isInitialLoad = false) {
        console.log(`Attempting navigation to: ${pageName}`);
        const targetPageId = this.pageIdMap[pageName];

        if (!targetPageId) {
            console.error(`Invalid page name for navigation: ${pageName}. Defaulting to 'home'.`);
            // Ensure this.app.pages is available and refers to the main app instance's page placeholders
            if (this.app && this.app.pages) {
                 document.querySelectorAll('.dashboard-page').forEach(p => { if(p) p.style.display = 'none';});
                 const homeDiv = document.getElementById(this.pageIdMap['home']);
                 if(homeDiv) homeDiv.style.display = 'block';
            }
            this.updateActiveNavLink('home');
            return;
        }
        console.log(`🧭 Navigating to page: ${pageName} (Element ID: ${targetPageId})`);

        if (this.app && this.app.pages) {
            this.app.pages.forEach(page => {
                if(page) page.style.display = 'none';
            });
        }

        const pageContentLoadedAndSetup = await this.loadPageContent(targetPageId);

        if (pageContentLoadedAndSetup) {
            const targetPageDiv = document.getElementById(targetPageId);
            if (targetPageDiv) {
                targetPageDiv.style.display = 'block';
                if (this.app) this.app.currentView = pageName; 
                console.log(`✅ Shown page: ${targetPageId}`);
                
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(targetPageDiv, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
                }
            } else {
                console.error(`Target page div #${targetPageId} not found after attempting to load content.`);
            }
        } else {
            console.error(`Failed to load content for ${pageName}, navigation aborted. Showing landing page as fallback.`);
            const landingPageDiv = document.getElementById(this.pageIdMap['home']);
            if (landingPageDiv) landingPageDiv.style.display = 'block';
        }
        this.updateActiveNavLink(pageName);
    }

    updateActiveNavLink(pageName) {
        // Assumes globalNavItems is on the appInstance or passed in
        const navItems = this.app.globalNavItems || document.querySelectorAll('#globalNavDropdown .nav-item');
        const currentPageTitleEl = this.app.globalNavDropdown?.querySelector('.nav-trigger .material-symbols-outlined'); 

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
                // Update main nav trigger text/icon if needed
                // const pageTitleText = item.querySelector('.nav-item-title')?.textContent || pageName.charAt(0).toUpperCase() + pageName.slice(1);
                // if (currentPageTitleEl) currentPageTitleEl.textContent = pageTitleText; 
            }
        });
    }
} 