<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Site name mapping to obfuscate sources

if (isset($_COOKIE['mode']) && $_COOKIE['mode'] == 'noSecrets') {
    $siteMapping = [
        'revolve.com' => 'Revolve',
        'aboutyou.ro.js' => 'AboutYou',
        'asos.com' => 'ASOS',
        'mytheresa.com' => 'MyTheresa'   
    ];
} else {
    $siteMapping = [
        'revolve.com' => 'Redric',
        'aboutyou.ro.js' => 'Gem',
        'asos.com' => 'Pyre',
        'mytheresa.com' => 'Thane'   
    ];
}


// Reverse mapping for lookups
$reverseSiteMapping = array_flip($siteMapping);

// Helper function to map site name
function mapSiteName($realName, $mapping) {
    return $mapping[$realName] ?? $realName;
}

// Helper function to get real site name from display name
function getRealSiteName($displayName, $reverseMapping) {
    return $reverseMapping[$displayName] ?? $displayName;
}

// Database path
$dbPath = '../Crawlers/database/crawls.sqlite';

if (!file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database not found']);
    exit;
}

try {
    $db = new PDO('sqlite:' . $dbPath);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $action = $_GET['action'] ?? 'get_crawls';
    
    switch ($action) {
        case 'get_sites':
            // Get unique crawl sites and map them
            $stmt = $db->query('SELECT DISTINCT crawl FROM crawls ORDER BY crawl');
            $sites = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $mappedSites = array_map(function($site) use ($siteMapping) {
                return mapSiteName($site, $siteMapping);
            }, $sites);
            echo json_encode(['sites' => $mappedSites]);
            break;
            
        case 'get_crawls':
            // Get crawl data with optional site filter
            $site = $_GET['site'] ?? null;
            
            // Convert display name back to real site name
            if ($site) {
                $site = getRealSiteName($site, $reverseSiteMapping);
            }
            
            $sql = 'SELECT 
                        id,
                        crawl,
                        started_at,
                        finished_at,
                        status,
                        account_id,
                        order_id,
                        cart_id,
                        card_id,
                        address_id,
                        created_at
                    FROM crawls';
            
            if ($site) {
                $sql .= ' WHERE crawl = :site';
            }
            
            $sql .= ' ORDER BY started_at ASC';
            
            $stmt = $db->prepare($sql);
            if ($site) {
                $stmt->bindParam(':site', $site);
            }
            $stmt->execute();
            
            $crawls = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Map site names in results
            foreach ($crawls as &$crawl) {
                $crawl['crawl'] = mapSiteName($crawl['crawl'], $siteMapping);
            }
            
            echo json_encode(['crawls' => $crawls]);
            break;
            
        case 'get_id_stats':
            // Get statistics for each ID field over time
            $site = $_GET['site'] ?? null;
            
            // Convert display name back to real site name
            if ($site) {
                $site = getRealSiteName($site, $reverseSiteMapping);
            }
            
            $sql = 'SELECT 
                        started_at,
                        crawl,
                        account_id,
                        order_id,
                        cart_id,
                        card_id,
                        address_id,
                        CASE WHEN account_id IS NOT NULL AND account_id != "" THEN 1 ELSE 0 END as has_account_id,
                        CASE WHEN order_id IS NOT NULL AND order_id != "" THEN 1 ELSE 0 END as has_order_id,
                        CASE WHEN cart_id IS NOT NULL AND cart_id != "" THEN 1 ELSE 0 END as has_cart_id,
                        CASE WHEN card_id IS NOT NULL AND card_id != "" THEN 1 ELSE 0 END as has_card_id,
                        CASE WHEN address_id IS NOT NULL AND address_id != "" THEN 1 ELSE 0 END as has_address_id
                    FROM crawls';
            
            if ($site) {
                $sql .= ' WHERE crawl = :site';
            }
            
            $sql .= ' ORDER BY started_at ASC';
            
            $stmt = $db->prepare($sql);
            if ($site) {
                $stmt->bindParam(':site', $site);
            }
            $stmt->execute();
            
            $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process order_id to extract numeric part and map site names
            foreach ($stats as &$stat) {
                // Map site name
                $stat['crawl'] = mapSiteName($stat['crawl'], $siteMapping);
                
                // Extract numeric part from order_id
                if (!empty($stat['order_id'])) {
                    preg_match('/\d+/', $stat['order_id'], $matches);
                    $stat['order_id_numeric'] = !empty($matches) ? $matches[0] : null;
                } else {
                    $stat['order_id_numeric'] = null;
                }
            }
            
            echo json_encode(['stats' => $stats]);
            break;
            
        case 'get_crawl_details':
            // Get detailed crawl data including JSON fields
            $crawlId = $_GET['id'] ?? null;
            
            if (!$crawlId) {
                http_response_code(400);
                echo json_encode(['error' => 'Crawl ID required']);
                break;
            }
            
            $sql = 'SELECT * FROM crawls WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->bindParam(':id', $crawlId);
            $stmt->execute();
            
            $crawl = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$crawl) {
                http_response_code(404);
                echo json_encode(['error' => 'Crawl not found']);
                break;
            }
            
            // Map site name
            $crawl['crawl'] = mapSiteName($crawl['crawl'], $siteMapping);
            
            // Parse JSON fields
            $jsonFields = ['user_data', 'screenshot_files', 'json_files', 'log', 'errors'];
            foreach ($jsonFields as $field) {
                if (!empty($crawl[$field])) {
                    $decoded = json_decode($crawl[$field], true);
                    $crawl[$field] = $decoded !== null ? $decoded : $crawl[$field];
                }
            }
            
            echo json_encode(['crawl' => $crawl]);
            break;
            
        case 'get_all_crawls':
            // Get all crawls with basic info for the viewer
            $site = $_GET['site'] ?? null;
            $status = $_GET['status'] ?? null;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $sortBy = $_GET['sort_by'] ?? 'started_at';
            $sortOrder = $_GET['sort_order'] ?? 'DESC';
            
            // Validate sort parameters
            $allowedSortFields = ['id', 'crawl', 'started_at', 'finished_at', 'status', 'created_at'];
            if (!in_array($sortBy, $allowedSortFields)) {
                $sortBy = 'started_at';
            }
            
            $sortOrder = strtoupper($sortOrder) === 'ASC' ? 'ASC' : 'DESC';
            
            // Convert display name back to real site name
            if ($site) {
                $site = getRealSiteName($site, $reverseSiteMapping);
            }
            
            // Build WHERE clause
            $whereConditions = [];
            $params = [];
            
            if ($site) {
                $whereConditions[] = 'crawl = :site';
                $params[':site'] = $site;
            }
            
            if ($status) {
                $whereConditions[] = 'status = :status';
                $params[':status'] = $status;
            }
            
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM crawls $whereClause";
            $countStmt = $db->prepare($countSql);
            foreach ($params as $key => $value) {
                $countStmt->bindValue($key, $value);
            }
            $countStmt->execute();
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            // Get crawls
            $sql = "SELECT 
                        id,
                        crawl,
                        started_at,
                        finished_at,
                        status,
                        account_id,
                        order_id,
                        cart_id,
                        card_id,
                        address_id,
                        user_data,
                        screenshot_files,
                        json_files,
                        log,
                        errors,
                        created_at
                    FROM crawls
                    $whereClause
                    ORDER BY $sortBy $sortOrder
                    LIMIT :limit OFFSET :offset";
            
            $stmt = $db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            $crawls = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process each crawl
            foreach ($crawls as &$crawl) {
                // Map site name
                $crawl['crawl'] = mapSiteName($crawl['crawl'], $siteMapping);
                
                // Parse JSON fields for preview
                $jsonFields = ['user_data', 'screenshot_files', 'json_files', 'log', 'errors'];
                foreach ($jsonFields as $field) {
                    if (!empty($crawl[$field])) {
                        $decoded = json_decode($crawl[$field], true);
                        $crawl[$field] = $decoded !== null ? $decoded : $crawl[$field];
                    }
                }
            }
            
            echo json_encode([
                'crawls' => $crawls, 
                'total' => $totalCount,
                'limit' => $limit,
                'offset' => $offset,
                'pages' => ceil($totalCount / $limit)
            ]);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
