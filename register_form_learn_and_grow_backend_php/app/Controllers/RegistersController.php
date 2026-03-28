<?php
namespace App\Controllers;

use App\Services\Database;
use App\Services\Logger;
use App\Middleware\AuthMiddleware;

class RegistersController
{
    public function index()
    {
        $search = $_GET['search'] ?? '';
        $year = $_GET['year'] ?? null;
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        );
        
        $db = Database::getConnection();
        
        $conditions = ["r.is_deleted = 0", "e.is_deleted = 0"];
        $params = [];
        
        if ($search) {
            $conditions[] = "e.emp_name LIKE ?";
            $params[] = "%$search%";
        }
        
        if ($year) {
            $conditions[] = "YEAR(r.sys_datetime) = ?";
            $params[] = $year;
        }
        
        $whereClause = "WHERE " . implode(" AND ", $conditions);
        
        $query = "SELECT r.*, e.emp_name
                  FROM register r
                  LEFT JOIN employee e ON r.emp_id = e.id
                  $whereClause
                  ORDER BY r.sys_datetime DESC
                  LIMIT ? OFFSET ?";
        
        $stmt = $db->prepare($query);
        $stmt->execute(array_merge($params, [$limit, $offset]));
        $registers = $stmt->fetchAll();
        
        $countQuery = "SELECT COUNT(*) as total
                       FROM register r
                       LEFT JOIN employee e ON r.emp_id = e.id
                       $whereClause";
        
        $countStmt = $db->prepare($countQuery);
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'registers' => $registers,
            'total' => $total,
            'page' => $totalPages > 0 ? $page : 0,
            'limit' => $limit,
            'totalPages' => $totalPages
        ]);
    }
    
    public function show($id)
    {
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        );
        
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT r.*, e.emp_name 
                              FROM register r 
                              LEFT JOIN employee e ON r.emp_id = e.id 
                              WHERE r.id = ?");
        $stmt->execute([$id]);
        $register = $stmt->fetch();
        
        if (!$register) {
            http_response_code(404);
            echo json_encode(['error' => 'ไม่พบการลงทะเบียน']);
            return;
        }
        
        echo json_encode($register);
    }
    
    public function store()
    {
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        );
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $empId = $input['emp_id'] ?? null;
        $tableNumber = $input['table_number'] ?? null;
        
        $db = Database::getConnection();
        
        // Check employee exists
        $empStmt = $db->prepare("SELECT emp_name FROM employee WHERE id = ? AND is_deleted = 0");
        $empStmt->execute([$empId]);
        if (!$empStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found']);
            return;
        }
        
        $stmt = $db->prepare("INSERT INTO register (emp_id, table_number, is_deleted) VALUES (?, ?, 0)");
        $stmt->execute([$empId, $tableNumber]);
        
        echo json_encode(['id' => $db->lastInsertId(), 'message' => 'เพิ่มการลงทะเบียนเรียบร้อย']);
    }
    
    public function update($id)
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        $empId = $input['emp_id'] ?? null;
        $tableNumber = $input['table_number'] ?? null;
        
        $db = Database::getConnection();
        
        // Check register exists
        $checkStmt = $db->prepare("SELECT id FROM register WHERE id = ? AND is_deleted = 0");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'ไม่พบการลงทะเบียน']);
            return;
        }
        
        // Check employee exists
        $empStmt = $db->prepare("SELECT emp_name FROM employee WHERE id = ? AND is_deleted = 0");
        $empStmt->execute([$empId]);
        if (!$empStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found']);
            return;
        }
        
        $stmt = $db->prepare("UPDATE register SET emp_id = ?, table_number = ? WHERE id = ? AND is_deleted = 0");
        $stmt->execute([$empId, $tableNumber, $id]);
        
        echo json_encode(['message' => 'แก้ไขการลงทะเบียนเรียบร้อย']);
    }
    
    public function destroy($id)
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE register SET is_deleted = 1 WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['message' => 'ลบการลงทะเบียนเรียบร้อย']);
    }
    
    public function destroyAll()
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE register SET is_deleted = 1 WHERE 1");
        $stmt->execute();
        
        echo json_encode(['message' => 'ลบการลงทะเบียนทั้งหมดเรียบร้อย']);
    }
    
    public function bulkDelete()
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $input = json_decode(file_get_contents('php://input'), true);
        $registerIds = $input['registerIds'] ?? [];
        
        if (!$registerIds || !is_array($registerIds) || count($registerIds) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Register IDs array is required']);
            return;
        }
        
        $ids = array_filter(array_map('intval', $registerIds), function($id) { return $id > 0; });
        
        if (count($ids) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No valid register IDs provided']);
            return;
        }
        
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        
        $registersToDelete = Database::fetchAll(
            "SELECT id, emp_id FROM register WHERE id IN ($placeholders) AND is_deleted = 0",
            $ids
        );
        
        $foundIds = array_column($registersToDelete, 'id');
        
        if (count($foundIds) > 0) {
            $deletePlaceholders = implode(',', array_fill(0, count($foundIds), '?'));
            Database::query(
                "UPDATE register SET is_deleted = 1 WHERE id IN ($deletePlaceholders)",
                $foundIds
            );
        }
        
        echo json_encode([
            'success' => true,
            'message' => "Successfully deleted " . count($foundIds) . " registers",
            'deletedCount' => count($foundIds),
            'requestedCount' => count($ids),
            'notFoundCount' => count($ids) - count($foundIds)
        ]);
    }
    
    public function getDivisions()
    {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM division ORDER BY div_name");
        echo json_encode($stmt->fetchAll());
    }
    
    public function getDepartments()
    {
        $divId = $_GET['div_id'] ?? null;
        
        if (!$divId) {
            http_response_code(400);
            echo json_encode(['error' => 'div_id is required']);
            return;
        }
        
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM dept WHERE div_id = ? ORDER BY dept_name");
        $stmt->execute([$divId]);
        echo json_encode($stmt->fetchAll());
    }
    
    public function getAllDepartments()
    {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM dept ORDER BY dept_name");
        echo json_encode($stmt->fetchAll());
    }
    
    public function getEmployees()
    {
        $deptId = $_GET['dept_id'] ?? null;
        
        if (!$deptId) {
            http_response_code(400);
            echo json_encode(['error' => 'Department ID is required']);
            return;
        }
        
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT e.id, e.emp_name, p.position_name, e.dept_id 
                              FROM employee e 
                              LEFT JOIN position p ON e.position_id = p.id 
                              WHERE e.dept_id = ? AND e.is_deleted = 0 
                              ORDER BY e.emp_name");
        $stmt->execute([$deptId]);
        echo json_encode($stmt->fetchAll());
    }
    
    public function getAllEmployees()
    {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT e.id, e.emp_name, p.position_name, d.dept_name, division.div_name
                            FROM employee e 
                            LEFT JOIN position p ON e.position_id = p.id 
                            LEFT JOIN dept d ON e.dept_id = d.id
                            LEFT JOIN division ON d.div_id = division.id
                            WHERE e.is_deleted = 0 
                            ORDER BY e.emp_name");
        echo json_encode($stmt->fetchAll());
    }
    
    public function getEmployeeInfo($id)
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT e.id, e.emp_name, p.position_name, e.dept_id, d.dept_name, d.div_id, division_obj.div_name
                              FROM employee e
                              LEFT JOIN position p ON e.position_id = p.id
                              LEFT JOIN dept d ON e.dept_id = d.id
                              LEFT JOIN division division_obj ON d.div_id = division_obj.id
                              WHERE e.id = ? AND e.is_deleted = 0");
        $stmt->execute([$id]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found']);
            return;
        }
        
        echo json_encode([
            'id' => $employee['id'],
            'emp_name' => $employee['emp_name'],
            'position_name' => $employee['position_name'],
            'department_id' => $employee['dept_id'],
            'department_name' => $employee['dept_name'],
            'division_id' => $employee['div_id'],
            'division_name' => $employee['div_name']
        ]);
    }
    
    public function searchEmployees()
    {
        $search = $_GET['search'] ?? '';
        
        $db = Database::getConnection();
        $query = "SELECT id, emp_name FROM employee WHERE is_deleted = 0";
        $params = [];
        
        if ($search) {
            $query .= " AND emp_name LIKE ? ORDER BY emp_name LIMIT 10";
            $params[] = "%$search%";
        } else {
            $query .= " ORDER BY emp_name LIMIT 10";
        }
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll());
    }
    
    public function exportData()
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $year = $_GET['year'] ?? null;
        
        $db = Database::getConnection();
        
        $additionalWhere = '';
        $params = [];
        
        if ($year) {
            $additionalWhere = "AND YEAR(r.sys_datetime) = ?";
            $params[] = $year;
        }
        
        $query = "SELECT r.*, e.emp_name, p.position_name, d.dept_name, division_obj.div_name,
                         division_obj.id as division_id, d.id as dept_id
                  FROM register r
                  INNER JOIN employee e ON r.emp_id = e.id
                  LEFT JOIN position p ON e.position_id = p.id
                  LEFT JOIN dept d ON e.dept_id = d.id
                  LEFT JOIN division division_obj ON d.div_id = division_obj.id
                  INNER JOIN (
                      SELECT emp_id, MAX(id) as latest_id
                      FROM register
                      WHERE is_deleted = 0
                      GROUP BY emp_id
                  ) latest ON r.id = latest.latest_id
                  WHERE r.is_deleted = 0 $additionalWhere
                  ORDER BY division_obj.id, d.id, e.emp_name";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $registers = $stmt->fetchAll();
        
        $unregisteredQuery = "SELECT e.id, e.emp_name, p.position_name, d.dept_name, division_obj.div_name,
                                     division_obj.id as division_id, d.id as dept_id
                              FROM employee e
                              LEFT JOIN position p ON e.position_id = p.id
                              LEFT JOIN dept d ON e.dept_id = d.id
                              LEFT JOIN division division_obj ON d.div_id = division_obj.id
                              WHERE e.is_deleted = 0
                                AND e.id NOT IN (SELECT DISTINCT emp_id FROM register WHERE is_deleted = 0)
                              ORDER BY division_obj.id, d.id, e.emp_name";
        
        $unregStmt = $db->prepare($unregisteredQuery);
        $unregStmt->execute();
        $unregisteredEmployees = $unregStmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'registers' => $registers,
            'unregisteredEmployees' => $unregisteredEmployees,
            'count' => count($registers),
            'unregisteredCount' => count($unregisteredEmployees)
        ]);
    }
    
    public function exportByDate()
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        
        $db = Database::getConnection();
        
        $conditions = ["r.is_deleted = 0", "e.is_deleted = 0"];
        $params = [];
        
        if ($startDate) {
            $conditions[] = "DATE(r.sys_datetime) >= ?";
            $params[] = $startDate;
        }
        
        if ($endDate) {
            $conditions[] = "DATE(r.sys_datetime) <= ?";
            $params[] = $endDate;
        }
        
        $whereClause = "WHERE " . implode(" AND ", $conditions);
        
        $query = "SELECT r.*, e.emp_name, p.position_name, d.dept_name, division_obj.div_name
                  FROM register r
                  INNER JOIN employee e ON r.emp_id = e.id
                  LEFT JOIN position p ON e.position_id = p.id
                  LEFT JOIN dept d ON e.dept_id = d.id
                  LEFT JOIN division division_obj ON d.div_id = division_obj.id
                  $whereClause
                  ORDER BY r.sys_datetime DESC";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $registers = $stmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'registers' => $registers,
            'count' => count($registers),
            'startDate' => $startDate,
            'endDate' => $endDate
        ]);
    }
    
    public function stats()
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $db = Database::getConnection();
        
        // Total registers
        $totalStmt = $db->query("SELECT COUNT(*) as total FROM register WHERE is_deleted = 0");
        $total = $totalStmt->fetch()['total'];
        
        // Today's registers
        $todayStmt = $db->query("SELECT COUNT(*) as today FROM register WHERE is_deleted = 0 AND DATE(sys_datetime) = CURDATE()");
        $today = $todayStmt->fetch()['today'];
        
        // This month's registers
        $monthStmt = $db->query("SELECT COUNT(*) as month FROM register WHERE is_deleted = 0 AND MONTH(sys_datetime) = MONTH(CURDATE()) AND YEAR(sys_datetime) = YEAR(CURDATE())");
        $month = $monthStmt->fetch()['month'];
        
        // Registers by department
        $byDeptStmt = $db->query("
            SELECT d.dept_name, COUNT(*) as count
            FROM register r
            INNER JOIN employee e ON r.emp_id = e.id
            INNER JOIN dept d ON e.dept_id = d.id
            WHERE r.is_deleted = 0
            GROUP BY d.id, d.dept_name
            ORDER BY count DESC
            LIMIT 10
        ");
        $byDepartment = $byDeptStmt->fetchAll();
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'total' => (int)$total,
                'today' => (int)$today,
                'thisMonth' => (int)$month,
                'byDepartment' => $byDepartment
            ]
        ]);
    }
}