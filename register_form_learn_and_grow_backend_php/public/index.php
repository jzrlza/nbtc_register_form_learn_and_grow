<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Services\Database;
use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

// Error reporting
if ($_ENV['APP_ENV'] === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// Set timezone
date_default_timezone_set($_ENV['TIMEZONE'] ?? 'Asia/Bangkok');

// CORS
require_once __DIR__ . '/../config/cors.php';
handleCors();

// Parse JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() === JSON_ERROR_NONE && $input) {
    $_POST = array_merge($_POST, $input);
}

// Router
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Remove base path if needed
$basePath = $_ENV['BASE_PATH'] ?? '';
if ($basePath && strpos($requestUri, $basePath) === 0) {
    $requestUri = substr($requestUri, strlen($basePath));
}

// Load routes
$routes = require_once __DIR__ . '/../routes/api.php';

// Match route
$routeFound = false;
foreach ($routes[$requestMethod] as $routePattern => $handler) {
    $pattern = '#^' . preg_replace('/\{[a-z]+\}/', '([^/]+)', $routePattern) . '$#';
    
    if (preg_match($pattern, $requestUri, $matches)) {
        array_shift($matches);
        $routeFound = true;
        
        list($controllerName, $methodName) = explode('@', $handler);
        $controllerClass = "App\\Controllers\\{$controllerName}";
        
        if (class_exists($controllerClass)) {
            $controller = new $controllerClass();
            if (method_exists($controller, $methodName)) {
                call_user_func_array([$controller, $methodName], $matches);
                exit();
            }
        }
    }
}

// 404
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Route not found']);