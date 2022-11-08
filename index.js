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
  const temp = await inquirer.prompt({
    type: "list",
    message: "Employee Manager Menu:",
    name: "action",
    choices: ["View All Employees", "Add Employee", "Update Employee Role", "View All Roles", "Add Role", "View All Departments", "Add Department", "All done!"]
  })
  switch (temp.action) {
    case "View All Employees":
      getTable(employee)
  }
  if (temp.action == "View") {
    await promptEngineer();
  }
  else if (temp.action == "Add Intern") {
    await promptIntern();
  }
  else {
    await buildWebsite();
  }
  await mainMenu();
}

mainMenu();
await db.end();