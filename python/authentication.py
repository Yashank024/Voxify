# Authentication system for the Chat App
import os
import json
import random
import string
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from python.db_handler import get_user_by_phone, create_user, update_user, search_users, \
    generate_otp, save_otp, verify_otp_db, create_session, validate_session, delete_session

# Import the TextFlow SMS API client for phone verification
from python.textflow_sms import send_otp_sms

# Initialize TextFlow SMS API service
print("Initializing TextFlow SMS API service...")

# Initialize Flask app
app = Flask(__name__, static_folder='..', static_url_path='')
app.secret_key = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(32))
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

# Enable CORS - Updated to accept requests from all origins
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Routes for authentication
@app.route('/')
def index():
    """Serve the landing page"""
    return app.send_static_file('index.html')

@app.route('/login')
def login_page():
    """Serve the login page"""
    return app.send_static_file('login.html')

@app.route('/chat')
def chat_page():
    """Serve the chat page"""
    return app.send_static_file('chat.html')

# API Endpoints
# QR code generation endpoint removed as it's not needed for the current flow

@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to the provided phone number"""
    data = request.get_json()
    
    if not data or 'phone_number' not in data:
        return jsonify({'success': False, 'message': 'Phone number is required'}), 400
    
    phone_number = data['phone_number']
    purpose = data.get('purpose', 'login')  # Default purpose is login
    
    # Special handling for admin code
    if phone_number == "admin1234":
        # Return all registered users for admin
        from python.db_handler import get_all_users
        users = get_all_users()
        return jsonify({
            'success': True,
            'is_admin': True,
            'message': 'Admin authentication successful',
            'users': users
        })
    
    # Check if user exists
    from python.db_handler import get_user_by_phone
    user = get_user_by_phone(phone_number)
    
    # Check login purpose - if login and user doesn't exist, redirect to signup
    if purpose == 'login' and not user:
        return jsonify({
            'success': False, 
            'message': 'User not registered. Please sign up first.',
            'redirect_to_signup': True
        }), 200
    
    # Validate phone number (updated to be more flexible)
    if not phone_number.replace('+', '').isdigit():
        return jsonify({'success': False, 'message': 'Invalid phone number format'}), 400
    
    # Format phone number with country code if not present
    if not phone_number.startswith('+'):
        phone_number = '+91' + phone_number  # Assuming India country code
    
    # Generate OTP
    otp = generate_otp()
    
    # Save OTP in the database
    save_otp(phone_number, otp)
    
    # Send OTP via SMS using TextFlow API
    try:
        result = send_otp_sms(phone_number, otp)
        if isinstance(result, dict) and result.get('success') is False:
            # TextFlow API failed but we have the error message
            sms_sent = False
            sms_message = result.get('message', 'Unknown error')
            debug_otp = result.get('debug_otp', otp)
        else:
            # Assume success if no explicit failure
            sms_sent = True
            sms_message = "OTP sent successfully"
            debug_otp = result.get('debug_otp', otp)
    except Exception as e:
        sms_sent = False
        sms_message = str(e)
        debug_otp = otp
        print(f"Failed to send SMS to {phone_number}: {sms_message}")
    
    # If SMS sending failed, fallback to debug mode
    if not sms_sent:
        # For development or if SMS fails, return the OTP in the response
        response = {
            'success': True,
            'message': f'OTP sent to {phone_number}',
            'debug_otp': debug_otp,  # Remove in production
            'user_exists': user is not None
        }
        
        if sms_message:
            response['sms_error'] = sms_message
    else:
        # In production with successful SMS delivery
        response = {
            'success': True,
            'message': f'OTP sent to {phone_number}',
            'user_exists': user is not None
        }
        
        # In debug mode, still include the OTP in the response
        if debug_otp:
            response['debug_otp'] = debug_otp
            
        print(f"SMS sent successfully to {phone_number}")
    
    return jsonify(response)

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and create/login user"""
    data = request.get_json()
    
    if not data or 'phone_number' not in data or 'otp' not in data:
        return jsonify({'success': False, 'message': 'Phone number and OTP are required'}), 400
    
    phone_number = data['phone_number']
    otp = data['otp']
    
    # Format phone number with country code if needed
    if not phone_number.startswith('+'):
        phone_number = '+91' + phone_number  # Assuming India country code
    
    print(f"Verifying OTP for phone number: {phone_number}, OTP: {otp}")
    
    # Verify OTP using our local database - Fast path for verification
    verified, message = verify_otp_db(phone_number, otp)
    if not verified:
        print(f"OTP verification failed: {message}")
        return jsonify({'success': False, 'message': message}), 400
    else:
        print(f"OTP verified successfully for {phone_number}")
        # Set session cookie immediately for faster login experience
        session['authenticated'] = True
        session['phone_number'] = phone_number
    
    # Check if user exists
    user = get_user_by_phone(phone_number)
    
    if user:
        # User exists, login
        # Update last login time
        current_time = datetime.now().isoformat()
        update_user(phone_number, last_login=current_time)
        print(f"User logged in: {phone_number}")
        user_status = "Logged in"
    else:
        # New user, create account
        name = data.get('name', '')
        email = data.get('email', '')
        about = data.get('about', 'Hello, I\'m using Voxify!')
        
        # Validate required fields for signup
        if not name:
            return jsonify({'success': False, 'message': 'Name is required for new user registration'}), 400
            
        user = create_user(phone_number, name=name, email=email, about=about)
        if not user:
            return jsonify({'success': False, 'message': 'Failed to create user account'}), 500
        print(f"New user created: {phone_number}")
        user_status = "Registered"
    
    # Create session
    session_data = create_session(phone_number)
    session_token = session_data['session_token']
    
    # Return success response with session token and user information
    return jsonify({
        'success': True,
        'message': f'Authentication successful. {user_status}!',
        'status': user_status,
        'session_token': session_token,
        'phone_number': phone_number,
        'name': user.get('name', '') if user else name
    })

@app.route('/api/user-profile', methods=['GET'])
def get_user_profile():
    """Get user profile information"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get user information
    user = get_user_by_phone(phone_number)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    # Return user profile without sensitive information
    return jsonify({
        'success': True,
        'user': {
            'phone_number': user['phone_number'],
            'name': user['name'],
            'email': user['email'],
            'about': user['about'],
            'profile_pic': user['profile_pic'],
            'created_at': user['created_at']
        }
    })

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    """Update user profile information"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get update data
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    # Update user profile
    update_fields = {}
    allowed_fields = ['name', 'email', 'about', 'profile_pic']
    
    for field in allowed_fields:
        if field in data:
            update_fields[field] = data[field]
    
    if not update_fields:
        return jsonify({'success': False, 'message': 'No valid fields to update'}), 400
    
    # Update user
    updated_user = update_user(phone_number, **update_fields)
    if not updated_user:
        return jsonify({'success': False, 'message': 'Failed to update profile'}), 500
    
    return jsonify({'success': True, 'message': 'Profile updated successfully'})

# Removed duplicate /api/logout endpoint
# This endpoint has been replaced by logout_api function in app.py

# API endpoint to search for users by phone number
@app.route('/api/search-users', methods=['GET'])
def search_users_api():
    """Search for users by phone number or name"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get search query
    query = request.args.get('query', '')
    if not query or len(query) < 3:
        return jsonify({'success': False, 'message': 'Search query must be at least 3 characters'}), 400
    
    # Search users
    results = search_users(query)
    
    # Remove sensitive information from results
    safe_results = []
    for user in results:
        # Don't include the current user in search results
        if user['phone_number'] != phone_number:
            safe_results.append({
                'phone_number': user['phone_number'],
                'name': user['name'],
                'about': user['about'],
                'profile_pic': user['profile_pic']
            })
    
    return jsonify({
        'success': True,
        'results': safe_results
    })

# API endpoint to get user conversations
@app.route('/api/conversations', methods=['GET'])
def get_user_conversations():
    """Get all conversations for the current user"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get conversations
    from python.db_handler import get_conversations, get_user_by_phone
    conversations = get_conversations(phone_number)
    
    # Format conversations for response
    formatted_conversations = []
    for conversation in conversations:
        # Get the other participant's info
        other_participant = None
        for participant in conversation['participants']:
            if participant != phone_number:
                other_participant = participant
                break
        
        if other_participant:
            user_info = get_user_by_phone(other_participant)
            if user_info:
                # Get the last message if any
                last_message = None
                if conversation['messages']:
                    last_message = conversation['messages'][-1]
                
                formatted_conversations.append({
                    'conversation_id': conversation['conversation_id'],
                    'contact': {
                        'phone_number': user_info['phone_number'],
                        'name': user_info['name'],
                        'profile_pic': user_info['profile_pic']
                    },
                    'last_message': last_message,
                    'updated_at': conversation['updated_at']
                })
    
    # Sort conversations by updated_at (most recent first)
    formatted_conversations.sort(key=lambda x: x['updated_at'], reverse=True)
    
    return jsonify({
        'success': True,
        'conversations': formatted_conversations
    })

# API endpoint to get a specific conversation
@app.route('/api/conversation/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id):
    """Get a specific conversation by ID"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get conversation
    from python.db_handler import get_conversation, get_user_by_phone, mark_messages_as_read
    conversation = get_conversation(conversation_id)
    
    if not conversation:
        return jsonify({'success': False, 'message': 'Conversation not found'}), 404
    
    # Check if user is a participant
    if phone_number not in conversation['participants']:
        return jsonify({'success': False, 'message': 'Unauthorized access to conversation'}), 403
    
    # Mark messages as read
    mark_messages_as_read(conversation_id, phone_number)
    
    # Get the other participant's info
    other_participant = None
    for participant in conversation['participants']:
        if participant != phone_number:
            other_participant = participant
            break
    
    other_user_info = None
    if other_participant:
        other_user_info = get_user_by_phone(other_participant)
    
    return jsonify({
        'success': True,
        'conversation': {
            'id': conversation['conversation_id'],
            'messages': conversation['messages'],
            'contact': other_user_info and {
                'phone_number': other_user_info['phone_number'],
                'name': other_user_info['name'],
                'profile_pic': other_user_info['profile_pic'],
                'about': other_user_info['about']
            }
        }
    })

# API endpoint to create a new conversation
@app.route('/api/conversation', methods=['POST'])
def create_new_conversation():
    """Create a new conversation with another user"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get request data
    data = request.get_json()
    if not data or 'contact_phone' not in data:
        return jsonify({'success': False, 'message': 'Contact phone number is required'}), 400
    
    contact_phone = data['contact_phone']
    
    # Check if contact exists
    from python.db_handler import get_user_by_phone, create_conversation
    contact = get_user_by_phone(contact_phone)
    if not contact:
        return jsonify({'success': False, 'message': 'Contact not found'}), 404
    
    # Create conversation
    conversation = create_conversation([phone_number, contact_phone])
    
    return jsonify({
        'success': True,
        'conversation': {
            'id': conversation['conversation_id'],
            'contact': {
                'phone_number': contact['phone_number'],
                'name': contact['name'],
                'profile_pic': contact['profile_pic'],
                'about': contact['about']
            }
        }
    })

# API endpoint to send a message
@app.route('/api/message', methods=['POST'])
def send_message():
    """Send a message in a conversation"""
    # Get session token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    
    session_token = auth_header.split(' ')[1]
    
    # Validate session
    phone_number = validate_session(session_token)
    if not phone_number:
        return jsonify({'success': False, 'message': 'Invalid or expired session'}), 401
    
    # Get request data
    data = request.get_json()
    if not data or 'conversation_id' not in data or 'content' not in data:
        return jsonify({'success': False, 'message': 'Conversation ID and message content are required'}), 400
    
    conversation_id = data['conversation_id']
    content = data['content']
    
    # Check if conversation exists and user is a participant
    from python.db_handler import get_conversation, add_message
    conversation = get_conversation(conversation_id)
    
    if not conversation:
        return jsonify({'success': False, 'message': 'Conversation not found'}), 404
    
    if phone_number not in conversation['participants']:
        return jsonify({'success': False, 'message': 'Unauthorized access to conversation'}), 403
    
    # Add message
    message = add_message(conversation_id, phone_number, content)
    
    return jsonify({
        'success': True,
        'message': message
    })

# Run the app
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)