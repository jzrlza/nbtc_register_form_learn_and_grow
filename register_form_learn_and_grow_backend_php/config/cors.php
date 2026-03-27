<?php
function handleCors()
{
    $allowedOrigins = [];
    
    if ($_ENV['FRONTEND_URL']) {
        $allowedOrigins[] = $_ENV['FRONTEND_URL'];
    }
    if ($_ENV['AD_API_URL']) {
        $allowedOrigins[] = $_ENV['AD_API_URL'];
    }
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
        header("Access-Control-Max-Age: 3600");
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}