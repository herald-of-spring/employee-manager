const inquirer = require('inquirer');
const mysql = require('mysql2/promise');
const cTable = require('console.table');

async function init() {
  db = await mysql.createConnection({
    host: 'localhost',
    // MySQL username,
    user: 'root',
    // MySQL password
    password: 'andy',
    database: 'management_db'
  },
    console.log("Connection successful")
  );
  await mainMenu();
  await db.end();
}

async function getDepartment() {
  [rows, fields] = await db.query(`SELECT * FROM department;`);
  console.table(JSON.parse(JSON.stringify(rows)));
}

async function getRole() {
  [rows, fields] = await db.query(`SELECT 
                                    r.id AS id, 
                                    r.title AS title, 
                                    d.name AS department, 
                                    r.salary AS salary 
                                  FROM role AS r 
                                  JOIN department AS d 
                                  ON r.department_id = d.id;`);
  console.table(JSON.parse(JSON.stringify(rows)));
}

async function getEmployee() {
  [rows, fields] = await db.query(`SELECT 
                                    e.id AS id, 
                                    e.first_name AS first_name, 
                                    e.last_name AS last_name,
                                    r.title AS title,
                                    d.name AS department,
                                    r.salary AS salary,
                                    CONCAT(emp.first_name, ' ', emp.last_name) AS manager
                                  FROM employee AS e
                                  JOIN role AS r
                                  ON e.role_id = r.id
                                  JOIN department AS d
                                  ON r.department_id = d.id
                                  LEFT JOIN employee AS emp
                                  ON e.manager_id = emp.id;`);
  console.table(JSON.parse(JSON.stringify(rows)));
}

async function addToTable(table, arr) {
  let cols;
  let colfill;
  switch (table) {
    case "department":
      cols = "(name)";
      colfill = "(?)";
      break;
    case "role":
      cols = "(title, salary, department_id)";
      colfill = "(?, ?, ?)";
      [rows, fields] = await db.query(`SELECT * FROM department WHERE name = "${arr[2]}"`);
      arr[2] = JSON.parse(JSON.stringify(rows))[0].id;
      break;
    case "employee":
      cols = "(first_name, last_name, role_id, manager_id)"
      colfill = "(?, ?, ?, ?)"
      let results;
      [results, fields] = await db.query(`SELECT * FROM role WHERE title = "${arr[2]}"`);
      arr[2] = JSON.parse(JSON.stringify(results))[0].id;
      if (arr[3] != "None") {
        [rows, fields] = await db.query(`SELECT * FROM employee WHERE first_name = "${arr[3].split(' ')[0]}" AND last_name = "${arr[3].split(' ')[1]}"`);
        arr[3] = JSON.parse(JSON.stringify(rows))[0].id;
      }
      else {
        arr[3] = null;
      }
  }
  try {
    await db.query(`INSERT INTO ${table} ${cols} VALUES ${colfill}`, arr);
    return true;
  } catch (e) {
    return false;
  }
}

async function updateEmployee(empName, newRole) {
  [rows, fields] = await db.query(`SELECT id FROM role WHERE title = "${newRole}"`);
  newRole = JSON.parse(JSON.stringify(rows))[0].id;
  return await db.query(`UPDATE employee SET role_id = "${newRole}" WHERE first_name = "${empName.split(' ')[0]}" AND last_name = "${empName.split(' ')[1]}"`);
} 

async function mainMenu() {
  const temp = await inquirer.prompt([{
    type: "list",
    message: "Employee Manager Menu:",
    name: "action",
    choices: ["View All Employees", "Add Employee", "Update Employee Role", "View All Roles", "Add Role", "View All Departments", "Add Department", "All done!"]
  }]);
  switch (temp.action) {
    case "View All Employees":
      await getEmployee();
      break;
    case "Add Employee":
      let res;  
      let roleList = [];
      [rows, fields] = await db.query(`SELECT * FROM role`);
      res = JSON.parse(JSON.stringify(rows));
      res.forEach(e => roleList.push(e.title));
      let empList;
      [rows, fields] = await db.query(`SELECT CONCAT(first_name, ' ', last_name) AS name FROM employee`);
      empList = JSON.parse(JSON.stringify(rows));
      empList.forEach(e => e.name);
      empList.unshift("None");
      let newEmp = await inquirer.prompt([{
        type: "input",
        message: "What is the employee's first name?",
        name: "first"
      }, {
        type: "input",
        message: "What is the employee's last name?",
        name: "last"
      }, {
        type: "list",
        message: "What is the employee's role?",
        name: "role",
        choices: roleList
      }, {
        type: "list",
        message: "Who is the employee's manager?",
        name: "manager",
        choices: empList
      }]);
      if (await addToTable("employee", [newEmp.first, newEmp.last, newEmp.role, newEmp.manager])) {
        console.log(`Successfully added ${newEmp.first} ${newEmp.last} to employees.`);
      };
      break;
    case "Update Employee Role":
      let temp;  
      let emp;
      [rows, fields] = await db.query(`SELECT CONCAT(first_name, ' ', last_name) AS name FROM employee`);
      emp = JSON.parse(JSON.stringify(rows));
      emp.forEach(e => e.name);
      let role = [];
      [rows, fields] = await db.query(`SELECT * FROM role`);
      temp = JSON.parse(JSON.stringify(rows));
      temp.forEach(e => role.push(e.title));
      let update = await inquirer.prompt([{
        type: "list",
        message: "Which employee's role do you want to update?",
        name: "emp",
        choices: emp
      }, {
        type: "list",
        message: "Which role do you want to assign the selected employee?",
        name: "role",
        choices: role
      }]);
      if (await updateEmployee(update.emp, update.role)) {
        console.log(`Successfully updated ${update.emp}'s role to ${update.role}.`);
      };
      break;
    case "View All Roles":
      await getRole();
      break;
    case "Add Role":
      let depList;
      [rows, fields] = await db.query(`SELECT * FROM department`);
      depList = JSON.parse(JSON.stringify(rows));
      depList.forEach(e => e.name);
      let newRole = await inquirer.prompt([{
        type: "input",
        message: "What is the name of the role?",
        name: "newRole"
      }, {
        type: "number",
        message: "What is the salary of the role?",
        name: "salary"
      }, {
        type: "list",
        message: "What department does the role belong to?",
        name: "department",
        choices: depList
      }]);
      if (await addToTable("role", [newRole.newRole, newRole.salary, newRole.department])) {
        console.log(`Successfully added ${newRole.newRole} to roles.`);
      };
      break;
    case "View All Departments":
      await getDepartment();
      break;
    case "Add Department":
      let newDep = await inquirer.prompt([{
        type: "input",
        message: "What is the name of the department?",
        name: "newDep"
      }])
      if (await addToTable("department", [newDep.newDep])) {
        console.log(`Successfully added ${newDep.newDep} to departments.`);
      };
      break;
    case "All done!":
      return;
  }
  //hack to prevent console log
  await sleep(500);
  await mainMenu();
}

const sleep = timeout => new Promise(resolve => {        
  setTimeout(resolve, timeout);
});

let db;
init();