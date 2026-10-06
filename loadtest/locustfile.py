"""Locust workload for the single-host Orchestrix deployment.

Required environment variables: LOCUST_EMAIL, LOCUST_PASSWORD, LOCUST_TENANT.
Optional: LOCUST_PROJECT_ID, LOCUST_ENABLE_SUMMARY=1, LOCUST_HOST.

Example:
    LOCUST_EMAIL=user@example.com LOCUST_PASSWORD=... LOCUST_TENANT=myorg \
      locust -f loadtest/locustfile.py --host https://orchestrix.mrt.lk
"""

import os

from locust import HttpUser, between, task
from locust.exception import StopUser


ENABLE_SUMMARY = os.getenv("LOCUST_ENABLE_SUMMARY") == "1"


class OrchestrixUser(HttpUser):
    host = os.getenv("LOCUST_HOST", "https://orchestrix.mrt.lk")
    wait_time = between(1, 3)

    def on_start(self):
        email = os.getenv("LOCUST_EMAIL")
        password = os.getenv("LOCUST_PASSWORD")
        self.tenant = os.getenv("LOCUST_TENANT")
        if not all((email, password, self.tenant)):
            raise RuntimeError(
                "Set LOCUST_EMAIL, LOCUST_PASSWORD, and LOCUST_TENANT before starting Locust"
            )

        with self.client.post(
            "/api/auth/login",
            name="POST /api/auth/login",
            headers={"X-Tenant-ID": self.tenant},
            json={"email": email, "password": password},
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"login returned HTTP {response.status_code}")
                raise StopUser()
            try:
                token = response.json()["token"]
            except (ValueError, KeyError, TypeError):
                response.failure("login response has no token")
                raise StopUser()

        self.headers = {
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": self.tenant,
        }
        self.project_id = os.getenv("LOCUST_PROJECT_ID")

    @task(5)
    def projects(self):
        with self.client.get(
            "/api/projects",
            name="GET /api/projects",
            headers=self.headers,
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"projects returned HTTP {response.status_code}")
                return
            try:
                projects = response.json()
            except ValueError:
                response.failure("projects response is not JSON")
                return
            if not isinstance(projects, list):
                response.failure("projects response is not a list")
                return
            if not self.project_id and projects:
                self.project_id = projects[0].get("id")

    @task(3)
    def chat_history(self):
        if not self.project_id:
            self.projects()
            if not self.project_id:
                return
        self.client.get(
            f"/api/chat/projects/{self.project_id}/messages",
            name="GET /api/chat/projects/:id/messages",
            params={"page": 0, "size": 15},
            headers=self.headers,
        )

    @task(1)
    def home(self):
        self.client.get("/", name="GET /")

    @task(1)
    def sockjs_info(self):
        self.client.get("/ws/info", name="GET /ws/info")

    if ENABLE_SUMMARY:

        @task(1)
        def summarize(self):
            if not self.project_id:
                self.projects()
                if not self.project_id:
                    return
            self.client.post(
                "/api/ai/summarize",
                name="POST /api/ai/summarize",
                headers=self.headers,
                json={
                    "projectId": self.project_id,
                    "messages": [
                        {"senderName": "Researcher", "content": "We completed the initial analysis."},
                        {"senderName": "Lead", "content": "Please summarize the next steps."},
                    ],
                },
                timeout=60,
            )
