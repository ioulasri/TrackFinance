"""Additional assistant actions, using the same account-scoped services as the UI."""
from app.core.currencies import SUPPORTED_CURRENCIES
from app.models.user import User
from app.schemas.user import UserUpdate
from app.schemas.recurring import RecurringTransactionCreate, RecurringTransactionUpdate, RecurringTransactionRead
from app.services.user_service import UserService
from app.services.recurring_service import RecurringTransactionService

PAGES = ["dashboard", "transactions", "budgets", "goals", "recurring", "analysis", "achievements", "settings"]


def tool(name, description, properties=None, required=None):
    return {"type": "function", "function": {"name": name, "description": description, "parameters": {
        "type": "object", "properties": properties or {}, "required": required or [], "additionalProperties": False,
    }}}


SETTINGS = {
    "currency": {"type": "string", "enum": list(SUPPORTED_CURRENCIES)},
    "username": {"type": "string", "minLength": 3, "maxLength": 50},
    "telegram_notifications_enabled": {"type": "boolean"},
}
RECURRING = {
    "amount": {"type": "number", "exclusiveMinimum": 0},
    "type": {"type": "string", "enum": ["income", "expense"]},
    "category": {"type": "string", "maxLength": 50},
    "description": {"type": "string", "maxLength": 255},
    "day_of_month": {"type": "integer", "minimum": 1, "maximum": 31},
}
ID = {"recurring_id": {"type": "integer", "minimum": 1}}
EXTRA_TOOLS = [
    tool("get_account_settings", "Read the account currency, username and Telegram notification setting."),
    tool("update_account_settings", "Change account currency, username or Telegram notifications. Currency changes labels without converting stored amounts.", SETTINGS),
    tool("get_recurring_transactions", "List monthly recurring income and expenses, including paused entries and their IDs."),
    tool("add_recurring_transaction", "Schedule monthly income or an expense.", RECURRING, ["amount", "type", "category", "day_of_month"]),
    tool("update_recurring_transaction", "Edit, pause or resume a monthly recurring entry. Read the list first to obtain its ID.", {**ID, **RECURRING, "is_active": {"type": "boolean"}}, ["recurring_id"]),
    tool("delete_recurring_transaction", "Delete one recurring schedule after identifying it in the list.", ID, ["recurring_id"]),
    tool("run_recurring_transaction", "Post one recurring entry now, only when the user explicitly asks. Read its ID first.", ID, ["recurring_id"]),
    tool("scan_receipt", "Open receipt capture/upload and an editable review form. The user must choose an image and save the expense."),
    tool("open_page", "Open a page in the web app.", {"page": {"type": "string", "enum": PAGES}}, ["page"]),
    tool("export_report", "Download the account's financial PDF report in the web app."),
]
ACTION_NAMES = {item['function']['name'] for item in EXTRA_TOOLS}


def handle_action(name, args, user_id, db):
    if name == "get_account_settings" or name == "update_account_settings":
        user = db.query(User).filter(User.id == user_id).one()
        if name == "update_account_settings":
            data = UserUpdate.model_validate(args)
            UserService.update_user(db, user, **data.model_dump(exclude_unset=True))
        return {"success": True, "currency": user.currency, "username": user.username,
                "telegram_notifications_enabled": user.telegram_notifications_enabled,
                "amounts_converted": False}
    if name == "get_recurring_transactions":
        rows = RecurringTransactionService.list_for_user(db, user_id)
        return {"success": True, "recurring": [RecurringTransactionRead.model_validate(row).model_dump(mode="json") for row in rows]}
    if name == "add_recurring_transaction":
        row = RecurringTransactionService.create(db, user_id, RecurringTransactionCreate.model_validate(args))
        return {"success": True, "recurring": RecurringTransactionRead.model_validate(row).model_dump(mode="json")}
    if name in ("update_recurring_transaction", "delete_recurring_transaction"):
        rid = int(args['recurring_id'])
        if name == "delete_recurring_transaction":
            return {"success": RecurringTransactionService.delete(db, user_id, rid)}
        data = RecurringTransactionUpdate.model_validate({k: v for k,v in args.items() if k != 'recurring_id'})
        row = RecurringTransactionService.update(db, user_id, rid, data)
        return {"success": row is not None, "recurring": RecurringTransactionRead.model_validate(row).model_dump(mode="json") if row else None}
    if name == "run_recurring_transaction":
        row = RecurringTransactionService.run_now(db, user_id, int(args['recurring_id']))
        return {"success": row is not None, "recurring": RecurringTransactionRead.model_validate(row).model_dump(mode="json") if row else None}
    if name == "scan_receipt":
        return {"success": True, "client_action": {"type": "scan_receipt"}, "message": "Open receipt review; no transaction has been saved yet."}
    if name == "open_page":
        if args.get('page') not in PAGES:
            raise ValueError('Unknown page')
        return {"success": True, "client_action": {"type": "open_page", "path": '/' + args['page']}}
    if name == "export_report":
        return {"success": True, "client_action": {"type": "export_report"}}
    raise ValueError('Unknown action')
