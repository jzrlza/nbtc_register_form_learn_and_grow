<?php
namespace App\Services;

use PragmaRX\Google2FA\Google2FA;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

class TwoFactorAuth
{
    private static $google2fa;
    private static $appName;
    
    public static function init()
    {
        self::$google2fa = new Google2FA();
        self::$appName = $_ENV['TWOFACTOR_SPEAKEASY_SECRET_STR'] ?? 'CalculatorApp';
    }
    
    public static function generateSecret()
    {
        self::init();
        return self::$google2fa->generateSecretKey();
    }
    
    public static function generateQrCode($secret, $username)
    {
        self::init();
        
        // Generate the OTP auth URL
        $otpAuthUrl = self::$google2fa->getQRCodeUrl(self::$appName, $username, $secret);
        
        // Create QR code options
        $options = new QROptions([
            'outputType' => QRCode::OUTPUT_IMAGE_PNG,
            'eccLevel' => QRCode::ECC_L,
            'scale' => 5,
            'imageBase64' => true,
            'addQuietzone' => false,      // Removes quiet zone (white border)
            'quietzoneSize' => 0,          // Sets border to 0
            'margin' => 0                  // Removes any additional margin
        ]);
        
        // Create QR code instance and render
        $qrCode = new QRCode($options);
        $qrCodeImage = $qrCode->render($otpAuthUrl);
        
        return $qrCodeImage;
    }
    
    public static function verify($secret, $code)
    {
        self::init();
        return self::$google2fa->verifyKey($secret, $code, 2); // window = 2
    }
}