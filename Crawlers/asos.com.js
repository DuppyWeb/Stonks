const BaseCrawler = require('./base.crawler.js');

(async () => {
    const crawler = new BaseCrawler('https://asos.com', {
        "proxy" : {
            enabled: true,
            host: 'proxy.packetstream.io',
            port: 31112,
            username: 'duppyweb',
            password: 'c0a26128da050453_country-UnitedKingdom'
        }
    });
    
    // Setup cleanup handlers for graceful exit
    crawler.setupCleanupHandlers();
    
    // Open or reuse tab
    const page = await crawler.openOrUseTab('https://asos.com');

    await page.waitForSelector('button[data-testid="myAccountIcon"]');
    await page.click('button[data-testid="myAccountIcon"]');

    
    await page.waitForSelector('button[data-testid="signup-link"]');
    await page.click('button[data-testid="signup-link"]');
    
    await page.waitForFunction(() => {
            return document.readyState === 'complete' && 
                document.body && 
                document.body.scrollHeight > 0;
    }, { timeout: 10000 });

    // Capture specific URLs
    await crawler.capture([/my.asos.com/]);

    const user = await crawler.generateUserDetails('en_GB', (email, address) => {
        console.log(`Email received: ${email.subject}`);
    });

    console.log(user);
    await crawler.wait(3);

    //Type email
    await page.waitForSelector('input[id="email"]');
    await page.type('input[id="email"]', user.email );

    await crawler.wait(2);

    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');

    await crawler.wait(5);


    //Fill form
    await page.type('input[id="firstName"]', user.firstName);

    await page.type('input[id="lastName"]', user.lastName);

    await page.type('input[id="password"]', user.password);

    // Fill date of birth
    await page.waitForSelector('select');
    const selects = await page.$$('select');
    
    if (selects.length >= 3) {
        await selects[0].select(user.dateOfBirth.day);   // Day
        await selects[1].select(user.dateOfBirth.month); // Month
        await selects[2].select(user.dateOfBirth.year);  // Year
    }

    await crawler.wait(1);

    await page.waitForSelector('button[type="submit"]');
    await page.click('button[type="submit"]');

        
    // Save HTML
    const html = await crawler.saveHTML(page);
    
    // Save screenshot
    const screenshotPath = await crawler.saveScreen(page);
    
    await crawler.wait(12);

    // Get captured requests
    const captured = crawler.getCapturedRequests();

    let jsonFile =  await crawler.saveJSON(captured );


    console.log(jsonFile);
            
    //await crawler.disconnect();
})();