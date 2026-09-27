import asyncio
import aiohttp
import time

async def fetch(session, url):
    start = time.time()
    async with session.get(url) as response:
        await response.text()
        return time.time() - start

async def main():
    url = "http://localhost:8080/actuator/health" # Or a public endpoint
    print(f"Starting load test on {url} with 100 concurrent requests...")
    
    start_time = time.time()
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for _ in range(100)]
        results = await asyncio.gather(*tasks)
    
    total_time = time.time() - start_time
    print(f"Total time for 100 requests: {total_time:.2f}s")
    print(f"Average response time: {sum(results)/len(results)*1000:.2f}ms")
    print(f"Min response time: {min(results)*1000:.2f}ms")
    print(f"Max response time: {max(results)*1000:.2f}ms")

if __name__ == "__main__":
    asyncio.run(main())
