#!/usr/bin/env python3

import os
import subprocess
import psutil

def validate_system_health():
    """
    Validates the system health by checking the system load average and disk capacity.

    Returns:
        bool: True if the system is healthy, False otherwise.
    """
    try:
        # Check system load average
        load_avg = psutil.getloadavg()[0]
        if load_avg >= 0.8:
            print("System load average is too high.")
            return False

        # Check disk capacity
        disk_usage = psutil.disk_usage('/')
        if disk_usage.percent <= 10:
            print("Disk capacity is too low.")
            return False

        print("System is healthy.")
        return True

    except Exception as e:
        print(f"An error occurred: {e}")
        return False

if __name__ == "__main__":
    # Run the validation
    is_healthy = validate_system_health()
    print(f"System health is: {'Healthy' if is_healthy else 'Unhealthy'}")