<?php
namespace App\Services;

use PDO;
use PDOException;

class Database
{
    private static $connections = [];
    private $connection;
    
    public function __construct($config = null)
    {
        $config = $config ?: require __DIR__ . '/../../config/database.php';
        
        try {
            $dsn = sprintf(
                "mysql:host=%s;port=%s;dbname=%s;charset=%s",
                $config['host'],
                $config['port'],
                $config['database'],
                $config['charset']
            );
            
            $this->connection = new PDO($dsn, $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            Logger::error('Database connection failed', ['error' => $e->getMessage()]);
            throw new \Exception('Database connection failed');
        }
    }
    
    public static function getConnection()
    {
        $key = $_ENV['DB_HOST'] . $_ENV['DB_NAME'];
        if (!isset(self::$connections[$key])) {
            self::$connections[$key] = new self();
        }
        return self::$connections[$key]->connection;
    }
    
    public static function query($sql, $params = [])
    {
        $stmt = self::getConnection()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    public static function fetchAll($sql, $params = [])
    {
        return self::query($sql, $params)->fetchAll();
    }
    
    public static function fetchOne($sql, $params = [])
    {
        return self::query($sql, $params)->fetch();
    }
    
    public static function insert($table, $data)
    {
        $fields = array_keys($data);
        $placeholders = implode(',', array_fill(0, count($fields), '?'));
        $sql = "INSERT INTO {$table} (" . implode(',', $fields) . ") VALUES ({$placeholders})";
        
        self::query($sql, array_values($data));
        return self::getConnection()->lastInsertId();
    }
    
    public static function update($table, $data, $where, $whereParams = [])
    {
        $set = implode('=?,', array_keys($data)) . '=?';
        $sql = "UPDATE {$table} SET {$set} WHERE {$where}";
        
        $params = array_merge(array_values($data), $whereParams);
        return self::query($sql, $params)->rowCount();
    }
}