import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import summarizer


def messages(count):
    return [{"senderName": "Researcher", "content": f"message {i}"} for i in range(count)]


def model_response(summary="Done"):
    return SimpleNamespace(content=json.dumps({
        "summary": summary,
        "key_points": ["Decision"],
        "action_items": ["Follow up"],
    }))


class SummarizerTests(unittest.TestCase):
    def test_formats_valid_timestamp_and_tolerates_invalid_timestamp(self):
        result = summarizer._format_messages([
            {"senderName": "Ada", "content": "Hello", "createdAt": "2026-01-01T09:05:00Z"},
            {"senderName": "Bob", "content": "Ready", "createdAt": "invalid"},
        ])

        self.assertEqual(result, "Ada [09:05]: Hello\nBob: Ready")

    def test_chunks_keep_all_messages_in_order(self):
        original = messages(81)

        chunks = summarizer._chunk_messages(original, chunk_size=40)

        self.assertEqual([len(chunk) for chunk in chunks], [40, 40, 1])
        self.assertEqual([message for chunk in chunks for message in chunk], original)

    def test_missing_key_returns_guidance_without_creating_model(self):
        with patch.object(summarizer, "GOOGLE_API_KEY", ""):
            with patch.object(summarizer, "_build_llm") as build_llm:
                result = summarizer.summarize_messages(messages(1))

        self.assertEqual(result["strategy"], "missing_api_key")
        self.assertEqual(result["message_count"], 1)
        build_llm.assert_not_called()

    def test_80_messages_use_one_model_call_and_parse_fenced_json(self):
        llm = Mock()
        llm.invoke.return_value = SimpleNamespace(content="```json\n" + model_response().content + "\n```")
        with patch.object(summarizer, "GOOGLE_API_KEY", "test-key"):
            with patch.object(summarizer, "_build_llm", return_value=llm):
                result = summarizer.summarize_messages(messages(80))

        self.assertEqual(result["strategy"], "stuff")
        self.assertEqual(result["message_count"], 80)
        self.assertEqual(result["key_points"], ["Decision"])
        llm.invoke.assert_called_once()
        self.assertIn("message 79", llm.invoke.call_args.args[0])

    def test_81_messages_map_three_chunks_then_combine(self):
        llm = Mock()
        llm.invoke.side_effect = [
            SimpleNamespace(content="first chunk"),
            SimpleNamespace(content="second chunk"),
            SimpleNamespace(content="third chunk"),
            model_response("Combined"),
        ]
        with patch.object(summarizer, "GOOGLE_API_KEY", "test-key"):
            with patch.object(summarizer, "_build_llm", return_value=llm):
                result = summarizer.summarize_messages(messages(81))

        self.assertEqual(result["strategy"], "map_reduce")
        self.assertEqual(result["message_count"], 81)
        self.assertEqual(result["summary"], "Combined")
        self.assertEqual(llm.invoke.call_count, 4)
        self.assertIn("first chunk\n\nsecond chunk\n\nthird chunk", llm.invoke.call_args.args[0])

    def test_non_json_model_output_becomes_plain_summary(self):
        llm = Mock()
        llm.invoke.return_value = SimpleNamespace(content="Plain response")
        with patch.object(summarizer, "GOOGLE_API_KEY", "test-key"):
            with patch.object(summarizer, "_build_llm", return_value=llm):
                result = summarizer.summarize_messages(messages(1))

        self.assertEqual(result["summary"], "Plain response")
        self.assertEqual(result["key_points"], [])
        self.assertEqual(result["action_items"], [])

    def test_extracts_text_from_model_content_blocks(self):
        response = SimpleNamespace(content=[
            {"text": "first"},
            "second",
            {"type": "other"},
        ])

        self.assertEqual(summarizer._extract_text(response), "first\nsecond")


if __name__ == "__main__":
    unittest.main()
