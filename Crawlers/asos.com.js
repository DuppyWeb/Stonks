const BaseCrawler = require('./base.crawler.js');

(async () => {
    const crawler = new BaseCrawler({
        crawlerName: 'asos.com.js',
        dbPath: './database/crawls.db',
        useIncognito: true, 
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
    
    try {

        // Open or reuse tab
        let page = await crawler.openOrUseTab('https://asos.com');
        
        //Clear Site Data
        await crawler.clearSiteData(page, 'https://asos.com');
        await crawler.clearSiteData(page, 'https://my.asos.com');
                
      
        //Dismiss Cookie Popup
        await crawler.wait(2);
        
        // Open or reuse tab
        page = await crawler.openOrUseTab('https://asos.com');
        
        await crawler.wait(5);


        await page.waitForSelector('button[data-testid="myAccountIcon"]');
        await page.click('button[data-testid="myAccountIcon"]');

        
        await page.waitForSelector('button[data-testid="signup-link"]');
        await page.click('button[data-testid="signup-link"]');
        
        await crawler.wait(5);
           

        // Capture specific URLs
        await crawler.capture([/my.asos.com/]); 

        const user = await crawler.generateUserDetails('en_GB', (email, address) => {
            console.log(`Email received: ${email.subject}`);
        });

        // Set user data in crawl
        crawler.crawl.setUserData(user);
        await crawler.crawl.save();

        console.log(user);
        await crawler.wait(3);

        //Type email
        await page.waitForSelector('input[id="email"]', {"timeout": 30000} );
        await page.type('input[id="email"]', user.email);

        await page.click('button[type="submit"]');

        await crawler.wait(8);
        
        //Fill form
        await page.type('input[id="firstName"]', user.firstName);

        await page.type('input[id="lastName"]', user.lastName);

        await page.type('input[id="password"]', user.password);

        // Fill date of birth
        await page.waitForSelector('select');
        const selects = await page.$$('select');
        
        if (selects.length >= 3) {
            await selects[0].select("11");   // Day
            await selects[1].select("11"); // Month
            await selects[2].select(user.dateOfBirth.year);  // Year
        }

        await crawler.wait(1);

        await page.waitForSelector('button[type="submit"]');
        await page.click('button[type="submit"]');

        // Save HTML
        const html = await crawler.saveHTML(page);

        await crawler.wait(15);
        
        // Save screenshot (automatically tracked)
        await crawler.saveScreen(page);

        await page.goto('https://my.asos.com/my-account');

        
        await crawler.wait(12);


       
        
        console.log("Getting User ID")
        details = await crawler.getXHRByUrl(/my.asos.com\/api\/customer\/profile\/v2\/customers/);
        try {
            let response = details[0].responseBody;
            let data = JSON.parse(response);        
            if (typeof data.customerId !== 'undefined') {
                await crawler.setAccountId(data.customerId);
            }
        } catch (error) {
            console.error('Failed to get User ID:', error);
        }

        //Registering a new Address
        await page.goto('https://my.asos.com/my-account/addresses/add');

        await crawler.wait(4);

        await page.evaluate((number)=>{
            document.querySelector('input[name="telephoneMobile"]').value = number;
        }, user.phone)
        await page.type('input[id="telephoneMobile"]', user.phone);

        const addressSelects = await page.$$('select');
        
        if (addressSelects.length >= 1) {
            await addressSelects[0].select('GB'); 
        }
        await crawler.wait(3);

        try {
            await page.click('button[name="showManualAddressField"]');
        } catch {
            //Silent
        }

        await page.type('input[name="address1"]', user.address.street);

        await page.type('input[name="locality"]', user.address.city);

        await page.type('input[name="postalCode"]', user.address.postcode);

        await crawler.wait(1);

        await page.click('button[type="submit"]');

        await crawler.wait(5);


        console.log("Getting Address ID")
        details = await crawler.getXHRByUrl(/api\/customer\/profile\/v2\/customers\/([0-9]+)\/addresses/);
        try {
            let response = details[0].responseBody;
            let data = JSON.parse(response);        
            if (typeof data.addresses[0] !== 'undefined') {
                await crawler.setAddressId(data.addresses[0].addressId);
            }
        } catch (error) {
            console.error('Failed to get/set address ID:', error);
        }


        
        // Mark crawl as completed
        await crawler.stopCrawl();
        console.log('Crawl completed successfully!');

        

        
    } catch (error) {
        console.error('Crawl failed:', error);
        await crawler.failCrawl(error);
    }
    
    //await crawler.disconnect();
})();