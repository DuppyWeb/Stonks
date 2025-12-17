const BaseCrawler = require('./base.crawler.js');

(async () => {
    const crawler = new BaseCrawler({
        crawlerName: 'aboutyou.ro.js',
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
        let page = await crawler.openOrUseTab('https://www.aboutyou.ro/');
       
        //Clear Site Data
        await crawler.clearSiteData(page, 'https://www.aboutyou.ro/');

        // Open or reuse tab
        page = await crawler.openOrUseTab('https://wwww.aboutyou.ro/');

        
        //Dismiss Cookie Popup
        await crawler.wait(4);

        console.log("Dismissing GEO Prompt if present");
        await page.evaluate(()=>{
            const allSpans = Array.from(document.querySelectorAll('span'));
            const targetSpan = allSpans.find(span =>
                span.textContent.includes("Continuă cumpărăturile în aboutyou.ro")
            );
            if (targetSpan) {
                targetSpan.click();
                console.log("Success: Element clicked.", targetSpan);
            } else {
                console.warn("Element not found.");
            }
        })

        
        // Open or reuse tab
        console.log("Dismissing GEO Prompt if present");
        page = await crawler.openOrUseTab('https://www.aboutyou.ro/magazinul-tau?loginFlow=register');
        
        await crawler.wait(10);
        console.log("Dismissing Cookie Prompt if present");
        await page.mouse.move(1630, 1035, { steps: 25 }); // 25 small steps = smooth
        await page.mouse.down();
        await page.mouse.up();
        await crawler.wait(2);
        await  crawler.saveScreen(page);

        console.log("Waiting for First Name");
        await page.waitForSelector('input[data-testid="FirstnameField"]');

        // Capture specific URLs
        await crawler.capture([/www.aboutyou.ro/]); 

        const user = await crawler.generateUserDetails('ro', (email, address) => {
            console.log(`Email received: ${email.subject}`);
        });

        // Set user data in crawl
        crawler.crawl.setUserData(user);
        await crawler.crawl.save();

        console.log("Filling in Reg From");
        await page.type('input[data-testid="FirstnameField"]', user.firstName);

        await page.type('input[data-testid="LastNameField"]', user.lastName);

        await page.type('input[data-testid="EmailField"]', user.email);

        await page.type('input[data-testid="PasswordField"]', user.password);
        
        await page.click('input[data-testid="RadioButtonMale"]');


        await crawler.saveScreen(page);
        console.log("Turnstile Checking");
        // Handle Cloudflare Turnstile checkbox if present
        await page.mouse.move(842, 772, { steps: 25 }); // 25 small steps = smooth
        await page.mouse.down();
        await page.mouse.up();

        await crawler.wait(5 );

        console.log("Submitting Reg Form");
        await page.click('button[data-testid="RegisterSubmitButton"]');

        await crawler.wait(10 );

        console.log("Dismissing GEO Prompt if present");
        await page.evaluate(()=>{
            const allSpans = Array.from(document.querySelectorAll('span'));
            const targetSpan = allSpans.find(span =>
                span.textContent.includes("Continuă cumpărăturile în aboutyou.ro")
            );
            if (targetSpan) {
                targetSpan.click();
                console.log("Success: Element clicked.", targetSpan);
            } else {
                console.warn("Element not found.");
            }
        })

        console.log("Opening Profile Page");
        await page.goto('https://www.aboutyou.ro/a/profile');

        await crawler.wait(10);
        
        console.log("Getting User ID");

        await crawler.saveScreen(page);

        let userID = await page.evaluate(()=>{
            return parseInt(document.querySelector('input[data-testid="customerId"]').value)
        })

        await crawler.setAccountId(userID);        

        //Create an Order and Cancel it 

        console.log("Opening Product Page");
        await page.goto('https://www.aboutyou.ro/p/adidas-originals/rucsac-adicolor-13836634');


        await crawler.wait(5);

        console.log("Dismissing GEO Prompt if present");
        await page.evaluate(()=>{
            const allSpans = Array.from(document.querySelectorAll('span'));
            const targetSpan = allSpans.find(span =>
                span.textContent.includes("Continuă cumpărăturile în aboutyou.ro")
            );
            if (targetSpan) {
                targetSpan.click();
                console.log("Success: Element clicked.", targetSpan);
            } else {
                console.warn("Element not found.");
            }
        })




        await crawler.wait(5);
        console.log("Add to Cart");
        await page.click('button[data-testid="addToBasketButton"]')
        
        await crawler.wait(10);

        await crawler.saveScreen(page);
        console.log("Opening Cart");
        await page.goto('https://www.aboutyou.ro/cos-cumparaturi');

        await crawler.saveScreen(page);

        await crawler.wait(5);
        console.log("Going to Checkout");
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

        console.log("Adding Shipping Address");
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
        console.log("Advancing to next Shipping Address");
        await page.evaluate(() => {
            let host = document.querySelector('scayle-checkout');
            let shadowRoot = host?.shadowRoot;
            shadowRoot?.querySelector('button[data-test-id="navigation-next-step"]').click();
        });
        
        await crawler.wait(10);   


        // Click payment option
        console.log("Selecting Payment Cash On Delivery");
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
        console.log("Placing Order");
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

        console.log("Visiting Orders Page");
        await page.goto('https://www.aboutyou.ro/a/orders');

        await crawler.wait(5);

        await crawler.saveScreen(page);
        console.log("Getting Order ID");
        let orderId  = await page.evaluate(()=>{
            return  document.querySelector('div[data-testid="OrderId"]').textContent;
        })
        console.log("Got Order ID", orderId);
        await crawler.setOrderId(orderId);    

        await page.click('div[data-testid="OrderId"]');

        await crawler.wait(3);
        console.log("Canceling Order");
        await page.click('button[aria-label="Retrage comanda"]');

        await crawler.wait(3);

        await page.click('button[aria-label="Retrage livrarea"]');
        
        await crawler.wait(5);


        await crawler.saveScreen(page);

        await crawler.stopCrawl();

        await crawler.disconnect();

        process.exit(0);
        
    } catch (error) {
        console.error('Crawl failed:', error);
        await crawler.failCrawl(error);
        await crawler.disconnect();
        process.exit(2);
    }
    

})();