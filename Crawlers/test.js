const BaseCrawler = require('./base.crawler.js');

(async () => {
     const crawler = new BaseCrawler({
        crawlerName: 'asos.com.js',
        dbPath: './database/crawls.db',
        proxy: {
            enabled: true,
            host: 'proxy.packetstream.io',
            port: 31112,
            username: 'duppyweb',
            password: 'c0a26128da050453_country-UnitedKingdom'
        }
    });
    
    // Setup cleanup handlers for graceful exit
    crawler.setupCleanupHandlers();
    
    // Start crawl tracking
    await crawler.startCrawl();

    const user = await crawler.generateUserDetails('en_GB', (email, address) => {
        console.log(`Email received: ${email.subject}`);
    });

    console.log(user.email);

    crawler.wait(500);

})();