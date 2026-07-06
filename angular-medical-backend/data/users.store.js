const bcrypt = require('bcryptjs');

const salt = bcrypt.genSaltSync(12);

// Seed in-memory users for testing/demo
const users = [
  {
    id: 'c8300222-38d7-4ee2-bb62-4467c6999b8b',
    firstName: 'John',
    lastName: 'Doe',
    email: 'patient@medical.com',
    password: bcrypt.hashSync('patient123', salt),
    role: 'patient',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a37452d7-9ad0-4228-a579-245367b848c8',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@medical.com',
    password: bcrypt.hashSync('admin123', salt),
    role: 'admin',
    createdAt: new Date().toISOString(),
  }
];

const findByEmail = (email) =>
  users.find((u) => u.email.toLowerCase() === email.toLowerCase());

const findById = (id) => users.find((u) => u.id === id);

const createUser = (user) => {
  users.push(user);
  return user;
};

const getAllUsers = () => users;

module.exports = { findByEmail, findById, createUser, getAllUsers };
