"""
RapidAPI Phone Verification Client
This module provides functions to interact with the RapidAPI Phone Verification service
"""
import base64
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API credentials
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "77a45e249cmsh792cd7445b30ea1p146476jsna8123226ed35")
CLIENT_ID = os.getenv("CLIENT_ID", "default-application_8037285")
CLIENT_SECRET = os.getenv("CLIENT_SECRET", "your_client_secret_here")
USERNAME = os.getenv("USERNAME", "tommorris@gmail.com")
PASSWORD = os.getenv("PASSWORD", "welcome123")

# API endpoints
BASE_URL = "https://phone-verification3.p.rapidapi.com"
LOGIN_ENDPOINT = f"{BASE_URL}/login"
SMS_SEND_ENDPOINT = f"{BASE_URL}/sms/send"

# Authentication token
access_token = None

def get_auth_headers():
    """Get the authentication headers for RapidAPI"""
    # Build the Basic auth header
    creds = f"{CLIENT_ID}:{CLIENT_SECRET}"
    b64_creds = base64.b64encode(creds.encode()).decode()
    authorization_header = f"Basic {b64_creds}"
    
    return {
        "x-rapidapi-host": "phone-verification3.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
        "Authorization": authorization_header,
        "Content-Type": "application/x-www-form-urlencoded"
    }

def authenticate():
    """Authenticate with RapidAPI and get access token"""
    global access_token
    
    # Prepare request data
    data = {
        "grant_type": "password",
        "username": USERNAME,
        "password": PASSWORD
    }
    
    # Get headers
    headers = get_auth_headers()
    
    try:
        # Make the request
        response = requests.post(LOGIN_ENDPOINT, headers=headers, data=data)
        
        # Check if successful
        if response.status_code == 200:
            result = response.json()
            access_token = result.get("access_token")
            print(f"Successfully authenticated with RapidAPI. Token: {access_token[:10]}...")
            return True, "Authentication successful"
        else:
            print(f"Failed to authenticate with RapidAPI. Status: {response.status_code}, Response: {response.text}")
            return False, f"Authentication failed: {response.text}"
    
    except Exception as e:
        print(f"Error authenticating with RapidAPI: {str(e)}")
        return False, f"Authentication error: {str(e)}"

def send_sms(phone_number, otp):
    """Send SMS with OTP via RapidAPI"""
    global access_token
    
    # Ensure we have an access token
    if not access_token:
        success, message = authenticate()
        if not success:
            return False, message, None
    
    # Prepare message
    message = f"Your Voxify verification code is: {otp}"
    
    # Prepare request data
    data = {
        "to": phone_number,
        "message": message
    }
    
    # Get headers
    headers = get_auth_headers()
    
    # Add Bearer token if we have one
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    try:
        # Make the request
        response = requests.post(SMS_SEND_ENDPOINT, headers=headers, data=data)
        
        # Check if successful
        if response.status_code == 200:
            result = response.json()
            print(f"Successfully sent SMS to {phone_number}")
            return True, "SMS sent successfully", otp
        else:
            print(f"Failed to send SMS. Status: {response.status_code}, Response: {response.text}")
            
            # If unauthorized, try to re-authenticate and try again
            if response.status_code == 401:
                success, message = authenticate()
                if success:
                    # Update headers with new token
                    headers["Authorization"] = f"Bearer {access_token}"
                    
                    # Try again
                    response = requests.post(SMS_SEND_ENDPOINT, headers=headers, data=data)
                    
                    if response.status_code == 200:
                        result = response.json()
                        print(f"Successfully sent SMS to {phone_number} after re-authentication")
                        return True, "SMS sent successfully", otp
            
            return False, f"Failed to send SMS: {response.text}", otp
    
    except Exception as e:
        print(f"Error sending SMS via RapidAPI: {str(e)}")
        return False, f"SMS sending error: {str(e)}", otp

def verify_otp(phone_number, otp):
    """
    Verify OTP (this would typically call the RapidAPI verification endpoint)
    Currently, we're just returning True as we're using our own OTP verification
    """
    # In a real implementation, you would call the RapidAPI verification endpoint
    # For now, we'll just return success and let our own verification logic handle it
    return True, "OTP verification successful"
