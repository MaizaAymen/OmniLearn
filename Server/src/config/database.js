const { Sequelize } = require('sequelize');
require('dotenv').config();

// Auto-create local DB and schema if they don't exist
async function ensureDatabase() {
  // Step 1: connect to default 'postgres' DB to create OmnilearnDB
  const temp = new Sequelize('postgres', 'postgres', 'aymen', {
    host: 'localhost', dialect: 'postgres', port: 5432, logging: false
  });
  try {
    await temp.query('CREATE DATABASE "OmnilearnDB";');
    console.log('✅ Database "OmnilearnDB" created');
  } catch (err) {
    if (err.original?.code === '42P04' || err.cause?.code === '42P04') {
      console.log('ℹ️  Database "OmnilearnDB" already exists');
    } else {
      console.error('❌ Failed to create database:', err.message);
      throw err;
    }
  } finally {
    await temp.close();
  }

  // Step 2: connect to OmnilearnDB to create the 'auth' schema
  const temp2 = new Sequelize('OmnilearnDB', 'postgres', 'aymen', {
    host: 'localhost', dialect: 'postgres', port: 5432, logging: false
  });
  try {
    await temp2.query('CREATE SCHEMA IF NOT EXISTS learn;');
    console.log('✅ Schema "learn" ready');
  } catch (err) {
    console.error('❌ Failed to create schema:', err.message);
    throw err;
  } finally {
    await temp2.close();
  }
}

// Use DATABASE_URL from envi 
const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  // Production: Use DATABASE_URL from Render
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
    // Removed schema definition - tables are in public schema
  });
} else {
  // Local development
  sequelize = new Sequelize(
    'OmnilearnDB',
    'postgres',
    'aymen',
    {
      host: 'localhost',
      dialect: 'postgres',
      port: 5432,
      define: {
        schema: 'learn' 
      }
    }
  );
}

module.exports = sequelize;
module.exports.ensureDatabase = ensureDatabase;