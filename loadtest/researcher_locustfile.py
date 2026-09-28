"""Read-only researcher/member workload for the deployed Orchestrix API.

Set LOCUST_EMAIL, LOCUST_PASSWORD, and LOCUST_TENANT (for example, myorg).
Run with: locust -f loadtest/researcher_locustfile.py --host https://orchestrix.mrt.lk
"""

import os
import random

from locust import HttpUser, between, task
from locust.exception import StopUser


class ResearcherUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        email = os.environ["LOCUST_EMAIL"]
        password = os.environ["LOCUST_PASSWORD"]
        tenant = os.environ["LOCUST_TENANT"]
        with self.client.post(
            "/api/auth/login",
            name="POST /api/auth/login",
            headers={"X-Tenant-ID": tenant},
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

        self.headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": tenant}
        self.project_ids = []
        self.resource_ids = []

    def get_list(self, path, name):
        with self.client.get(path, name=name, headers=self.headers, catch_response=True) as response:
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return None
            try:
                items = response.json()
            except ValueError:
                response.failure("response is not JSON")
                return None
            if not isinstance(items, list):
                response.failure("response is not a list")
                return None
            return items

    def project_id(self):
        if not self.project_ids:
            projects = self.get_list("/api/projects", "GET /api/projects")
            if projects is not None:
                self.project_ids = [item["id"] for item in projects if isinstance(item, dict) and item.get("id")]
        return random.choice(self.project_ids) if self.project_ids else None

    def resource_id(self):
        if not self.resource_ids:
            resources = self.get_list("/api/resources", "GET /api/resources")
            if resources is not None:
                self.resource_ids = [item["id"] for item in resources if isinstance(item, dict) and item.get("id")]
        return random.choice(self.resource_ids) if self.resource_ids else None

    @task(4)
    def kanban_tasks(self):
        project_id = self.project_id()
        if project_id:
            self.get_list(f"/api/projects/{project_id}/tasks", "GET /api/projects/:id/tasks")

    @task(2)
    def kanban_status(self):
        project_id = self.project_id()
        if project_id:
            status = random.choice(("TODO", "IN_PROGRESS", "DONE", "BLOCKED"))
            self.get_list(
                f"/api/projects/{project_id}/tasks?status={status}",
                "GET /api/projects/:id/tasks?status",
            )

    @task(3)
    def projects(self):
        self.get_list("/api/projects", "GET /api/projects")

    @task(1)
    def project_summary(self):
        project_id = self.project_id()
        if project_id:
            self.client.get(
                f"/api/projects/{project_id}/summary",
                name="GET /api/projects/:id/summary",
                headers=self.headers,
            )

    @task(2)
    def resources(self):
        self.get_list("/api/resources", "GET /api/resources")

    @task(2)
    def my_bookings(self):
        self.get_list("/api/resources/bookings/me", "GET /api/resources/bookings/me")

    @task(1)
    def resource_bookings(self):
        resource_id = self.resource_id()
        if resource_id:
            self.get_list(
                f"/api/resources/{resource_id}/bookings",
                "GET /api/resources/:id/bookings",
            )
