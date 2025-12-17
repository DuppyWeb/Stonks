<?php

require_once 'base.class.php';

/**
 * Revolve.com Login Class
 * 
 * Handles visiting the website, collecting cookies, and performing login
 * with proper cookie management like a real browser.
 * 
 * @author Stonks
 * @version 1.0
 */
class Revolve extends BaseCurl {
    
    /**
     * Start URL to visit first (to collect cookies)
     * @var string
     */
    protected $startUrl = 'https://www.revolve.com/';
    
    /**
     * Login endpoint URL
     * @var string
     */
    protected $loginUrl = 'https://www.revolve.com/r/ajax/SignIn.jsp';
    
    /**
     * Referer URL for login request
     * @var string
     */
    protected $refererUrl = 'https://www.revolve.com/r/SignIn.jsp?page=https%3A%2F%2Fwww.revolve.com%2Fr%2FMyBillingSettings.jsp';
    
    /**
     * Cookie file path (auto-generated if not set)
     * @var string
     */
    protected $cookieFile;

    /**
     * Whether initial visit has been made
     * @var bool
     */
    protected $initialized = false;
    
    /**
     * Constructor
     * 
     * @param array $options Configuration options
     */
    public function __construct($options = []) {
        // Set default cookie file if not provided
        if (!isset($options['cookie_jar'])) {
            $this->cookieFile = sys_get_temp_dir() . '/revolve_cookies_' . uniqid() . '.txt';
            $options['cookie_jar'] = $this->cookieFile;
        } else {
            $this->cookieFile = $options['cookie_jar'];
        }
        
        // Initialize parent
        parent::__construct($options);
        
        // Override start URL if provided
        if (isset($options['start_url'])) {
            $this->startUrl = $options['start_url'];
        }
        
        // Override login URL if provided
        if (isset($options['login_url'])) {
            $this->loginUrl = $options['login_url'];
        }
        
        // Override referer URL if provided
        if (isset($options['referer_url'])) {
            $this->refererUrl = $options['referer_url'];
        }
    }
    
    /**
     * Initialize session by visiting start URL to collect cookies
     * 
     * @return array Response from initial visit
     */
    public function initialize() {
        if ($this->initialized) {
            if ($this->debug) {
                error_log("Revolve: Already initialized, skipping");
            }
            return ['success' => true, 'message' => 'Already initialized'];
        }
        
        if ($this->debug) {
            error_log("Revolve: Initializing by visiting {$this->startUrl}");
        }
        $this->setCookieJar($this->cookieFile);

        var_dump($this->cookieFile);

        $response = $this->get($this->startUrl);
        
        if ($response['success']) {
            $this->initialized = true;
            
            if ($this->debug) {
                error_log("Revolve: Initialization successful, cookies saved to {$this->cookieFile}");
                if (file_exists($this->cookieFile)) {
                    error_log("Revolve: Cookie file size: " . filesize($this->cookieFile) . " bytes");
                }
            }
        } else {
            if ($this->debug) {
                error_log("Revolve: Initialization failed - " . $response['error']);
            }
        }
        
        return $response;
    }

    /**
     * Perform login request
     * 
     * @param string $email Email address
     * @param string $password Password
     * @param array $additionalData Additional form data
     * @return array Response from login request
     */
    public function login($email, $password, $additionalData = []) {
        // Ensure we've visited the site first to collect cookies
        if (!$this->initialized) {
            $initResponse = $this->initialize();
            if (!$initResponse['success']) {
                return [
                    'success' => false,
                    'error' => 'Failed to initialize session: ' . $initResponse['error'],
                    'init_response' => $initResponse
                ];
            }
            
            // Small delay to simulate human behavior
            usleep(500000); // 500ms
        }
        
        if ($this->debug) {
            error_log("Revolve: Attempting login for {$email}");
        }
        
        // Build POST data
        $postData = array_merge([
            'd' => 'Womens',
            'favcode' => '',
            'favbrand' => '',
            'g_recaptcha_response' => '',
            'karmir_luys' => 'true',
            'rememberMe' => 'true',
            'isCheckout' => 'false',
            'saveForLater' => 'false',
            'isSecurityCheck' => 'false',
            'checkedPage' => 'false',
            'isBuyNow' => 'false',
            'sectionURL' => 'Direct Hit',
            'isEarlyAccessLogin' => 'false',
            'email' => $email,
            'pw' => $password
        ], $additionalData);
        
        // Build headers matching the curl request
        $headers = [
            'Accept: */*',
            'Accept-Language: en-US,en;q=0.9,ro;q=0.8',
            'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
            'DNT: 1',
            'Origin: https://www.revolve.com',
            'Priority: u=1, i',
            'Referer: ' . $this->refererUrl,
            'X-Requested-With: XMLHttpRequest'
        ];
        
        // Make the login request (cookies will be sent automatically from cookie jar)
        $response = $this->post($this->loginUrl, $postData, $headers);
        
        if ($this->debug) {
            error_log("Revolve: Login response - HTTP {$response['http_code']}");
            error_log("Revolve: Response body: " . substr($response['body'], 0, 200));
        }
        
        // Parse response
        $response['login_success'] = $this->isLoginSuccessful($response);
        
        return $response;
    }
    
    /**
     * Check if login was successful based on response
     * 
     * @param array $response Response array
     * @return bool True if login successful
     */
    protected function isLoginSuccessful($response) {

        if (preg_match('/\{"success" : false, "code" : 2/', $response['body'])) {
            return false;
        } 

        if (trim)

        if (!$response['success']) {
            return false;
        }
        
        // Empty response body indicates success
        if (trim($response['body']) === '') {
            return true;
        }
        
        // Check for failure indicators
        if (strpos($response['body'], '{"success" : false') !== false) {
            return false;
        }
        
        // Check for rate limiting
        if (strpos($response['body'], 'recaptcha') !== false || 
            strpos($response['body'], 'too many') !== false) {
            return false;
        }
        
        // If we got here with content, it's likely an error
        return false;
    }
    
    /**
     * Get cookies from cookie jar file
     * 
     * @return array Array of cookies
     */
    public function getCookies() {
        if (!file_exists($this->cookieFile)) {
            return [];
        }
        
        $cookies = [];
        $lines = file($this->cookieFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments and empty lines
            if (empty($line) || $line[0] === '#') {
                continue;
            }
            
            $parts = explode("\t", $line);
            if (count($parts) >= 7) {
                $cookies[] = [
                    'domain' => $parts[0],
                    'flag' => $parts[1],
                    'path' => $parts[2],
                    'secure' => $parts[3],
                    'expiration' => $parts[4],
                    'name' => $parts[5],
                    'value' => $parts[6]
                ];
            }
        }
        
        return $cookies;
    }
    
    /**
     * Get cookie value by name
     * 
     * @param string $name Cookie name
     * @return string|null Cookie value or null if not found
     */
    public function getCookie($name) {
        $cookies = $this->getCookies();
        
        foreach ($cookies as $cookie) {
            if ($cookie['name'] === $name) {
                return $cookie['value'];
            }
        }
        
        return null;
    }
    
    /**
     * Clear cookies
     * 
     * @return bool Success
     */
    public function clearCookies() {
        if (file_exists($this->cookieFile)) {
            $result = unlink($this->cookieFile);
            $this->initialized = false;
            return $result;
        }
        return true;
    }
    
    /**
     * Get cookie file path
     * 
     * @return string
     */
    public function getCookieFile() {
        return $this->cookieFile;
    }
    
    /**
     * Set start URL
     * 
     * @param string $url Start URL
     * @return self
     */
    public function setStartUrl($url) {
        $this->startUrl = $url;
        return $this;
    }
    
    /**
     * Get start URL
     * 
     * @return string
     */
    public function getStartUrl() {
        return $this->startUrl;
    }
    
    /**
     * Check if session is initialized
     * 
     * @return bool
     */
    public function isInitialized() {
        return $this->initialized;
    }
    
    /**
     * Make a request with current session cookies
     * Useful for making authenticated requests after login
     * 
     * @param string $url URL to request
     * @param string $method HTTP method (GET or POST)
     * @param mixed $data POST data (if method is POST)
     * @param array $headers Additional headers
     * @return array Response
     */
    public function request($url, $method = 'GET', $data = null, $headers = []) {
        // Ensure initialized
        if (!$this->initialized) {
            $this->initialize();
        }
        
        // Add common headers
        $defaultHeaders = [
            'Accept: */*',
            'Accept-Language: en-US,en;q=0.9,ro;q=0.8',
            'Referer: https://www.revolve.com/'
        ];
        
        $allHeaders = array_merge($defaultHeaders, $headers);
        
        if (strtoupper($method) === 'POST') {
            return $this->post($url, $data, $allHeaders);
        } else {
            return $this->get($url, $allHeaders);
        }
    }
    
    /**
     * Destructor - cleanup cookie file if temporary
     * 
     * @return void
     */
    public function __destruct() {
        return;
        // Only delete if it's a temp file we created
        if ($this->cookieFile && 
            strpos($this->cookieFile, sys_get_temp_dir()) === 0 && 
            strpos($this->cookieFile, 'revolve_cookies_') !== false) {
            
            if (file_exists($this->cookieFile)) {
                @unlink($this->cookieFile);
            }
        }
    }
}
