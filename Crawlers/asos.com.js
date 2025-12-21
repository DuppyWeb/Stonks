const BaseCrawler = require('./base.crawler.js');

(async () => {
    const crawler = new BaseCrawler({
        crawlerName: 'asos.com',
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
        console.log("Opening Home page");
        let page = await crawler.openOrUseTab('https://asos.com');
        
        await crawler.wait(10);

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
        crawler.crawl.setUserData(user);
        
        await crawler.wait(3);

        //Type email
        console.log("Filling Email");
        await page.waitForSelector('input[id="email"]', {"timeout": 30000} );
        await page.type('input[id="email"]', user.email);

        await page.click('button[type="submit"]');

        await crawler.wait(8);
        
        //Fill form
        console.log("Filling rest of the details");
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
        console.log("Submitting Register Form");
        await page.waitForSelector('button[type="submit"]');
        await page.click('button[type="submit"]');

        // Save HTML
        const html = await crawler.saveHTML(page);

        await crawler.wait(15);
        
        // Save screenshot (automatically tracked)
        await crawler.saveScreen(page);

        console.log("Opening MyAccount page");
        await page.goto('https://my.asos.com/my-account');

        await crawler.wait(12);

        console.log("Getting User ID");
        details = await crawler.getXHRByUrl(/my.asos.com\/api\/customer\/profile\/v2\/customers/);
        try {
            let response = details[0].responseBody;
            let data = JSON.parse(response);        
            if (typeof data.customerId !== 'undefined') {

                await crawler.setAccountId(data.customerId);
                await crawler.crawl.save();
            }
        } catch (error) {
            console.error(error);
            throw new Error("Failed getting User ID")
        }

        //Registering a new Address
        console.log("Opening Add Address page");
        await page.goto('https://my.asos.com/my-account/addresses/add');

        await crawler.wait(4);
        console.log("Filling Address Form");
        await page.evaluate((number)=>{
            document.querySelector('input[name="telephoneMobile"]').value = number;
        }, user.phone)
        await page.type('input[name="telephoneMobile"]', user.phone);

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
        await crawler.wait(2);
        await page.type('input[name="address1"]', user.address.street);
        await crawler.wait(2);
        await page.type('input[name="locality"]', user.address.city);
        await crawler.wait(2);
        await page.type('input[name="postalCode"]', 'ww33ww');
        await crawler.wait(2);

        console.log("Submitting Address Form");
        await page.click('button[type="submit"]');
        await crawler.wait(5);


        await page.goto('https://my.asos.com/my-account/addresses');
        await crawler.wait(10);
        console.log("Getting Address ID fron Addresses Page")
        details = await crawler.getXHRByUrl(/api\/customer\/profile\/v2\/customers\/([0-9]+)\/addresses/);

        for (const address of details) {
            if (typeof details.responseBody !== "undefined") {
                try {
                    let response = details.responseBody;
                    let data = JSON.parse(response);
                    if (typeof data.addresses[0] !== 'undefined') {
                        console.log("Setting Address ID: " + data.addresses[0].addressId)
                        await crawler.setAddressId(data.addresses[0].addressId);
                        await crawler.crawl.save();
                    }
                } catch (error) {
                    console.error('Error processing address:', error);
                }

            }
            
        }


        //Register a Payment Method
        console.log("Opening Add Payment Method Form");
        await page.goto('https://my.asos.com/my-account/payment-methods/add')
        await crawler.wait(5);
        console.log("Submitting new Fake Card and Getting Card ID ");
        let cardID = false;
        try {
            cardID = await client.send('Runtime.evaluate', {
                awaitPromise: true,
                expression: `//CDP
                            (async() => {
                                const sleep = ms => new Promise(r => setTimeout(r, ms));
                                
                                function setNativeValue(selector, value) {
                                    let element =  document.querySelector(selector);
                                    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                                    const prototype = Object.getPrototypeOf(element);
                                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
                                    if (valueSetter && valueSetter !== prototypeValueSetter) {
                                        prototypeValueSetter.call(element, value);
                                    } else {
                                        valueSetter.call(element, value);
                                    }
                                    element.dispatchEvent(new Event('input', { bubbles: true }));
                                    element.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                                
                                document.querySelector('a[data-auto-id="AddNewCardButton"]').click();
                                await sleep(10000);
                                
                                setNativeValue('input[id="cardNumber"]', '{$user.card.number}');
                                await sleep(2000);
                                document.querySelector('select#expiryMonth').value = '${user.card.expiryMonth}';
                                document.querySelector('select#expiryMonth').dispatchEvent(new Event('change', { bubbles: true }));
                                await sleep(2000);
                                document.querySelector('select#expiryYear').value = '${user.card.expiryYearFull}';
                                document.querySelector('select#expiryYear').dispatchEvent(new Event('change', { bubbles: true }));
                                await sleep(2000);
                                setNativeValue('input[id="cardName"]', '{$user.firstName} {$user.lastName}');
                                await sleep(2000);
                                document.querySelector('button[type="submit"]').click();
                                await sleep(8000);
                                document.querySelector('div[data-auto-id="PaymentMethod"]').querySelector('button').click();
                                await sleep(3000);
                                document.querySelector('button[data-auto-id="DeletePaymentMethodModalAccept"]').click();
                                
                                
                            })()
                          `
            });
        } catch (e) {
            console.log(e);
        }


        console.log("Searching for CardID in the database")
        details = await crawler.getXHRByUrl(/\/api\/customer\/paymentdetails\/v2\/customers\/([0-9]+)\/paymentdetails\/cards/);


        for (const card of details) {
            let response = details.responseBody;
            let data = JSON.parse(response);
            if (typeof data.cardNumber !== 'undefined' && typeof data.id !== 'undefined' ) {
                console.log("Found Card ID in DB, setting it to: " + data.id)
                await crawler.setAddressId(data.id);
                await crawler.crawl.save();
            }
        }

        
        // Mark crawl as completed
        await crawler.stopCrawl();
        await crawler.closeTab()
        await crawler.disconnect()

        process.exit(0);

        

        
    } catch (error) {
        console.error('Crawl failed:', error);
        await crawler.failCrawl(error);
        await crawler.closeTab();
        await crawler.disconnect();
    }
    
    //await crawler.disconnect();
})();