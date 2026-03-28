<?php
namespace App\Services;

use OTPHP\TOTP;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

class TwoFactorAuth
{
    private static $appName;
    
    public static function init()
    {
        self::$appName = $_ENV['TWOFACTOR_SPEAKEASY_SECRET_STR'] ?? 'CalculatorApp';
    }
    
    public static function generateSecret()
    {
        self::init();
        $totp = TOTP::generate();
        return $totp->getSecret();
    }
    
    public static function generateQrCode($secret, $username)
    {
        self::init();
        
        // Create TOTP instance with existing secret
        $totp = TOTP::create($secret);
        $totp->setLabel($username);
        $totp->setIssuer(self::$appName);
        
        // Generate the OTP auth URL
        $otpAuthUrl = $totp->getProvisioningUri();
        
        // Create QR code options
        $options = new QROptions([
            'outputType' => QRCode::OUTPUT_IMAGE_PNG,
            'eccLevel' => QRCode::ECC_L,
            'scale' => 5,
            'imageBase64' => true,
            'addQuietzone' => false,
            'quietzoneSize' => 0,
            'margin' => 0
        ]);
        
        // Create QR code instance and render
        $qrCode = new QRCode($options);
        $qrCodeImage = $qrCode->render($otpAuthUrl);
        
        return $qrCodeImage;
    }
    
    public static function verify($secret, $code)
    {
        self::init();
        
        try {
            $totp = TOTP::create($secret);
            return $totp->verify($code, null, 1); // window = 1 (allows 1 step time drift)
        } catch (\Exception $e) {
            Logger::error('2FA verification failed', ['error' => $e->getMessage()]);
            return false;
        }
    }
    
    public static function isValidSecret($secret)
    {
        try {
            TOTP::create($secret);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}