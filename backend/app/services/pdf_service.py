from fpdf import FPDF
from datetime import datetime
from typing import List, Dict, Any

# Layout constants
LEFT_MARGIN = 15
CONTENT_WIDTH = 180  # 210 - 2 * 15

# Budget table column widths (sum = 180)
BUD_W_CAT = 45
BUD_W_LIMIT = 30
BUD_W_SPENT = 30
BUD_W_REMAIN = 35
BUD_W_PROGRESS = 40

# Transactions table column widths (sum = 180)
TX_W_DATE = 30
TX_W_CATEGORY = 55
TX_W_DESC = 75
TX_W_AMOUNT = 20


class PDFService:
    # Professional color palette
    COLOR_PRIMARY = (41, 128, 185)      # Blue
    COLOR_SUCCESS = (46, 204, 113)      # Green
    COLOR_DANGER = (231, 76, 60)        # Red
    COLOR_WARNING = (241, 196, 15)      # Yellow
    COLOR_DARK = (44, 62, 80)           # Dark blue-gray
    COLOR_TEXT = (52, 73, 94)           # Text
    COLOR_MUTED = (149, 165, 166)       # Muted text

    @staticmethod
    def _fmt_mad(amount: float) -> str:
        """Format amount in MAD."""
        return f"{amount:,.2f} MAD"

    @staticmethod
    def _to_float(v) -> float:
        """Safe numeric conversion (handles Decimal/None)."""
        return float(v or 0)

    @staticmethod
    def generate_financial_report(
        user_data: Dict[str, Any],
        transactions: List[Dict[str, Any]],
        budgets: List[Dict[str, Any]]
    ) -> bytes:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=20)
        # Set consistent margins
        pdf.set_left_margin(LEFT_MARGIN)
        pdf.set_right_margin(LEFT_MARGIN)
        pdf.add_page()

        # --- Header ---
        pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
        pdf.rect(0, 0, 210, 35, style='F')

        pdf.set_font("helvetica", "B", 28)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(LEFT_MARGIN, 10)
        pdf.cell(0, 15, "Financial Quest", ln=True)

        pdf.set_font("helvetica", "", 12)
        pdf.set_xy(LEFT_MARGIN, 22)
        pdf.cell(0, 10, "Financial Report & Analytics", ln=True)

        pdf.set_font("helvetica", "I", 10)
        pdf.set_xy(210 - LEFT_MARGIN - 60, 10)
        pdf.cell(60, 10, f"{datetime.now().strftime('%B %d, %Y')}", ln=True, align="R")

        pdf.ln(25)

        # --- User card ---
        pdf.set_fill_color(250, 251, 252)
        pdf.set_draw_color(230, 233, 236)
        pdf.set_line_width(0.5)
        top_y = pdf.get_y()
        pdf.rect(LEFT_MARGIN, top_y, CONTENT_WIDTH, 42, style='DF')

        pdf.set_font("helvetica", "B", 14)
        pdf.set_text_color(*PDFService.COLOR_DARK)
        pdf.set_xy(LEFT_MARGIN + 5, top_y + 4)
        pdf.cell(0, 10, f"User: {user_data.get('username', 'User')}", ln=True)

        stats = [
            ("Total XP", user_data.get('total_xp', 0), PDFService.COLOR_PRIMARY),
            ("Level", user_data.get('current_level', 0), PDFService.COLOR_WARNING),
            ("Streak", f"{user_data.get('current_streak', 0)} days", PDFService.COLOR_SUCCESS),
        ]

        col_width = 58
        x_start = LEFT_MARGIN + 5
        y_pos = top_y + 15

        for label, value, color in stats:
            pdf.set_font("helvetica", "B", 18)
            pdf.set_text_color(*color)
            pdf.set_xy(x_start, y_pos)
            pdf.cell(col_width, 10, str(value), ln=True)

            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*PDFService.COLOR_MUTED)
            pdf.set_xy(x_start, y_pos + 10)
            pdf.cell(col_width, 8, label, ln=True)

            x_start += col_width

        pdf.set_y(top_y + 45)
        pdf.ln(10)

        # --- Financial Summary ---
        if transactions:
            pdf.set_font("helvetica", "B", 16)
            pdf.set_text_color(*PDFService.COLOR_DARK)
            pdf.cell(0, 12, "Financial Summary", ln=True)
            pdf.ln(4)

            total_income = sum(
                PDFService._to_float(t.get("amount"))
                for t in transactions
                if t.get("type") == "income"
            )
            total_expense = sum(
                PDFService._to_float(t.get("amount"))
                for t in transactions
                if t.get("type") == "expense"
            )
            net_balance = total_income - total_expense

            summary_data = [
                ("Total Income",
                 f"+{PDFService._fmt_mad(total_income)}",
                 PDFService.COLOR_SUCCESS),
                ("Total Expenses",
                 f"-{PDFService._fmt_mad(total_expense)}",
                 PDFService.COLOR_DANGER),
                ("Net Balance",
                 PDFService._fmt_mad(net_balance),
                 PDFService.COLOR_PRIMARY if net_balance >= 0 else PDFService.COLOR_DANGER),
            ]

            card_width = 56
            card_height = 28
            x_start = LEFT_MARGIN
            y_start = pdf.get_y()

            for label, value, color in summary_data:
                pdf.set_draw_color(230, 233, 236)
                pdf.set_fill_color(255, 255, 255)
                pdf.rect(x_start, y_start, card_width, card_height, style='DF')

                pdf.set_font("helvetica", "B", 12)
                pdf.set_text_color(*color)
                pdf.set_xy(x_start + 5, y_start + 6)
                pdf.cell(card_width - 10, 8, value, ln=True)

                pdf.set_font("helvetica", "", 9)
                pdf.set_text_color(*PDFService.COLOR_MUTED)
                pdf.set_xy(x_start + 5, y_start + 17)
                pdf.cell(0, 6, label, ln=True)

                x_start += card_width + 6

            pdf.set_y(y_start + card_height + 10)
            pdf.ln(5)

        # --- Budget Overview ---
        if budgets:
            pdf.set_font("helvetica", "B", 16)
            pdf.set_text_color(*PDFService.COLOR_DARK)
            pdf.cell(0, 12, "Budget Overview", ln=True)
            pdf.ln(4)

            # Header row
            pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 11)

            pdf.cell(BUD_W_CAT,      10, "Category",    0, 0, "L", True)
            pdf.cell(BUD_W_LIMIT,    10, "Limit (MAD)", 0, 0, "R", True)
            pdf.cell(BUD_W_SPENT,    10, "Spent (MAD)", 0, 0, "R", True)
            pdf.cell(BUD_W_REMAIN,   10, "Remain",      0, 0, "R", True)
            pdf.cell(BUD_W_PROGRESS, 10, "Progress",    0, 1, "C", True)

            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*PDFService.COLOR_TEXT)

            for idx, b in enumerate(budgets):
                y_pos = pdf.get_y()

                # full-width background stripe
                if idx % 2 == 0:
                    pdf.set_fill_color(250, 251, 252)
                    pdf.rect(LEFT_MARGIN, y_pos, CONTENT_WIDTH, 10, style="F")

                pdf.set_xy(LEFT_MARGIN, y_pos + 2)
                category = str(b.get("category", "Uncategorized"))[:18]
                pdf.cell(BUD_W_CAT, 6, category)

                limit = PDFService._to_float(b.get("monthly_limit"))
                spent = PDFService._to_float(b.get("spent_amount"))
                remaining = limit - spent
                percentage = (spent / limit * 100) if limit > 0 else 0.0

                if spent > limit:
                    status_color = PDFService.COLOR_DANGER
                elif percentage >= 80:
                    status_color = PDFService.COLOR_WARNING
                else:
                    status_color = PDFService.COLOR_SUCCESS

                pdf.cell(BUD_W_LIMIT, 6, PDFService._fmt_mad(limit), 0, 0, "R")
                pdf.set_text_color(*status_color)
                pdf.cell(BUD_W_SPENT, 6, PDFService._fmt_mad(spent), 0, 0, "R")
                pdf.set_text_color(*PDFService.COLOR_TEXT)

                remain_txt = PDFService._fmt_mad(remaining)
                pdf.cell(BUD_W_REMAIN, 6, remain_txt, 0, 0, "R")

                # Progress bar inside last column
                bar_width = float(BUD_W_PROGRESS - 8)   # inner padding
                bar_height = 4.0
                # Calculate X to center bar in the column
                current_x = pdf.get_x()
                bar_x = current_x + (BUD_W_PROGRESS - bar_width) / 2
                bar_y = y_pos + 3

                pdf.set_fill_color(230, 233, 236)
                pdf.rect(bar_x, bar_y, bar_width, bar_height, style="F")

                if percentage > 0:
                    pdf.set_fill_color(*status_color)
                    fill_width = float((min(percentage, 100.0) / 100.0) * bar_width)
                    pdf.rect(bar_x, bar_y, fill_width, bar_height, style="F")

                pdf.ln(10)

            pdf.ln(10)

        # --- Transactions Table ---
        if transactions:

            def add_tx_header():
                pdf.set_font("helvetica", "B", 16)
                pdf.set_text_color(*PDFService.COLOR_DARK)
                pdf.cell(0, 10, "Recent Transactions", ln=True)
                pdf.ln(4)

                pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font("helvetica", "B", 10)

                pdf.cell(TX_W_DATE,     10, "Date",         0, 0, "L", True)
                pdf.cell(TX_W_CATEGORY, 10, "Category",     0, 0, "L", True)
                pdf.cell(TX_W_DESC,     10, "Description",  0, 0, "L", True)
                pdf.cell(TX_W_AMOUNT,   10, "Amount",       0, 1, "R", True)

                pdf.set_font("helvetica", "", 9)
                pdf.set_text_color(*PDFService.COLOR_TEXT)

            # First header
            if pdf.get_y() > 220:
                pdf.add_page()
            add_tx_header()

            for idx, t in enumerate(transactions[:40]):
                if pdf.get_y() > 270:
                    pdf.add_page()
                    add_tx_header()

                y_pos = pdf.get_y()

                # full-width background band
                if idx % 2 == 0:
                    pdf.set_fill_color(250, 251, 252)
                    pdf.rect(LEFT_MARGIN, y_pos, CONTENT_WIDTH, 8, style="F")

                date_str = str(t.get("date", ""))[:10]
                category = str(t.get("category", "Uncategorized"))[:25]
                description = str(t.get("description") or "-")[:45]

                pdf.set_xy(LEFT_MARGIN, y_pos + 1.5)
                pdf.cell(TX_W_DATE, 5, date_str)
                pdf.cell(TX_W_CATEGORY, 5, category)
                pdf.cell(TX_W_DESC, 5, description)

                amount = PDFService._to_float(t.get("amount"))
                if t.get("type") == "expense":
                    pdf.set_text_color(*PDFService.COLOR_DANGER)
                    txt = f"-{PDFService._fmt_mad(amount)}"
                else:
                    pdf.set_text_color(*PDFService.COLOR_SUCCESS)
                    txt = f"+{PDFService._fmt_mad(amount)}"

                pdf.cell(TX_W_AMOUNT, 5, txt, 0, 1, "R")
                pdf.set_text_color(*PDFService.COLOR_TEXT)
                pdf.ln(3)

        # --- Footer ---
        pdf.set_y(-20)
        pdf.set_font("helvetica", "I", 8)
        pdf.set_text_color(*PDFService.COLOR_MUTED)
        pdf.cell(0, 10, f"Financial Quest - Page {pdf.page_no()}", 0, 0, "C")

        return bytes(pdf.output())
