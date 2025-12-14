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
        await crawler.capture([/www.revolve.com\/r\/ajax\//], 'text/html');

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

        await page.click('button[id="add_new_billing"]');
        await crawler.wait(4);

        //Card Data
        await page.type('input[id="card_num"]', '5468 0507 1272 4730');

        await page.select('select[id="expire_month"]', '02');
        await page.select('select[id="expire_year"]', '29');
        await page.type('input[id="security_code"]', '881');



        await page.select('select[id="billingRowId_1billing_country"]', 'Romania');
        await crawler.wait(5);
        await page.evaluate(() => {
            const fill = (sel, val) => {
                const el = document.querySelector(sel);
                el.focus();
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            };

            fill('input[name="billingName"]', 'Bencsik Oszkar');
            fill('input[name="billingStreet"]', 'Drumul Bisericii 36 - 38');
            fill('input[name="billingZipCode"]', '077191');
            fill('input[name="billingTelephone"]', '+40756531296');
        });
        await crawler.wait(12);

        await page.click('input[type="submit"]');
        await crawler.wait(60);

        let cardID = await page.evaluate(()=>{
            return document.querySelector('input[type="hidden"][class="billingID"]').value;
        })

        await  crawler.crawl.setCardId(cardID)
        await crawler.crawl.save()

        await page.click('button[id="remove-cta-row_0"]');
        await crawler.wait(4);
        await page.click('input[id="confirm_remove_billing"]')
        await crawler.wait(4);
        await crawler.saveScreen(page);

        await crawler.stopCrawl();
        await crawler.disconnect();

        process.exit(1);


        //Create an Order and Cancel it


        await page.goto('https://www.aboutyou.ro/p/adidas-originals/rucsac-adicolor-13836634');

        await crawler.wait(5);

        await page.click('button[data-testid="addToBasketButton"]')

        await crawler.wait(10);

        await crawler.saveScreen(page);

        await page.goto('https://www.aboutyou.ro/cos-cumparaturi');

        await crawler.saveScreen(page);

        await crawler.wait(5);

        await page.click('button[data-testid="proceedToCheckoutButton"]');

        await crawler.wait(5);

        await crawler.saveScreen(page);

        // Helper function to type into shadow DOM inputs using Puppeteer's page.type()
        async function typeIntoShadowDOM(page, inputSelector, text) {
            await page.evaluate((inputSelector, text) => {
                function setNativeValue(element, value) {
                    if (!element) {
                        console.error('Element not found for selector:', inputSelector);
                        return;
                    }

                    // 1. Get the native value setter from the prototype
                    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    const prototype = Object.getPrototypeOf(element);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

                    // 2. Call the native setter (this bypasses React's override)
                    if (valueSetter && valueSetter !== prototypeValueSetter) {
                        prototypeValueSetter.call(element, value);
                    } else {
                        valueSetter.call(element, value);
                    }

                    // 3. Dispatch the input event so the framework wakes up and sees the change
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const hostElement = document.querySelector('scayle-checkout');
                if (!hostElement || !hostElement.shadowRoot) {
                    console.error('Shadow host not found or no shadow root');
                    return;
                }

                const shadowInput = hostElement.shadowRoot.querySelector(inputSelector);
                setNativeValue(shadowInput, text);
            }, inputSelector, text);
        }

        // Fill in shipping address fields
        await typeIntoShadowDOM(page, 'input[id="shippingAddress.street"]', 'Drumul Bisericii 36-38');
        await crawler.wait(2);

        await page.evaluate(()=>{
            const hostElement = document.querySelector('scayle-checkout');
            hostElement.shadowRoot.querySelector('ul[role="listbox"] li').click();
        })

        await crawler.saveScreen(page);

        await typeIntoShadowDOM(page, 'input[id="shippingAddress.houseNumber"]', '12');
        await crawler.wait(2);
        await typeIntoShadowDOM(page, 'input[id="shippingAddress.zipCode"]', '077191');
        await crawler.wait(2);
        await typeIntoShadowDOM(page, 'input[id="shippingAddress.city"]', 'Voluntari');
        await crawler.wait(2);
        await typeIntoShadowDOM(page, 'input[id="shippingAddress.state"]', 'Ilfov');
        await crawler.wait(2);
        await typeIntoShadowDOM(page, 'input[id="shippingAddress.birthDate"]', '03.03.1988');
        await crawler.wait(2);

        await crawler.saveScreen(page);

        // Click next button
        await page.evaluate(() => {
            let host = document.querySelector('scayle-checkout');
            let shadowRoot = host?.shadowRoot;
            shadowRoot?.querySelector('button[data-test-id="navigation-next-step"]').click();
        });

        await crawler.wait(10);

        // Click payment option
        await page.evaluate(() => {
            const host = document.querySelector('scayle-checkout');
            const shadowRoot = host?.shadowRoot;
            const option = shadowRoot?.querySelector('div[id="option-label-ro_cod"]');
            option?.click();
        });

        // Type phone number using Puppeteer's type method
        const phoneNumber = '0756' + (100000 + Math.floor(Math.random() * 900000));
        await typeIntoShadowDOM(page, 'input[id="logisticsPhoneNumber"]', phoneNumber);

        await crawler.wait(5);

        await crawler.saveScreen(page);

        // Click final next button
        await page.evaluate(() => {
            const host = document.querySelector('scayle-checkout');
            const shadowRoot = host?.shadowRoot;
            const nextBtn2 = shadowRoot?.querySelector('button[data-test-id="navigation-next-step"]');
            nextBtn2?.click();
        });

        await crawler.saveScreen(page);

        await crawler.wait(5);

        await crawler.saveScreen(page);

        await crawler.wait(5);

        await page.goto('https://www.aboutyou.ro/a/orders');

        await crawler.wait(5);

        await crawler.saveScreen(page);

        let orderId  = await page.evaluate(()=>{
            return  document.querySelector('div[data-testid="OrderId"]').textContent;
        })

        await crawler.setOrderId(orderId);

        await page.click('div[data-testid="OrderId"]');

        await crawler.wait(3);

        await page.click('button[aria-label="Retrage comanda"]');

        await crawler.wait(3);

        await page.click('button[aria-label="Retrage livrarea"]');

        await crawler.wait(5);


        await crawler.saveScreen(page);

        await crawler.stopCrawl();
        console.log('Crawl completed successfully!');

        await crawler.closeTab()

        process.exit(0);

    } catch (error) {
        console.error('Crawl failed:', error);
        await crawler.failCrawl(error);
    }


})();