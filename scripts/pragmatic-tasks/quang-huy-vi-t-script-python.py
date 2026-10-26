import requests
import time
import logging

# Load configuration from config.py
from config import API_URL, LOG_FILE

# Configure logging
logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def check_website_status():
    try:
        response = requests.get(API_URL)
        response.raise_for_status()  # Raise an error for bad responses
        logging.info(f"Status: {response.status_code} - {response.reason}")
    except requests.exceptions.RequestException as e:
        logging.error(f"Error checking website status: {e}")

def main():
    while True:
        check_website_status()
        time.sleep(300)  # Sleep for 5 minutes

if __name__ == "__main__":
    main()