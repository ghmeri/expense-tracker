import * as SQLite from 'expo-sqlite';
import { Expense, User } from '../types';

const db = SQLite.openDatabaseSync('expenses.db');

export const initDatabase = (): void => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      imageUri TEXT,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
    INSERT OR IGNORE INTO users (id, name, color) VALUES ('user1', 'Yo', '#6200ee');
    INSERT OR IGNORE INTO users (id, name, color) VALUES ('user2', 'Mi pareja', '#03dac6');
  `);
};

export const getExpenses = (): Expense[] => {
  return db.getAllSync<Expense>('SELECT * FROM expenses ORDER BY date DESC');
};

export const addExpense = (expense: Expense): void => {
  db.runSync(
    `INSERT INTO expenses (id, amount, category, description, date, imageUri, userId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.amount,
      expense.category,
      expense.description,
      expense.date,
      expense.imageUri ?? null,
      expense.userId,
      expense.createdAt,
    ]
  );
};

export const deleteExpense = (id: string): void => {
  db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
};

export const getUsers = (): User[] => {
  return db.getAllSync<User>('SELECT * FROM users');
};

export const updateUserName = (id: string, name: string): void => {
  db.runSync('UPDATE users SET name = ? WHERE id = ?', [name, id]);
};
