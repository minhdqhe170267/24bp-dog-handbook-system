import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('dog_handbook.db');
