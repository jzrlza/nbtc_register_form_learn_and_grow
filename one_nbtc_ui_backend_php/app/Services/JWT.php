<?php
namespace App\Services;

use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Token\Plain;
use DateTimeImmutable;

class JWT
{
    private static $config;
    private static $expiry = 3600; // 1 hour
    
    private static function init()
    {
        if (self::$config) {
            return self::$config;
        }
        
        $secret = $_ENV['JWT_SECRET'] ?? null;
        if (!$secret) {
            throw new \Exception('JWT_SECRET not set');
        }
        
        self::$config = Configuration::forSymmetricSigner(
            new Sha256(),
            InMemory::plainText($secret)
        );
        
        return self::$config;
    }
    
    public static function generate($user)
    {
        $config = self::init();
        $now = new DateTimeImmutable();
        
        $token = $config->builder()
            ->issuedBy($_ENV['APP_NAME'] ?? 'CalculatorApp')
            ->relatedTo((string)($user['id'] ?? ''))
            ->withClaim('id', $user['id'] ?? null)
            ->withClaim('username', $user['username'] ?? null)
            ->withClaim('type', $user['type'] ?? null)
            ->issuedAt($now)
            ->canOnlyBeUsedAfter($now)
            ->expiresAt($now->modify('+' . self::$expiry . ' second'))
            ->getToken($config->signer(), $config->signingKey());
        
        return $token->toString();
    }
    
    public static function verify($token)
    {
        self::init();
        
        try {
            $token = str_replace('Bearer ', '', $token);
            $token = str_replace('"', '', $token);
            
            $parsedToken = self::$config->parser()->parse($token);
            
            if (!$parsedToken instanceof Plain) {
                return null;
            }
            
            $now = new DateTimeImmutable();
            
            if ($parsedToken->isExpired($now)) {
                Logger::debug('JWT verification failed', ['error' => 'Token expired']);
                return null;
            }
            
            if (!$parsedToken->hasBeenIssuedBefore($now)) {
                Logger::debug('JWT verification failed', ['error' => 'Token not yet valid']);
                return null;
            }
            
            $claims = $parsedToken->claims();
            
            return [
                'id' => $claims->get('id'),
                'username' => $claims->get('username'),
                'type' => $claims->get('type')
            ];
            
        } catch (\Exception $e) {
            Logger::debug('JWT verification failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}