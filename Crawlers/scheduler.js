const { spawn } = require('child_process');
const path = require('path');
/*

 */
class CrawlerScheduler {
    constructor() {
        // Crawler configurations
        this.crawlers = [
            {
                name: 'aboutyou',
                script: 'aboutyou.ro.js',
                modes: {
                    order: { interval: 8 * 60 * 60 * 1000 }, // 1 hour
                    user: { interval: 60 * 60 * 1000 },   // 1 hour (future)
                    address: { interval: 8 * 60 * 60 * 1000 }, // 8 hours (future)
                    card: { interval: 8 * 60 * 60 * 1000 }  // 8 hours (future)
                },
                activeModes: ['order'] // Currently active modes
            },
            {
                name: 'asos',
                script: 'asos.com.js',
                modes: {
                    order: { interval: 8 *60 * 60 * 1000 },
                    user: { interval: 60 * 60 * 1000 },
                    address: { interval: 8 * 60 * 60 * 1000 },
                    card: { interval: 8 * 60 * 60 * 1000 }
                },
                activeModes: ['order']
            },
            {
                name: 'revolve',
                script: 'revolve.com.js',
                modes: {
                    order: { interval: 8 * 60 * 60 * 1000 },
                    user: { interval: 60 * 60 * 1000 },
                    address: { interval: 8 * 60 * 60 * 1000 },
                    card: { interval: 8 * 60 * 60 * 1000 }
                },
                activeModes: ['order']
            },
            {
                name: 'mytheresa',
                script: 'mytheresa.com.js',
                modes: {
                    order: { interval: 8 * 60 * 60 * 1000 },
                    user: { interval: 60 * 60 * 1000 },
                    address: { interval: 8 * 60 * 60 * 1000 },
                    card: { interval: 8 * 60 * 60 * 1000 }
                },
                activeModes: ['order']
            }
        ];

        // Scheduler settings
        this.delayBetweenCrawlers = 5 * 60 * 1000; // 5 minutes
        this.crawlerTimeout = 4 * 60 * 1000; // 4 minutes
        this.runningProcesses = new Map();
        this.lastRunTimes = new Map();
        this.stats = {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            timeouts: 0
        };
    }

    /**
     * Initialize last run times for all crawler-mode combinations
     */
    initialize() {
        this.crawlers.forEach(crawler => {
            crawler.activeModes.forEach(mode => {
                const key = `${crawler.name}-${mode}`;
                this.lastRunTimes.set(key, 0); // Start immediately
            });
        });
        console.log('🚀 Crawler Scheduler initialized');
        console.log(`📋 Configured crawlers: ${this.crawlers.map(c => c.name).join(', ')}`);
        console.log(`⏱️  Delay between crawlers: ${this.delayBetweenCrawlers / 1000}s`);
        console.log(`⏰ Crawler timeout: ${this.crawlerTimeout / 1000}s`);
        console.log('');
    }

    /**
     * Run a crawler with specified mode
     */
    async runCrawler(crawler, mode) {
        const key = `${crawler.name}-${mode}`;
        
        return new Promise((resolve) => {
            const scriptPath = path.join(__dirname, crawler.script);
            const startTime = Date.now();
            
            console.log(`▶️  Starting: ${crawler.name} (mode: ${mode}) at ${new Date().toISOString()}`);
            
            const process = spawn('node', [scriptPath, mode], {
                cwd: __dirname,
                stdio: 'inherit'
            });

            this.runningProcesses.set(key, process);
            this.stats.totalRuns++;

            // Set timeout to kill process if it runs too long
            const timeoutId = setTimeout(() => {
                console.log(`⏱️  TIMEOUT: ${crawler.name} (${mode}) exceeded ${this.crawlerTimeout / 1000}s`);
                process.kill('SIGINT'); // Send Ctrl+C
                this.stats.timeouts++;
                
                // Force kill if SIGINT doesn't work after 5 seconds
                setTimeout(() => {
                    if (!process.killed) {
                        console.log(`💀 Force killing: ${crawler.name} (${mode})`);
                        process.kill('SIGKILL');
                    }
                }, 5000);
            }, this.crawlerTimeout);

            process.on('exit', (code, signal) => {
                clearTimeout(timeoutId);
                this.runningProcesses.delete(key);
                
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                
                if (code === 0) {
                    console.log(`✅ SUCCESS: ${crawler.name} (${mode}) completed in ${duration}s`);
                    this.stats.successfulRuns++;
                } else {
                    console.log(`❌ FAILED: ${crawler.name} (${mode}) exited with code ${code} (signal: ${signal}) after ${duration}s`);
                    this.stats.failedRuns++;
                }
                
                this.lastRunTimes.set(key, Date.now());
                this.printStats();
                console.log('');
                
                resolve({ code, duration });
            });

            process.on('error', (error) => {
                clearTimeout(timeoutId);
                console.error(`❌ ERROR: ${crawler.name} (${mode}) failed to start:`, error.message);
                this.stats.failedRuns++;
                this.runningProcesses.delete(key);
                this.lastRunTimes.set(key, Date.now());
                resolve({ code: 1, error: error.message });
            });
        });
    }

    /**
     * Check if a crawler-mode combination should run
     */
    shouldRun(crawler, mode) {
        const key = `${crawler.name}-${mode}`;
        const lastRun = this.lastRunTimes.get(key) || 0;
        const interval = crawler.modes[mode].interval;
        const timeSinceLastRun = Date.now() - lastRun;
        
        return timeSinceLastRun >= interval;
    }

    /**
     * Get next crawler-mode to run
     */
    getNextToRun() {
        const candidates = [];
        
        this.crawlers.forEach(crawler => {
            crawler.activeModes.forEach(mode => {
                if (this.shouldRun(crawler, mode)) {
                    const key = `${crawler.name}-${mode}`;
                    const lastRun = this.lastRunTimes.get(key) || 0;
                    candidates.push({
                        crawler,
                        mode,
                        lastRun,
                        priority: Date.now() - lastRun // Older = higher priority
                    });
                }
            });
        });

        // Sort by priority (oldest first)
        candidates.sort((a, b) => b.priority - a.priority);
        
        return candidates[0] || null;
    }

    /**
     * Print statistics
     */
    printStats() {
        const successRate = this.stats.totalRuns > 0 
            ? ((this.stats.successfulRuns / this.stats.totalRuns) * 100).toFixed(1)
            : 0;
        
        console.log(`📊 Stats: Total: ${this.stats.totalRuns} | Success: ${this.stats.successfulRuns} | Failed: ${this.stats.failedRuns} | Timeouts: ${this.stats.timeouts} | Success Rate: ${successRate}%`);
    }

    /**
     * Main scheduler loop
     */
    async start() {
        this.initialize();
        
        console.log('🔄 Starting scheduler loop...\n');
        
        while (true) {
            const next = this.getNextToRun();
            
            if (next) {
                await this.runCrawler(next.crawler, next.mode);
                
                // Wait delay before next crawler
                console.log(`⏳ Waiting ${this.delayBetweenCrawlers / 1000}s before next crawler...\n`);
                await this.sleep(this.delayBetweenCrawlers);
            } else {
                // No crawler ready to run, check again in 30 seconds
                const checkInterval = 30 * 1000;
                console.log(`💤 No crawlers ready. Checking again in ${checkInterval / 1000}s...`);
                await this.sleep(checkInterval);
            }
        }
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('\n🛑 Shutting down scheduler...');
        
        // Kill all running processes
        for (const [key, process] of this.runningProcesses.entries()) {
            console.log(`Stopping: ${key}`);
            process.kill('SIGINT');
        }
        
        // Wait for processes to exit
        await this.sleep(5000);
        
        // Force kill any remaining
        for (const [key, process] of this.runningProcesses.entries()) {
            if (!process.killed) {
                console.log(`Force killing: ${key}`);
                process.kill('SIGKILL');
            }
        }
        
        this.printStats();
        console.log('✅ Scheduler stopped');
        process.exit(0);
    }
}

// Create and start scheduler
const scheduler = new CrawlerScheduler();

// Handle graceful shutdown
process.on('SIGINT', () => scheduler.shutdown());
process.on('SIGTERM', () => scheduler.shutdown());

// Start the scheduler
scheduler.start().catch(error => {
    console.error('💥 Scheduler crashed:', error);
    process.exit(1);
});
