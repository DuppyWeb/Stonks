const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class Crawl {
    constructor(crawlerName, options = {}) {
        this.crawl = crawlerName;
        this.startedAt = new Date().toISOString();
        this.finishedAt = null;
        this.screenshots = [];
        this.jsons = [];
        this.userData = options.userData || null;
        this.accountId = options.accountId || null;
        this.orderId = options.orderId || null;
        this.cartId = options.cartId || null;
        this.cardId = options.cardId || null;
        this.addressId = options.addressId || null;
        this.xhrRequests = [];
        this.log = [];
        this.errors = [];
        this.status = 'running'; // running, completed, failed
        
        // Database connection
        this.db = null;
        this.dbPath = options.dbPath || './crawls.sqlite';
        this.crawlId = null;
    }

    /**
     * Initialize database connection and create tables if needed
     */
    async initDatabase() {
        this.db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database
        });

        // Create tables
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS crawls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crawl TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                status TEXT NOT NULL,
                account_id TEXT,
                order_id TEXT,
                cart_id TEXT,
                card_id TEXT,
                address_id TEXT,
                user_data TEXT,
                screenshot_files TEXT,
                json_files TEXT,
                log TEXT,
                errors TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS xhr_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                crawl_id INTEGER NOT NULL,
                url TEXT NOT NULL,
                method TEXT NOT NULL,
                status INTEGER,
                content_type TEXT,
                request_headers TEXT,
                response_headers TEXT,
                response_body TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (crawl_id) REFERENCES crawls(id)
            );

            CREATE INDEX IF NOT EXISTS idx_crawls_status ON crawls(status);
            CREATE INDEX IF NOT EXISTS idx_crawls_started_at ON crawls(started_at);
            CREATE INDEX IF NOT EXISTS idx_xhr_requests_crawl_id ON xhr_requests(crawl_id);
        `);

        console.log('Database initialized');
    }

    /**
     * Save crawl to database
     */
    async save() {
        if (!this.db) {
            await this.initDatabase();
        }

        if (!this.crawlId) {
            // Insert new crawl
            const result = await this.db.run(
                `INSERT INTO crawls (crawl, started_at, finished_at, status, account_id, order_id, cart_id, card_id, address_id, user_data, screenshot_files, json_files, log, errors)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    this.crawl,
                    this.startedAt,
                    this.finishedAt,
                    this.status,
                    this.accountId,
                    this.orderId,
                    this.cartId,
                    this.cardId,
                    this.addressId,
                    JSON.stringify(this.userData),
                    JSON.stringify(this.screenshots),
                    JSON.stringify(this.jsons),
                    JSON.stringify(this.log),
                    JSON.stringify(this.errors)
                ]
            );
            this.crawlId = result.lastID;
            console.log(`Crawl saved to database with ID: ${this.crawlId}`);
        } else {
            // Update existing crawl
            await this.db.run(
                `UPDATE crawls 
                 SET finished_at = ?, status = ?, account_id = ?, order_id = ?, cart_id = ?, card_id = ?, address_id = ?, 
                     user_data = ?, screenshot_files = ?, json_files = ?, log = ?, errors = ?
                 WHERE id = ?`,
                [
                    this.finishedAt,
                    this.status,
                    this.accountId,
                    this.orderId,
                    this.cartId,
                    this.cardId,
                    this.addressId,
                    JSON.stringify(this.userData),
                    JSON.stringify(this.screenshots),
                    JSON.stringify(this.jsons),
                    JSON.stringify(this.log),
                    JSON.stringify(this.errors),
                    this.crawlId
                ]
            );
            console.log(`Crawl ${this.crawlId} updated in database`);
        }

        return this.crawlId;
    }

    /**
     * Add screenshot reference
     */
    async addScreenshot(filePath) {
        this.screenshots.push(filePath);

        // Update database immediately if crawl is already saved
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET screenshot_files = ? WHERE id = ?`,
                [JSON.stringify(this.screenshots), this.crawlId]
            );
        }

        console.log(`Screenshot added to crawl: /home/stonks/Workdir/Stonks/Crawlers/${filePath}`);
    }

    /**
     * Add JSON file reference
     */
    async addJSON(filePath, recordCount = 0) {
        this.jsons.push(filePath);

        // Update database immediately if crawl is already saved
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET json_files = ? WHERE id = ?`,
                [JSON.stringify(this.jsons), this.crawlId]
            );
        }

        console.log(`JSON file added to crawl: ${filePath}`);
    }

    /**
     * Add XHR request
     */
    async addXHRRequest(request) {
        this.xhrRequests.push(request);

        if (this.db && this.crawlId) {
            await this.db.run(
                `INSERT INTO xhr_requests (crawl_id, url, method, status, content_type, request_headers, response_headers, response_body, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    this.crawlId,
                    request.url,
                    request.method,
                    request.status,
                    request.contentType,
                    JSON.stringify(request.requestHeaders),
                    JSON.stringify(request.responseHeaders),
                    request.responseBody,
                    request.timestamp
                ]
            );
        }
    }

    /**
     * Get XHR requests matching a URL pattern
     * @param {RegExp|string} urlPattern - URL pattern to match (RegExp or string)
     * @param {number} crawlId - Optional crawl ID (defaults to current crawl)
     * @returns {Promise<Array>} - Array of matching XHR requests
     */
    async getXHRByUrl(urlPattern, crawlId = null) {
        const targetCrawlId = crawlId || this.crawlId;
        
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        if (!targetCrawlId) {
            throw new Error('No crawl ID specified');
        }

        // Get all XHR requests for the crawl
        const xhrs = await this.db.all(
            'SELECT * FROM xhr_requests WHERE crawl_id = ? ORDER BY timestamp',
            [targetCrawlId]
        );

        // Convert pattern to RegExp if it's a string
        const pattern = typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern;

        // Filter by URL pattern
        const matchingRequests = xhrs.filter(xhr => pattern.test(xhr.url));

        // Parse JSON fields and return
        return matchingRequests.map(xhr => ({
            id: xhr.id,
            url: xhr.url,
            method: xhr.method,
            status: xhr.status,
            contentType: xhr.content_type,
            requestHeaders: JSON.parse(xhr.request_headers || '{}'),
            responseHeaders: JSON.parse(xhr.response_headers || '{}'),
            responseBody: xhr.response_body,
            timestamp: xhr.timestamp
        }));
    }

    /**
     * Add log entry
     * @param {string} message - Log message
     * @param {boolean} silent - If true, don't output to console (default: false)
     */
    addLog(message, silent = false) {
        const logEntry = `[${new Date().toISOString()}] ${message}`;
        this.log.push(logEntry);
        if (!silent) {
            console.log(logEntry);
        }
    }

    /**
     * Add error
     */
    addError(error) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            message: error.message || error.toString(),
            stack: error.stack || null
        };
        this.errors.push(errorEntry);
        console.error(`Error captured: ${errorEntry.message}`);
    }

    /**
     * Set user data
     * Filters out non-serializable properties (those starting with _)
     */
    setUserData(userData) {
        if (!userData) {
            this.userData = null;
            return;
        }
        
        // Create a clean copy without non-serializable properties
        const cleanData = {};
        for (const key in userData) {
            // Skip properties starting with _ (internal/non-serializable)
            if (!key.startsWith('_')) {
                cleanData[key] = userData[key];
            }
        }
        this.userData = cleanData;
        this.save();
    }

    /**
     * Set account ID
     * @param {string} accountId - Account ID to set
     * @returns {Promise<void>}
     */
    async setAccountId(accountId) {
        this.accountId = accountId;
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET account_id = ? WHERE id = ?`,
                [this.accountId, this.crawlId]
            );
            console.log(`Account ID updated: ${accountId}`);
        }
    }

    /**
     * Set order ID
     * @param {string} orderId - Order ID to set
     * @returns {Promise<void>}
     */
    async setOrderId(orderId) {
        this.orderId = orderId;
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET order_id = ? WHERE id = ?`,
                [this.orderId, this.crawlId]
            );
            console.log(`Order ID updated: ${orderId}`);
        }
    }

    /**
     * Set cart ID
     * @param {string} cartId - Cart ID to set
     * @returns {Promise<void>}
     */
    async setCartId(cartId) {
        this.cartId = cartId;
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET cart_id = ? WHERE id = ?`,
                [this.cartId, this.crawlId]
            );
            console.log(`Cart ID updated: ${cartId}`);
        }
    }

    /**
     * Set card ID
     * @param {string} cardId - Card ID to set
     * @returns {Promise<void>}
     */
    async setCardId(cardId) {
        this.cardId = cardId;
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET card_id = ? WHERE id = ?`,
                [this.cardId, this.crawlId]
            );
            console.log(`Card ID updated: ${cardId}`);
        }
    }

    /**
     * Set address ID
     * @param {string} addressId - Address ID to set
     * @returns {Promise<void>}
     */
    async setAddressId(addressId) {
        this.addressId = addressId;
        if (this.db && this.crawlId) {
            await this.db.run(
                `UPDATE crawls SET address_id = ? WHERE id = ?`,
                [this.addressId, this.crawlId]
            );
            console.log(`Address ID updated: ${addressId}`);
        }
    }

    /**
     * Mark crawl as completed
     */
    async complete() {
        this.finishedAt = new Date().toISOString();
        this.status = 'completed';
        await this.save();
        console.log(`Crawl completed at ${this.finishedAt}`);
    }

    /**
     * Mark crawl as failed
     */
    async fail(error) {
        this.finishedAt = new Date().toISOString();
        this.status = 'failed';
        if (error) {
            this.addError(error);
        }
        await this.save();
        console.log(`Crawl failed at ${this.finishedAt}`);
    }

    /**
     * Export crawl data as JSON
     */
    toJSON() {
        return {
            crawl: this.crawl,
            startedAt: this.startedAt,
            finishedAt: this.finishedAt,
            status: this.status,
            screenshots: this.screenshots,
            jsons: this.jsons,
            userData: this.userData,
            accountId: this.accountId,
            orderId: this.orderId,
            cartId: this.cartId,
            cardId: this.cardId,
            xhrRequests: this.xhrRequests,
            log: this.log,
            errors: this.errors
        };
    }

    /**
     * Save crawl data to JSON file
     */
    async saveToFile(filePath) {
        const data = JSON.stringify(this.toJSON(), null, 2);
        await fs.writeFile(filePath, data, 'utf8');
        console.log(`Crawl data saved to: ${filePath}`);
    }

    /**
     * Load crawl from database by ID
     */
    static async loadFromDatabase(crawlId, dbPath = './crawls.sqlite') {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        const crawlData = await db.get('SELECT * FROM crawls WHERE id = ?', [crawlId]);
        
        if (!crawlData) {
            throw new Error(`Crawl with ID ${crawlId} not found`);
        }

        const crawl = new Crawl(crawlData.crawl, { dbPath });
        crawl.db = db;
        crawl.crawlId = crawlData.id;
        crawl.startedAt = crawlData.started_at;
        crawl.finishedAt = crawlData.finished_at;
        crawl.status = crawlData.status;
        crawl.accountId = crawlData.account_id;
        crawl.orderId = crawlData.order_id;
        crawl.cartId = crawlData.cart_id;
        crawl.cardId = crawlData.card_id;
        crawl.addressId = crawlData.address_id;
        crawl.userData = JSON.parse(crawlData.user_data || 'null');
        crawl.screenshots = JSON.parse(crawlData.screenshot_files || '[]');
        crawl.jsons = JSON.parse(crawlData.json_files || '[]');
        crawl.log = JSON.parse(crawlData.log || '[]');
        crawl.errors = JSON.parse(crawlData.errors || '[]');

        // Load XHR requests
        const xhrs = await db.all('SELECT * FROM xhr_requests WHERE crawl_id = ?', [crawlId]);
        crawl.xhrRequests = xhrs.map(xhr => ({
            url: xhr.url,
            method: xhr.method,
            status: xhr.status,
            contentType: xhr.content_type,
            requestHeaders: JSON.parse(xhr.request_headers || '{}'),
            responseHeaders: JSON.parse(xhr.response_headers || '{}'),
            responseBody: xhr.response_body,
            timestamp: xhr.timestamp
        }));

        return crawl;
    }

    /**
     * Close database connection
     */
    async closeDatabase() {
        if (this.db) {
            await this.db.close();
            this.db = null;
            console.log('Database connection closed');
        }
    }
}

module.exports = Crawl;
