"""
User Profile API endpoints for the Voxify Chat Application
Handles fetching, updating and managing user profile information
"""
from flask import Blueprint, request, jsonify, current_app as app, session
import os
import json
import time
from werkzeug.utils import secure_filename
from .db_handler import get_user_by_phone, update_user, validate_session, delete_session
from functools import wraps

# Create a Blueprint for the user profile API
user_profile_bp = Blueprint('user_profile', __name__)

# File path for storing profile pictures
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'img')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Allowed file extensions for profile pictures
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('authenticated'):
            if request.content_type == 'application/json':
                return jsonify({'success': False, 'error': 'Authentication required', 'redirect': 'login.html'}), 401
            else:
                return jsonify({'success': False, 'error': 'Authentication required', 'redirect': 'login.html'}), 401
        return f(*args, **kwargs)
    return decorated_function

@user_profile_bp.route('/api/user-profile', methods=['GET'])
@login_required
def get_user_profile():
    """Get the user profile information"""
    try:
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Validate session
        phone_number = validate_session(session_token)
        if not phone_number:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        # Get user information
        user = get_user_by_phone(phone_number)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Return user profile information
        profile_data = {
            'name': user.get('name', ''),
            'phone_number': user.get('phone_number', ''),
            'email': user.get('email', ''),
            'about': user.get('about', 'Hey there! I am using Voxify.'),
            'profile_pic': user.get('profile_pic', '')
        }
        
        return jsonify(profile_data), 200
    
    except Exception as e:
        app.logger.error(f"Error fetching user profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch user profile'}), 500

@user_profile_bp.route('/api/update-profile', methods=['POST'])
@login_required
def update_profile():
    """Update user profile information"""
    try:
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Validate session
        phone_number = validate_session(session_token)
        if not phone_number:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        data = request.json
        app.logger.info(f"Updating profile for user: {phone_number} with data: {data}")
        
        # Validate data
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Fields that can be updated
        allowed_fields = ['name', 'email', 'about']
        update_data = {}
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Update user profile in database
        updated_user = update_user(phone_number, **update_data)
        
        if not updated_user:
            return jsonify({'error': 'Failed to update profile'}), 500
        
        return jsonify({'message': 'Profile updated successfully'}), 200
    
    except Exception as e:
        app.logger.error(f"Error updating user profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500

@user_profile_bp.route('/api/upload-profile-picture', methods=['POST'])
@login_required
def upload_profile_picture():
    """Upload a new profile picture"""
    try:
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Validate session
        phone_number = validate_session(session_token)
        if not phone_number:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        # Check if the post request has the file part
        if 'profile_picture' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['profile_picture']
        
        # If user does not select file, browser also
        # submit an empty part without filename
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            # Create a secure filename with timestamp to avoid conflicts
            filename = secure_filename(file.filename)
            timestamp = int(time.time())
            new_filename = f"{phone_number.replace('+', '')}_{timestamp}_{filename}"
            
            # Save the file
            file_path = os.path.join(UPLOAD_FOLDER, new_filename)
            file.save(file_path)
            
            # Update the user's profile picture path in the database
            relative_path = f"img/{new_filename}"
            updated_user = update_user(phone_number, profile_pic=relative_path)
            
            if not updated_user:
                return jsonify({'error': 'Failed to update profile picture in database'}), 500
            
            return jsonify({
                'message': 'Profile picture uploaded successfully',
                'profile_pic': relative_path
            }), 200
        
        return jsonify({'error': 'File type not allowed'}), 400
    
    except Exception as e:
        app.logger.error(f"Error uploading profile picture: {str(e)}")
        return jsonify({'error': 'Failed to upload profile picture'}), 500

@user_profile_bp.route('/api/logout', methods=['POST'])
def logout():
    """Log out the user by invalidating the session token"""
    try:
        # Get session token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
        
        session_token = auth_header.split(' ')[1]
        
        # Delete the session
        success = delete_session(session_token)
        
        if not success:
            return jsonify({'error': 'Failed to logout'}), 500
        
        return jsonify({'message': 'Logged out successfully'}), 200
    
    except Exception as e:
        app.logger.error(f"Error during logout: {str(e)}")
        return jsonify({'error': 'Failed to logout'}), 500

def register_user_profile_api(app):
    """Register the user profile blueprint with the Flask app"""
    app.register_blueprint(user_profile_bp)
    app.logger.info("User Profile API registered")
