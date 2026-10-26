#!/usr/bin/env python3

import os
import time
import psutil

def get_uptime():
    """Get the system uptime in seconds."""
    return time.time() - os.path.getmtime("/proc/uptime")

def get_memory_usage():
    """Get the memory usage in bytes."""
    mem = psutil.virtual_memory()
    return mem.total - mem.available

def main():
    uptime = get_uptime()
    memory_usage = get_memory_usage()

    print(f"System Uptime: {uptime:.2f} seconds")
    print(f"Memory Usage: {memory_usage / (1024**3):.2f} GB")

if __name__ == "__main__":
    main()