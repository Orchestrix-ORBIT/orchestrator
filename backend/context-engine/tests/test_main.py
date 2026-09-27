import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import ChatMessageItem, SummarizeRequest, app, health_check, summarize


async def run_inline(function, *args, **kwargs):
    """Avoid worker threads, which are unavailable in the test sandbox."""
    return function(*args, **kwargs)


class ContextEngineApiTests(unittest.TestCase):
    def test_health_check(self):
        result = health_check()

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["service"], "context-engine")

    def test_summarize_forwards_normalized_messages_and_returns_result(self):
        result = {
            "summary": "The team agreed to test the prototype.",
            "key_points": ["Prototype test agreed"],
            "action_items": ["Run the test"],
            "message_count": 2,
            "strategy": "stuff",
        }
        request = SummarizeRequest(messages=[
            ChatMessageItem(senderName="A", content="Test it", createdAt="2026-01-01T10:00:00Z"),
            ChatMessageItem(senderName="B", content="Agreed"),
        ], projectId="project-1", tenantId="lab-1")
        with patch("main.summarize_messages", return_value=result) as summarize_model:
            response = summarize(request)

        self.assertEqual(response.model_dump(), result)
        summarize_model.assert_called_once_with([
            {"senderName": "A", "content": "Test it", "createdAt": "2026-01-01T10:00:00Z"},
            {"senderName": "B", "content": "Agreed", "createdAt": ""},
        ])

    def test_rejects_empty_and_oversized_requests_before_model_call(self):
        with patch("main.summarize_messages") as summarize_model:
            with self.assertRaises(HTTPException) as empty:
                summarize(SummarizeRequest(messages=[]))
            with self.assertRaises(HTTPException) as oversized:
                summarize(SummarizeRequest(messages=[ChatMessageItem(senderName="A", content="x")] * 501))

        self.assertEqual(empty.exception.status_code, 400)
        self.assertEqual(empty.exception.detail, "No messages provided.")
        self.assertEqual(oversized.exception.status_code, 400)
        self.assertIn("500 or fewer", oversized.exception.detail)
        summarize_model.assert_not_called()

    def test_request_model_rejects_missing_message_fields(self):
        with self.assertRaises(ValidationError):
            SummarizeRequest.model_validate({"messages": [{"senderName": "A"}]})

    def test_maps_value_error_to_422(self):
        with patch("main.summarize_messages", side_effect=ValueError("invalid model output")):
            with self.assertRaises(HTTPException) as error:
                summarize(SummarizeRequest(messages=[ChatMessageItem(senderName="A", content="hello")]))

        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(error.exception.detail, "invalid model output")

    def test_maps_unexpected_error_to_500(self):
        with patch("main.summarize_messages", side_effect=RuntimeError("model unavailable")):
            with patch("main.traceback.print_exc"):
                with self.assertRaises(HTTPException) as error:
                    summarize(SummarizeRequest(messages=[ChatMessageItem(senderName="A", content="hello")]))

        self.assertEqual(error.exception.status_code, 500)
        self.assertIn("model unavailable", error.exception.detail)


class ContextEngineHttpTests(unittest.IsolatedAsyncioTestCase):
    async def request(self, method, path, **kwargs):
        with patch("fastapi.routing.run_in_threadpool", run_inline):
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://testserver"
            ) as client:
                return await client.request(method, path, **kwargs)

    async def test_health_route_returns_json(self):
        response = await self.request("GET", "/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["service"], "context-engine")

    async def test_summarize_route_serializes_model_result(self):
        result = {
            "summary": "Meeting done",
            "key_points": ["Decision"],
            "action_items": ["Follow up"],
            "message_count": 1,
            "strategy": "stuff",
        }
        with patch("main.summarize_messages", return_value=result):
            response = await self.request("POST", "/summarize", json={
                "messages": [{"senderName": "A", "content": "hello"}],
            })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), result)

    async def test_summarize_route_rejects_empty_and_malformed_messages(self):
        empty = await self.request("POST", "/summarize", json={"messages": []})
        malformed = await self.request("POST", "/summarize", json={
            "messages": [{"senderName": "A"}],
        })

        self.assertEqual(empty.status_code, 400)
        self.assertEqual(malformed.status_code, 422)

    async def test_summarize_route_maps_model_error(self):
        with patch("main.summarize_messages", side_effect=RuntimeError("model unavailable")):
            with patch("main.traceback.print_exc"):
                response = await self.request("POST", "/summarize", json={
                    "messages": [{"senderName": "A", "content": "hello"}],
                })

        self.assertEqual(response.status_code, 500)
        self.assertIn("model unavailable", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
