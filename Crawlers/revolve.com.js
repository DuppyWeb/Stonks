const BaseCrawler = require('./base.crawler.js');

(async () => {
    const crawler = new BaseCrawler({
        crawlerName: 'revolve.com',
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
        let page = await crawler.openOrUseTab('https://www.revolve.com/');

        //Clear Site Data
        await crawler.clearSiteData(page, 'https://www.revolve.com/');

        // Open or reuse tab
        await crawler.openOrUseTab('https://www.revolve.com/');


        //Dismiss Cookie Popup
        await crawler.wait(2);

        // Open or reuse tab
        page = await crawler.openOrUseTab('https://www.revolve.com/r/SignIn.jsp?page=%2Fr%2FHomepage.jsp');

        await crawler.wait(5);

        const user = await crawler.generateUserDetails('ro', (email, address) => {
            console.log(`Email received: ${email.subject}`);
        });
        crawler.crawl.setUserData(user);


        // Capture specific URLs
        await crawler.capture([/www.revolve.com\/r\/ajax\//]);

        /*
        await page.mouse.move(1651, 870, { steps: 25 }); // 25 small steps = smooth
        await page.mouse.down();
        await page.mouse.up();
         */

        await page.waitForSelector('input[id="emailNew"]');

        console.log(user);

        await crawler.wait(3);

        await page.type('input[id="emailNew"]', user.email);

        await crawler.wait(2);

        await page.type('input[id="passwordNew"]', user.password);

        await crawler.wait(2);

        await page.type('input[name="VerifyPassword"]', user.password);

        await crawler.wait(2);

        await page.click('input[id="createButton"]');

        await crawler.wait(5);

        await crawler.saveScreen(page);

        await page.goto('https://www.revolve.com/');

        await crawler.wait(5);

        const fullHTML = await crawler.getFullHTML(page);
        //console.log(fullHTML);
        let mat = fullHTML.match(/'revolve_user_id' : '([0-9]+)'}/);
        let userId = 'NA';
        if (mat) {
            userId  = mat[1];
        } else {
            await crawler.failCrawl("UserId not found")
            await crawler.disconnect();
            process.exit(5);
        }

        await crawler.setAccountId(userId);



        //Register New address
        await page.goto('https://www.revolve.com/r/MyShippingSettings.jsp');

        await crawler.wait(4);
        await page.click('button[id="add_new_address"]');
        await crawler.wait(4);
        await page.select('select[id="shipping_country"]', 'Romania');
        await crawler.wait(2);
        await page.type('input[id="shipping_name_eu"]', 'Bencsik Oszkar');
        await crawler.wait(2);
        await page.type('input[id="shipping_street_eu"]', 'Drumul Bisericii 36-68');
        await crawler.wait(2);
        await page.type('input[id="shipping_city_eu"]', 'Voluntari');
        await crawler.wait(2);
        await page.type('input[id="shipping_state_eu"]', 'Ilfov');
        await crawler.wait(2);
        await page.type('input[id="shipping_zip_code_eu"]', '077191');
        await crawler.wait(2);
        await page.type('input[id="shipping_telephone_eu"]', '+40756531296');
        await crawler.wait(2);
        await crawler.saveScreen(page);

        await page.click('button[id="save_shipping"]');

        await crawler.wait(4);

        await page.goto('https://www.revolve.com/r/MyShippingSettings.jsp');

        await crawler.wait(4);

        await crawler.saveScreen(page);


        const addressId = await page.evaluate(() => {
            return document.querySelector("button[class*='edit_a']")
                ?.getAttribute("data-address-id");
        });

        // click remove button
        await page.click("button[class*='remove_a']");

        // wait for confirm input to appear
        await page.waitForSelector('input#confirm_remove');

        // click confirm
        await page.click('input#confirm_remove');

        console.log(addressId);
        await crawler.setAddressId(addressId);




        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Navigation attempt ${attempt}/${maxRetries} to Revolve...`);
                await page.goto('https://www.revolve.com/r/MyBillingSettings.jsp', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                break;
            } catch (error) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === maxRetries) {
                    throw new Error(`Failed to load Revolve after ${maxRetries} attempts: ${error.message}`);
                }
                await new Promise(r => setTimeout(r, 3000));
            }
        }


        //Register Card
        await crawler.wait(10);

        const client = await page.target().createCDPSession();
        await client.send('Runtime.enable');

        //Register Card
        try {
            let cardID = await client.send('Runtime.evaluate', {
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
                                
                                document.querySelector('button[id="add_new_billing"]').click();
                                
                                await sleep(3000);
                                setNativeValue('input[id="card_num"]', '${user.card.number}');
                                setNativeValue('input[id="security_code"]', '${user.card.cvv}');
                                document.querySelector('select#expire_month').value = '${user.card.expiryMonth}';
                                document.querySelector('select#expire_month').dispatchEvent(new Event('change', { bubbles: true }));
                                await sleep(2000);
                                document.querySelector('select#expire_year').value = '${user.card.expiryYear}';
                                document.querySelector('select#expire_year').dispatchEvent(new Event('change', { bubbles: true }));
                                await sleep(1000);
                                document.querySelector('select[id="billingRowId_1billing_country"]').value = 'Romania';
                                document.querySelector('select[id="billingRowId_1billing_country"]').dispatchEvent(new Event('change', { bubbles: true })); 
                                await sleep(1000);
                                setNativeValue('input[id="billingRowId_1billing_name_eu"]', 'Bencsik Oszkar');
                                await sleep(1000);
                                setNativeValue('input[id="billingRowId_1billing_street_eu"]', 'Drumul Bisericii 36 - 38');
                                await sleep(1000);
                                setNativeValue('input[id="billingRowId_1billing_city_eu"]', 'Voluntari');
                                await sleep(1000);
                                setNativeValue('input[id="billingRowId_1billing_zip_code_eu"]', '077191');
                                await sleep(1000);
                                setNativeValue('input[id="billingRowId_1billing_telephone_eu"]', '+40756531296');
                                await sleep(5000);
                                document.querySelector('div[id="billingRowId_1"]').querySelector('input[type="submit"]').click()
                                await sleep(10000);
                                
                                return document.querySelector('input[type="hidden"][class="billingID"]').value;
                                
                                
                            })()
                          `
            });
        } catch (e) {
            console.log(e);
        }


        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Navigation attempt ${attempt}/${maxRetries} to Revolve...`);
                await page.goto('https://www.revolve.com/r/MyBillingSettings.jsp', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                break;
            } catch (error) {
                console.warn(`Attempt ${attempt} failed: ${error.message}`);
                if (attempt === maxRetries) {
                    throw new Error(`Failed to load Revolve after ${maxRetries} attempts: ${error.message}`);
                }
                await new Promise(r => setTimeout(r, 3000));
            }
        }
        let cardID = false;
        try {
            cardID = await client.send('Runtime.evaluate', {
                awaitPromise: true,
                expression: `//CDP
                            (async() => {
                                const sleep = ms => new Promise(r => setTimeout(r, ms));
                                let cardID = document.querySelector('input[type="hidden"][class="billingID"]').value;
                                //Delete it just for sakes
                                removeBilling('row_0')
                                await sleep(5000);
                                try {
                                    document.querySelector('input[id="confirm_remove_billing"]').click();
                                } catch (e) {
                                    //Ignore
                                }
                                
                                return cardID;
                            })()
                          `
            });
        } catch (e) {
            console.log(e);
        }
        
        console.log("Got Card ID", cardID);
        if (cardID !== false ) {
            await crawler.crawl.setCardId(cardID.result.value)
            await crawler.crawl.save()
        }


        await page.click('button[id="remove-cta-row_0"]');
        await crawler.wait(4);
        await page.click('input[id="confirm_remove_billing"]')
        await crawler.wait(4);
        await crawler.saveScreen(page);

        await crawler.stopCrawl();
        await crawler.disconnect();

        process.exit(1);


        await crawler.saveScreen(page);

        await crawler.stopCrawl();
        console.log('Crawl completed successfully!');

        await crawler.closeTab()

        process.exit(0);

    } catch (error) {
        console.error('Crawl failed:', error);
        await crawler.failCrawl(error);
        await crawler.closeTab();
        await crawler.disconnect();
        process.exit(2);
    }


})();