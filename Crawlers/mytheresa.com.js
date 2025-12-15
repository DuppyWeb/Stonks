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

    try {

        let page = await crawler.openOrUseTab('https://www.mytheresa.com/');

        await crawler.wait(5);

        const user = await crawler.generateUserDetails('ro', (email, address) => {
            console.log(`Email received: ${email.subject}`);
        });
        crawler.crawl.setUserData(user);

        const client = await page.target().createCDPSession();
        await client.send('Runtime.enable');

        //Dismiss Cookie
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
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                         document.querySelector('div[class="useractions"]').querySelector('a[aria-label="My Account"]').click();
                        })()
                      `
        });

        //Open My Account
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                         document.querySelector('a[href="/euro/en/account/registration"]').querySelector('div').click();
                        })()
                      `
        });

        // Fill the form
        await client.send('Runtime.evaluate', {
            expression: `//CDP
                        (() => {
                            
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

        const { cookies } = await client.send('Network.getAllCookies');
        const mtToken = cookies.find(c => c.name === 'mt_token')?.value;

        if (mtToken) {
            const [,p] = mtToken.split('.');
            let parts = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
            if ( parts.customerId ) {
                await crawler.setAccountId(parts.customerId)
                await crawler.stopCrawl();
                console.log('Crawl completed successfully!');
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