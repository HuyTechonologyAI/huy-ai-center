import subprocess
import time
import requests

def ping_latency(host):
    try:
        start_time = time.time()
        subprocess.run(['ping', '-c', '1', host], check=True)
        end_time = time.time()
        return end_time - start_time
    except subprocess.CalledProcessError:
        return None

def http_latency(host):
    try:
        start_time = time.time()
        response = requests.get(host, timeout=1)
        end_time = time.time()
        return end_time - start_time
    except requests.exceptions.RequestException:
        return None

def main():
    cloudflare_host = '1.1.1.1'
    gateway_host = '10.0.0.1'

    cloudflare_ping_latency = ping_latency(cloudflare_host)
    gateway_ping_latency = ping_latency(gateway_host)

    cloudflare_http_latency = http_latency(cloudflare_host)
    gateway_http_latency = http_latency(gateway_host)

    print(f"Cloudflare Ping Latency: {cloudflare_ping_latency if cloudflare_ping_latency is not None else 'N/A'} seconds")
    print(f"Gateway Ping Latency: {gateway_ping_latency if gateway_ping_latency is not None else 'N/A'} seconds")

    print(f"Cloudflare HTTP Latency: {cloudflare_http_latency if cloudflare_http_latency is not None else 'N/A'} seconds")
    print(f"Gateway HTTP Latency: {gateway_http_latency if gateway_http_latency is not None else 'N/A'} seconds")

if __name__ == "__main__":
    main()