const BaseCrawler = require('./base.crawler.js');

(async () => {
    const crawler = new BaseCrawler({
        crawlerName: 'mytheresa.com',
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

    await crawler.capture([/\/api/]);


    try {
        console.log("Opening Home page");
        let page = await crawler.openOrUseTab('https://www.mytheresa.com/');

        await crawler.wait(5);

        const user = await crawler.generateUserDetails('ro', (email, address) => {
            console.log(`Email received: ${email.subject}`);
        });
        crawler.crawl.setUserData(user);

        const client = await page.target().createCDPSession();
        await client.send('Runtime.enable');

        //Dismiss Cookie
        console.log("Dismissing Cookie Prompt");
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                            const hostElement = document.querySelector('aside');
                            window.ROOT = hostElement.shadowRoot;
                            ROOT.querySelector("button#accept").click();
                        })()
                      `
        });

        await crawler.wait(5);

        //Open My Account
        console.log("Opening My Account");
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                         document.querySelector('div[class="useractions"]').querySelector('a[aria-label="My Account"]').click();
                        })()
                      `
        });

        console.log("Opening Registration Section");
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                         document.querySelector('a[href="/euro/en/account/registration"]').querySelector('div').click();
                        })()
                      `
        });

        // Fill the form
        console.log("Filling the Registration Form");
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                          
                          const sleep = ms => new Promise(r => setTimeout(r, ms));
                            
                          function setNativeValue(selector, value) {
                            let element =  document.querySelector(selector);
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
                        
                        setNativeValue('input[name="email"]', '${user.email}');
                        setNativeValue('input[name="password"]', '${user.password}');
                        document.querySelector('div[class="dropdown__select"]').click()
                        document.querySelector('div[class="dropdown__item"]').click()
                        setNativeValue('input[name="firstName"]', '${user.firstName}');
                        setNativeValue('input[name="lastName"]', '${user.lastName}');
                        document.querySelector('div[class="signupform__submit"]').querySelector('div[class="button"]').click();
                            
                        })()
                      `
        });

        await crawler.wait(15);

        //Read and decode UserID
        console.log("Getting MT Token Cookie");
        const { cookies } = await client.send('Network.getAllCookies');
        const mtToken = cookies.find(c => c.name === 'mt_token')?.value;

        if (mtToken) {
            const [,p] = mtToken.split('.');
            let parts = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
            if ( parts.customerId ) {
                console.log("Got User ID From the token:", parts.customerId );
                await crawler.setAccountId(parts.customerId)

            }

        }

        //Register new Address
        console.log("Registering new Address");
        await page.goto('https://www.mytheresa.com/euro/en/account/addresses');
        
        await crawler.wait(12);


        await client.send('Runtime.evaluate', {
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
                            document.querySelector('div[class="dropdown__select__content__text"]').click();
                            await sleep(1000);
                            document.querySelector('div[class="dropdown__item"]').click();
                            await sleep(1000);
                            setNativeValue('input[id="firstName"]', 'Bencsik');                        
                            setNativeValue('input[id="lastName"]', 'Oszkar');
                            await sleep(1000);
                            document.querySelector('div[class*="dropdown__countryCode"]').querySelector('div[class="dropdown__select__content"]').click()
                            await sleep(1000);
                            setNativeValue('input[class="dropdown__search__input"]', 'Romania');
                            await sleep(1000);
                            const item = Array.from(document.querySelectorAll('div.dropdown__item'))
                                    .find(el => el.textContent.trim() === 'Romania');
                            item.click();
                            
                            setNativeValue('input[id="postcode"]', '077191');
                            await sleep(1000);
                            setNativeValue('input[id="city"]', 'Voluntari');
                            await sleep(1000);
                            setNativeValue('input[id="phoneNumber"]', '+40756531296');
                            await sleep(1000);
                            setNativeValue('input[id="street"]', 'Drumul Bisericii 36-38');
                            await sleep(1000);
                            document.querySelector('div[class="addressbook__addressform__submit"]').querySelector('div[class="button"]').click();
                            
                            await sleep(3000);
                            
                            document.querySelector('div[class="box__link"]').click();
                            await sleep(3000);
                            Array.from(document.querySelectorAll('div[class="button__text"]')).find(el => el.textContent.trim() === 'DELETE ADDRESS').click()
                            await sleep(3000);      
                        })()
                        
                        
                      `
        });

        await crawler.wait(5);

        console.log("Looking for Address ID in the Database");


        let details = await crawler.getXHRByUrl(/\/api/);

        for (const request of details) {
            let response = request.responseBody;
            let data = JSON.parse(response);
            if (typeof data.data !== 'undefined' && typeof data.data.xAddAddressToUser !== 'undefined' ) {
                console.log("Found Address ID in DB, setting it to: " + data.data.xAddAddressToUser.id)
                await crawler.setAddressId(data.data.xAddAddressToUser.id);
                await crawler.crawl.save();

                await crawler.stopCrawl();
                await crawler.closeTab();
                await crawler.disconnect();
                process.exit(0);

            }
        }




    } catch (error) {
        console.error('Crawl failed:', error);
        await crawler.failCrawl(error);
        //await crawler.closeTab()
        //await crawler.disconnect();
        process.exit(2);
    }


})();