<?php

/**
 * Base cURL Class with Interface Binding Support
 * 
 * Features:
 * - Network interface binding for public requests
 * - Local GET method (no interface binding)
 * - Public GET/POST methods (with interface binding)
 * - Randomized User-Agent per request
 * - Cookie management
 * - Proxy support
 * - SSL verification options
 * - Response header parsing
 * 
 * @author Stonks
 * @version 1.0
 */
class BaseCurl {
    
    /**
     * Available network interfaces for binding
     * @var array
     */
    protected $interfaces = [];
    
    /**
     * Current interface to use for requests
     * @var string|null
     */
    protected $currentInterface = null;
    
    /**
     * Cookie jar file path
     * @var string|null
     */
    protected $cookieJar = null;
    
    /**
     * Default timeout in seconds
     * @var int
     */
    protected $timeout = 30;
    
    /**
     * SSL verification enabled
     * @var bool
     */
    protected $sslVerify = true;
    
    /**
     * Follow redirects
     * @var bool
     */
    protected $followRedirects = true;
    
    /**
     * Max redirects to follow
     * @var int
     */
    protected $maxRedirects = 5;
    
    /**
     * Proxy configuration
     * @var array
     */
    protected $proxy = null;
    
    /**
     * Debug mode
     * @var bool
     */
    protected $debug = false;
    
    /**
     * User agent pool
     * @var array
     */
    protected $userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    
    /**
     * Constructor
     * 
     * @param array $options Configuration options
     */
    public function __construct($options = []) {
        // Load available network interfaces
        $this->loadNetworkInterfaces();
        
        // Apply options
        if (isset($options['timeout'])) {
            $this->timeout = (int)$options['timeout'];
        }
        
        if (isset($options['ssl_verify'])) {
            $this->sslVerify = (bool)$options['ssl_verify'];
        }
        
        if (isset($options['follow_redirects'])) {
            $this->followRedirects = (bool)$options['follow_redirects'];
        }
        
        if (isset($options['max_redirects'])) {
            $this->maxRedirects = (int)$options['max_redirects'];
        }
        
        if (isset($options['cookie_jar'])) {
            $this->cookieJar = $options['cookie_jar'];
        }
        
        if (isset($options['proxy'])) {
            $this->proxy = $options['proxy'];
        }
        
        if (isset($options['debug'])) {
            $this->debug = (bool)$options['debug'];
        }
        
        if (isset($options['interface'])) {
            $this->setInterface($options['interface']);
        }
    }
    
    /**
     * Load available network interfaces
     * 
     * @return void
     */
    protected function loadNetworkInterfaces() {
        if (PHP_OS_FAMILY === 'Linux') {
            // Linux: use ip command
            $output = shell_exec('ip -4 addr show | grep inet | awk \'{print $2}\' | cut -d/ -f1');
            if ($output) {
                $ips = array_filter(explode("\n", trim($output)));
                foreach ($ips as $ip) {
                    if ($ip !== '127.0.0.1' && filter_var($ip, FILTER_VALIDATE_IP)) {
                        $this->interfaces[] = $ip;
                    }
                }
            }
        } elseif (PHP_OS_FAMILY === 'Darwin') {
            // macOS: use ifconfig
            $output = shell_exec('ifconfig | grep "inet " | grep -v 127.0.0.1 | awk \'{print $2}\'');
            if ($output) {
                $ips = array_filter(explode("\n", trim($output)));
                foreach ($ips as $ip) {
                    if (filter_var($ip, FILTER_VALIDATE_IP)) {
                        $this->interfaces[] = $ip;
                    }
                }
            }
        }
        
        if ($this->debug && !empty($this->interfaces)) {
            error_log("Available interfaces: " . implode(', ', $this->interfaces));
        }
    }
    
    /**
     * Set network interface for binding
     * 
     * @param string|null $interface IP address or null for auto-select
     * @return self
     */
    public function setInterface($interface = null) {
        if ($interface === null && !empty($this->interfaces)) {
            // Auto-select random interface
            $this->currentInterface = $this->interfaces[array_rand($this->interfaces)];
        } elseif ($interface && in_array($interface, $this->interfaces)) {
            $this->currentInterface = $interface;
        } elseif ($interface) {
            // Allow manual interface even if not detected
            $this->currentInterface = $interface;
        }
        
        if ($this->debug && $this->currentInterface) {
            error_log("Using interface: " . $this->currentInterface);
        }
        
        return $this;
    }
    
    /**
     * Get random User-Agent
     * 
     * @return string
     */
    protected function getRandomUserAgent() {
        return $this->userAgents[array_rand($this->userAgents)];
    }
    
    /**
     * Initialize cURL handle with common options
     * 
     * @param string $url URL to request
     * @param bool $useInterface Whether to bind to network interface
     * @return resource cURL handle
     */
    protected function initCurl($url, $useInterface = true) {
        $ch = curl_init();
        
        // Basic options
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $this->followRedirects);
        curl_setopt($ch, CURLOPT_MAXREDIRS, $this->maxRedirects);
        
        // Random User-Agent
        curl_setopt($ch, CURLOPT_USERAGENT, $this->getRandomUserAgent());
        
        // SSL verification
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $this->sslVerify);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, $this->sslVerify ? 2 : 0);
        
        // Cookie jar
        if ($this->cookieJar) {
            curl_setopt($ch, CURLOPT_COOKIEJAR, $this->cookieJar);
            curl_setopt($ch, CURLOPT_COOKIEFILE, $this->cookieJar);
        }
        
        // Interface binding (only for public requests)
        if ($useInterface && $this->currentInterface) {
            curl_setopt($ch, CURLOPT_INTERFACE, $this->currentInterface);
        }
        
        // Proxy
        if ($this->proxy) {
            curl_setopt($ch, CURLOPT_PROXY, $this->proxy['host'] . ':' . $this->proxy['port']);
            if (isset($this->proxy['username']) && isset($this->proxy['password'])) {
                curl_setopt($ch, CURLOPT_PROXYUSERPWD, $this->proxy['username'] . ':' . $this->proxy['password']);
            }
            if (isset($this->proxy['type'])) {
                curl_setopt($ch, CURLOPT_PROXYTYPE, $this->proxy['type']);
            }
        }
        
        // Debug mode
        if ($this->debug) {
            curl_setopt($ch, CURLOPT_VERBOSE, true);
        }
        
        return $ch;
    }
    
    /**
     * Execute cURL request and return response
     * 
     * @param resource $ch cURL handle
     * @return array Response data
     */
    protected function executeCurl($ch) {
        $response = curl_exec($ch);
        $info = curl_getinfo($ch);
        $error = curl_error($ch);
        $errno = curl_errno($ch);
        
        curl_close($ch);
        
        return [
            'success' => $errno === 0,
            'body' => $response,
            'info' => $info,
            'error' => $error,
            'errno' => $errno,
            'http_code' => $info['http_code'],
            'total_time' => $info['total_time'],
            'size_download' => $info['size_download']
        ];
    }
    
    /**
     * Local GET request (no interface binding)
     * Used for local/internal requests
     * 
     * @param string $url URL to request
     * @param array $headers Optional headers
     * @return array Response data
     */
    public function localGet($url, $headers = []) {
        $ch = $this->initCurl($url, false); // false = no interface binding
        
        // Set custom headers
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        if ($this->debug) {
            error_log("Local GET: $url (no interface binding)");
        }
        
        return $this->executeCurl($ch);
    }
    
    /**
     * Public GET request (with interface binding)
     * Used for external/public requests
     * 
     * @param string $url URL to request
     * @param array $headers Optional headers
     * @return array Response data
     */
    public function get($url, $headers = []) {
        $ch = $this->initCurl($url, true); // true = use interface binding
        
        // Set custom headers
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        if ($this->debug) {
            error_log("Public GET: $url (interface: " . ($this->currentInterface ?: 'default') . ")");
        }
        
        return $this->executeCurl($ch);
    }
    
    /**
     * Public POST request (with interface binding)
     * 
     * @param string $url URL to request
     * @param mixed $data POST data (array or string)
     * @param array $headers Optional headers
     * @return array Response data
     */
    public function post($url, $data = [], $headers = []) {
        $ch = $this->initCurl($url, true); // true = use interface binding
        
        // Set POST options
        curl_setopt($ch, CURLOPT_POST, true);
        
        // Handle different data types
        if (is_array($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        }
        
        // Set custom headers
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        if ($this->debug) {
            error_log("Public POST: $url (interface: " . ($this->currentInterface ?: 'default') . ")");
        }
        
        return $this->executeCurl($ch);
    }
    
    /**
     * Local POST request (no interface binding)
     * 
     * @param string $url URL to request
     * @param mixed $data POST data (array or string)
     * @param array $headers Optional headers
     * @return array Response data
     */
    public function localPost($url, $data = [], $headers = []) {
        $ch = $this->initCurl($url, false); // false = no interface binding
        
        // Set POST options
        curl_setopt($ch, CURLOPT_POST, true);
        
        // Handle different data types
        if (is_array($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        }
        
        // Set custom headers
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        if ($this->debug) {
            error_log("Local POST: $url (no interface binding)");
        }
        
        return $this->executeCurl($ch);
    }
    
    /**
     * PUT request (with interface binding)
     * 
     * @param string $url URL to request
     * @param mixed $data PUT data
     * @param array $headers Optional headers
     * @return array Response data
     */
    public function put($url, $data = [], $headers = []) {
        $ch = $this->initCurl($url, true);
        
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        
        if (is_array($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        } else {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        }
        
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        return $this->executeCurl($ch);
    }
    
    /**
     * DELETE request (with interface binding)
     * 
     * @param string $url URL to request
     * @param array $headers Optional headers
     * @return array Response data
     */
    public function delete($url, $headers = []) {
        $ch = $this->initCurl($url, true);
        
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        return $this->executeCurl($ch);
    }
    
    /**
     * Get available network interfaces
     * 
     * @return array
     */
    public function getInterfaces() {
        return $this->interfaces;
    }
    
    /**
     * Get current interface
     * 
     * @return string|null
     */
    public function getCurrentInterface() {
        return $this->currentInterface;
    }
    
    /**
     * Set timeout
     * 
     * @param int $timeout Timeout in seconds
     * @return self
     */
    public function setTimeout($timeout) {
        $this->timeout = (int)$timeout;
        return $this;
    }
    
    /**
     * Set SSL verification
     * 
     * @param bool $verify Enable/disable SSL verification
     * @return self
     */
    public function setSslVerify($verify) {
        $this->sslVerify = (bool)$verify;
        return $this;
    }
    
    /**
     * Set cookie jar
     * 
     * @param string $path Path to cookie jar file
     * @return self
     */
    public function setCookieJar($path) {
        $this->cookieJar = $path;
        return $this;
    }
    
    /**
     * Set proxy
     * 
     * @param array $proxy Proxy configuration
     * @return self
     */
    public function setProxy($proxy) {
        $this->proxy = $proxy;
        return $this;
    }
    
    /**
     * Enable/disable debug mode
     * 
     * @param bool $debug Debug mode
     * @return self
     */
    public function setDebug($debug) {
        $this->debug = (bool)$debug;
        return $this;
    }
    
    /**
     * Add custom user agent to pool
     * 
     * @param string $userAgent User agent string
     * @return self
     */
    public function addUserAgent($userAgent) {
        $this->userAgents[] = $userAgent;
        return $this;
    }
    
    /**
     * Set custom user agent pool
     * 
     * @param array $userAgents Array of user agent strings
     * @return self
     */
    public function setUserAgents($userAgents) {
        if (!empty($userAgents)) {
            $this->userAgents = $userAgents;
        }
        return $this;
    }
}
