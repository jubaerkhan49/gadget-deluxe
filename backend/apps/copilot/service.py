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
import time
from typing import Dict, Any, List, Optional
from . import tools

logger = logging.getLogger(__name__)

# API Key from environment or Render secret
DEFAULT_GEMINI_KEY = os.environ.get('GEMINI_API_KEY', '')

# Candidate models in priority order (flash-lite has high rate limits & sub-second latency)
CANDIDATE_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
]

def get_system_prompt() -> str:
    from django.utils import timezone
    now_dhaka = timezone.localtime(timezone.now())
    today_str = now_dhaka.strftime("%A, %B %d, %Y (%I:%M %p %Z)")
    
    return f"""You are the intelligent Inventory & Operations Copilot for "Gadget Deluxe", a premium Apple smartphone inventory and electronics business.

CURRENT SYSTEM TIME & DATE:
- Current Date & Time: {today_str}
- Local Timezone: Asia/Dhaka (GMT+6)

YOUR ROLE & CAPABILITIES:
You assist the business owner and administrators with real-time operations, inventory queries, sales analysis, diagnostics, and repairs.

GENERALIZED REASONING & ARBITRARY QUERY CAPABILITY:
You are NOT limited to preset questions. When the user asks a custom, analytical, cross-table, or specific question that convenience tools do not directly answer (for example: "how many devices are pending in shipment related to AB Group", "which seller made the most profit last month", "how many 256GB devices from China have battery health under 85%", etc.):
-> YOU MUST USE `execute_safe_sql_query` to write and execute a custom SQL SELECT query to find the exact answer from the database!

DATABASE SCHEMA FOR CUSTOM SQL QUERIES:
1. `inventory_device` (Phones in inventory):
   - id (int), imei (char 50), imei2, serial_number, model (e.g. 'iPhone 15 Pro Max'), model_description, capacity (e.g. '256GB'), color (e.g. 'Natural Titanium'), variant (e.g. 'USA', 'Japan', 'China Dual SIM')
   - current_status: 'WAITING_SHIPMENT', 'IN_STOCK', 'PENDING_SALE', 'UNDER_REPAIR', 'SOLD', 'ASSIGNED', 'RETURNED', 'LOST'
   - buying_price (decimal), b2b_selling_price (decimal), is_b2b (boolean), b2b_shop_name (char), b2b_status ('PENDING_DELIVERY', 'DELIVERED', 'UNDER_REPAIR', 'RETURNED')
   - current_owner_id (FK to accounts_user), current_shipment_id (FK to shipments_shipment)
   - received_date_bd (date, null if not yet physically in BD)
   - created_at, updated_at

2. `shipments_shipment` (Incoming shipments from overseas suppliers):
   - id, tracking_number (char), supplier_id (FK to shipments_supplier), shipping_company (char)
   - receive_date (date: NULL means in transit / pending arrival in BD; non-null means received)
   - shipping_cost (decimal), discount (decimal), country, notes, created_at

3. `shipments_supplier` (Vendors/Suppliers in China/overseas):
   - id, name (char), contact_person, country, phone, notes

4. `sales_sale` (Completed customer sales records):
   - id, invoice_number (char), device_id (FK to inventory_device), customer_id (FK to customers_customer), seller_id (FK to accounts_user)
   - buying_price, selling_price, discount, commission_amount, profit (decimal)
   - payment_status ('PAID', 'PARTIAL', 'PENDING'), payment_method ('CASH', 'BANK', 'CARD', 'MOBILE')
   - sale_date (datetime: sale timestamp)

5. `repairs_repair` (Device repairs):
   - id, device_id (FK to inventory_device), repair_center (char, e.g. 'Qifeng Repair Center'), repair_cost (decimal)
   - status ('IN_PROGRESS', 'SENT_TO_CHINA', 'COMPLETED', 'UNREPAIRABLE')
   - issue_description, sent_date, returned_date, created_at

6. `orders_othergoodsorder` (Custom orders for Laptops, AirPods, Accessories):
   - id, order_id, customer_name, customer_phone, product_name, category, total_price_bdt, advance_paid_bdt, tracking_stage, current_status

7. `accounts_user` (Employees/Admins):
   - id, username, first_name, last_name, role ('ADMIN', 'EMPLOYEE')

8. `customers_customer`:
   - id, name, phone, email, address

POSTGRESQL SYNTAX RULES FOR SQL QUERIES (CRITICAL):
- The database is PostgreSQL.
- Always use standard PostgreSQL date syntax:
  * For this month: `s.sale_date >= '2026-10-01' AND s.sale_date < '2026-11-01'` or `EXTRACT(MONTH FROM s.sale_date) = 10`
  * For today: `s.sale_date >= CURRENT_DATE` or `s.sale_date >= '2026-10-22'`
  * To rank employees by highest profit:
    `SELECT u.username, u.first_name, SUM(s.profit) as total_profit, COUNT(s.id) as total_sales FROM sales_sale s JOIN accounts_user u ON s.seller_id = u.id WHERE s.sale_date >= '2026-10-01' GROUP BY u.id, u.username, u.first_name ORDER BY total_profit DESC LIMIT 1;`
  * To rank employees by lowest or least profit:
    `SELECT u.username, u.first_name, SUM(s.profit) as total_profit, COUNT(s.id) as total_sales FROM sales_sale s JOIN accounts_user u ON s.seller_id = u.id WHERE s.sale_date >= '2026-10-01' GROUP BY u.id, u.username, u.first_name ORDER BY total_profit ASC LIMIT 1;`
  * To check devices that finished repair today:
    `SELECT r.id, d.imei, d.model, r.repair_center, r.repair_cost, r.status, r.returned_date FROM repairs_repair r JOIN inventory_device d ON r.device_id = d.id WHERE r.returned_date >= CURRENT_DATE OR (r.status = 'COMPLETED' AND r.returned_date >= CURRENT_DATE);`
- NEVER use SQLite `strftime()` functions! They do not exist in PostgreSQL and will fail.

CRITICAL INSTRUCTIONS FOR ACCURACY (MUST FOLLOW):
1. DIRECT, TO-THE-POINT ANSWERS (LIKE CHATGPT / GEMINI):
   - Answer the user's core question directly in the very FIRST sentence.
   - For example: "This month, the employee with the highest profit is **emon** with **৳120,000**." (or "No sales records were found for this month, so no employee has recorded profits yet.")
   - Do NOT dump a wall of unrelated historical data or all-time sold items unless explicitly asked.

2. DO NOT LOOP OR QUERY REPEATEDLY:
   - Execute at most ONE relevant tool or SQL query per user message.
   - If a query returns 0 rows, empty results, or no matches, that is a factual answer! Immediately state that clearly to the user (e.g. "No sales have been recorded for this month yet.").
   - NEVER query database metadata tables (like sqlite_master or pg_tables).

3. SALES & ORDERS QUERIES:
   - For "sold today", "yesterday's sales", "sales this week", "sales this month", call `get_sales_and_orders_summary` with `date_preset='today'` (or the requested period).
   - NEVER call `search_devices(status='SOLD')` to answer a date-specific sales question. Total cumulative sold inventory is NOT "today's sales".

4. STOCK & INVENTORY QUERIES:
   - For stock counts, available devices, or asset valuations, call `get_inventory_stats` or `search_devices(status='IN_STOCK')`.

5. SICKW & GSX LIVE API DIAGNOSTICS (CRITICAL):
   - You HAVE direct, active integration with the official Sickw API via `fetch_live_sickw_report` and `get_sickw_account_balance`.
   - NEVER tell the user "The system does not have an active Sickw API integration" or "I cannot perform external lookups on demand". That is completely FALSE. You HAVE direct API access and you MUST use it!
   - When the user asks to "fetch sickw", "check sickw", "run diagnostic", "get motherboard color", "check carrier/sim lock", or "do it through the system and give me the result", call `fetch_live_sickw_report(imei=...)`.
   - If the user does not repeat the IMEI in their current message (e.g. "fetch the sickw for me", "you do it through the system and give me the result"), locate the 15-digit IMEI discussed in recent conversation turns and use that IMEI!
   - After fetching, report:
     1. Official Apple Model & Capacity
     2. Motherboard Color vs Physical Outlook Color: If they mismatch (e.g. Blue Titanium motherboard vs Natural Titanium housing), prominently highlight a ⚠️ WARNING that this device's housing or motherboard has been swapped/replaced!
     3. Carrier & SIM Lock status (Locked / Unlocked)
     4. Serial Number, Purchase Country & Warranty status
   - To check Sickw account funds/credits, call `get_sickw_account_balance`.

6. CLEAN MARKDOWN FORMATTING:
   - Bold key numbers, currency in ৳ (BDT), and use concise tables or clean bullet points.
   - When mentioning IMEIs, output the exact 15-digit number so the UI renders it as an interactive clickable chip.
"""

GEMINI_TOOLS_DECLARATION = [{
    "function_declarations": [
        {
            "name": "execute_safe_sql_query",
            "description": "Execute a custom read-only SQL SELECT query against the PostgreSQL/SQLite database to answer any arbitrary, complex, cross-table, or custom questions that standard tools cannot answer (e.g. cross-table joins, supplier-specific counts, custom date filters, rankings, profit aggregates).",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "query": {
                        "type": "STRING",
                        "description": "A valid read-only SQL SELECT statement. Example: SELECT COUNT(d.id) as pending_count FROM inventory_device d JOIN shipments_shipment s ON d.current_shipment_id = s.id JOIN shipments_supplier sup ON s.supplier_id = sup.id WHERE (sup.name LIKE '%AB%' OR s.tracking_number LIKE '%SA%') AND s.receive_date IS NULL"
                    }
                },
                "required": ["query"]
            }
        },
        {
            "name": "get_sales_and_orders_summary",
            "description": "Get verified sales transactions, devices sold, revenue, and profits for a specific time period like today, yesterday, this week, this month, or all time.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "date_preset": {
                        "type": "STRING",
                        "description": "Time period to query: 'today', 'yesterday', 'this_week', 'this_month', or 'all_time'. Default is 'today'."
                    },
                    "limit": {"type": "INTEGER", "description": "Max recent sales to return (default 10)"}
                }
            }
        },
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
        },
        {
            "name": "fetch_live_sickw_report",
            "description": "Fetch a live official Sickw API diagnostic report for any device IMEI or Serial Number on demand. Automatically queries Sickw, updates device specs (motherboard color, carrier, sim lock, icloud, serial, model), stores a permanent SickwReport, checks for color mismatches against the physical housing, and returns real-time diagnostic results.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "imei": {
                        "type": "STRING",
                        "description": "The 15-digit IMEI or Serial Number of the device to inspect. If the user does not specify an IMEI in their current message (e.g. 'fetch the sickw for me'), extract the IMEI from the recent conversation context."
                    },
                    "service_id": {
                        "type": "STRING",
                        "description": "Optional service ID: '12' (Model & Motherboard Color & Specs - default), '103' (Carrier & SIM Lock), or '92' (Color Only)."
                    }
                },
                "required": ["imei"]
            }
        },
        {
            "name": "get_sickw_account_balance",
            "description": "Fetch the current live Sickw API account balance and credits in USD.",
            "parameters": {
                "type": "OBJECT",
                "properties": {}
            }
        }
    ]
}]


def execute_tool_call(func_name: str, args: Dict[str, Any], user_username: str = None) -> Dict[str, Any]:
    """Dispatches function calls from Gemini to actual Python inventory tools."""
    logger.info(f"Copilot executing tool: {func_name} with args: {args}")
    try:
        if func_name == "fetch_live_sickw_report":
            return tools.fetch_live_sickw_report(
                imei=args.get("imei"),
                service_id=args.get("service_id"),
                user_username=user_username
            )
        elif func_name == "get_sickw_account_balance":
            return tools.get_sickw_account_balance()
        elif func_name == "execute_safe_sql_query":
            return tools.execute_safe_sql_query(
                query=args.get("query", "")
            )
        elif func_name == "get_sales_and_orders_summary":
            return tools.get_sales_and_orders_summary(
                date_preset=args.get("date_preset", "today"),
                limit=args.get("limit", 10)
            )
        elif func_name == "search_devices":
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

        # Fast conversational pleasantry response (avoids burning model quota on pure greetings/thanks)
        clean_msg = user_message.lower().strip()
        pure_pleasantries = [
            "very good", "good job", "thank you", "thanks", "thanks a lot",
            "im satisfied", "i'm satisfied", "satisfied", "well done", "great job",
            "awesome", "perfect", "good", "nice", "ok", "okay"
        ]
        is_pure_pleasantry = any(p in clean_msg for p in pure_pleasantries) and not any(
            k in clean_msg for k in ["how", "what", "which", "who", "show", "list", "check", "tell", "count", "profit", "device", "sale", "imei", "repair", "stock", "cost", "shipment"]
        )
        if is_pure_pleasantry:
            return {
                "reply": "You're very welcome! I'm glad I could assist. Let me know whenever you'd like to check device inventory, sales stats, or employee profits!",
                "actions_taken": [],
                "referenced_devices": [],
                "suggestions": [
                    "Which employee generated most profits this month?",
                    "How many goods sold today?",
                    "Give me an inventory summary"
                ]
            }

        # Build sanitized contents array with conversation history
        # Gemini strictly requires:
        # 1. Must start with a 'user' turn
        # 2. Strict alternation between 'user' and 'model'
        # 3. Must end with 'user'
        sanitized_history = []
        if history and isinstance(history, list):
            for h in history[-8:]:
                raw_text = (h.get("text") or h.get("content") or "").strip()
                if not raw_text:
                    continue
                # Skip error messages from history so past failures don't poison subsequent turns
                if "Unable to complete request" in raw_text or raw_text.startswith("⚠️"):
                    continue
                role = "user" if h.get("role") == "user" else "model"
                if sanitized_history and sanitized_history[-1]["role"] == role:
                    sanitized_history[-1]["parts"][0]["text"] += f"\n{raw_text}"
                else:
                    sanitized_history.append({"role": role, "parts": [{"text": raw_text}]})

        # Ensure first turn is from user
        while sanitized_history and sanitized_history[0]["role"] != "user":
            sanitized_history.pop(0)

        # Ensure last turn in history is model so appending new user turn alternates strictly
        while sanitized_history and sanitized_history[-1]["role"] == "user":
            sanitized_history.pop()

        contents = sanitized_history + [{"role": "user", "parts": [{"text": user_message}]}]

        actions_taken = []
        referenced_imeis = set()
        final_reply = ""
        last_error = None
        start_time = time.time()
        for model_name in CANDIDATE_MODELS:
            # Prevent cumulative attempts from approaching request deadline
            if time.time() - start_time > 45:
                logger.warning("Approaching request deadline, stopping candidate model loop")
                break

            try:
                model_contents = json.loads(json.dumps(contents))
                final_reply = cls._run_agent_loop(
                    model_name=model_name,
                    api_key=api_key,
                    contents=model_contents,
                    actions_taken=actions_taken,
                    referenced_imeis=referenced_imeis,
                    user_username=user_username
                )
                if final_reply:
                    break
            except urllib.error.HTTPError as e:
                logger.warning(f"Model {model_name} HTTP {e.code}: {e}")
                if e.code == 429:
                    last_error = "Gemini API free tier rate limit was temporarily reached (15 requests/min). Please wait a few seconds and try again."
                else:
                    last_error = e
                continue
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}. Trying next candidate...")
                last_error = e
                continue

        if not final_reply:
            lower_msg = user_message.lower().strip()
            if any(w in lower_msg for w in ["thank", "good", "satisfied", "great", "nice", "awesome", "perfect"]):
                final_reply = "You're very welcome! I'm glad I could help. Let me know whenever you'd like to check device inventory, sales stats, or employee profits!"
            elif "503" in str(last_error) or "Service Unavailable" in str(last_error):
                final_reply = "The AI service is currently experiencing high demand. Please try asking again in a few moments."
            else:
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

        # Up to 3 tool iterations (Execute Tool -> Follow-up/Diagnostics -> Formulate Final Answer)
        for iteration in range(3):
            payload = {
                "contents": contents,
                "system_instruction": {
                    "parts": [{"text": get_system_prompt()}]
                },
                "tools": GEMINI_TOOLS_DECLARATION
            }

            body = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})

            with urllib.request.urlopen(req, timeout=30) as resp:
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

            # Fallback IMEI extraction if missing in arguments for fetch_live_sickw_report or get_device_detail
            if func_name in ["fetch_live_sickw_report", "get_device_detail"]:
                arg_key = "imei" if func_name == "fetch_live_sickw_report" else "imei_or_id"
                if not func_args.get(arg_key):
                    if referenced_imeis:
                        func_args[arg_key] = list(referenced_imeis)[-1]
                    else:
                        for c in reversed(contents):
                            for p in c.get("parts", []):
                                txt = p.get("text", "")
                                found = re.findall(r'\b(35\d{13}|86\d{13}|99\d{13})\b', txt)
                                if found:
                                    func_args[arg_key] = found[-1]
                                    break
                            if func_args.get(arg_key):
                                break

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

        # If loop ended after executing tools but model didn't return final text yet,
        # make one final request with tools and mode NONE so Gemini is forced to formulate the final answer immediately
        if not text_part.strip():
            final_payload = {
                "contents": contents,
                "system_instruction": {
                    "parts": [{"text": get_system_prompt()}]
                },
                "tools": GEMINI_TOOLS_DECLARATION,
                "tool_config": {
                    "function_calling_config": {
                        "mode": "NONE"
                    }
                }
            }
            final_body = json.dumps(final_payload).encode('utf-8')
            final_req = urllib.request.Request(url, data=final_body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(final_req, timeout=10) as resp:
                final_data = json.loads(resp.read().decode('utf-8'))
            for part in final_data.get("candidates", [{}])[0].get("content", {}).get("parts", []):
                if "text" in part:
                    text_part += part["text"]

        return text_part.strip()

    @classmethod
    def _generate_suggestions(cls, query: str, actions_taken: List[Dict[str, Any]], reply: str) -> List[str]:
        q_lower = query.lower()
        if "profit" in q_lower or "employee" in q_lower or "sale" in q_lower or "sold" in q_lower:
            return [
                "Which employee generated most profits this month?",
                "How many goods sold today?",
                "Give me an inventory summary"
            ]
        elif "repair" in q_lower:
            return [
                "What is our total active repair cost?",
                "Which employee generated most profits this month?",
                "Show in-stock iPhone 15 models"
            ]
        elif "inventory" in q_lower or "stock" in q_lower or "how many" in q_lower:
            return [
                "Which employee generated most profits this month?",
                "How many goods sold today?",
                "List all iPhone 15 Pro Max in stock"
            ]
        else:
            return [
                "Which employee generated most profits this month?",
                "How many goods sold today?",
                "Give me an inventory summary"
            ]
