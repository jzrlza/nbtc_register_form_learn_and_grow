const express = require('express');
const { getConnection } = require('../config/database');
const router = express.Router();

// GET all employees with position and department names
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const connection = await getConnection();
    
    let whereClause = 'WHERE e.is_deleted = 0 \n';
    let queryParams = [];
    
    if (search) {
      whereClause += `AND e.emp_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }
    
    const offset = (page - 1) * limit;
    
    // Get employees with pagination
    const employeeQuery = `
      SELECT 
        e.id,
        e.emp_name,
        p.position_name,
        d.dept_name,
        division.div_name,
        e.is_register
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN dept d ON e.dept_id = d.id
      LEFT JOIN division ON d.div_id = division.id
      ${whereClause}
      ORDER BY e.id
      LIMIT ? OFFSET ?
    `;
    
    // Add limit and offset to params
    const employeeParams = [...queryParams, parseInt(limit).toString(), parseInt(offset).toString()];
    
    const [rows] = await connection.execute(employeeQuery, employeeParams);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM employee e
      LEFT JOIN position p ON e.position_id = p.id
      LEFT JOIN dept d ON e.dept_id = d.id
      LEFT JOIN division ON d.div_id = division.id
      ${whereClause}
    `;
    
    const [countResult] = await connection.execute(countQuery, queryParams);
    
    await connection.end();

    const totalPages = Math.ceil(countResult[0].total / limit);
    
    res.json({
      employees: rows,
      total: countResult[0].total,
      page: totalPages > 0 ? parseInt(page) : 0,
      limit: parseInt(limit),
      totalPages: totalPages
    });
  } catch (error) {
    console.log('Database error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET positions for dropdown
router.get('/positions', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM position ORDER BY position_name');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET departments for dropdown
router.get('/departments', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM dept ORDER BY dept_name');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/divisions', async (req, res) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM division ORDER BY div_name');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST create new employee
router.post('/', async (req, res) => {
  try {
    const { emp_name, position_id, dept_id } = req.body;
    const connection = await getConnection();
    
    const [result] = await connection.execute(
      'INSERT INTO employee (emp_name, position_id, dept_id) VALUES (?, ?, ?)',
      [emp_name, position_id, dept_id]
    );
    
    await connection.end();
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { emp_name, position_id, dept_id } = req.body;
    const connection = await getConnection();
    
    await connection.execute(
      'UPDATE employee SET emp_name = ?, position_id = ?, dept_id = ? WHERE id = ?',
      [emp_name, position_id, dept_id, id]
    );
    
    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET single employee for edit
router.get('/single/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await getConnection();
    
    const [rows] = await connection.execute(
      'SELECT * FROM employee WHERE id = ? AND is_deleted = 0',
      [id]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await getConnection();
    
    await connection.execute(
      'UPDATE employee SET is_deleted = 1 WHERE id = ?',
      [id]
    );
    
    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/force', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await getConnection();
    
    await connection.execute(
      'DELETE FROM employee WHERE id = ?',
      [id]
    );
    
    await connection.end();
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REUSABLE IMPORT FUNCTIONS ====================

/**
 * Find the first data row by detecting when the first column becomes numerical
 */
const findDataStartIndex = (excelData) => {
  // Start from row 1 (skip header row 0)
  for (let i = 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = row[0]?.toString().trim();
    
    // Check if first cell is a number (row index)
    if (firstCell && !isNaN(firstCell) && firstCell !== '') {
      return i; // Found the first data row
    }
  }
  return 2; // Default to row 2 if no numerical first column found
};
/**
 * Parse and validate Excel row data
 */
const parseExcelRow = (row, rowNumber, divisions, departments, positions) => {
  if (!row || row.length === 0 || row.every(cell => !cell)) {
    return { skipped: true, reason: 'Empty row' };
  }
  
  const divisionStr = row[1]?.toString().trim();
  const deptStr = row[2]?.toString().trim();
  const empName = row[3]?.toString().trim();
  const positionStr = row[4]?.toString().trim();
  
  // Validate required fields
  const missingFields = [];
  if (!empName) missingFields.push('Employee name');
  if (!divisionStr) missingFields.push('Division');
  if (!deptStr) missingFields.push('Department');
  if (!positionStr) missingFields.push('Position');
  
  if (missingFields.length > 0) {
    return { 
      error: `Row ${rowNumber}: Missing required fields: ${missingFields.join(', ')}` 
    };
  }
  
  // Find division
  const division = divisions.find(div => 
    div.div_name.toLowerCase() === divisionStr.toLowerCase()
  );
  if (!division) {
    const availableDivisions = divisions.map(d => d.div_name).join(', ');
    return { 
      error: `Row ${rowNumber}: Division "${divisionStr}" not found. Available: ${availableDivisions}` 
    };
  }
  
  // Find department
  const department = departments.find(dept => 
    dept.dept_name.toLowerCase() === deptStr.toLowerCase() && 
    dept.div_id == division.id
  );
  if (!department) {
    const availableDepts = departments
      .filter(d => d.div_id == division.id)
      .map(d => d.dept_name);
    return { 
      error: `Row ${rowNumber}: Department "${deptStr}" not found in division "${divisionStr}". Available: ${availableDepts.join(', ')}` 
    };
  }
  
  // Find position
  const position = positions.find(pos => 
    pos.position_name.toLowerCase() === positionStr.toLowerCase()
  );
  if (!position) {
    const availablePositions = positions.map(p => p.position_name).join(', ');
    return { 
      error: `Row ${rowNumber}: Position "${positionStr}" not found. Available: ${availablePositions}` 
    };
  }
  
  return {
    success: true,
    data: {
      emp_name: empName,
      division_id: division.id,
      division_name: division.div_name,
      dept_id: department.id,
      dept_name: department.dept_name,
      position_id: position.id,
      position_name: position.position_name,
      rowNumber
    }
  };
};

/**
 * Process Excel data rows (validation only)
 */
const processExcelValidation = async (excelData, connection) => {
  const [divisions, departments, positions] = await Promise.all([
    connection.execute('SELECT * FROM division').then(([rows]) => rows),
    connection.execute('SELECT * FROM dept').then(([rows]) => rows),
    connection.execute('SELECT * FROM position').then(([rows]) => rows)
  ]);
  
  const results = [];
  const errors = [];
  
  // Skip header row
  const dataRows = excelData.slice(findDataStartIndex(excelData));
  
  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = parseExcelRow(row, rowNumber, divisions, departments, positions);
    
    if (result.skipped) {
      console.log(`Row ${rowNumber}: ${result.reason}`);
      return;
    }
    
    if (result.error) {
      console.log(`Row ${rowNumber} ERROR: ${result.error}`);
      errors.push(result.error);
      return;
    }
    
    console.log(`Row ${rowNumber}: Validated successfully`, result.data);
    results.push({
      ...result.data,
      status: 'VALID'
    });
  });
  
  return {
    results,
    errors,
    totalRows: dataRows.length,
    validRows: results.length,
    errorRows: errors.length
  };
};

/**
 * Process Excel data rows with database saving
 */
const processExcelImport = async (excelData, connection) => {
  const [divisions, departments, positions] = await Promise.all([
    connection.execute('SELECT * FROM division').then(([rows]) => rows),
    connection.execute('SELECT * FROM dept').then(([rows]) => rows),
    connection.execute('SELECT * FROM position').then(([rows]) => rows)
  ]);
  
  const savedEmployees = [];
  const errors = [];
  
  // Skip header row
  const dataRows = excelData.slice(findDataStartIndex(excelData));
  
  for (let index = 0; index < dataRows.length; index++) {
    const row = dataRows[index];
    const rowNumber = index + 2;
    
    // Parse and validate row
    const validation = parseExcelRow(row, rowNumber, divisions, departments, positions);
    
    if (validation.skipped) {
      console.log(`Row ${rowNumber}: ${validation.reason}`);
      continue;
    }
    
    if (validation.error) {
      errors.push(validation.error);
      continue;
    }
    
    // Check for existing employee
    const { emp_name: empName, dept_id, position_id } = validation.data;
    
    try {
      const [existingEmployees] = await connection.execute(
        'SELECT id FROM employee WHERE emp_name = ? AND is_deleted = 0',
        [empName]
      );
      
      if (existingEmployees.length > 0) {
        errors.push(`Row ${rowNumber}: Employee "${empName}" already exists`);
        continue;
      }
      
      // Insert employee
      const [insertResult] = await connection.execute(
        'INSERT INTO employee (emp_name, position_id, dept_id, is_register) VALUES (?, ?, ?, 0)',
        [empName, position_id, dept_id]
      );
      
      const savedEmployee = {
        ...validation.data,
        id: insertResult.insertId,
        status: 'SAVED'
      };
      
      console.log(`Row ${rowNumber}: Employee saved successfully`, savedEmployee);
      savedEmployees.push(savedEmployee);
      
    } catch (dbError) {
      errors.push(`Row ${rowNumber}: Database error - ${dbError.message}`);
    }
  }
  
  return {
    saved: savedEmployees,
    errors,
    totalRows: dataRows.length,
    savedCount: savedEmployees.length,
    errorCount: errors.length
  };
};

// ==================== ROUTE HANDLERS ====================

// POST test Excel import (validation only)
router.post('/test-import', async (req, res) => {
  console.log('=== EXCEL IMPORT TEST START ===');
  
  try {
    const { excelData } = req.body;
    console.log('Raw Excel Data Received (first 5 rows):', excelData?.slice(0, 5));
    
    if (!excelData || !Array.isArray(excelData)) {
      console.log('ERROR: Invalid Excel data format');
      return res.json({ success: false, error: 'Invalid Excel data format' });
    }
    
    const connection = await getConnection();
    const result = await processExcelValidation(excelData, connection);
    await connection.end();
    
    console.log('=== EXCEL IMPORT TEST SUMMARY ===');
    console.log('Total Rows Processed:', result.totalRows);
    console.log('Successful Rows:', result.validRows);
    console.log('Error Rows:', result.errorRows);
    console.log('Results (first 5):', result.results.slice(0, 5));
    console.log('Errors (first 5):', result.errors.slice(0, 5));
    console.log('=== EXCEL IMPORT TEST END ===\n');
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.log('BACKEND ERROR:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST real Excel import (save to database)
router.post('/import', async (req, res) => {
  console.log('=== EXCEL IMPORT START (SAVING TO DATABASE) ===');
  
  const connection = await getConnection();
  
  try {
    const { excelData } = req.body;
    
    if (!excelData || !Array.isArray(excelData)) {
      throw new Error('Invalid Excel data format');
    }
    
    await connection.beginTransaction();
    const result = await processExcelImport(excelData, connection);
    await connection.commit();
    
    console.log('=== EXCEL IMPORT COMPLETE ===');
    console.log('Total Rows Processed:', result.totalRows);
    console.log('Successfully Saved:', result.savedCount);
    console.log('Errors:', result.errorCount);
    console.log('First 5 Saved Employees:', result.saved.slice(0, 5));
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    await connection.rollback();
    console.log('IMPORT ERROR:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

// Optional: Add batch processing for large files
router.post('/import-batch', async (req, res) => {
  const { excelData, batchSize = 100 } = req.body;
  
  if (!excelData || !Array.isArray(excelData)) {
    return res.status(400).json({ success: false, error: 'Invalid Excel data format' });
  }
  
  console.log(`Starting batch import with batch size: ${batchSize}`);
  
  const connection = await getConnection();
  const results = { saved: [], errors: [], batches: [] };
  
  try {
    await connection.beginTransaction();
    
    // Skip header row
    const dataRows = excelData.slice(1);
    const totalBatches = Math.ceil(dataRows.length / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = start + batchSize;
      const batchRows = dataRows.slice(start, end);
      
      console.log(`Processing batch ${batchIndex + 1}/${totalBatches}`);
      
      const batchResult = await processExcelImport(
        ['HEADER', ...batchRows], // Add header back for slice(1) to work
        connection
      );
      
      results.saved.push(...batchResult.saved);
      results.errors.push(...batchResult.errors);
      results.batches.push({
        batch: batchIndex + 1,
        saved: batchResult.savedCount,
        errors: batchResult.errorCount
      });
      
      // Optional: Commit each batch individually
      // await connection.commit();
      // await connection.beginTransaction();
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      totalRows: dataRows.length,
      totalSaved: results.saved.length,
      totalErrors: results.errors.length,
      batches: results.batches,
      saved: results.saved,
      errors: results.errors
    });
    
  } catch (error) {
    await connection.rollback();
    console.log('BATCH IMPORT ERROR:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  } finally {
    await connection.end();
  }
});

module.exports = router;