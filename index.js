const inquirer = require('inquirer');
const mysql = require('mysql2').createConnectionPromise;
const cTable = require('console.table');

const db = await mysql.createConnection(
  {
    host: 'localhost',
    // MySQL username,
    user: 'root',
    // MySQL password
    password: 'andy',
    database: 'management_db'
  },
  console.log("Connection successful")
);

async function getDepartment() {
  await db.query(`SELECT * FROM department;`, function (err, results) {
    console.table(JSON.parse(JSON.stringify(results)));
  });
}

async function getRole() {
  await db.query(`SELECT 
                    r.id AS id, 
                    r.title AS title, 
                    d.name AS department, 
                    r.salary AS salary 
                  FROM role AS r 
                  JOIN department AS d 
                  ON r.department_id = d.id;`, function (err, results) {
    console.table(JSON.parse(JSON.stringify(results)));
  });
}

async function getEmployee() {
  await db.query(`SELECT 
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
                  ON e.manager_id = emp.id;`, function (err, results) {
    console.table(JSON.parse(JSON.stringify(results)));
  });
}

async function addToTable(table, arr) {
  let cols;
  let colfill;
  switch (table) {
    case "department":
      cols = "(name)";
      colfill = "(?)"
      break;
    case "role":
      cols = "(title, salary, department_id";
      colfill = "(?, ?, ?)";
      await db.query(`SELECT id FROM department WHERE name = ${arr[2]}`, function (err, results) {
        if (!err) arr[2] = JSON.parse(JSON.stringify(results))[0].id;
      });
      break;
    case "employee":
      cols = "(first_name, last_name, role_id, manager_id)"
      colfill = "(?, ?, ?, ?)"
      await db.query(`SELECT id FROM role WHERE title = ${arr[2]}`, function (err, results) {
        if (!err) arr[2] = JSON.parse(JSON.stringify(results))[0].id;
      });
      if (arr[3] != "None") {
        await db.query(`SELECT id FROM employee WHERE first_name = ${arr[3].split(' ')[0]} AND last_name = ${arr[3].split(' ')[1]}`, function (err, results) {
          if (!err) arr[3] = JSON.parse(JSON.stringify(results))[0].id;
        })
      }
      else {
        arr[3] = null;
      }
  }
  return await db.query(`INSERT INTO ${table} ${cols} VALUES ${colfill}`, arr, (err, results) => !err);
}

async function updateEmployee(empName, newRole) {
  await db.query(`SELECT id FROM role WHERE title = ${newRole}`, function (err, results) {
    if (!err) newRole = JSON.parse(JSON.stringify(results))[0].id;
  });
  return await db.query(`UPDATE employee SET role_id = ${newRole} WHERE first_name = ${empName.split(' ')[0]} AND last_name = ${empName.split(' ')[1]}`, (err, results) => !err);
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
      getEmployee();
      break;
    case "Add Employee":
      let roleList;
      await db.query(`SELECT * FROM role`, function (err, results) {
        roleList = JSON.parse(JSON.stringify(results));
        roleList.forEach(e => e.title);
      });
      let empList;
      await db.query(`SELECT CONCAT(first_name, ' ', last_name) AS name FROM employee`, function (err, results) {
        empList = JSON.parse(JSON.stringify(results));
        empList.forEach(e => e.name);
      });
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
      if (addToTable("employee", [newEmp.first, newEmp.last, newEmp.role, newEmp.manager])) {
        console.log(`Successfully added ${newEmp.first} ${newEmp.last} to employees.`);
      };
      break;
    case "Update Employee Role":
      let emp;
      await db.query(`SELECT CONCAT(first_name, ' ', last_name) AS name FROM employee`, function (err, results) {
        emp = JSON.parse(JSON.stringify(results));
        emp.forEach(e => e.name);
      });
      let role;
      await db.query(`SELECT * FROM role`, function (err, results) {
        role = JSON.parse(JSON.stringify(results));
        role.forEach(e => e.title);
      });
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
      if (updateEmployee(update.emp, update.role)) {
        console.log(`Successfully updated ${update.emp}'s role to ${update.role}.`);
      };
      break;
    case "View All Roles":
      getRole();
      break;
    case "Add Role":
      let depList;
      await db.query(`SELECT * FROM department`, function (err, results) {
        depList = JSON.parse(JSON.stringify(results));
        depList.forEach(e => e.name);
      });
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
      if (addToTable("role", [newRole.newRole, newRole.salary, newRole.department])) {
        console.log(`Successfully added ${newRole.newRole} to roles.`);
      };
      break;
    case "View All Departments":
      getDepartment();
      break;
    case "Add Department":
      let newDep = await inquirer.prompt([{
        type: "input",
        message: "What is the name of the department?",
        name: "newDep"
      }])
      if (addToTable("department", [newDep.newDep])) {
        console.log(`Successfully added ${newDep.newDep} to departments.`);
      };
      break;
    case "All done!":
      return false;
  }
  return true;
}

while (mainMenu()) {};
await db.end();