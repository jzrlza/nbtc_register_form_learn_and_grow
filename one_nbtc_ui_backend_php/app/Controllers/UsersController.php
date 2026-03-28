<?php
namespace App\Controllers;

use App\Services\Database;
use App\Services\Logger;
use App\Middleware\AuthMiddleware;

class UsersController
{
    public function index()
    {
        $search = $_GET['search'] ?? '';
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
        
        $whereClause = '';
        $params = [];
        
        if ($search) {
            $whereClause = 'AND u.username LIKE ?';
            $params[] = "%$search%";
        }
        
        $query = "SELECT u.id, u.username, u.employee_id, u.type, u.is_2fa_enabled,
                         (u.two_factor_secret IS NOT NULL) as has_two_password,
                         e.emp_name
                  FROM users u
                  LEFT JOIN employee e ON u.employee_id = e.id
                  WHERE u.is_deleted = 0 $whereClause
                  ORDER BY u.id DESC
                  LIMIT ? OFFSET ?";
        
        $stmt = $db->prepare($query);
        $stmt->execute(array_merge($params, [$limit, $offset]));
        $users = $stmt->fetchAll();
        
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM users u WHERE u.is_deleted = 0 $whereClause");
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'users' => $users,
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
        $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(400);
            echo json_encode(['error' => 'User not found']);
            return;
        }
        
        echo json_encode($user);
    }
    
    public function store()
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
        
        $employeeId = $input['employee_id'] ?? null;
        $type = $input['type'] ?? 1;
        $username = $input['username'] ?? '';
        $is2faEnabled = $input['is_2fa_enabled'] ?? 0;
        
        $db = Database::getConnection();
        
        // Check employee exists
        $empStmt = $db->prepare("SELECT emp_name FROM employee WHERE id = ? AND is_deleted = 0");
        $empStmt->execute([$employeeId]);
        if (!$empStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found']);
            return;
        }
        
        // Check username duplicate
        $dupStmt = $db->prepare("SELECT 1 FROM users WHERE username = ? AND is_deleted = 0");
        $dupStmt->execute([$username]);
        if ($dupStmt->fetch()) {
            http_response_code(401);
            echo json_encode(['error' => 'Username ซ้ำ']);
            return;
        }
        
        $stmt = $db->prepare("INSERT INTO users (username, employee_id, type, is_2fa_enabled, is_deleted) VALUES (?, ?, ?, ?, 0)");
        $stmt->execute([$username, $employeeId, $type, $is2faEnabled ? 1 : 0]);
        
        echo json_encode(['id' => $db->lastInsertId(), 'message' => 'เพิ่มผู้ใช้งานเรียบร้อย']);
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
        
        $employeeId = $input['employee_id'] ?? null;
        $type = $input['type'] ?? 1;
        $username = $input['username'] ?? '';
        $is2faEnabled = $input['is_2fa_enabled'] ?? 0;
        
        $db = Database::getConnection();
        
        // Check user exists
        $checkStmt = $db->prepare("SELECT id FROM users WHERE id = ? AND is_deleted = 0");
        $checkStmt->execute([$id]);
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'ไม่พบผู้ใช้งาน']);
            return;
        }
        
        // Check employee exists
        $empStmt = $db->prepare("SELECT emp_name FROM employee WHERE id = ? AND is_deleted = 0");
        $empStmt->execute([$employeeId]);
        if (!$empStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found']);
            return;
        }
        
        // Check username duplicate
        $dupStmt = $db->prepare("SELECT 1 FROM users WHERE username = ? AND is_deleted = 0 AND id != ?");
        $dupStmt->execute([$username, $id]);
        if ($dupStmt->fetch()) {
            http_response_code(401);
            echo json_encode(['error' => 'Username ซ้ำ']);
            return;
        }
        
        $stmt = $db->prepare("UPDATE users SET username = ?, employee_id = ?, type = ?, is_2fa_enabled = ? WHERE id = ? AND is_deleted = 0");
        $stmt->execute([$username, $employeeId, $type, $is2faEnabled ? 1 : 0, $id]);
        
        echo json_encode(['message' => 'แก้ไขผู้ใช้งานเรียบร้อย']);
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
        
        $selfDelete = (int)$user['id'] === (int)$id;
        
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET is_deleted = 1 WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['message' => 'User ถูกลบเรียบร้อย', 'self_delete' => $selfDelete]);
    }
    
    public function delete2fa($id)
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
        $stmt = $db->prepare("UPDATE users SET two_factor_secret = NULL WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['message' => '2FA ถูกลบเรียบร้อย']);
    }
    
    public function reset2fa($id)
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
        $stmt = $db->prepare("UPDATE users SET two_factor_secret = NULL, is_2fa_enabled = 0 WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['message' => '2FA ถูกรีเซ็ตเรียบร้อย']);
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
        $stmt = $db->prepare("SELECT e.id, e.emp_name, p.position_name, e.dept_id, d.dept_name, d.div_id, 
                                     division_obj.div_name, user_obj.type, user_obj.id as user_id
                              FROM employee e
                              LEFT JOIN position p ON e.position_id = p.id
                              LEFT JOIN dept d ON e.dept_id = d.id
                              LEFT JOIN division division_obj ON d.div_id = division_obj.id
                              LEFT JOIN users user_obj ON e.id = user_obj.employee_id
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
            'division_name' => $employee['div_name'],
            'type' => $employee['type'],
            'user_id' => $employee['user_id']
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
    
    public function getTypes()
    {
        echo json_encode([
            ['id' => 0, 'name' => 'Initial Admin'],
            ['id' => 1, 'name' => 'Admin'],
            ['id' => 2, 'name' => 'User']
        ]);
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
        $userIds = $input['userIds'] ?? [];
        
        if (!$userIds || !is_array($userIds) || count($userIds) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'User IDs array is required']);
            return;
        }
        
        $ids = array_filter(array_map('intval', $userIds), function($id) use ($user) {
            return $id > 0 && $id != $user['id']; // Prevent self-delete
        });
        
        if (count($ids) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No valid user IDs provided or cannot delete yourself']);
            return;
        }
        
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        
        $usersToDelete = Database::fetchAll(
            "SELECT id, username FROM users WHERE id IN ($placeholders) AND is_deleted = 0",
            $ids
        );
        
        $foundIds = array_column($usersToDelete, 'id');
        
        if (count($foundIds) > 0) {
            $deletePlaceholders = implode(',', array_fill(0, count($foundIds), '?'));
            Database::query(
                "UPDATE users SET is_deleted = 1 WHERE id IN ($deletePlaceholders)",
                $foundIds
            );
        }
        
        echo json_encode([
            'success' => true,
            'message' => "Successfully deleted " . count($foundIds) . " users",
            'deletedCount' => count($foundIds),
            'deletedUsers' => $usersToDelete,
            'requestedCount' => count($ids),
            'notFoundCount' => count($ids) - count($foundIds)
        ]);
    }
    
    public function export()
    {
        $user = AuthMiddleware::verify();
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $user['username'] ?? ''
        );
        
        $users = Database::fetchAll("
            SELECT u.id, u.username, u.type, u.is_2fa_enabled, u.created_at, e.emp_name
            FROM users u
            LEFT JOIN employee e ON u.employee_id = e.id
            WHERE u.is_deleted = 0
            ORDER BY u.id DESC
        ");
        
        echo json_encode([
            'success' => true,
            'users' => $users,
            'count' => count($users)
        ]);
    }
}