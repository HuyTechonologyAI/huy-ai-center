import requests
from requests.exceptions import RequestException

def check_vercel_project():
    """
    Checks if the Vercel Frontend project is accessible and loads without errors.
    """
    try:
        response = requests.get('https://your-vercel-frontend-url.com')
        response.raise_for_status()  # Raises an HTTPError for bad responses
        print("Vercel Frontend project is accessible and loads without errors.")
    except RequestException as e:
        print(f"Error accessing Vercel Frontend project: {e}")

def check_edge_middleware():
    """
    Checks if the Edge middleware is correctly configured and deployed.
    """
    try:
        response = requests.get('https://your-vercel-frontend-url.com/api/edge-middleware')
        response.raise_for_status()  # Raises an HTTPError for bad responses
        print("Edge middleware is correctly configured and deployed.")
    except RequestException as e:
        print(f"Error accessing Edge middleware: {e}")

def main():
    """
    Main function to check the Vercel Frontend project and Edge middleware.
    """
    print("Checking Vercel Frontend project...")
    check_vercel_project()

    print("Checking Edge middleware...")
    check_edge_middleware()

if __name__ == "__main__":
    main()