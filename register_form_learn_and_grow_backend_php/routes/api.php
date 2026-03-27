<?php
return [
    'GET' => [
        '/' => 'AuthController@index',
        '/health' => 'AuthController@health',
        
        // Users
        '/api/users' => 'UsersController@index',
        '/api/users/divisions' => 'UsersController@getDivisions',
        '/api/users/departments' => 'UsersController@getDepartments',
        '/api/users/departments/all' => 'UsersController@getAllDepartments',
        '/api/users/employees' => 'UsersController@getEmployees',
        '/api/users/employees/all' => 'UsersController@getAllEmployees',
        '/api/users/employee-info/{id}' => 'UsersController@getEmployeeInfo',
        '/api/users/employees/search' => 'UsersController@searchEmployees',
        '/api/users/types' => 'UsersController@getTypes',
        '/api/users/export' => 'UsersController@export',
        '/api/users/{id}' => 'UsersController@show',
        
        // Employees
        '/api/employees' => 'EmployeesController@index',
        '/api/employees/single/{id}' => 'EmployeesController@show',
        '/api/employees/positions' => 'EmployeesController@getPositions',
        '/api/employees/departments' => 'EmployeesController@getDepartments',
        '/api/employees/departments/all' => 'EmployeesController@getAllDepartments',
        '/api/employees/divisions' => 'EmployeesController@getDivisions',
        '/api/employees/divisions/all' => 'EmployeesController@getAllDivisions',
        '/api/employees/departments/by-division/{id}' => 'EmployeesController@getDepartmentsByDivision',
        '/api/employees/export' => 'EmployeesController@export',
        
        // Registers
        '/api/registers' => 'RegistersController@index',
        '/api/registers/single/{id}' => 'RegistersController@show',
        '/api/registers/divisions' => 'RegistersController@getDivisions',
        '/api/registers/departments' => 'RegistersController@getDepartments',
        '/api/registers/departments/all' => 'RegistersController@getAllDepartments',
        '/api/registers/employees' => 'RegistersController@getEmployees',
        '/api/registers/employees/all' => 'RegistersController@getAllEmployees',
        '/api/registers/employee-info/{id}' => 'RegistersController@getEmployeeInfo',
        '/api/registers/employees/search' => 'RegistersController@searchEmployees',
        '/api/registers/export-data' => 'RegistersController@exportData',
        '/api/registers/export-by-date' => 'RegistersController@exportByDate',
        '/api/registers/stats' => 'RegistersController@stats',
    ],
    
    'POST' => [
        '/api/auth/login' => 'AuthController@login',
        '/api/auth/verify-2fa' => 'AuthController@verify2fa',
        '/api/auth/setup-2fa' => 'AuthController@setup2fa',
        
        '/api/users' => 'UsersController@store',
        '/api/users/bulk-delete' => 'UsersController@bulkDelete',
        
        '/api/employees' => 'EmployeesController@store',
        '/api/employees/test-import' => 'EmployeesController@testImport',
        '/api/employees/import' => 'EmployeesController@import',
        '/api/employees/import-batch' => 'EmployeesController@importBatch',
        '/api/employees/detect-missing' => 'EmployeesController@detectMissing',
        '/api/employees/excel-mass-delete' => 'EmployeesController@excelMassDelete',
        '/api/employees/excel-mass-delete/preview' => 'EmployeesController@previewMassDelete',
        
        '/api/registers' => 'RegistersController@store',
        '/api/registers/bulk-delete' => 'RegistersController@bulkDelete',
    ],
    
    'PUT' => [
        '/api/users/{id}' => 'UsersController@update',
        '/api/users/reset-2fa/{id}' => 'UsersController@reset2fa',
        '/api/employees/{id}' => 'EmployeesController@update',
        '/api/registers/{id}' => 'RegistersController@update',
    ],
    
    'DELETE' => [
        '/api/users/{id}' => 'UsersController@destroy',
        '/api/users/2fa/{id}' => 'UsersController@delete2fa',
        '/api/employees/{id}' => 'EmployeesController@destroy',
        '/api/employees/{id}/force' => 'EmployeesController@forceDelete',
        '/api/registers/single/{id}' => 'RegistersController@destroy',
        '/api/registers/all' => 'RegistersController@destroyAll',
    ],
    
    'PATCH' => [
        '/api/employees/excel-mass-delete' => 'EmployeesController@excelMassDelete',
    ]
];