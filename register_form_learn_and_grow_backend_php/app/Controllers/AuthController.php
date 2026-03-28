<?php
namespace App\Controllers;

use App\Services\Database;
use App\Services\Logger;
use App\Services\JWT;
use App\Services\ADService;
use App\Services\TwoFactorAuth;

class AuthController
{
    public function login()
    {
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        );
        
        $input = json_decode(file_get_contents('php://input'), true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        
        if (!$username || !$password) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Username and password required']);
            return;
        }
        
        $db = Database::getConnection();
        
        // Check user in database
        $stmt = $db->prepare("SELECT id, username, employee_id, is_2fa_enabled, is_deleted, created_at, type FROM users WHERE username = ? AND is_deleted = 0");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'ไม่พบ Username ในฐานข้อมูล']);
            return;
        }
        
        $isInitialAdmin = (int)$user['type'] <= 0;
        
        if ($isInitialAdmin) {
            $token = JWT::generate($user);
            echo json_encode([
                'success' => true,
                'user' => array_merge($user, ['code' => 200, 'CN' => 'coreadmin', 'email' => 'core']),
                'requires2FA' => false,
                'token' => $token
            ]);
            return;
        }
        
        // AD Authentication
        $adUser = ADService::authenticate($username, $password);
        
        if (!$adUser) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'ชื่อหรือรหัสผ่านผิดพลาด']);
            return;
        }
        
        if ($user['is_2fa_enabled']) {
            echo json_encode([
                'requires2FA' => true,
                'message' => '2FA code required',
                'userId' => $user['id'],
                'userAD' => $adUser
            ]);
            return;
        }
        
        $token = JWT::generate($user);
        echo json_encode([
            'success' => true,
            'user' => array_merge($user, $adUser),
            'requires2FA' => false,
            'token' => $token
        ]);
    }
    
    public function verify2fa()
    {
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        );
        
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['userId'] ?? null;
        $username = $input['username'] ?? '';
        $userAD = $input['userAD'] ?? [];
        $code = $input['code'] ?? '';
        
        $db = Database::getConnection();
        
        $stmt = $db->prepare("SELECT id, username, employee_id, is_2fa_enabled, is_deleted, created_at, two_factor_secret, type FROM users WHERE username = ? AND is_deleted = 0");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'ไม่พบ Username ในฐานข้อมูล']);
            return;
        }
        
        if (!$user['two_factor_secret']) {
            http_response_code(400);
            echo json_encode(['error' => '2FA ยังไม่ได้ตั้งค่า']);
            return;
        }
        
        $verified = TwoFactorAuth::verify($user['two_factor_secret'], $code);
        
        unset($user['two_factor_secret']);
        $token = JWT::generate($user);
        
        if ($verified) {
            echo json_encode([
                'success' => true,
                'user' => array_merge($user, $userAD),
                'token' => $token
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'รหัส 2FA code ผิด']);
        }
    }
    
    public function setup2fa()
    {        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $input = json_decode(file_get_contents('php://input'), true);
        $userId = $input['userId'] ?? null;
        $username = $input['username'] ?? '';
        
        $secret = TwoFactorAuth::generateSecret();
        $qrCode = TwoFactorAuth::generateQrCode($secret, $username);
        
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET two_factor_secret = ?, is_2fa_enabled = 1 WHERE id = ?");
        $stmt->execute([$secret, $userId]);
        
        echo json_encode([
            'success' => true,
            'secret' => $secret,
            'qrCode' => $qrCode
        ]);
    }
    
    public function health()
    {
        echo json_encode(['status' => 'OK', 'service' => 'backend']);
    }
    
    public function index()
    {
        echo json_encode([
            'message' => 'regis API',
            'version' => '1.0.0',
            'endpoints' => [
                'users' => '/api/users',
                'employees' => '/api/employees',
                'health' => '/api/health'
            ]
        ]);
    }
}