# Database models for the Chat App
import os
import sqlite3
import hashlib
import secrets
import time
from datetime import datetime, timedelta

# Database setup
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'chat_app.db')

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        about TEXT,
        profile_pic TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    )
    ''')
    
    # No OTP table needed for email/password authentication
    
    # Create sessions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# User management functions
class User:
    @staticmethod
    def create(name, email, password_hash, about=None):
        """Create a new user with email and password"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'INSERT INTO users (name, email, password_hash, about) VALUES (?, ?, ?, ?)',
                (name, email, password_hash, about)
            )
            user_id = cursor.lastrowid
            conn.commit()
            return user_id
        except sqlite3.IntegrityError:
            # Email already exists
            return None
        finally:
            conn.close()
    
    @staticmethod
    def get_by_email(email):
        """Get user by email address"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return dict(user)
        return None
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return dict(user)
        return None
    
    @staticmethod
    def update(user_id, **kwargs):
        """Update user information"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        allowed_fields = ['name', 'email', 'about', 'profile_pic']
        updates = []
        values = []
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                updates.append(f"{field} = ?")
                values.append(value)
        
        if not updates:
            conn.close()
            return False
        
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        
        cursor.execute(query, values)
        conn.commit()
        conn.close()
        return True
    
    @staticmethod
    def update_last_login(user_id):
        """Update user's last login timestamp"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            (user_id,)
        )
        conn.commit()
        conn.close()

# No OTP verification functions needed for email/password authentication

# Session management
class Session:
    @staticmethod
    def create(user_id, expiry_days=30):
        """Create a new session for a user"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Generate a secure random token
        token = secrets.token_hex(32)
        
        # Set expiration time
        expires_at = datetime.now() + timedelta(days=expiry_days)
        
        # Insert new session
        cursor.execute(
            'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
            (user_id, token, expires_at)
        )
        
        conn.commit()
        conn.close()
        
        return token
    
    @staticmethod
    def validate(session_token):
        """Validate a session token and return the user_id if valid"""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get session by token
        cursor.execute(
            'SELECT * FROM sessions WHERE session_token = ?',
            (session_token,)
        )
        session = cursor.fetchone()
        
        if not session:
            conn.close()
            return None
        
        # Convert to dict
        session = dict(session)
        
        # Check if session is expired
        expires_at = datetime.fromisoformat(session['expires_at'])
        if datetime.now() > expires_at:
            # Delete expired session
            cursor.execute('DELETE FROM sessions WHERE id = ?', (session['id'],))
            conn.commit()
            conn.close()
            return None
        
        conn.close()
        return session['user_id']
    
    @staticmethod
    def delete(session_token):
        """Delete a session (logout)"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM sessions WHERE session_token = ?', (session_token,))
        
        conn.commit()
        conn.close()
        
        return True

# Initialize the database when this module is imported
init_db()