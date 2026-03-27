<?php
namespace App\Services;

class Logger
{
    private static $logDir;
    private static $logFile;
    private static $maxSize = 10485760; // 10MB
    private static $maxFiles = 5;
    
    public static function init()
    {
        self::$logDir = $_ENV['LOG_PATH'] ?? __DIR__ . '/../../logs';
        self::$logFile = self::$logDir . '/app.log';
        
        if (!is_dir(self::$logDir)) {
            mkdir(self::$logDir, 0777, true);
        }
    }
    
    private static function write($level, $message, $data = [])
    {
        self::init();
        
        $timestamp = date('Y-m-d H:i:s');
        $dataStr = !empty($data) ? ' ' . json_encode($data, JSON_UNESCAPED_UNICODE) : '';
        $logLine = sprintf("[%s] [%s] %s%s\n", $timestamp, strtoupper($level), $message, $dataStr);
        
        // Rotate if needed
        if (file_exists(self::$logFile) && filesize(self::$logFile) > self::$maxSize) {
            self::rotate();
        }
        
        error_log($logLine, 3, self::$logFile);
        
    }
    
    private static function rotate()
    {
        for ($i = self::$maxFiles - 1; $i >= 1; $i--) {
            $oldFile = self::$logDir . "/app.log.{$i}";
            $newFile = self::$logDir . "/app.log." . ($i + 1);
            if (file_exists($oldFile)) {
                rename($oldFile, $newFile);
            }
        }
        
        if (file_exists(self::$logFile)) {
            rename(self::$logFile, self::$logDir . "/app.log.1");
        }
    }
    
    public static function debug($message, $data = [])
    {
        self::write('debug', $message, $data);
    }
    
    public static function info($message, $data = [])
    {
        self::write('info', $message, $data);
    }
    
    public static function warn($message, $data = [])
    {
        self::write('warn', $message, $data);
    }
    
    public static function error($message, $data = [])
    {
        self::write('error', $message, $data);
    }
    
    public static function logRequest($method, $url, $ip, $userAgent, $user = null)
    {
        self::info('API Request', [
            'method' => $method,
            'url' => $url,
            'ip' => $ip,
            'userAgent' => $userAgent,
            'user' => $user
        ]);
    }
}