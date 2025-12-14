#!/usr/bin/env node

/**
 * Query Crawls Database
 * 
 * Simple CLI tool to query and view crawl data from the SQLite database
 * 
 * Usage:
 *   node query-crawls.js list              # List all crawls
 *   node query-crawls.js view <id>         # View specific crawl details
 *   node query-crawls.js failed            # List failed crawls
 *   node query-crawls.js stats             # Show statistics
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const Crawl = require('./crawl.class');

const DB_PATH = './crawls.db';

async function openDatabase() {
    return await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
}

async function listCrawls() {
    const db = await openDatabase();
    
    const crawls = await db.all(`
        SELECT 
            c.id,
            c.crawl,
            c.started_at,
            c.finished_at,
            c.status,
            c.screenshot_files,
            c.json_files,
            COUNT(DISTINCT x.id) as xhr_request_count
        FROM crawls c
        LEFT JOIN xhr_requests x ON c.id = x.crawl_id
        GROUP BY c.id
        ORDER BY c.started_at DESC
        LIMIT 50
    `);
    
    console.log('\n=== Recent Crawls ===\n');
    console.log('ID | Crawler | Status | Started | Screenshots | JSONs | XHRs');
    console.log('-'.repeat(80));
    
    for (const crawl of crawls) {
        const duration = crawl.finished_at 
            ? Math.round((new Date(crawl.finished_at) - new Date(crawl.started_at)) / 1000)
            : 'N/A';
        
        const screenshotCount = crawl.screenshot_files ? JSON.parse(crawl.screenshot_files).length : 0;
        const jsonFileCount = crawl.json_files ? JSON.parse(crawl.json_files).length : 0;
        
        console.log(
            `${crawl.id.toString().padEnd(3)} | ` +
            `${crawl.crawl.padEnd(15)} | ` +
            `${crawl.status.padEnd(9)} | ` +
            `${new Date(crawl.started_at).toLocaleString().padEnd(20)} | ` +
            `${screenshotCount.toString().padEnd(11)} | ` +
            `${jsonFileCount.toString().padEnd(5)} | ` +
            `${crawl.xhr_request_count}`
        );
    }
    
    console.log('\n');
    await db.close();
}

async function viewCrawl(crawlId) {
    const crawl = await Crawl.loadFromDatabase(parseInt(crawlId), DB_PATH);
    
    console.log('\n=== Crawl Details ===\n');
    console.log(`ID: ${crawl.crawlId}`);
    console.log(`Crawler: ${crawl.crawl}`);
    console.log(`Status: ${crawl.status}`);
    console.log(`Started: ${new Date(crawl.startedAt).toLocaleString()}`);
    console.log(`Finished: ${crawl.finishedAt ? new Date(crawl.finishedAt).toLocaleString() : 'N/A'}`);
    
    if (crawl.finishedAt) {
        const duration = Math.round((new Date(crawl.finishedAt) - new Date(crawl.startedAt)) / 1000);
        console.log(`Duration: ${duration}s`);
    }
    
    console.log(`\nScreenshots: ${crawl.screenshots.length}`);
    if (crawl.screenshots.length > 0) {
        crawl.screenshots.slice(0, 5).forEach(hash => {
            console.log(`  - ${hash}`);
        });
        if (crawl.screenshots.length > 5) {
            console.log(`  ... and ${crawl.screenshots.length - 5} more`);
        }
    }
    
    console.log(`\nJSON Files: ${crawl.jsons.length}`);
    if (crawl.jsons.length > 0) {
        crawl.jsons.slice(0, 5).forEach(hash => {
            console.log(`  - ${hash}`);
        });
        if (crawl.jsons.length > 5) {
            console.log(`  ... and ${crawl.jsons.length - 5} more`);
        }
    }
    
    console.log(`\nXHR Requests: ${crawl.xhrRequests.length}`);
    if (crawl.xhrRequests.length > 0) {
        crawl.xhrRequests.slice(0, 5).forEach(xhr => {
            console.log(`  - ${xhr.method} ${xhr.url} (${xhr.status})`);
        });
        if (crawl.xhrRequests.length > 5) {
            console.log(`  ... and ${crawl.xhrRequests.length - 5} more`);
        }
    }
    
    if (crawl.userData) {
        console.log(`\nUser Data:`);
        console.log(`  Name: ${crawl.userData.firstName} ${crawl.userData.lastName}`);
        console.log(`  Email: ${crawl.userData.email}`);
    }
    
    if (crawl.accountId) console.log(`\nAccount ID: ${crawl.accountId}`);
    if (crawl.orderId) console.log(`Order ID: ${crawl.orderId}`);
    if (crawl.cartId) console.log(`Cart ID: ${crawl.cartId}`);
    if (crawl.cardId) console.log(`Card ID: ${crawl.cardId}`);
    
    console.log(`\nLog Entries: ${crawl.log.length}`);
    if (crawl.log.length > 0) {
        crawl.log.slice(-5).forEach(log => {
            console.log(`  ${log}`);
        });
    }
    
    console.log(`\nErrors: ${crawl.errors.length}`);
    if (crawl.errors.length > 0) {
        crawl.errors.forEach(error => {
            console.log(`  [${error.timestamp}] ${error.message}`);
        });
    }
    
    console.log('\n');
    await crawl.closeDatabase();
}

async function listFailedCrawls() {
    const db = await openDatabase();
    
    const crawls = await db.all(`
        SELECT id, crawl, started_at, finished_at, errors
        FROM crawls
        WHERE status = 'failed'
        ORDER BY started_at DESC
        LIMIT 20
    `);
    
    console.log('\n=== Failed Crawls ===\n');
    
    if (crawls.length === 0) {
        console.log('No failed crawls found.\n');
        await db.close();
        return;
    }
    
    for (const crawl of crawls) {
        console.log(`ID: ${crawl.id} | ${crawl.crawl} | ${new Date(crawl.started_at).toLocaleString()}`);
        
        try {
            const errors = JSON.parse(crawl.errors || '[]');
            if (errors.length > 0) {
                errors.forEach(error => {
                    console.log(`  Error: ${error.message}`);
                });
            }
        } catch (e) {
            console.log('  (Error parsing error data)');
        }
        
        console.log('');
    }
    
    await db.close();
}

async function showStats() {
    const db = await openDatabase();
    
    const stats = await db.get(`
        SELECT 
            COUNT(*) as total_crawls,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
        FROM crawls
    `);
    
    const screenshotCount = await db.get('SELECT COUNT(*) as count FROM screenshots');
    const jsonCount = await db.get('SELECT COUNT(*) as count FROM json_files');
    const xhrCount = await db.get('SELECT COUNT(*) as count FROM xhr_requests');
    
    console.log('\n=== Database Statistics ===\n');
    console.log(`Total Crawls: ${stats.total_crawls}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Running: ${stats.running}`);
    console.log(`\nTotal Screenshots: ${screenshotCount.count}`);
    console.log(`Total JSON Files: ${jsonCount.count}`);
    console.log(`Total XHR Requests: ${xhrCount.count}`);
    
    // Get most recent crawl
    const recent = await db.get(`
        SELECT crawl, started_at, status
        FROM crawls
        ORDER BY started_at DESC
        LIMIT 1
    `);
    
    if (recent) {
        console.log(`\nMost Recent Crawl:`);
        console.log(`  ${recent.crawl} (${recent.status})`);
        console.log(`  ${new Date(recent.started_at).toLocaleString()}`);
    }
    
    console.log('\n');
    await db.close();
}

// Main CLI handler
async function main() {
    const command = process.argv[2];
    const arg = process.argv[3];
    
    try {
        switch (command) {
            case 'list':
                await listCrawls();
                break;
            
            case 'view':
                if (!arg) {
                    console.error('Error: Please provide a crawl ID');
                    console.error('Usage: node query-crawls.js view <id>');
                    process.exit(1);
                }
                await viewCrawl(arg);
                break;
            
            case 'failed':
                await listFailedCrawls();
                break;
            
            case 'stats':
                await showStats();
                break;
            
            default:
                console.log('Usage:');
                console.log('  node query-crawls.js list              # List all crawls');
                console.log('  node query-crawls.js view <id>         # View specific crawl details');
                console.log('  node query-crawls.js failed            # List failed crawls');
                console.log('  node query-crawls.js stats             # Show statistics');
                process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
