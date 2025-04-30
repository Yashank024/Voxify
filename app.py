"""
Voxify Chat Application - Flask Backend
Handles authentication, profile management, and chat functionality
"""

import os
import json
import uuid
import re
from datetime import datetime, timedelta
from functools import wraps
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import Flask, request, jsonify, session, send_from_directory, redirect
from flask_cors import CORS
# Authentication imports

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Preload database files to reduce lazy loading
def preload_database_files():
    """Preload database files to memory for faster access"""
    db_dir = os.path.join(os.path.dirname(__file__), 'database')
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
    
    # Ensure users.json exists
    users_db = os.path.join(db_dir, 'users.json')
    if not os.path.exists(users_db):
        with open(users_db, 'w') as f:
            json.dump({"users": []}, f, indent=2)
    
    # Ensure sessions.json exists
    sessions_db = os.path.join(db_dir, 'sessions.json')
    if not os.path.exists(sessions_db):
        with open(sessions_db, 'w') as f:
            json.dump({"sessions": []}, f, indent=2)
    
    # Preload files to memory with error handling
    try:
        with open(users_db, 'r') as f:
            users_data = json.load(f)
        with open(sessions_db, 'r') as f:
            sessions_data = json.load(f)
        
        print("Database files preloaded to memory for faster access")
        return users_data, sessions_data
    except Exception as e:
        print(f"Error preloading database files: {str(e)}")
        print("Falling back to default empty database")
        return {"users": []}, {"sessions": []}

# Preload database files
try:
    preloaded_users, preloaded_sessions = preload_database_files()
except Exception as e:
    print(f"Error during database preloading: {str(e)}")
    print("Using empty default databases")
    preloaded_users, preloaded_sessions = {"users": []}, {"sessions": []}

# Initialize Flask app with optimized settings
app = Flask(__name__, static_folder='.', static_url_path='')
app.config['JSON_SORT_KEYS'] = False  # Don't sort JSON keys for faster serialization
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False  # Disable pretty printing for faster JSON responses
app.config['TEMPLATES_AUTO_RELOAD'] = False  # Disable template auto-reload in production
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # Cache static files for 1 year

# Add compression for faster response times
try:
    from flask_compress import Compress
    Compress(app)
    print("Compression enabled for faster response times")
except ImportError:
    print("Flask-Compress not installed. Consider installing for better performance.")

# Enable CORS
CORS(app, supports_credentials=True)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'voxify-chat-app-secret-key')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['UPLOAD_FOLDER'] = 'img/avatars'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max upload size
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)  # Session expires after 1 day
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Prevents CSRF

# No email configuration needed

# Ensure upload directory exists
Path(app.config['UPLOAD_FOLDER']).mkdir(parents=True, exist_ok=True)

# Cache for database operations
_db_cache = {
    'users': preloaded_users,
    'users_timestamp': 0,
    'sessions': preloaded_sessions,
    'sessions_timestamp': 0
}

# Database files in the database directory
DB_DIR = os.path.join(os.path.dirname(__file__), 'database')
USERS_DB = os.path.join(DB_DIR, 'users.json')
SESSIONS_DB = os.path.join(DB_DIR, 'sessions.json')

def ensure_db_files_exist():
    """Ensure all database files exist with proper structure"""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
    
    # Initialize users.json if it doesn't exist
    if not os.path.exists(USERS_DB):
        with open(USERS_DB, 'w') as f:
            json.dump({"users": []}, f, indent=2)
    
    # No OTP store needed for email/password authentication
    
    # Initialize sessions.json if it doesn't exist
    if not os.path.exists(SESSIONS_DB):
        with open(SESSIONS_DB, 'w') as f:
            json.dump({"sessions": []}, f, indent=2)

def get_db():
    """Load users database from file with caching for better performance"""
    # Use preloaded data if available and file hasn't been modified
    try:
        current_timestamp = os.path.getmtime(USERS_DB)
        if _db_cache['users'] is not None and current_timestamp <= _db_cache['users_timestamp']:
            return _db_cache['users']  # Return cached data if file hasn't changed
        
        with open(USERS_DB, 'r') as f:
            db = json.load(f)
            _db_cache['users'] = db
            _db_cache['users_timestamp'] = current_timestamp
            return db
    except (FileNotFoundError, json.JSONDecodeError):
        db = {"users": []}
        _db_cache['users'] = db
        _db_cache['users_timestamp'] = datetime.now().timestamp()
        return db

def save_db(db):
    """Save users database to file and update cache"""
    ensure_db_files_exist()
    with open(USERS_DB, 'w') as f:
        json.dump(db, f, indent=2)
    
    # Update cache
    _db_cache['users'] = db
    _db_cache['users_timestamp'] = datetime.now().timestamp()

def get_sessions():
    """Load sessions database from file with caching"""
    # Use preloaded data if available and file hasn't been modified
    try:
        current_timestamp = os.path.getmtime(SESSIONS_DB)
        if _db_cache['sessions'] is not None and current_timestamp <= _db_cache['sessions_timestamp']:
            return _db_cache['sessions']  # Return cached data if file hasn't changed
        
        with open(SESSIONS_DB, 'r') as f:
            sessions = json.load(f)
            _db_cache['sessions'] = sessions
            _db_cache['sessions_timestamp'] = current_timestamp
            return sessions
    except (FileNotFoundError, json.JSONDecodeError):
        sessions = {"sessions": []}
        _db_cache['sessions'] = sessions
        _db_cache['sessions_timestamp'] = datetime.now().timestamp()
        return sessions

def save_sessions(sessions):
    """Save sessions database to file and update cache"""
    ensure_db_files_exist()
    with open(SESSIONS_DB, 'w') as f:
        json.dump(sessions, f, indent=2)
    
    # Update cache
    _db_cache['sessions'] = sessions
    _db_cache['sessions_timestamp'] = datetime.now().timestamp()

def create_session(user_id):
    """Create a new session for a user"""
    session_id = str(uuid.uuid4())
    sessions = get_sessions()
    
    # Add new session
    sessions['sessions'].append({
        'id': session_id,
        'user_id': user_id,
        'created_at': datetime.now().timestamp(),
        'expires_at': (datetime.now() + timedelta(days=1)).timestamp()
    })
    
    # Remove expired sessions while we're at it (performance optimization)
    current_time = datetime.now().timestamp()
    sessions['sessions'] = [s for s in sessions['sessions'] if s['expires_at'] > current_time]
    
    save_sessions(sessions)
    return session_id

def delete_session(session_id):
    """Delete a session by ID"""
    sessions = get_sessions()
    sessions['sessions'] = [s for s in sessions['sessions'] if s['id'] != session_id]
    save_sessions(sessions)

# Add connection pooling for better performance
@app.before_first_request
def setup_connection_pool():
    """Set up connection pooling for better performance"""
    try:
        # Set up connection pool for database connections
        # This is a placeholder since we're using file-based storage
        # but would be implemented with real databases
        print("Connection pooling setup complete")
        
        # Commenting out the problematic code that tries to warm up the app
        # with app.test_client() as client:
        #     # Make a request to the index page to warm up the app
        #     client.get('/')
        #     print("Application warmed up and ready for faster response times")
    except Exception as e:
        print(f"Error setting up connection pool: {str(e)}")

# Optimize database access with bulk operations
def get_user_by_id(user_id):
    """Get user by ID with optimized access pattern"""
    db = get_db()
    # Use dictionary comprehension for faster lookup
    matching_users = [u for u in db['users'] if u['id'] == user_id]
    return matching_users[0] if matching_users else None

def get_user_by_email(email):
    """Get user by email with optimized access pattern"""
    db = get_db()
    # Use dictionary comprehension for faster lookup
    matching_users = [u for u in db['users'] if u['email'] == email]
    return matching_users[0] if matching_users else None

# Authentication decorator with optimization
def login_required(f):
    """Decorator to ensure user is authenticated with optimized session check"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for user_id in session (more reliable than authenticated flag)
        if not session.get('user_id'):
            print(f"Authentication failed - no user_id in session: {dict(session)}")
            return jsonify({"error": "Unauthorized: Please log in"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Serve static files
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the root directory with optimized caching"""
    # Add cache headers for common static file types
    cache_extensions = {'.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf'}
    _, ext = os.path.splitext(path)
    
    # Simplified file serving to avoid errors
    try:
        response = send_from_directory('.', path)
        
        # Add cache headers for better performance
        if ext in cache_extensions:
            # Cache for 1 year (31536000 seconds)
            response.headers['Cache-Control'] = 'public, max-age=31536000'
        elif path.endswith('.html'):
            # Don't cache HTML files to ensure fresh content
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        
        return response
    except Exception:
        # If file not found, try to serve index.html for SPA routing
        if path.startswith(('chat', 'login', 'profile')):
            return send_from_directory('.', 'index.html')
        # Otherwise, let Flask handle the 404
        return send_from_directory('.', path)

# Preload common static assets to prevent lazy loading
@app.before_first_request
def preload_static_assets():
    """Preload common static assets to prevent lazy loading"""
    try:
        # Simplified asset preloading to avoid errors
        print("Static asset preloading disabled to fix startup issues")
        # Commenting out potentially problematic code
        # common_assets = [
        #     'css/styles.css',
        #     'css/chat.css',
        #     'js/auth-api.js',
        #     'js/login.js',
        #     'js/chat.js'
        # ]
        # 
        # for asset in common_assets:
        #     asset_path = os.path.join(app.static_folder, asset)
        #     if os.path.exists(asset_path):
        #         with open(asset_path, 'rb') as f:
        #             f.read()  # Just read the file to cache it in OS file cache
    except Exception as e:
        print(f"Error preloading static assets: {str(e)}")

# Authentication routes
@app.route('/api/login', methods=['POST'])
def login():
    """Login with email and password"""
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    db = get_db()
    
    # Use faster list comprehension instead of next() with generator
    matching_users = [u for u in db['users'] if u['email'] == email]
    if not matching_users or not check_password_hash(matching_users[0].get('password_hash', ''), password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    user = matching_users[0]
    
    # Set session
    session.permanent = True
    session['user_id'] = user['id']
    session['authenticated'] = True  # Add explicit authenticated flag
    
    # Update last login time
    user_index = next((i for i, u in enumerate(db['users']) if u['id'] == user['id']), None)
    if user_index is not None:
        db['users'][user_index]['last_login'] = datetime.now().isoformat()
        save_db(db)
    
    # Return user data (excluding password) - use dict comprehension for better performance
    user_data = {k: v for k, v in user.items() if k != 'password_hash'}
    return jsonify({
        "success": True,
        "redirect": "/chat.html",
        "user": user_data,
        "token": "authenticated"  # Add token for client-side auth check
    })

# Signup route
@app.route('/api/signup', methods=['POST'])
def signup():
    """Register a new user with email and password"""
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    # Validate inputs
    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
        
    # Validate email format
    if not re.match(r'^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({"error": "Invalid email format"}), 400
        
    # Validate password strength (at least 8 characters)
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400
    
    # Check if user already exists
    db = get_db()
    if any(user['email'] == email for user in db['users']):
        return jsonify({"error": "Email already registered"}), 400
    
    # Create new user
    user_id = str(uuid.uuid4())
    new_user = {
        'id': user_id,
        'name': name,
        'email': email,
        'password_hash': generate_password_hash(password),
        'about': 'Hello, I\'m using Voxify!',
        'created_at': datetime.now().isoformat(),
        'last_login': datetime.now().isoformat()
    }
    
    # Add user to database
    db['users'].append(new_user)
    save_db(db)
    
    # Set session
    session.permanent = True
    session['user_id'] = user_id
    
    # Return success response
    return jsonify({
        "success": True,
        "redirect": "/chat.html",
        "user": {
            "id": user_id,
            "name": name,
            "email": email
        }
    })

# Logout route
@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout user and clear session"""
    try:
        # Clear session data
        session.clear()
        return jsonify({
            'success': True, 
            'message': 'Logged out successfully',
            'redirect': 'login.html'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Profile routes
@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    """Get user profile data"""
    user_id = session.get('user_id')
    
    # Debug session information
    print(f"Session data in profile endpoint: {dict(session)}")
    print(f"User ID from session: {user_id}")
    
    if not user_id:
        print("No user_id in session, returning 401")
        return jsonify({"error": "Not authenticated"}), 401
    
    db = get_db()
    
    # Use faster list comprehension instead of next() with generator
    matching_users = [u for u in db['users'] if u['id'] == user_id]
    
    if not matching_users:
        print(f"User not found for ID: {user_id}")
        return jsonify({"error": "User not found"}), 404
    
    # Return user data excluding password hash
    user_data = {k: v for k, v in matching_users[0].items() if k != 'password_hash'}
    
    # Add default values for missing fields
    if 'about' not in user_data:
        user_data['about'] = "Hello, I'm using Voxify!"
    
    if 'avatar' not in user_data:
        user_data['avatar'] = "/img/avatars/default.jpg"
    
    if 'settings' not in user_data:
        user_data['settings'] = {
            "disappearing_messages": False,
            "mute_notifications": "Off",
            "notification_tone": "Default"
        }
    
    print(f"Returning profile data for user: {user_data.get('name')}")
    return jsonify(user_data), 200

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    """
    PUT /api/profile
    Updates the profile data for the authenticated user
    Requires valid session with user_id
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    db = get_db()
    
    # Find user index more efficiently
    user_index = None
    for i, user in enumerate(db['users']):
        if user['id'] == user_id:
            user_index = i
            break
    
    if user_index is None:
        return jsonify({"error": "User not found"}), 404
    
    # Update allowed fields
    allowed_fields = ['name', 'about', 'settings']
    for field in allowed_fields:
        if field in data:
            db['users'][user_index][field] = data[field]
    
    # Save changes
    save_db(db)
    
    # Return updated user data
    user_data = {k: v for k, v in db['users'][user_index].items() if k != 'password_hash'}
    return jsonify(user_data), 200

@app.route('/api/profile/avatar', methods=['POST'])
@login_required
def update_avatar():
    """
    POST /api/profile/avatar
    Updates the user's avatar
    Requires valid session with user_id
    """
    user_id = session.get('user_id')
    
    # Check if file was uploaded
    if 'avatar' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['avatar']
    
    # Check if file is empty
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    # Check file extension
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
    if not '.' in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({"error": "Invalid file type"}), 400
    
    # Create a secure filename with timestamp to avoid conflicts
    filename = f"{user_id}_{int(datetime.now().timestamp())}_" + secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save the file
    file.save(filepath)
    
    # Update user avatar in database
    db = get_db()
    user_index = next((i for i, u in enumerate(db['users']) if u['id'] == user_id), None)
    
    if user_index is None:
        return jsonify({"error": "User not found"}), 404
    
    # Update avatar path
    avatar_path = f"/{app.config['UPLOAD_FOLDER']}/{filename}"
    db['users'][user_index]['avatar'] = avatar_path
    save_db(db)
    
    # Return updated user profile (excluding password)
    user_data = {k: v for k, v in db['users'][user_index].items() if k != 'password_hash'}
    return jsonify(user_data), 200

# Logout endpoint
@app.route('/api/logout-session', methods=['POST'])
def logout_api():
    """Logout user and clear session"""
    try:
        # Get session ID from cookie
        session_id = request.cookies.get('session_id')
        if session_id:
            # Delete session
            delete_session(session_id)
            print(f"Session cleared on logout: {session_id}")
        
        # Create response with redirect
        response = jsonify({"success": True, "redirect": "/login.html"})
        
        # Clear session cookie
        response.set_cookie('session_id', '', expires=0)
        
        return response, 200
    
    except Exception as e:
        print(f"Error during logout: {str(e)}")
        return jsonify({"error": "Failed to logout", "message": str(e)}), 500

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Handle OPTIONS requests globally
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    response = jsonify({'status': 'ok'})
    return response

# Check if user exists endpoint
@app.route('/api/check-user-exists', methods=['POST'])
def check_user_exists_api():
    """Check if a user exists in the database"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    db = get_db()
    
    # Use faster list comprehension instead of next() with generator
    matching_users = [u for u in db['users'] if u['email'] == email]
    user_exists = len(matching_users) > 0
    
    return jsonify({
        "exists": user_exists
    })

# Conversations API endpoints
@app.route('/api/conversations', methods=['GET'])
@login_required
def get_conversations():
    """Get all conversations for the current user"""
    user_id = session.get('user_id')
    
    # Load conversations from file
    conversations_file = os.path.join(DB_DIR, 'conversations.json')
    try:
        with open(conversations_file, 'r') as f:
            conversations_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        conversations_data = {"conversations": []}
    
    # Filter conversations for current user
    user_conversations = [
        conv for conv in conversations_data.get('conversations', [])
        if user_id in [conv.get('user1_id'), conv.get('user2_id')]
    ]
    
    # Load user data for each conversation
    db = get_db()
    for conv in user_conversations:
        # Get the other user's ID (not the current user)
        other_user_id = conv.get('user1_id') if conv.get('user1_id') != user_id else conv.get('user2_id')
        
        # Find other user in database
        other_user = get_user_by_id(other_user_id)
        
        if other_user:
            # Add other user's details to conversation
            conv['other_user'] = {
                'id': other_user.get('id'),
                'name': other_user.get('name'),
                'avatar': other_user.get('avatar', ''),
                'about': other_user.get('about', 'Hello, I\'m using Voxify!')
            }
    
    return jsonify({
        "conversations": user_conversations
    })

@app.route('/api/conversations', methods=['POST'])
@login_required
def create_conversation():
    """Create a new conversation with another user"""
    user_id = session.get('user_id')
    data = request.json
    other_user_id = data.get('user_id')
    
    if not other_user_id:
        return jsonify({"error": "Other user ID is required"}), 400
    
    # Check if other user exists
    other_user = get_user_by_id(other_user_id)
    if not other_user:
        return jsonify({"error": "User not found"}), 404
    
    # Load conversations from file
    conversations_file = os.path.join(DB_DIR, 'conversations.json')
    try:
        with open(conversations_file, 'r') as f:
            conversations_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        conversations_data = {"conversations": []}
    
    # Check if conversation already exists
    for conv in conversations_data.get('conversations', []):
        if (conv.get('user1_id') == user_id and conv.get('user2_id') == other_user_id) or \
           (conv.get('user1_id') == other_user_id and conv.get('user2_id') == user_id):
            # Return existing conversation
            return jsonify({
                "conversation": conv,
                "message": "Conversation already exists"
            })
    
    # Create new conversation
    new_conversation = {
        'id': str(uuid.uuid4()),
        'user1_id': user_id,
        'user2_id': other_user_id,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'messages': []
    }
    
    # Add conversation to database
    conversations_data['conversations'].append(new_conversation)
    
    # Save conversations to file
    with open(conversations_file, 'w') as f:
        json.dump(conversations_data, f, indent=2)
    
    # Add user details to response
    new_conversation['other_user'] = {
        'id': other_user.get('id'),
        'name': other_user.get('name'),
        'avatar': other_user.get('avatar', ''),
        'about': other_user.get('about', 'Hello, I\'m using Voxify!')
    }
    
    return jsonify({
        "conversation": new_conversation,
        "message": "Conversation created successfully"
    }), 201

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
@login_required
def get_messages(conversation_id):
    """Get all messages for a conversation"""
    user_id = session.get('user_id')
    
    # Load conversations from file
    conversations_file = os.path.join(DB_DIR, 'conversations.json')
    try:
        with open(conversations_file, 'r') as f:
            conversations_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"error": "Conversation not found"}), 404
    
    # Find conversation
    conversation = None
    for conv in conversations_data.get('conversations', []):
        if conv.get('id') == conversation_id:
            conversation = conv
            break
    
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
    
    # Check if user is part of conversation
    if user_id not in [conversation.get('user1_id'), conversation.get('user2_id')]:
        return jsonify({"error": "Unauthorized"}), 403
    
    return jsonify({
        "messages": conversation.get('messages', [])
    })

@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
@login_required
def send_message(conversation_id):
    """Send a message in a conversation"""
    user_id = session.get('user_id')
    data = request.json
    message_text = data.get('message')
    
    if not message_text:
        return jsonify({"error": "Message text is required"}), 400
    
    # Load conversations from file
    conversations_file = os.path.join(DB_DIR, 'conversations.json')
    try:
        with open(conversations_file, 'r') as f:
            conversations_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"error": "Conversation not found"}), 404
    
    # Find conversation
    conversation_index = None
    for i, conv in enumerate(conversations_data.get('conversations', [])):
        if conv.get('id') == conversation_id:
            conversation_index = i
            break
    
    if conversation_index is None:
        return jsonify({"error": "Conversation not found"}), 404
    
    # Check if user is part of conversation
    conversation = conversations_data['conversations'][conversation_index]
    if user_id not in [conversation.get('user1_id'), conversation.get('user2_id')]:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Create new message
    new_message = {
        'id': str(uuid.uuid4()),
        'sender_id': user_id,
        'text': message_text,
        'timestamp': datetime.now().isoformat(),
        'read': False
    }
    
    # Add message to conversation
    if 'messages' not in conversation:
        conversation['messages'] = []
    
    conversation['messages'].append(new_message)
    conversation['updated_at'] = datetime.now().isoformat()
    
    # Save conversations to file
    with open(conversations_file, 'w') as f:
        json.dump(conversations_data, f, indent=2)
    
    return jsonify({
        "message": new_message,
        "status": "Message sent successfully"
    }), 201

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    """Get all users except the current user"""
    user_id = session.get('user_id')
    
    db = get_db()
    
    # Filter out current user and sensitive information
    other_users = []
    for user in db.get('users', []):
        if user.get('id') != user_id:
            other_users.append({
                'id': user.get('id'),
                'name': user.get('name'),
                'avatar': user.get('avatar', ''),
                'about': user.get('about', 'Hello, I\'m using Voxify!')
            })
    
    return jsonify({
        "users": other_users
    })

# Run the app
if __name__ == '__main__':
    # Run the Flask app
    app.run(debug=os.environ.get('FLASK_ENV') != 'production', host='0.0.0.0', port=5000)
