import http from 'k6/http';
import { check, sleep } from 'k6';

// 6.5.2 Load Testing Configuration
export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp up to 20 concurrent users over 10 seconds
    { duration: '30s', target: 100 }, // Spike to 100 concurrent users for 30 seconds (Load Test)
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    // 6.5.1 Performance Profiling Configuration
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms 
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1% (Stability Check)
  },
};

export default function () {
  // Target the Core API endpoint
  const res = http.get('http://localhost:8080/api/projects');
  
  check(res, {
    'status is 200 or 401 (Auth Check)': (r) => r.status === 200 || r.status === 401,
    'response time is acceptable': (r) => r.timings.duration < 300,
  });
  
  sleep(1);
}
