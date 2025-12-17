<?php

require_once 'revolve.php';
$revolve = new Revolve([
    'debug' => true,
    'ssl_verify' => false,
    'timeout' => 30
]);

$response = $revolve->login('mere@0xff.fit', 'Lofaszix');
var_dump($response);

die("Died");

if ($response['login_success']) {
    echo "✅ Login successful!\n";
} else {
    echo "❌ Login failed\n";
    echo "Response: " . $response['body'] . "\n";
}

echo "HTTP Code: " . $response['http_code'] . "\n";
echo "Response time: " . $response['total_time'] . "s\n";
echo "\n";

// Example 2: Login with custom cookie file
echo "\n--- Example 2: Persistent Cookie File ---\n";
$revolve2 = new Revolve([
    'cookie_jar' => '/tmp/my_revolve_session.txt',
    'debug' => false
]);

$response = $revolve2->login('user@example.com', 'password123');

echo "Login success: " . ($response['login_success'] ? 'Yes' : 'No') . "\n";
echo "Cookie file: " . $revolve2->getCookieFile() . "\n";

// View cookies
$cookies = $revolve2->getCookies();
echo "Total cookies: " . count($cookies) . "\n";
foreach ($cookies as $cookie) {
    echo "  - {$cookie['name']}: " . substr($cookie['value'], 0, 30) . "...\n";
}
echo "\n";

// Example 3: Manual initialization and login
echo "\n--- Example 3: Manual Initialization ---\n";
$revolve3 = new Revolve();

// First, visit the site to collect cookies
echo "Initializing session...\n";
$initResponse = $revolve3->initialize();
echo "Initialization: " . ($initResponse['success'] ? 'Success' : 'Failed') . "\n";

// Check if we got cookies
if ($revolve3->isInitialized()) {
    echo "Session initialized, cookies collected\n";
    
    // Now perform login
    echo "Attempting login...\n";
    $loginResponse = $revolve3->login('test@example.com', 'testpass');
    echo "Login: " . ($loginResponse['login_success'] ? 'Success' : 'Failed') . "\n";
}
echo "\n";

// Example 4: Using with interface binding
echo "\n--- Example 4: Interface Binding ---\n";
$revolve4 = new Revolve([
    'debug' => true
]);

// Set specific interface or auto-select
$revolve4->setInterface(); // Auto-select random interface

echo "Using interface: " . $revolve4->getCurrentInterface() . "\n";

$response = $revolve4->login('user@example.com', 'password');
echo "Login attempt from interface: " . ($response['login_success'] ? 'Success' : 'Failed') . "\n";
echo "\n";

// Example 5: Making authenticated requests after login
echo "\n--- Example 5: Authenticated Requests ---\n";
$revolve5 = new Revolve();

// Login first
$loginResponse = $revolve5->login('user@example.com', 'password');

if ($loginResponse['login_success']) {
    echo "Logged in successfully\n";
    
    // Now make authenticated requests using the same session
    $profileResponse = $revolve5->request('https://www.revolve.com/r/MyBillingSettings.jsp');
    echo "Profile page HTTP code: " . $profileResponse['http_code'] . "\n";
    
    // Make a POST request
    $updateResponse = $revolve5->request(
        'https://www.revolve.com/r/ajax/UpdateProfile.jsp',
        'POST',
        ['field' => 'value']
    );
    echo "Update HTTP code: " . $updateResponse['http_code'] . "\n";
}
echo "\n";

// Example 6: Get specific cookie value
echo "\n--- Example 6: Cookie Management ---\n";
$revolve6 = new Revolve();
$revolve6->initialize();

// Get specific cookie
$sessionId = $revolve6->getCookie('JSESSIONID2');
echo "Session ID: " . ($sessionId ?: 'Not found') . "\n";

$browserID = $revolve6->getCookie('browserID');
echo "Browser ID: " . ($browserID ?: 'Not found') . "\n";

// Clear cookies
echo "Clearing cookies...\n";
$revolve6->clearCookies();
echo "Cookies cleared: " . ($revolve6->isInitialized() ? 'No' : 'Yes') . "\n";
echo "\n";

// Example 7: Multiple login attempts with different credentials
echo "\n--- Example 7: Multiple Login Attempts ---\n";
$credentials = [
    ['email' => 'user1@example.com', 'password' => 'pass1'],
    ['email' => 'user2@example.com', 'password' => 'pass2'],
    ['email' => 'user3@example.com', 'password' => 'pass3']
];

foreach ($credentials as $i => $cred) {
    $revolve = new Revolve(['debug' => false]);
    $revolve->setInterface(); // Randomize interface
    
    $response = $revolve->login($cred['email'], $cred['password']);
    
    echo "Attempt " . ($i + 1) . " - {$cred['email']}: ";
    echo ($response['login_success'] ? '✅ Success' : '❌ Failed');
    echo " (HTTP {$response['http_code']})";
    echo " - Interface: " . $revolve->getCurrentInterface() . "\n";
    
    // Small delay between attempts
    sleep(1);
}
echo "\n";

// Example 8: Custom start URL
echo "\n--- Example 8: Custom Start URL ---\n";
$revolve8 = new Revolve([
    'start_url' => 'https://www.revolve.com/womens-clothing/',
    'debug' => true
]);

echo "Start URL: " . $revolve8->getStartUrl() . "\n";
$response = $revolve8->login('user@example.com', 'password');
echo "Login: " . ($response['login_success'] ? 'Success' : 'Failed') . "\n";
echo "\n";

// Example 9: Error handling
echo "\n--- Example 9: Error Handling ---\n";
$revolve9 = new Revolve(['timeout' => 5]);

$response = $revolve9->login('test@example.com', 'wrongpassword');

if (!$response['success']) {
    echo "Request failed!\n";
    echo "Error: " . $response['error'] . "\n";
} elseif (!$response['login_success']) {
    echo "Login failed!\n";
    echo "Response: " . $response['body'] . "\n";
    
    // Check for specific errors
    if (strpos($response['body'], 'recaptcha') !== false) {
        echo "⚠️  reCAPTCHA required\n";
    } elseif (strpos($response['body'], '{"success" : false, "code" : 2,') !== false) {
        echo "❌ Invalid credentials\n";
    }
} else {
    echo "✅ Login successful!\n";
}
echo "\n";

// Example 10: Using with proxy
echo "\n--- Example 10: Proxy Usage ---\n";
$revolve10 = new Revolve();
$revolve10->setProxy([
    'host' => '127.0.0.1',
    'port' => 8080,
    'username' => 'proxyuser',
    'password' => 'proxypass'
]);

$response = $revolve10->login('user@example.com', 'password');
echo "Login via proxy: " . ($response['login_success'] ? 'Success' : 'Failed') . "\n";
echo "\n";

echo "=== All Examples Completed ===\n";
