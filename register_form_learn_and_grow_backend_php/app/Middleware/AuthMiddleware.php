<?php
namespace App\Middleware;

use App\Services\JWT;
use App\Services\Logger;

class AuthMiddleware
{
    public static function verify()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        
        if (!$authHeader) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized Access']);
            exit();
        }
        
        $user = JWT::verify($authHeader);
        
        if (!$user) {
            http_response_code(403);
            echo json_encode(['error' => 'Unauthorized Access']);
            exit();
        }
        
        return $user;
    }
}