"""
Gemini Copilot Service:
Handles multi-turn AI reasoning, function declaration schemas, autonomous tool execution,
and fallback logic for Google Gemini models.
"""
import os
import json
import re
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from . import tools

logger = logging.getLogger(__name__)

# API Key from environment or Render secret
DEFAULT_GEMINI_KEY = os.environ.get('GEMINI_API_KEY', '')

# Candidate models in priority order
CANDIDATE_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
]

SYSTEM_PROMPT = """You are the intelligent Inventory & Operations Copilot for "Gadget Deluxe", a premium Apple smartphone inventory and electronics business.
You assist administrators and operations managers with:
1. Instant inventory queries (IMEI, model, color, stock status, valuation).
2. Diagnostic verification (checking Sickw GSX reports, motherboard color vs housing color mismatches, SIM lock status).
3. Shipments in-transit from international suppliers (tracking numbers, arrival status).
4. Repairs tracking (devices in Chinese/local repair centers, costs).
5. Operational actions (updating device status, assigning devices to staff).

GUIDELINES:
- When the user asks about stock, devices, or shipments, ALWAYS call the appropriate tool to retrieve real-time facts from the database.
- Be concise, professional, and authoritative. Format answers using GitHub markdown (tables, bullet points, bold numbers, emoji).
- When mentioning IMEIs, output the exact 15-digit number so the UI can link directly to the device.
- If a device has a motherboard color mismatch (e.g., housing is Natural Titanium but motherboard is Blue Titanium), highlight this as a potential modified or refurbished housing.
- If performing a state-changing action (like changing status or assigning), confirm the exact device and previous state in your final response.
"""

GEMINI_TOOLS_DECLARATION = [{
    "function_declarations": [
        {
            "name": "search_devices",
            "description": "Search devices in inventory by query (IMEI, serial, model, color) or current status.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {"type": "STRING", "description": "Search term like iPhone 15, Natural, or partial IMEI/Serial"},
                    "status": {"type": "STRING", "description": "Optional status filter (WAITING_SHIPMENT, IN_STOCK, UNDER_REPAIR, SOLD, ASSIGNED)"},
                    "limit": {"type": "INTEGER", "description": "Max results to return (default 8)"}
                }
            }
        },
        {
            "name": "get_inventory_stats",
            "description": "Get real-time count of devices across all statuses, total active unsold inventory valuation in BDT, and active shipments count.",
            "parameters": {
                "type": "OBJECT",
                "properties": {}
            }
        },
        {
            "name": "get_device_detail",
            "description": "Get deep technical and diagnostic details of a specific device by its IMEI or database ID. Includes Sickw reports, motherboard color comparison, and carrier lock.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "imei_or_id": {"type": "STRING", "description": "Device IMEI (15 digits) or numeric ID"}
                },
                "required": ["imei_or_id"]
            }
        },
        {
            "name": "get_shipments_summary",
            "description": "Get recent or active international shipments (China to BD), tracking numbers, and device quantities.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "status": {"type": "STRING", "description": "Optional status filter: DRAFT, SHIPPED, CUSTOMS_HOLD, DELIVERED, CANCELLED"},
                    "limit": {"type": "INTEGER", "description": "Number of shipments to return (default 5)"}
                }
            }
        },
        {
            "name": "get_repairs_summary",
            "description": "Get summary of all devices currently under repair, repair centers (e.g. Qifeng), and total repair costs in BDT.",
            "parameters": {
                "type": "OBJECT",
                "properties": {}
            }
        },
        {
            "name": "update_device_status",
            "description": "Update the operational status of a device (e.g. IN_STOCK, UNDER_REPAIR, WAITING_SHIPMENT, SOLD).",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "imei": {"type": "STRING", "description": "The exact 15-digit IMEI of the device"},
                    "new_status": {"type": "STRING", "description": "One of: WAITING_SHIPMENT, IN_STOCK, PENDING_SALE, UNDER_REPAIR, SOLD, ASSIGNED, RETURNED, LOST"},
                    "notes": {"type": "STRING", "description": "Optional reason for status change"}
                },
                "required": ["imei", "new_status"]
            }
        },
        {
            "name": "assign_device_to_employee",
            "description": "Assign a device to an employee by their username.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "imei": {"type": "STRING", "description": "The exact 15-digit IMEI of the device"},
                    "employee_username": {"type": "STRING", "description": "The username of the employee to assign to"},
                    "notes": {"type": "STRING", "description": "Optional assignment notes"}
                },
                "required": ["imei", "employee_username"]
            }
        }
    ]
}]


def execute_tool_call(func_name: str, args: Dict[str, Any], user_username: str = None) -> Dict[str, Any]:
    """Dispatches function calls from Gemini to actual Python inventory tools."""
    logger.info(f"Copilot executing tool: {func_name} with args: {args}")
    try:
        if func_name == "search_devices":
            return tools.search_devices(
                query=args.get("query"),
                status=args.get("status"),
                limit=args.get("limit", 8)
            )
        elif func_name == "get_inventory_stats":
            return tools.get_inventory_stats()
        elif func_name == "get_device_detail":
            return tools.get_device_detail(
                imei_or_id=args.get("imei_or_id")
            )
        elif func_name == "get_shipments_summary":
            return tools.get_shipments_summary(
                status=args.get("status"),
                limit=args.get("limit", 5)
            )
        elif func_name == "get_repairs_summary":
            return tools.get_repairs_summary()
        elif func_name == "update_device_status":
            return tools.update_device_status(
                imei=args.get("imei"),
                new_status=args.get("new_status"),
                notes=args.get("notes"),
                user_username=user_username
            )
        elif func_name == "assign_device_to_employee":
            return tools.assign_device_to_employee(
                imei=args.get("imei"),
                employee_username=args.get("employee_username"),
                notes=args.get("notes"),
                user_username=user_username
            )
        else:
            return {"error": f"Unknown tool function: {func_name}"}
    except Exception as e:
        logger.exception(f"Error executing tool {func_name}")
        return {"error": str(e)}


class CopilotService:
    """Manages the full conversation turn with Gemini, including tool calls."""

    @classmethod
    def process_chat(cls, user_message: str, history: List[Dict[str, Any]] = None, user_username: str = None) -> Dict[str, Any]:
        api_key = os.environ.get('GEMINI_API_KEY') or DEFAULT_GEMINI_KEY
        if not api_key:
            return {
                "reply": "⚠️ Gemini API key is missing. Please set `GEMINI_API_KEY` in your environment or Render settings.",
                "actions_taken": [],
                "referenced_devices": [],
                "suggestions": ["Check API Key in Render settings"]
            }

        # Build contents array with conversation history
        contents = []
        if history and isinstance(history, list):
            for h in history[-8:]:  # keep last 8 turns for context window efficiency
                role = "user" if h.get("role") == "user" else "model"
                text = h.get("text") or h.get("content") or ""
                if text:
                    contents.append({"role": role, "parts": [{"text": text}]})

        contents.append({"role": "user", "parts": [{"text": user_message}]})

        actions_taken = []
        referenced_imeis = set()

        # Multi-turn tool execution loop (max 4 iterations to prevent infinite loops)
        final_reply = ""
        last_error = None

        for model_name in CANDIDATE_MODELS:
            try:
                final_reply = cls._run_agent_loop(
                    model_name=model_name,
                    api_key=api_key,
                    contents=contents,
                    actions_taken=actions_taken,
                    referenced_imeis=referenced_imeis,
                    user_username=user_username
                )
                if final_reply:
                    break
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}. Trying next candidate...")
                last_error = e
                continue

        if not final_reply:
            final_reply = f"Sorry, I encountered an issue communicating with the AI service: {last_error or 'Unknown error'}"

        # Extract any 15-digit IMEIs in the final reply text as referenced devices
        found_in_text = re.findall(r'\b(35\d{13}|86\d{13}|99\d{13})\b', final_reply)
        referenced_imeis.update(found_in_text)

        # Generate intelligent follow-up suggestions
        suggestions = cls._generate_suggestions(user_message, actions_taken, final_reply)

        return {
            "reply": final_reply,
            "actions_taken": actions_taken,
            "referenced_devices": list(referenced_imeis),
            "suggestions": suggestions
        }

    @classmethod
    def _run_agent_loop(cls, model_name: str, api_key: str, contents: List[Dict[str, Any]], actions_taken: List[Dict[str, Any]], referenced_imeis: set, user_username: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

        # Up to 4 tool iterations
        for iteration in range(4):
            payload = {
                "contents": contents,
                "system_instruction": {
                    "parts": [{"text": SYSTEM_PROMPT}]
                },
                "tools": GEMINI_TOOLS_DECLARATION
            }

            body = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})

            with urllib.request.urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode('utf-8'))

            candidate = data.get("candidates", [{}])[0]
            content = candidate.get("content", {})
            parts = content.get("parts", [])

            # Check if Gemini wants to call a function
            function_call = None
            text_part = ""
            for part in parts:
                if "functionCall" in part:
                    function_call = part["functionCall"]
                elif "text" in part:
                    text_part += part["text"]

            if not function_call:
                # No more tools needed, return text
                return text_part.strip()

            # Execute the function call
            func_name = function_call.get("name")
            func_args = function_call.get("args", {})
            call_id = function_call.get("id")

            tool_result = execute_tool_call(func_name, func_args, user_username=user_username)

            # Record action
            actions_taken.append({
                "tool": func_name,
                "args": func_args,
                "summary": f"Executed {func_name}"
            })

            # Check for IMEIs in tool args or results
            if "imei" in func_args:
                referenced_imeis.add(str(func_args["imei"]))
            if isinstance(tool_result, dict):
                if "imei" in tool_result:
                    referenced_imeis.add(str(tool_result["imei"]))
                if "devices" in tool_result and isinstance(tool_result["devices"], list):
                    for d in tool_result["devices"]:
                        if "imei" in d: referenced_imeis.add(str(d["imei"]))

            # Append the model's exact response turn to contents (preserving thoughtSignature and call IDs)
            contents.append({"role": "model", "parts": parts})

            # Append functionResponse turn under role 'user'
            resp_body = {
                "name": func_name,
                "response": {"name": func_name, "content": tool_result}
            }
            if call_id:
                resp_body["id"] = call_id

            contents.append({
                "role": "user",
                "parts": [{"functionResponse": resp_body}]
            })

        return text_part.strip()

    @classmethod
    def _generate_suggestions(cls, query: str, actions_taken: List[Dict[str, Any]], reply: str) -> List[str]:
        q_lower = query.lower()
        if "stat" in q_lower or "inventory" in q_lower or "how many" in q_lower:
            return [
                "Show devices currently under repair",
                "Which devices are waiting for shipment?",
                "List all iPhone 15 Pro Max in stock"
            ]
        elif "repair" in q_lower:
            return [
                "What is our total active repair cost?",
                "Show shipments currently in transit",
                "View overall inventory statistics"
            ]
        elif "shipment" in q_lower:
            return [
                "How many devices arrived in BD this month?",
                "Show devices waiting shipment",
                "View inventory valuation summary"
            ]
        else:
            return [
                "What is our current inventory status?",
                "Are there any motherboard color mismatches?",
                "Show active shipments from China"
            ]
