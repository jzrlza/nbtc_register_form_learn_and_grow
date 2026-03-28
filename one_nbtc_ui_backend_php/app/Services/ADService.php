<?php
namespace App\Services;

use GuzzleHttp\Client;

class ADService
{
    private static $client;
    private static $apiUrl;
    private static $apiKey;
    
    public static function init()
    {
        self::$client = new Client([
            'timeout' => 10,
            'verify' => false  // Disable SSL verification (matches Node.js axios behavior)
        ]);
        self::$apiUrl = $_ENV['AD_API_URL'];
        self::$apiKey = $_ENV['AD_API_KEY'];
    }
    
    public static function authenticate($username, $password)
    {
        self::init();
        
        try {
            // Step 1: Get token
            $tokenResponse = self::$client->post(self::$apiUrl . '/token', [
                'json' => ['api_key' => self::$apiKey]
            ]);
            
            $tokenData = json_decode($tokenResponse->getBody(), true);
            if (!isset($tokenData['access_token'])) {
                Logger::error('AD token failed');
                return null;
            }
            
            // Step 2: Get user info
            $userResponse = self::$client->post(self::$apiUrl . '/user-info', [
                'json' => [
                    'username' => $username,
                    'password' => $password,
                    'token' => $tokenData['access_token'],
                    'api_key' => self::$apiKey
                ]
            ]);
            
            $userData = json_decode($userResponse->getBody(), true);
            
            if (isset($userData['code']) && $userData['code'] === 200) {
                return [
                    'code' => 200,
                    'CN' => $userData['CN'] ?? '',
                    'email' => $userData['email'] ?? ''
                ];
            }
            
            return null;
            
        } catch (\Exception $e) {
            Logger::error('AD authentication failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}