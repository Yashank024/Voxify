"""
Database handler for the Voxify Chat Application
This module provides functions to interact with the JSON database files
"""
import os
import json
import time
import random
import string
from datetime import datetime, timedelta

# Database paths
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database')
USERS_DB = os.path.join(DB_DIR, 'users.json')
CONVERSATIONS_DB = os.path.join(DB_DIR, 'conversations.json')
# No OTP database needed for email/password authentication
SESSIONS_DB = os.path.join(DB_DIR, 'sessions.json')

def ensure_db_files_exist():
    """Ensure all database files exist with proper structure"""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
    
    # Initialize users.json if it doesn't exist
    if not os.path.exists(USERS_DB):
        with open(USERS_DB, 'w') as f:
            json.dump({"users": []}, f, indent=2)
    
    # Initialize conversations.json if it doesn't exist
    if not os.path.exists(CONVERSATIONS_DB):
        with open(CONVERSATIONS_DB, 'w') as f:
            json.dump({"conversations": []}, f, indent=2)
    
    # No OTP verification needed for email/password authentication
    
    # Initialize sessions.json if it doesn't exist
    if not os.path.exists(SESSIONS_DB):
        with open(SESSIONS_DB, 'w') as f:
            json.dump({"sessions": []}, f, indent=2)

# User management functions
def get_all_users():
    """Get all registered users (for admin)"""
    ensure_db_files_exist()
    with open(USERS_DB, 'r') as f:
        users_data = json.load(f)
    
    # Return all users except the admin
    return users_data.get('users', [])

def get_user_by_phone(phone_number):
    """Get user by phone number"""
    ensure_db_files_exist()
    with open(USERS_DB, 'r') as f:
        users_data = json.load(f)
    
    for user in users_data.get('users', []):
        if user["phone_number"] == phone_number:
            return user
    return None

def get_user_by_id(user_id):
    """Get user by ID"""
    ensure_db_files_exist()
    with open(USERS_DB, 'r') as f:
        users_data = json.load(f)
    
    for user in users_data.get('users', []):
        if user.get('id') == user_id:
            return user
    
    return None

def create_user(phone_number, name=None, email=None, about=None):
    """Create a new user"""
    ensure_db_files_exist()
    with open(USERS_DB, 'r') as f:
        users_data = json.load(f)
    
    # Check if user already exists
    for user in users_data.get('users', []):
        if user["phone_number"] == phone_number:
            return user
    
    # Create new user
    current_time = datetime.now().isoformat()
    new_user = {
        "id": ''.join(random.choices(string.ascii_letters + string.digits, k=16)),
        "phone_number": phone_number,
        "name": name or "",
        "email": email or "",
        "about": about or "Hello, I'm using Voxify!",
        "profile_pic": "",
        "created_at": current_time,
        "last_login": current_time
    }
    
    users_data["users"].append(new_user)
    
    with open(USERS_DB, 'w') as f:
        json.dump(users_data, f, indent=2)
    
    return new_user

def update_user(phone_number, name=None, email=None, about=None, profile_pic=None):
    """Update user information"""
    ensure_db_files_exist()
    with open(USERS_DB, 'r') as f:
        users_data = json.load(f)
    
    for i, user in enumerate(users_data.get('users', [])):
        if user["phone_number"] == phone_number:
            if name is not None:
                users_data["users"][i]["name"] = name
            if email is not None:
                users_data["users"][i]["email"] = email
            if about is not None:
                users_data["users"][i]["about"] = about
            if profile_pic is not None:
                users_data["users"][i]["profile_pic"] = profile_pic
            
            with open(USERS_DB, 'w') as f:
                json.dump(users_data, f, indent=2)
            
            return users_data["users"][i]
    
    return None

def update_user_profile(user_id, update_data):
    """Update user profile information by user ID
    
    Args:
        user_id (str): The user ID
        update_data (dict): Dictionary containing fields to update
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    ensure_db_files_exist()
    
    try:
        with open(USERS_DB, 'r') as f:
            users_data = json.load(f)
        
        # Find the user by ID
        for i, user in enumerate(users_data.get('users', [])):
            if user.get('id') == user_id:
                # Update the user data
                for key, value in update_data.items():
                    users_data['users'][i][key] = value
                
                # Save the updated data
                with open(USERS_DB, 'w') as f:
                    json.dump(users_data, f, indent=2)
                
                return True
        
        return False
    except Exception as e:
        print(f"Error updating user profile: {str(e)}")
        return False

def search_users(query):
    """Search users by name or phone number"""
    ensure_db_files_exist()
    with open(USERS_DB, 'r') as f:
        users_data = json.load(f)
    
    results = []
    for user in users_data.get('users', []):
        if (query.lower() in user["name"].lower() or 
            query in user["phone_number"]):
            results.append(user)
    
    return results

# No OTP verification functions needed for email/password authentication

def verify_otp_db(phone_number, otp):
    """Verify OTP for a phone number"""
    ensure_db_files_exist()
    
    # Load OTP records
    with open(OTP_DB, 'r') as f:
        otp_data = json.load(f)
    
    # Find the OTP record for this phone number
    for i, record in enumerate(otp_data['otp_records']):
        if record['phone_number'] == phone_number:
            # Check if OTP is expired
            expires_at = datetime.fromisoformat(record['expires_at'])
            if datetime.now() > expires_at:
                return False, 'OTP has expired. Please request a new one.'
            
            # Fast path - Check if OTP matches exactly
            if record['otp'] == otp:
                # Mark as verified immediately
                otp_data['otp_records'][i]['verified'] = True
                with open(OTP_DB, 'w') as f:
                    json.dump(otp_data, f, indent=2)
                return True, 'OTP verified successfully'
            
            # Alternative path - Check with whitespace trimming
            if record['otp'].strip() == otp.strip():
                # Mark as verified
                otp_data['otp_records'][i]['verified'] = True
                with open(OTP_DB, 'w') as f:
                    json.dump(otp_data, f, indent=2)
                return True, 'OTP verified successfully'
            else:
                return False, 'Invalid OTP. Please try again.'
    
    return False, 'No OTP found for this phone number. Please request a new one.'

# Session management functions
def create_session(phone_number):
    """Create a new session for a user"""
    ensure_db_files_exist()
    with open(SESSIONS_DB, 'r') as f:
        sessions_data = json.load(f)
    
    # Generate a random session token
    token = ''.join(random.choices(string.ascii_letters + string.digits, k=64))
    
    current_time = datetime.now()
    expiry_time = current_time + timedelta(hours=24)
    
    new_session = {
        "user_phone": phone_number,
        "session_token": token,
        "created_at": current_time.isoformat(),
        "expires_at": expiry_time.isoformat()
    }
    
    sessions_data["sessions"].append(new_session)
    
    with open(SESSIONS_DB, 'w') as f:
        json.dump(sessions_data, f, indent=2)
    
    return new_session

def validate_session(session_token):
    """Validate a session token"""
    ensure_db_files_exist()
    with open(SESSIONS_DB, 'r') as f:
        sessions_data = json.load(f)
    
    current_time = datetime.now()
    
    for session in sessions_data["sessions"]:
        if session["session_token"] == session_token:
            # Check if session is expired
            expires_at = datetime.fromisoformat(session["expires_at"])
            if current_time > expires_at:
                return None
            
            return session["user_phone"]
    
    return None

def delete_session(session_token):
    """Delete a session"""
    ensure_db_files_exist()
    with open(SESSIONS_DB, 'r') as f:
        sessions_data = json.load(f)
    
    sessions_data["sessions"] = [session for session in sessions_data["sessions"] 
                               if session["session_token"] != session_token]
    
    with open(SESSIONS_DB, 'w') as f:
        json.dump(sessions_data, f, indent=2)
    
    return True

# Chat conversation functions
def get_conversations(phone_number):
    """Get all conversations for a user"""
    ensure_db_files_exist()
    with open(CONVERSATIONS_DB, 'r') as f:
        conversations_data = json.load(f)
    
    user_conversations = []
    for conversation in conversations_data["conversations"]:
        if phone_number in conversation["participants"]:
            user_conversations.append(conversation)
    
    return user_conversations

def get_conversation(conversation_id):
    """Get a specific conversation by ID"""
    ensure_db_files_exist()
    with open(CONVERSATIONS_DB, 'r') as f:
        conversations_data = json.load(f)
    
    for conversation in conversations_data["conversations"]:
        if conversation["conversation_id"] == conversation_id:
            return conversation
    
    return None

def create_conversation(participants):
    """Create a new conversation between users"""
    ensure_db_files_exist()
    with open(CONVERSATIONS_DB, 'r') as f:
        conversations_data = json.load(f)
    
    # Check if conversation already exists
    for conversation in conversations_data["conversations"]:
        if set(conversation["participants"]) == set(participants):
            return conversation
    
    # Create a new conversation ID
    # Sort participants to ensure consistent ID generation
    sorted_participants = sorted(participants)
    conversation_id = f"conv_{'_'.join(sorted_participants)}"
    
    current_time = datetime.now().isoformat()
    
    new_conversation = {
        "conversation_id": conversation_id,
        "participants": participants,
        "messages": [],
        "created_at": current_time,
        "updated_at": current_time
    }
    
    conversations_data["conversations"].append(new_conversation)
    
    with open(CONVERSATIONS_DB, 'w') as f:
        json.dump(conversations_data, f, indent=2)
    
    return new_conversation

def add_message(conversation_id, sender, content):
    """Add a message to a conversation"""
    ensure_db_files_exist()
    with open(CONVERSATIONS_DB, 'r') as f:
        conversations_data = json.load(f)
    
    current_time = datetime.now().isoformat()
    
    for i, conversation in enumerate(conversations_data["conversations"]):
        if conversation["conversation_id"] == conversation_id:
            # Generate a message ID
            message_id = f"msg_{len(conversation['messages']):03d}"
            
            new_message = {
                "message_id": message_id,
                "sender": sender,
                "content": content,
                "timestamp": current_time,
                "read": False
            }
            
            conversations_data["conversations"][i]["messages"].append(new_message)
            conversations_data["conversations"][i]["updated_at"] = current_time
            
            with open(CONVERSATIONS_DB, 'w') as f:
                json.dump(conversations_data, f, indent=2)
            
            return new_message
    
    return None

def mark_messages_as_read(conversation_id, phone_number):
    """Mark all messages in a conversation as read for a user"""
    ensure_db_files_exist()
    with open(CONVERSATIONS_DB, 'r') as f:
        conversations_data = json.load(f)
    
    for i, conversation in enumerate(conversations_data["conversations"]):
        if conversation["conversation_id"] == conversation_id:
            updated = False
            for j, message in enumerate(conversation["messages"]):
                if message["sender"] != phone_number and not message["read"]:
                    conversations_data["conversations"][i]["messages"][j]["read"] = True
                    updated = True
            
            if updated:
                with open(CONVERSATIONS_DB, 'w') as f:
                    json.dump(conversations_data, f, indent=2)
            
            return True
    
    return False

# Initialize database files
ensure_db_files_exist()
