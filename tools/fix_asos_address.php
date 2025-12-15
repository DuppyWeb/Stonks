<?php
$db = new PDO('sqlite:../Crawlers/database/crawls.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

//Select all Assos Crawls

$stmt = $db->query('SELECT * FROM crawls WHERE crawl = "asos.com" ');
$crawls = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($crawls as $crawl) {
    $id = $crawl['id'];
    echo "ID : $id\n";
    $substm = $db->prepare("

        SELECT * FROM xhr_requests 
        WHERE 
            crawl_id = :id and 
            url LIKE 'https://my.asos.com/api/customer/profile/v2/customers/%/addresses%'
     ");
    $substm->bindParam(':id', $id);
    $substm->execute();
    $addresses = $substm->fetchAll(PDO::FETCH_ASSOC);
    foreach ($addresses as $address) {
        $body = json_decode($address['response_body'], true);
        if (isset($body['addresses'][0]['addressId'])){
            //Update
            $stm = $db->prepare("UPDATE crawls SET address_id = :address WHERE id = :id");
            $stm->bindParam(':id', $id);
            $stm->bindParam(':address', $body['addresses'][0]['addressId'] );
            $stm->execute();

        }
    }

}
