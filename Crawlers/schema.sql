-- SQLite Schema for Crawl Tracking System
-- This schema stores comprehensive information about web crawling sessions

-- Main crawls table - stores metadata about each crawl session
CREATE TABLE IF NOT EXISTS crawls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crawl TEXT NOT NULL,                    -- Name of the crawler script (e.g., 'asos.com.js')
    started_at TEXT NOT NULL,               -- ISO timestamp when crawl started
    finished_at TEXT,                       -- ISO timestamp when crawl finished
    status TEXT NOT NULL,                   -- Status: 'running', 'completed', 'failed'
    account_id TEXT,                        -- Account ID created during crawl
    order_id TEXT,                          -- Order ID if purchase was made
    cart_id TEXT,                           -- Shopping cart ID
    card_id TEXT,                           -- Payment card ID
    address_id TEXT,                        -- Address ID
    user_data TEXT,                         -- JSON string of user details (name, email, etc.)
    screenshot_files TEXT,                  -- JSON array of screenshot file paths
    json_files TEXT,                        -- JSON array of JSON file paths
    log TEXT,                               -- JSON array of log messages
    errors TEXT,                            -- JSON array of error objects
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


-- XHR requests table - stores captured network requests
CREATE TABLE IF NOT EXISTS xhr_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crawl_id INTEGER NOT NULL,              -- Foreign key to crawls table
    url TEXT NOT NULL,                      -- Request URL
    method TEXT NOT NULL,                   -- HTTP method (GET, POST, etc.)
    status INTEGER,                         -- HTTP status code
    content_type TEXT,                      -- Response content type
    request_headers TEXT,                   -- JSON string of request headers
    response_headers TEXT,                  -- JSON string of response headers
    response_body TEXT,                     -- Response body (for text-based responses)
    timestamp TEXT NOT NULL,                -- ISO timestamp of request
    FOREIGN KEY (crawl_id) REFERENCES crawls(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_crawls_status ON crawls(status);
CREATE INDEX IF NOT EXISTS idx_crawls_started_at ON crawls(started_at);
CREATE INDEX IF NOT EXISTS idx_crawls_crawler_name ON crawls(crawl);
CREATE INDEX IF NOT EXISTS idx_xhr_requests_crawl_id ON xhr_requests(crawl_id);
CREATE INDEX IF NOT EXISTS idx_xhr_requests_url ON xhr_requests(url);
CREATE INDEX IF NOT EXISTS idx_xhr_requests_timestamp ON xhr_requests(timestamp);

-- Example queries for common use cases:

-- Get all crawls with their statistics
-- SELECT 
--     c.id,
--     c.crawl,
--     c.started_at,
--     c.finished_at,
--     c.status,
--     json_array_length(c.screenshot_files) as screenshot_count,
--     json_array_length(c.json_files) as json_file_count,
--     COUNT(DISTINCT x.id) as xhr_request_count
-- FROM crawls c
-- LEFT JOIN xhr_requests x ON c.id = x.crawl_id
-- GROUP BY c.id
-- ORDER BY c.started_at DESC;

-- Get all failed crawls with error details
-- SELECT 
--     id,
--     crawl,
--     started_at,
--     finished_at,
--     errors
-- FROM crawls
-- WHERE status = 'failed'
-- ORDER BY started_at DESC;

-- Get all XHR requests for a specific crawl
-- SELECT 
--     url,
--     method,
--     status,
--     content_type,
--     timestamp
-- FROM xhr_requests
-- WHERE crawl_id = ?
-- ORDER BY timestamp;

-- Get crawls by date range
-- SELECT *
-- FROM crawls
-- WHERE started_at BETWEEN ? AND ?
-- ORDER BY started_at DESC;

-- Get user data from successful crawls
-- SELECT 
--     id,
--     crawl,
--     user_data,
--     account_id,
--     started_at
-- FROM crawls
-- WHERE status = 'completed'
--   AND user_data IS NOT NULL
-- ORDER BY started_at DESC;
