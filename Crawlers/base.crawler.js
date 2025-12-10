const puppeteer = require('puppeteer-core');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { TempMail } = require('tempmail.lol');
const { faker } = require('@faker-js/faker');
const Crawl = require('./crawl.class');

class BaseCrawler {
    constructor(options = {}) {
        this.debugUrl = 'http://127.0.0.1:9222';
        this.browser = null;
        this.incognitoContext = null; // Incognito browser context
        this.useIncognito = options.useIncognito !== undefined ? options.useIncognito : true; // Use incognito by default
        this.pages = new Map(); // Map of domain -> page
        this.capturedRequests = [];
        this.capturePatterns = [];
        this.tempmail = new TempMail('tempmail.20251208.fm1wy3t334e7or288wqdoa45fbl0nd692nhzvepwx2e6l7ym'); // Initialize TempMail client
        this.emailDomains =  ["0xff.fit", "ruhanemuk.fit", "chlotesxxl.online", "ruhanemuk.online", "ruhanemuk.space", "ruhanemuk.store", "chlotesxxl.xyz"];
        
        
        // Proxy configuration
        this.proxy = {
            enabled: options.proxy?.enabled || false,
            host: options.proxy?.host || null,
            port: options.proxy?.port || null,
            username: options.proxy?.username || null,
            password: options.proxy?.password || null
        };
        
        // Track if browser was launched (vs connected)
        this.browserLaunched = false;
        
        // Crawl tracking
        this.crawl = null;
        this.crawlerName = options.crawlerName || 'unknown';
        this.dbPath = options.dbPath || './crawls.sqlite';
    }

    /**
     * Launch Chrome with proxy support
     * @param {string} executablePath - Path to Chrome executable
     * @returns {Promise<Browser>} - Puppeteer browser object
     */
    async launch(executablePath = '/usr/bin/chromium-browser') {
        try {
            const launchOptions = {
                executablePath,
                headless: false,
                defaultViewport: null,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled'
                ]
            };

            // Add proxy configuration if enabled
            if (this.proxy.enabled && this.proxy.host && this.proxy.port) {
                const proxyServer = `${this.proxy.host}:${this.proxy.port}`;
                launchOptions.args.push(`--proxy-server=${proxyServer}`);
                console.log(`Launching Chrome with proxy: ${proxyServer}`);
            }

            this.browser = await puppeteer.launch(launchOptions);
            this.browserLaunched = true;
            console.log('Chrome launched successfully');
            return this.browser;
        } catch (error) {
            throw new Error(`Failed to launch Chrome: ${error.message}`);
        }
    } 
  
    /**
     * Connect to the remote Chromium instance
     */
    async connect() {
        try {
            // Fetch the WebSocket endpoint from Chrome DevTools
            const response = await fetch(`${this.debugUrl}/json/version`);
            const data = await response.json();
            const browserWSEndpoint = data.webSocketDebuggerUrl;
            
            console.log(`Detected WebSocket endpoint: ${browserWSEndpoint}`);
            
            this.browser = await puppeteer.connect({
                browserWSEndpoint,
                defaultViewport: null
            });
            
            // Create incognito browser context if enabled (works for connected browsers)
            if (this.useIncognito) {
                this.incognitoContext = await this.browser.createBrowserContext();
                console.log('Connected to Chromium with incognito context');
            } else {
                console.log('Connected to Chromium (no incognito context)');
            }
            
            // Note: When connecting to existing browser, proxy must be configured at browser launch
            if (this.proxy.enabled) {
                console.warn('WARNING: Proxy is configured but connecting to existing browser.');
                console.warn('For proxy to work, Chrome must be launched with --proxy-server flag.');
                console.warn(`Use: google-chrome --remote-debugging-port=9222 --proxy-server=${this.proxy.host}:${this.proxy.port}`);
            }
            
            return this.browser;
        } catch (error) {
            throw new Error(`Failed to connect to Chromium: ${error.message}`);
        }
    }

    /**
     * Start crawl tracking
     * @param {Object} options - Optional crawl options (userData, accountId, etc.)
     * @returns {Promise<number>} - Crawl ID
     */
    async startCrawl(options = {}) {
        this.crawl = new Crawl(this.crawlerName, {
            ...options,
            dbPath: this.dbPath
        });
        await this.crawl.initDatabase();
        const crawlId = await this.crawl.save();
        this.crawl.addLog(`Crawl started: ${this.crawlerName}`);
        console.log(`Crawl tracking started for: ${this.crawlerName} (ID: ${crawlId})`);
        return crawlId;
    }

    /**
     * Stop crawl tracking and mark as completed
     */
    async stopCrawl() {
        if (this.crawl) {
            await this.crawl.complete();
            await this.crawl.closeDatabase();
            console.log('Crawl tracking stopped');
        }
    }

    /**
     * Mark crawl as failed
     */
    async failCrawl(error) {
        if (this.crawl) {
            await this.crawl.fail(error);
            await this.crawl.closeDatabase();
            console.log('Crawl marked as failed');
        }
    }

    /**
     * Set account ID for the current crawl
     * @param {string} accountId - Account ID to set
     * @returns {Promise<void>}
     */
    async setAccountId(accountId) {
        if (this.crawl) {
            await this.crawl.setAccountId(accountId);
        } else {
            console.warn('No active crawl to set account ID');
        }
    }

    /**
     * Set order ID for the current crawl
     * @param {string} orderId - Order ID to set
     * @returns {Promise<void>}
     */
    async setOrderId(orderId) {
        if (this.crawl) {
            await this.crawl.setOrderId(orderId);
        } else {
            console.warn('No active crawl to set order ID');
        }
    }

    /**
     * Set cart ID for the current crawl
     * @param {string} cartId - Cart ID to set
     * @returns {Promise<void>}
     */
    async setCartId(cartId) {
        if (this.crawl) {
            await this.crawl.setCartId(cartId);
        } else {
            console.warn('No active crawl to set cart ID');
        }
    }

    /**
     * Set card ID for the current crawl
     * @param {string} cardId - Card ID to set
     * @returns {Promise<void>}
     */
    async setCardId(cardId) {
        if (this.crawl) {
            await this.crawl.setCardId(cardId);
        } else {
            console.warn('No active crawl to set card ID');
        }
    }

    /**
     * Set address ID for the current crawl
     * @param {string} addressId - Address ID to set
     * @returns {Promise<void>}
     */
    async setAddressId(addressId) {
        if (this.crawl) {
            await this.crawl.setAddressId(addressId);
        } else {
            console.warn('No active crawl to set address ID');
        }
    }

    /**
     * Get XHR requests matching a URL pattern for the current crawl
     * @param {RegExp|string} urlPattern - URL pattern to match (RegExp or string)
     * @returns {Promise<Array>} - Array of matching XHR requests
     */
    async getXHRByUrl(urlPattern, id) {
        if (this.crawl) {
            return await this.crawl.getXHRByUrl(urlPattern, id);
        } else {
            console.warn('No active crawl to get XHR requests');
            return [];
        }
    }

    /**
     * Get the WebSocket endpoint from the debug URL
     */
    async getBrowserWSEndpoint() {
        const response = await fetch(`${this.debugUrl}/json/version`);
        const data = await response.json();
        return data.webSocketDebuggerUrl;
    }

    /**
     * Extract domain from URL
     */
    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            throw new Error(`Invalid URL: ${url}`);
        }
    }

    /**
     * Extract base domain from hostname (e.g., my.asos.com -> asos.com)
     */
    getBaseDomain(hostname) {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            // Return the last two parts (e.g., asos.com)
            return parts.slice(-2).join('.');
        }
        return hostname;
    }

    /**
     * Clear site settings and data for a specific domain
     * @param {Page} page - Puppeteer page object
     * @param {string} url - The URL to clear data for
     */
    async clearSiteData(page, url) {
        try {
            const urlObj = new URL(url);
            const origin = urlObj.origin;
            
            // Navigate to the site first if not already there
            const currentUrl = page.url();
            if (!currentUrl.includes(urlObj.hostname)) {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            }
            
            // Get CDP session
            const client = await page.target().createCDPSession();
            
            // Clear cookies for the domain
            const cookies = await client.send('Network.getCookies');
            const domainCookies = cookies.cookies.filter(cookie => {
                return cookie.domain.includes(urlObj.hostname) || 
                       urlObj.hostname.includes(cookie.domain.replace(/^\./, ''));
            });
            
            if (domainCookies.length > 0) {
                for (const cookie of domainCookies) {
                    await client.send('Network.deleteCookies', {
                        name: cookie.name,
                        domain: cookie.domain,
                        path: cookie.path
                    });
                }
                console.log(`Cleared ${domainCookies.length} cookie(s) for: ${urlObj.hostname}`);
            }
            
            // Clear storage (localStorage, sessionStorage, IndexedDB, etc.)
            await client.send('Storage.clearDataForOrigin', {
                origin: origin,
                storageTypes: 'all'
            });
            
            // Clear cache for this origin
            await client.send('Network.clearBrowserCookies');
            
            console.log(`Cleared site data for: ${urlObj.hostname}`);
            
            await client.detach();
        } catch (error) {
            console.error(`Failed to clear site data: ${error.message}`);
        }
    }

    /**
     * Setup proxy authentication for a page using page.authenticate()
     * @param {Page} page - Puppeteer page object
     */
    async setupProxyAuth(page) {
        if (this.proxy.enabled && this.proxy.username && this.proxy.password) {
            try {
                // Use page.authenticate() for proxy basic auth
                // This is the proper way to handle proxy authentication in Puppeteer
                await page.authenticate({
                    username: this.proxy.username,
                    password: this.proxy.password
                });
                
                console.log(`Proxy authentication configured for: ${this.proxy.host}:${this.proxy.port}`);
            } catch (error) {
                console.error(`Failed to setup proxy authentication: ${error.message}`);
            }
        } else if (this.proxy.enabled) {
            console.log(`Proxy configured (no auth): ${this.proxy.host}:${this.proxy.port}`);
        }
    }

    /**
     * Setup basic HTTP authentication for a page
     * @param {Page} page - Puppeteer page object
     * @param {string} username - Username for basic auth
     * @param {string} password - Password for basic auth
     */
    async setupBasicAuth(page, username, password) {
        await page.authenticate({
            username: username,
            password: password
        });
        console.log(`Basic authentication configured`);
    }

    /**
     * Open a new tab or reuse existing tab for the same domain
     * @param {string} url - The URL to open
     * @param {Object} authOptions - Optional authentication options {username, password}
     * @returns {Promise<Page>} - Puppeteer page object
     */
    async openOrUseTab(url, authOptions = null) {
        if (!this.browser) {
            // Use launch() if proxy is enabled, otherwise connect to existing browser
            if (this.proxy.enabled) {
                await this.connect();
            } else {
                await this.connect();
            }
        }

        const domain = this.getDomain(url);
        const baseDomain = this.getBaseDomain(domain);

        // Check if we already have a page for this exact domain
        if (this.pages.has(domain)) {
            const page = this.pages.get(domain);
            try {
                // Verify the page is still valid
                await page.goto(url, { waitUntil: 'domcontentloaded' });
                console.log(`Reusing existing tab for domain: ${domain}`);
                return page;
            } catch (error) {
                // Page is no longer valid, remove it
                this.pages.delete(domain);
            }
        }

        // Check if we have a page for a related domain (e.g., asos.com and my.asos.com)
        for (const [existingDomain, page] of this.pages.entries()) {
            const existingBaseDomain = this.getBaseDomain(existingDomain);
            if (existingBaseDomain === baseDomain) {
                try {
                    // Reuse the page and update the domain mapping
                    await page.goto(url, { waitUntil: 'domcontentloaded' });
                    this.pages.delete(existingDomain);
                    this.pages.set(domain, page);
                    console.log(`Reusing existing tab from ${existingDomain} for domain: ${domain}`);
                    return page;
                } catch (error) {
                    // Page is no longer valid, remove it
                    this.pages.delete(existingDomain);
                }
            }
        }

        // Create a new page in incognito context or default context
        const page = this.useIncognito && this.incognitoContext 
            ? await this.incognitoContext.newPage() 
            : await this.browser.newPage();
        this.pages.set(domain, page);

        // Setup console log capturing (silent mode - saved but not displayed)
        page.on('console', msg => {
            const logMessage = `[Browser Console ${msg.type()}] ${msg.text()}`;
            if (this.crawl) {
                this.crawl.addLog(logMessage, true); // true = silent mode
            }
        });

        // Setup error capturing
        page.on('pageerror', error => {
            if (this.crawl) {
                this.crawl.addError(error);
            }
        });

        // Setup proxy authentication if configured
        await this.setupProxyAuth(page);

        // Setup basic HTTP authentication if provided
        if (authOptions && authOptions.username && authOptions.password) {
            await this.setupBasicAuth(page, authOptions.username, authOptions.password);
        }

        // Set up request interception if we have capture patterns
        if (this.capturePatterns.length > 0) {
            await this.setupRequestInterception(page);
        }

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log(`Opened new tab for domain: ${domain}`);
        return page;
    }

    /**
     * Set up request interception for capturing URLs
     * Only captures XHR requests with text-based content types (JSON, XML, etc.)
     */
    async setupRequestInterception(page) {
        // Use response event to filter by content type
        page.on('response', async (response) => {
            const request = response.request();
            const url = request.url();
            const resourceType = request.resourceType();
            
            // Only capture XHR/fetch requests
            if (resourceType !== 'xhr' && resourceType !== 'fetch') {
                return;
            }
            
            // Check if URL matches any capture pattern
            const shouldCapture = this.capturePatterns.some(pattern => {
                if (pattern instanceof RegExp) {
                    return pattern.test(url);
                }
                return url.includes(pattern);
            });

            if (!shouldCapture) {
                return;
            }

            // Get content type from response headers
            const contentType = response.headers()['content-type'] || '';
            
            // Only capture text-based content types
            const textBasedTypes = [
                'application/json',
                'application/xml',
                'text/xml',
                'text/plain',
                'application/ld+json',
                'application/x-www-form-urlencoded',
                'application/graphql'
            ];
            
            const isTextBased = textBasedTypes.some(type => contentType.toLowerCase().includes(type));
            
            // Skip if not text-based (e.g., images, HTML, CSS, JS files)
            if (!isTextBased) {
                return;
            }

            try {
                // Try to get response body for text-based content
                const responseBody = await response.text().catch(() => null);
                
                const capturedRequest = {
                    url,
                    method: request.method(),
                    requestHeaders: request.headers(),
                    responseHeaders: response.headers(),
                    status: response.status(),
                    contentType,
                    responseBody,
                    timestamp: new Date().toISOString()
                };
                
                this.capturedRequests.push(capturedRequest);
                
                // Add to crawl tracking if active
                if (this.crawl) {
                    await this.crawl.addXHRRequest(capturedRequest);
                }
                
                console.log(`Captured XHR: ${request.method()} (${contentType})`);
            } catch (error) {
                // Silently ignore errors (e.g., response body already consumed)
            }
        });
    }

    /**
     * Add URL patterns to capture
     * Only captures XHR/fetch requests with text-based content types (JSON, XML, etc.)
     * Excludes images, HTML, CSS, and other non-text resources
     * @param {string|RegExp|Array} patterns - URL patterns to capture
     */
    async capture(patterns) {
        if (!Array.isArray(patterns)) {
            patterns = [patterns];
        }

        // Convert string patterns to RegExp if they look like regex
        patterns = patterns.map(pattern => {
            if (typeof pattern === 'string' && pattern.startsWith('/') && pattern.includes('/')) {
                // Convert string regex to RegExp
                const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
                if (match) {
                    return new RegExp(match[1], match[2]);
                }
            }
            return pattern;
        });

        this.capturePatterns.push(...patterns);

        // Update existing pages with new interception
        for (const [domain, page] of this.pages.entries()) {
            await this.setupRequestInterception(page);
        }

        console.log(`Added ${patterns.length} capture pattern(s)`);
    }

    /**
     * Get captured requests
     * @param {string} contentTypeFilter - Optional filter by content type (e.g., 'json', 'xml')
     * @returns {Array} - Array of captured requests
     */
    getCapturedRequests(contentTypeFilter = null) {
        if (!contentTypeFilter) {
            return this.capturedRequests;
        }
        
        return this.capturedRequests.filter(req => 
            req.contentType && req.contentType.toLowerCase().includes(contentTypeFilter.toLowerCase())
        );
    }

    /**
     * Clear captured requests
     */
    clearCapturedRequests() {
        this.capturedRequests = [];
    }

    /**
     * Save HTML content of the current page
     * @param {Page} page - Puppeteer page object
     * @returns {Promise<string>} - HTML content
     */
    async saveHTML(page) {
        if (!page) {
            throw new Error('No page provided');
        }
        const html = await page.content();
        return html;
    }

    /**
     * Save data as newline-separated JSON (NDJSON) to disk with SHA1-based nested directory structure
     * Each object in the array will be written as a separate JSON line
     * @param {Array|Object} data - Data to save (array of objects or single object)
     * @param {string} baseDir - Base directory (default: './jsons')
     * @returns {Promise<string>} - Path to saved file
     */
    async saveJSON(data, baseDir = './jsons') {
        try {
            // Generate SHA1 hash for filename
            const hash = this.generateSHA1();
            const dirPath = await this.createNestedDir(baseDir, hash);
            const filename = `${hash}.json`;
            const fullPath = path.join(dirPath, filename);
            
            // Convert single object to array
            const dataArray = Array.isArray(data) ? data : [data];
            
            // Convert each object to JSON and join with newlines
            const ndjson = dataArray.map(item => JSON.stringify(item)).join('\n');
            
            // Write to file
            await fs.writeFile(fullPath, ndjson + '\n', 'utf8');
            
            // Add to crawl tracking if active
            if (this.crawl) {
                await this.crawl.addJSON(fullPath, dataArray.length);
            }
            
            console.log(`Saved ${dataArray.length} JSON record(s) to: ${fullPath}`);
            return fullPath;
        } catch (error) {
            throw new Error(`Failed to save JSON: ${error.message}`);
        }
    }

    /**
     * Generate SHA1 hash for filename
     */
    generateSHA1() {
        const randomBytes = crypto.randomBytes(20);
        return crypto.createHash('sha1').update(randomBytes).digest('hex');
    }

    /**
     * Create nested directory structure based on SHA1 hash
     * @param {string} baseDir - Base directory for screenshots
     * @param {string} hash - SHA1 hash
     * @returns {Promise<string>} - Full directory path
     */
    async createNestedDir(baseDir, hash) {
        const firstTwo = hash.substring(0, 2);
        const secondTwo = hash.substring(2, 4);
        const dirPath = path.join(baseDir, firstTwo, secondTwo);
        
        await fs.mkdir(dirPath, { recursive: true });
        return dirPath;
    }

    /**
     * Save screenshot with SHA1-based nested directory structure
     * @param {Page} page - Puppeteer page object
     * @param {string} baseDir - Base directory for screenshots (default: './screenshots')
     * @returns {Promise<string>} - Path to saved screenshot
     */
    async saveScreen(page, baseDir = './screenshots') {
        if (!page) {
            throw new Error('No page provided');
        }

        // Wait for the page to be in a stable state and have dimensions
        await page.waitForFunction(() => {
            return document.readyState === 'complete' && 
                document.body && 
                document.body.scrollHeight > 0;
        }, { timeout: 10000 });

        // Ensure viewport is set
        const viewport = page.viewport();
        if (!viewport || viewport.width === 0) {
            await page.setViewport({ width: 1920, height: 1080 });
        }

        const hash = this.generateSHA1();
        const dirPath = await this.createNestedDir(baseDir, hash);
        const filename = `${hash}.png`;
        const fullPath = path.join(dirPath, filename);

        await page.screenshot({
            path: fullPath,
            fullPage: true
        });

        // Add to crawl tracking if active
        if (this.crawl) {
            await this.crawl.addScreenshot(fullPath);
        }

        //console.log(`\n\nScreenshot saved: ${fullPath} \n\n`);
        return fullPath;
    }

    /**
     * Close a specific tab by domain
     */
    async closeTab(domain) {
        if (this.pages.has(domain)) {
            const page = this.pages.get(domain);
            await page.close();
            this.pages.delete(domain);
            console.log(`Closed tab for domain: ${domain}`);
        }
    }

    /**
     * Close all tabs
     */
    async closeAllTabs() {
        for (const [domain, page] of this.pages.entries()) {
            try {
                await page.close();
            } catch (error) {
                // Ignore errors if page is already closed
                console.log(`Tab for ${domain} already closed or unavailable`);
            }
        }
        this.pages.clear();
        
        // Close incognito context if it exists
        if (this.incognitoContext) {
            try {
                await this.incognitoContext.close();
                console.log('Closed incognito context');
            } catch (error) {
                console.log('Incognito context already closed or unavailable');
            }
            this.incognitoContext = null;
        }
        
        console.log('Closed all tabs');
    }

    /**
     * Disconnect from browser
     */
    async disconnect() {
        await this.closeAllTabs();
        if (this.browser) {
            if (this.browserLaunched) {
                // Close the browser if we launched it
                await this.browser.close();
                console.log('Browser closed');
            } else {
                // Just disconnect if we connected to existing browser
                this.browser.disconnect();
                console.log('Disconnected from Chromium');
            }
            this.browser = null;
            this.browserLaunched = false;
        }
    }

    /**
     * Generate a real temporary email address
     * @param {Function} onEmailReceived - Callback function called when email arrives
     * @param {number} pollInterval - Interval in ms to check for new emails (default: 5000)
     * @returns {Promise<Object>} - Email inbox object with address and token
     */
    async generateRealEmail(onEmailReceived = null, pollInterval = 5000) {
        try {
            // Create inbox using TempMail instance
            const inbox = await this.tempmail.createInbox({
                community: false,
                domain: this.emailDomains[ Math.floor(Math.random() * this.emailDomains.length) ]
            });
            
            console.log(`Generated email address: ${inbox.address}`);
            
            // Store inbox info
            const emailData = {
                address: inbox.address,
                token: inbox.token,
                pollInterval: null
            };

            // Set up polling if callback is provided
            if (onEmailReceived && typeof onEmailReceived === 'function') {
                let lastEmailCount = 0;
                
                emailData.pollInterval = setInterval(async () => {
                    try {
                        const emails = await this.tempmail.checkInbox(inbox.token);
                        
                        // Check if inbox expired
                        if (emails === undefined) {
                            console.log('Email inbox has expired');
                            clearInterval(emailData.pollInterval);
                            return;
                        }

                        // Check if new emails arrived
                        if (emails && emails.length > lastEmailCount) {
                            const newEmails = emails.slice(lastEmailCount);
                            lastEmailCount = emails.length;
                            
                            // Call the callback for each new email
                            newEmails.forEach(email => {
                                onEmailReceived(email, inbox.address);
                            });
                        }
                    } catch (error) {
                        console.error(`Error checking inbox: ${error.message}`);
                    }
                }, pollInterval);

                console.log(`Email polling started (interval: ${pollInterval}ms)`);
            }

            return emailData;
        } catch (error) {
            throw new Error(`Failed to create email inbox: ${error.message}`);
        }
    }

    /**
     * Stop polling for emails
     * @param {Object} emailData - Email data object returned from generateRealEmail
     */
    stopEmailPolling(emailData) {
        if (emailData && emailData.pollInterval) {
            clearInterval(emailData.pollInterval);
            emailData.pollInterval = null;
            console.log('Email polling stopped');
        }
    }

    /**
     * Manually check inbox for emails
     * @param {string} token - Inbox token from generateRealEmail
     * @returns {Promise<Array>} - Array of emails
     */
    async checkEmailInbox(token) {
        try {
            const emails = await this.tempmail.checkInbox(token);
            if (emails === undefined) {
                throw new Error('Inbox has expired');
            }
            return emails;
        } catch (error) {
            throw new Error(`Failed to check inbox: ${error.message}`);
        }
    }

    /**
     * Wait for a specified number of seconds
     * @param {number} seconds - Number of seconds to wait
     * @returns {Promise<void>}
     */
    async wait(seconds) {
        console.log(`Waiting for ${seconds} second(s)...`);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
    
    /**
     * Setup cleanup handlers to close all tabs on script interruption
     * Handles SIGINT (Ctrl+C) and SIGTERM (kill command)
     */
    setupCleanupHandlers() {
        const cleanup = async () => {
            console.log('\nCleaning up...');
            console.log('Closing all tabs...');
            await this.closeAllTabs();
            if (this.browser) {
                if (this.browserLaunched) {
                    await this.browser.close();
                    console.log('Browser closed');
                } else {
                    this.browser.disconnect();
                    console.log('Disconnected from browser');
                }
            }
            process.exit(0);
        };
        
        process.on('SIGINT', cleanup);  // Ctrl+C
        process.on('SIGTERM', cleanup); // Kill command
        
        console.log('Cleanup handlers registered');
    }

    /**
     * Generate realistic user details for testing
     * @param {string} locale - Locale for data generation (default: 'en_GB' for UK)
     * @param {Function} onEmailReceived - Optional callback function called when email arrives
     * @param {number} pollInterval - Interval in ms to check for new emails (default: 5000)
     * @returns {Promise<Object>} - User details object with real email
     */
    async generateUserDetails(locale = 'en_GB', onEmailReceived = null, pollInterval = 5000) {
        // Locale to country mapping
        const localeToCountry = {
            'en_GB': 'United Kingdom',
            'en_US': 'United States',
            'en_CA': 'Canada',
            'en_AU': 'Australia',
            'en_NZ': 'New Zealand',
            'en_IE': 'Ireland',
            'fr_FR': 'France',
            'de_DE': 'Germany',
            'es_ES': 'Spain',
            'it_IT': 'Italy',
            'nl_NL': 'Netherlands',
            'ro_RO': 'Romania',
            'pt_PT': 'Portugal',
            'pl_PL': 'Poland',
            'sv_SE': 'Sweden',
            'da_DK': 'Denmark',
            'no_NO': 'Norway',
            'fi_FI': 'Finland',
            'ja_JP': 'Japan',
            'zh_CN': 'China',
            'ko_KR': 'South Korea',
            'ar_SA': 'Saudi Arabia',
            'tr_TR': 'Turkey',
            'ru_RU': 'Russia',
            'pt_BR': 'Brazil',
            'es_MX': 'Mexico'
        };
        
        // Set locale for faker
        faker.locale = locale;
        
        const dob = faker.date.birthdate({ min: 18, max: 65, mode: 'age' });
        const country = localeToCountry[locale] || 'United Kingdom';
        
        // Generate real email
        const emailData = await this.generateRealEmail(onEmailReceived, pollInterval);
        
        // Generate phone number based on locale
        let phoneNumber;
        if (locale === 'en_GB') {
            // UK mobile numbers: Real 07XXX prefix followed by 6 digits
            const ukPrefixes = ['07971', '07972', '07973', '07974', '07975', '07976', '07977', '07978', '07979'];
            const prefix = faker.helpers.arrayElement(ukPrefixes);
            phoneNumber = prefix + faker.string.numeric(6);
        } else {
            phoneNumber = faker.phone.number();
        }
        
        const userDetails = {
            firstName: faker.person.firstName(),
            lastName: faker.person.lastName(),
            email: emailData.address,
            emailToken: emailData.token,
            // emailPollInterval excluded - contains non-serializable Timeout object
            phone: phoneNumber,
            dateOfBirth: {
                full: dob,
                day: dob.getDate().toString(),
                month: dob.getMonth().toString(),
                year: dob.getFullYear().toString()
            },
            address: {
                street: faker.location.streetAddress(),
                city: faker.location.city(),
                county: faker.location.county(),
                postcode: faker.location.zipCode(),
                country: country
            },
            username: faker.internet.username(),
            password: faker.internet.password({ length: 12, memorable: false })
        };
        
        // Store the poll interval separately for cleanup (not in userDetails to avoid serialization issues)
        userDetails._emailPollInterval = emailData.pollInterval;

        console.log(`Generated user: ${userDetails.firstName} ${userDetails.lastName} (${userDetails.email})`);
        return userDetails;
    }
}

module.exports = BaseCrawler;