import time
import csv
import redis
from datetime import datetime

# Function to measure average response time of data queries
def measure_query_performance(query, num_iterations=100):
    """
    Measures the average response time of executing a data query a specified number of times.
    
    :param query: The SQL query to be executed.
    :param num_iterations: Number of times to execute the query.
    :return: Average response time in seconds.
    """
    start_time = time.time()
    for _ in range(num_iterations):
        redis_client.execute_command(query)
    end_time = time.time()
    return (end_time - start_time) / num_iterations

# Function to monitor and report Redis memory usage
def monitor_redis_memory_usage():
    """
    Monitors and reports the current memory usage of Redis.
    
    :return: Memory usage in bytes.
    """
    memory_usage = redis_client.info('memory')['used_memory']
    return memory_usage

# Main function to execute the tests
def main():
    # Initialize Redis client
    redis_client = redis.Redis(host='localhost', port=6379, db=0)
    
    # Define a sample query
    sample_query = "SELECT * FROM users WHERE age > 30"
    
    # Measure query performance
    average_response_time = measure_query_performance(sample_query)
    print(f"Average Query Response Time: {average_response_time:.4f} seconds")
    
    # Monitor Redis memory usage
    memory_usage = monitor_redis_memory_usage()
    print(f"Current Redis Memory Usage: {memory_usage} bytes")
    
    # Log results to CSV
    log_results(average_response_time, memory_usage)

# Function to log results to a CSV file
def log_results(response_time, memory_usage):
    """
    Logs the query performance and Redis memory usage to a CSV file.
    
    :param response_time: Average query response time.
    :param memory_usage: Current Redis memory usage.
    """
    with open('performance_results.csv', mode='a', newline='') as file:
        writer = csv.writer(file)
        writer.writerow([datetime.now().strftime('%Y-%m-%d %H:%M:%S'), response_time, memory_usage])

# Run the main function
if __name__ == "__main__":
    main()