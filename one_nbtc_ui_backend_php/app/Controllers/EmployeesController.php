<?php
namespace App\Controllers;

use App\Services\Database;
use App\Services\Logger;
use App\Middleware\AuthMiddleware;

class EmployeesController
{
    public function index()
    {
        $search = $_GET['search'] ?? '';
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
        $divisionId = $_GET['division_id'] ?? null;
        $deptId = $_GET['dept_id'] ?? null;
        $offset = ($page - 1) * $limit;
        
        Logger::logRequest(
            $_SERVER['REQUEST_METHOD'],
            $_SERVER['REQUEST_URI'],
            $_SERVER['REMOTE_ADDR'] ?? '',
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        );
        
        $db = Database::getConnection();
        
        $conditions = ["e.is_deleted = 0"];
        $params = [];
        
        if ($search) {
            $conditions[] = "e.emp_name LIKE ?";
            $params[] = "%$search%";
        }
        
        if ($divisionId) {
            $conditions[] = "d.div_id = ?";
            $params[] = $divisionId;
        }
        
        if ($deptId) {
            $conditions[] = "e.dept_id = ?";
            $params[] = $deptId;
        }
        
        $whereClause = "WHERE " . implode(" AND ", $conditions);
        
        $query = "SELECT e.id, e.emp_name, p.position_name, d.dept_name, division.div_name
                  FROM employee e
                  LEFT JOIN position p ON e.position_id = p.id
                  LEFT JOIN dept d ON e.dept_id = d.id
                  LEFT JOIN division ON d.div_id = division.id
                  $whereClause
                  ORDER BY e.id
                  LIMIT ? OFFSET ?";
        
        $stmt = $db->prepare($query);
        $stmt->execute(array_merge($params, [$limit, $offset]));
        $employees = $stmt->fetchAll();
        
        $countQuery = "SELECT COUNT(*) as total
                       FROM employee e
                       LEFT JOIN position p ON e.position_id = p.id
                       LEFT JOIN dept d ON e.dept_id = d.id
                       LEFT JOIN division ON d.div_id = division.id
                       $whereClause";
        
        $countStmt = $db->prepare($countQuery);
        $countStmt->execute($params);
        $total = $countStmt->fetch()['total'];
        
        $totalPages = ceil($total / $limit);
        
        echo json_encode([
            'employees' => $employees,
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
        $stmt = $db->prepare("SELECT * FROM employee WHERE id = ? AND is_deleted = 0");
        $stmt->execute([$id]);
        $employee = $stmt->fetch();
        
        if (!$employee) {
            http_response_code(404);
            echo json_encode(['error' => 'Employee not found']);
            return;
        }
        
        echo json_encode($employee);
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
        
        $empName = $input['emp_name'] ?? '';
        $positionId = $input['position_id'] ?? null;
        $deptId = $input['dept_id'] ?? null;
        
        $db = Database::getConnection();
        $stmt = $db->prepare("INSERT INTO employee (emp_name, position_id, dept_id) VALUES (?, ?, ?)");
        $stmt->execute([$empName, $positionId, $deptId]);
        
        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
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
        
        $empName = $input['emp_name'] ?? '';
        $positionId = $input['position_id'] ?? null;
        $deptId = $input['dept_id'] ?? null;
        
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE employee SET emp_name = ?, position_id = ?, dept_id = ? WHERE id = ?");
        $stmt->execute([$empName, $positionId, $deptId, $id]);
        
        echo json_encode(['success' => true]);
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
        $stmt = $db->prepare("UPDATE employee SET is_deleted = 1 WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    }
    
    public function forceDelete($id)
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
        $stmt = $db->prepare("DELETE FROM employee WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode(['success' => true]);
    }
    
    public function getPositions()
    {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM position ORDER BY position_name");
        echo json_encode($stmt->fetchAll());
    }
    
    public function getDepartments()
    {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM dept ORDER BY dept_name");
        echo json_encode($stmt->fetchAll());
    }
    
    public function getDivisions()
    {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM division ORDER BY div_name");
        echo json_encode($stmt->fetchAll());
    }
    
    public function getDepartmentsByDivision($id)
    {
        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM dept WHERE div_id = ? ORDER BY dept_name");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetchAll());
    }

    public function testImport()
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
        $excelData = $input['excelData'] ?? [];
        
        if (!$excelData || !is_array($excelData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid Excel data format']);
            return;
        }
        
        $result = $this->processExcelImport($excelData, true); // testing mode
        
        echo json_encode([
            'success' => true,
            'saved' => $result['saved'],
            'updated' => $result['updated'],
            'errors' => $result['errors'],
            'totalRows' => $result['totalRows'],
            'createdCount' => $result['createdCount'],
            'updatedCount' => $result['updatedCount'],
            'unchangedCount' => $result['unchangedCount'],
            'errorCount' => $result['errorCount'],
            'testingMode' => true,
            'message' => 'This is a test. No data was actually saved.'
        ]);
    }
    
    public function import()
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
        $excelData = $input['excelData'] ?? [];
        
        if (!$excelData || !is_array($excelData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid Excel data format']);
            return;
        }
        
        $db = Database::getConnection();
        
        try {
            $db->beginTransaction();
            $result = $this->processExcelImport($excelData, false); // real import
            $db->commit();
            
            echo json_encode([
                'success' => true,
                'saved' => $result['saved'],
                'updated' => $result['updated'],
                'errors' => $result['errors'],
                'totalRows' => $result['totalRows'],
                'createdCount' => $result['createdCount'],
                'updatedCount' => $result['updatedCount'],
                'unchangedCount' => $result['unchangedCount'],
                'errorCount' => $result['errorCount'],
                'message' => 'Import completed. Existing employees were updated if their details differed.'
            ]);
        } catch (\Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
    
    public function importBatch()
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
        $excelData = $input['excelData'] ?? [];
        $batchSize = $input['batchSize'] ?? 100;
        
        if (!$excelData || !is_array($excelData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Invalid Excel data format']);
            return;
        }
        
        $db = Database::getConnection();
        $results = ['saved' => [], 'updated' => [], 'errors' => [], 'batches' => []];
        
        try {
            $db->beginTransaction();
            
            // Detect headers once
            $detection = $this->detectColumnIndices($excelData);
            $headerRowIndex = $detection['headerRowIndex'];
            $columnMap = $detection['columnMap'];
            $dataStartIndex = $detection['dataStartIndex'];
            $allDataRows = array_slice($excelData, $dataStartIndex);
            $totalBatches = ceil(count($allDataRows) / $batchSize);
            
            // Load existing data once
            $divisions = Database::fetchAll("SELECT * FROM division");
            $departments = Database::fetchAll("SELECT * FROM dept");
            $positions = Database::fetchAll("SELECT * FROM `position`");
            
            for ($batchIndex = 0; $batchIndex < $totalBatches; $batchIndex++) {
                $start = $batchIndex * $batchSize;
                $batchRows = array_slice($allDataRows, $start, $batchSize);
                $batchSaved = [];
                $batchUpdated = [];
                $batchErrors = [];
                
                foreach ($batchRows as $rowIndex => $row) {
                    $globalRowIndex = $start + $rowIndex;
                    $rowNumber = $dataStartIndex + $globalRowIndex + 1;
                    
                    $validation = $this->parseExcelRow($row, $rowNumber, $divisions, $departments, $positions, $columnMap);
                    
                    if (isset($validation['skipped']) && $validation['skipped']) {
                        continue;
                    }
                    
                    if (isset($validation['error'])) {
                        $batchErrors[] = $validation['error'];
                        continue;
                    }
                    
                    $empName = $validation['data']['emp_name'];
                    $deptId = $validation['data']['dept_id'];
                    $positionId = $validation['data']['position_id'];
                    
                    // Check existing employee
                    $existing = Database::fetchOne("SELECT id, position_id, dept_id FROM employee WHERE emp_name = ? AND is_deleted = 0", [$empName]);
                    
                    if ($existing) {
                        if ($existing['position_id'] != $positionId || $existing['dept_id'] != $deptId) {
                            Database::update('employee', 
                                ['position_id' => $positionId, 'dept_id' => $deptId],
                                'id = ?',
                                [$existing['id']]
                            );
                            $batchUpdated[] = array_merge($validation['data'], ['id' => $existing['id'], 'status' => 'UPDATED']);
                        } else {
                            $batchSaved[] = array_merge($validation['data'], ['id' => $existing['id'], 'status' => 'UNCHANGED']);
                        }
                    } else {
                        $newId = Database::insert('employee', [
                            'emp_name' => $empName,
                            'position_id' => $positionId,
                            'dept_id' => $deptId
                        ]);
                        $batchSaved[] = array_merge($validation['data'], ['id' => $newId, 'status' => 'CREATED']);
                    }
                }
                
                $results['saved'] = array_merge($results['saved'], $batchSaved);
                $results['updated'] = array_merge($results['updated'], $batchUpdated);
                $results['errors'] = array_merge($results['errors'], $batchErrors);
                $results['batches'][] = [
                    'batch' => $batchIndex + 1,
                    'startRow' => $start + 1,
                    'endRow' => min($start + $batchSize, count($allDataRows)),
                    'saved' => count($batchSaved),
                    'updated' => count($batchUpdated),
                    'errors' => count($batchErrors)
                ];
            }
            
            $db->commit();
            
            echo json_encode([
                'success' => true,
                'totalRows' => count($allDataRows),
                'totalSaved' => count($results['saved']),
                'totalUpdated' => count($results['updated']),
                'totalErrors' => count($results['errors']),
                'batches' => $results['batches'],
                'saved' => $results['saved'],
                'updated' => $results['updated'],
                'errors' => $results['errors']
            ]);
            
        } catch (\Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
    
    public function detectMissing()
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
        $excelData = $input['excelData'] ?? [];
        
        if (!$excelData || !is_array($excelData)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Excel data required']);
            return;
        }
        
        // Get all employees from database
        $allEmployees = Database::fetchAll("
            SELECT e.id, e.emp_name, p.position_name, d.dept_name, division.div_name
            FROM employee e
            LEFT JOIN position p ON e.position_id = p.id
            LEFT JOIN dept d ON e.dept_id = d.id
            LEFT JOIN division ON d.div_id = division.id
            WHERE e.is_deleted = 0
            ORDER BY e.emp_name
        ");
        
        // Extract employee names from Excel
        $detection = $this->detectColumnIndices($excelData);
        $columnMap = $detection['columnMap'];
        $dataStartIndex = $detection['dataStartIndex'];
        $dataRows = array_slice($excelData, $dataStartIndex);
        
        $excelEmployeeNames = [];
        foreach ($dataRows as $row) {
            $empNameIndex = $columnMap['empNameIndex'] ?? -1;
            if ($empNameIndex >= 0 && isset($row[$empNameIndex]) && $row[$empNameIndex]) {
                $excelEmployeeNames[] = trim((string)$row[$empNameIndex]);
            }
        }
        $excelEmployeeNames = array_unique($excelEmployeeNames);
        
        // Find missing employees (in DB but not in Excel)
        $missingFromExcel = [];
        $databaseEmployeeNames = [];
        foreach ($allEmployees as $emp) {
            $databaseEmployeeNames[] = $emp['emp_name'];
            if (!in_array($emp['emp_name'], $excelEmployeeNames)) {
                $missingFromExcel[] = $emp;
            }
        }
        
        // Find new employees (in Excel but not in DB)
        $newInExcel = [];
        foreach ($excelEmployeeNames as $empName) {
            if (!in_array($empName, $databaseEmployeeNames)) {
                $newInExcel[] = ['emp_name' => $empName, 'status' => 'New in Excel (not in database)'];
            }
        }
        
        echo json_encode([
            'success' => true,
            'totalInDatabase' => count($allEmployees),
            'totalInExcel' => count($excelEmployeeNames),
            'missingCount' => count($missingFromExcel),
            'newInExcelCount' => count($newInExcel),
            'missingEmployeeIds' => array_column($missingFromExcel, 'id'),
            'missingEmployees' => $missingFromExcel,
            'newInExcel' => $newInExcel,
            'comparisonSummary' => [
                'onlyInDatabase' => count($missingFromExcel),
                'onlyInExcel' => count($newInExcel),
                'inBoth' => count($allEmployees) - count($missingFromExcel)
            ]
        ]);
    }
    
    public function excelMassDelete()
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
        $employeeIds = $input['employeeIds'] ?? [];
        
        if (!$employeeIds || !is_array($employeeIds) || count($employeeIds) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Employee IDs array is required']);
            return;
        }
        
        $ids = array_filter(array_map('intval', $employeeIds), function($id) { return $id > 0; });
        
        if (count($ids) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No valid employee IDs provided']);
            return;
        }
        
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        
        // Get employees to delete
        $employeesToDelete = Database::fetchAll(
            "SELECT id, emp_name FROM employee WHERE id IN ($placeholders) AND is_deleted = 0",
            $ids
        );
        
        $foundIds = array_column($employeesToDelete, 'id');
        
        if (count($foundIds) > 0) {
            $deletePlaceholders = implode(',', array_fill(0, count($foundIds), '?'));
            Database::query(
                "UPDATE employee SET is_deleted = 1 WHERE id IN ($deletePlaceholders)",
                $foundIds
            );
        }
        
        echo json_encode([
            'success' => true,
            'message' => "Successfully deleted " . count($foundIds) . " employees",
            'deletedCount' => count($foundIds),
            'deletedEmployees' => $employeesToDelete,
            'requestedCount' => count($ids),
            'notFoundCount' => count($ids) - count($foundIds)
        ]);
    }
    
    public function previewMassDelete()
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
        $employeeIds = $input['employeeIds'] ?? [];
        
        if (!$employeeIds || !is_array($employeeIds) || count($employeeIds) === 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Employee IDs array is required']);
            return;
        }
        
        $ids = array_filter(array_map('intval', $employeeIds), function($id) { return $id > 0; });
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        
        $employees = Database::fetchAll(
            "SELECT id, emp_name, position_id, dept_id FROM employee WHERE id IN ($placeholders) AND is_deleted = 0",
            $ids
        );
        
        $foundIds = array_column($employees, 'id');
        $missingIds = array_diff($ids, $foundIds);
        
        echo json_encode([
            'success' => true,
            'totalFound' => count($employees),
            'employees' => $employees,
            'missingIds' => array_values($missingIds)
        ]);
    }
    
    // ==================== PRIVATE HELPER METHODS ====================
    
    private function detectColumnIndices($excelData)
    {
        $headerRowIndex = -1;
        $headerRow = null;
        
        for ($i = 0; $i < count($excelData); $i++) {
            $row = $excelData[$i];
            if (!is_array($row) || count($row) === 0) continue;
            
            $firstCell = isset($row[0]) ? trim((string)$row[0]) : '';
            if ($firstCell === "ลำดับ") {
                $headerRowIndex = $i;
                $headerRow = $row;
                break;
            }
        }
        
        if ($headerRowIndex === -1) {
            throw new \Exception('Header row with "ลำดับ" not found in Excel file');
        }
        
        $columnMap = [
            'seqIndex' => 0,
            'empNameIndex' => null,
            'positionIndex' => null,
            'divisionIndex' => null,
            'deptIndex' => null
        ];
        
        for ($colIndex = 0; $colIndex < count($headerRow); $colIndex++) {
            $cellValue = isset($headerRow[$colIndex]) ? trim((string)$headerRow[$colIndex]) : '';
            $lowerValue = mb_strtolower($cellValue);
            
            if (mb_strpos($lowerValue, 'ชื่อ') === 0) {
                $columnMap['empNameIndex'] = $colIndex;
            }
            if (mb_strpos($lowerValue, 'ตำแหน่ง') === 0) {
                $columnMap['positionIndex'] = $colIndex;
            }
            if (mb_strpos($lowerValue, 'สายงาน') === 0) {
                $columnMap['divisionIndex'] = $colIndex;
            }
            if (mb_strpos($lowerValue, 'สำนัก') === 0 || mb_strpos($lowerValue, 'สังกัด') === 0) {
                $columnMap['deptIndex'] = $colIndex;
            }
        }
        
        $missing = [];
        if ($columnMap['empNameIndex'] === null) $missing[] = '"ชื่อ"';
        if ($columnMap['positionIndex'] === null) $missing[] = '"ตำแหน่ง"';
        if ($columnMap['divisionIndex'] === null) $missing[] = '"สายงาน"';
        if ($columnMap['deptIndex'] === null) $missing[] = '"สำนัก"';
        
        if (!empty($missing)) {
            throw new \Exception('Missing required columns: ' . implode(', ', $missing));
        }
        
        return [
            'headerRowIndex' => $headerRowIndex,
            'columnMap' => $columnMap,
            'dataStartIndex' => $headerRowIndex + 1
        ];
    }
    
    private function parseExcelRow($row, $rowNumber, &$divisions, &$departments, &$positions, $columnMap)
    {
        $getCell = function($index) use ($row) {
            if ($index === null || !isset($row[$index])) return '';
            return trim((string)$row[$index]);
        };
        
        $divisionStr = $getCell($columnMap['divisionIndex']);
        $deptStr = $getCell($columnMap['deptIndex']);
        $empName = $getCell($columnMap['empNameIndex']);
        $positionStr = $getCell($columnMap['positionIndex']);
        
        $missing = [];
        if (!$empName) $missing[] = 'Employee name';
        if (!$divisionStr) $missing[] = 'Division';
        if (!$deptStr) $missing[] = 'Department';
        if (!$positionStr) $missing[] = 'Position';
        
        if (!empty($missing)) {
            return ['error' => "Row $rowNumber: Missing required fields: " . implode(', ', $missing)];
        }
        
        // Find or add division
        $division = null;
        foreach ($divisions as $d) {
            if (mb_strtolower($d['div_name']) === mb_strtolower($divisionStr)) {
                $division = $d;
                break;
            }
        }
        
        if (!$division) {
            $divisionId = Database::insert('division', ['div_name' => $divisionStr]);
            $division = ['id' => $divisionId, 'div_name' => $divisionStr];
            $divisions[] = $division;
        }
        
        // Find or add department
        $department = null;
        foreach ($departments as $d) {
            if (mb_strtolower($d['dept_name']) === mb_strtolower($deptStr) && $d['div_id'] == $division['id']) {
                $department = $d;
                break;
            }
        }
        
        if (!$department) {
            $deptId = Database::insert('dept', ['dept_name' => $deptStr, 'div_id' => $division['id']]);
            $department = ['id' => $deptId, 'dept_name' => $deptStr, 'div_id' => $division['id']];
            $departments[] = $department;
        }
        
        // Find or add position
        $position = null;
        foreach ($positions as $p) {
            if (mb_strtolower($p['position_name']) === mb_strtolower($positionStr)) {
                $position = $p;
                break;
            }
        }
        
        if (!$position) {
            $positionId = Database::insert('position', ['position_name' => $positionStr]);
            $position = ['id' => $positionId, 'position_name' => $positionStr];
            $positions[] = $position;
        }
        
        return [
            'success' => true,
            'data' => [
                'emp_name' => $empName,
                'division_id' => $division['id'],
                'division_name' => $division['div_name'],
                'dept_id' => $department['id'],
                'dept_name' => $department['dept_name'],
                'position_id' => $position['id'],
                'position_name' => $position['position_name'],
                'rowNumber' => $rowNumber
            ]
        ];
    }
    
    private function processExcelImport($excelData, $testing = false)
    {
        $detection = $this->detectColumnIndices($excelData);
        $columnMap = $detection['columnMap'];
        $dataStartIndex = $detection['dataStartIndex'];
        $dataRows = array_slice($excelData, $dataStartIndex);
        
        // Load existing data
        $divisions = Database::fetchAll("SELECT * FROM division");
        $departments = Database::fetchAll("SELECT * FROM dept");
        $positions = Database::fetchAll("SELECT * FROM `position`");
        
        $saved = [];
        $updated = [];
        $errors = [];
        
        foreach ($dataRows as $index => $row) {
            $rowNumber = $dataStartIndex + $index + 1;
            
            $validation = $this->parseExcelRow($row, $rowNumber, $divisions, $departments, $positions, $columnMap);
            
            if (isset($validation['skipped']) && $validation['skipped']) {
                continue;
            }
            
            if (isset($validation['error'])) {
                $errors[] = $validation['error'];
                continue;
            }
            
            $empName = $validation['data']['emp_name'];
            $deptId = $validation['data']['dept_id'];
            $positionId = $validation['data']['position_id'];
            
            // Check existing employee
            $existing = Database::fetchOne("SELECT id, position_id, dept_id FROM employee WHERE emp_name = ? AND is_deleted = 0", [$empName]);
            
            if ($existing) {
                $needsUpdate = ($existing['position_id'] != $positionId || $existing['dept_id'] != $deptId);
                
                if ($needsUpdate) {
                    if (!$testing) {
                        Database::update('employee', 
                            ['position_id' => $positionId, 'dept_id' => $deptId],
                            'id = ?',
                            [$existing['id']]
                        );
                    }
                    $updated[] = array_merge($validation['data'], [
                        'id' => $existing['id'],
                        'status' => $testing ? 'WOULD_UPDATE' : 'UPDATED',
                        'previous_position_id' => $existing['position_id'],
                        'previous_dept_id' => $existing['dept_id']
                    ]);
                } else {
                    $saved[] = array_merge($validation['data'], [
                        'id' => $existing['id'],
                        'status' => 'UNCHANGED'
                    ]);
                }
            } else {
                if (!$testing) {
                    $newId = Database::insert('employee', [
                        'emp_name' => $empName,
                        'position_id' => $positionId,
                        'dept_id' => $deptId
                    ]);
                    $saved[] = array_merge($validation['data'], ['id' => $newId, 'status' => 'CREATED']);
                } else {
                    $saved[] = array_merge($validation['data'], ['status' => 'WOULD_CREATE']);
                }
            }
        }
        
        return [
            'saved' => $saved,
            'updated' => $updated,
            'errors' => $errors,
            'totalRows' => count($dataRows),
            'createdCount' => count(array_filter($saved, function($e) { return $e['status'] === 'CREATED' || $e['status'] === 'WOULD_CREATE'; })),
            'updatedCount' => count($updated),
            'unchangedCount' => count(array_filter($saved, function($e) { return $e['status'] === 'UNCHANGED'; })),
            'errorCount' => count($errors)
        ];
    }
}