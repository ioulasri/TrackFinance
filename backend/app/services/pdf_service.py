from fpdf import FPDF
from datetime import datetime
from typing import List, Dict, Any


class PDFService:
    # Professional color palette
    COLOR_PRIMARY = (41, 128, 185)      # Nice blue
    COLOR_SUCCESS = (46, 204, 113)      # Green
    COLOR_DANGER = (231, 76, 60)        # Red
    COLOR_WARNING = (241, 196, 15)      # Yellow
    COLOR_DARK = (44, 62, 80)           # Dark blue-gray
    COLOR_TEXT = (52, 73, 94)           # Text
    COLOR_MUTED = (149, 165, 166)       # Muted text
    
    @staticmethod
    def generate_financial_report(user_data: Dict[str, Any], transactions: List[Dict[str, Any]], budgets: List[Dict[str, Any]]) -> bytes:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()
        
        # --- Modern Header ---
        pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
        pdf.rect(0, 0, 210, 35, style='F')
        
        pdf.set_font("helvetica", "B", 28)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(15, 10)
        pdf.cell(0, 15, "Financial Quest", ln=True)
        
        pdf.set_font("helvetica", "", 12)
        pdf.set_xy(15, 22)
        pdf.cell(0, 10, "Financial Report & Analytics", ln=True)
        
        pdf.set_font("helvetica", "I", 10)
        pdf.set_xy(-70, 10)
        pdf.cell(0, 10, f"{datetime.now().strftime('%B %d, %Y')}", ln=True)
        
        pdf.ln(25)
        
        # --- User Profile Card ---
        pdf.set_fill_color(250, 251, 252)
        pdf.set_draw_color(230, 233, 236)
        pdf.set_line_width(0.5)
        pdf.rect(15, pdf.get_y(), 180, 45, style='DF')
        
        pdf.set_font("helvetica", "B", 14)
        pdf.set_text_color(*PDFService.COLOR_DARK)
        pdf.set_xy(20, pdf.get_y() + 5)
        pdf.cell(0, 10, f"User: {user_data.get('username', 'User')}", ln=True)
        
        stats = [
            ("Total XP", user_data.get('total_xp', 0), PDFService.COLOR_PRIMARY),
            ("Level", user_data.get('current_level', 0), PDFService.COLOR_WARNING),
            ("Streak", f"{user_data.get('current_streak', 0)} days", PDFService.COLOR_SUCCESS)
        ]
        
        col_width, x_start, y_pos = 55, 20, pdf.get_y()
        
        for label, value, color in stats:
            pdf.set_font("helvetica", "B", 18)
            pdf.set_text_color(*color)
            pdf.set_xy(x_start, y_pos)
            pdf.cell(col_width, 10, str(value), ln=True)
            
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*PDFService.COLOR_MUTED)
            pdf.set_xy(x_start, pdf.get_y())
            pdf.cell(col_width, 8, label, ln=True)
            x_start += col_width
        
        pdf.ln(20)
        
        # --- Financial Summary Cards ---
        if transactions:
            pdf.set_font("helvetica", "B", 16)
            pdf.set_text_color(*PDFService.COLOR_DARK)
            pdf.cell(0, 12, "Financial Summary", ln=True)
            pdf.ln(2)
            
            total_income = sum(t.get('amount', 0) for t in transactions if t.get('type') == 'income')
            total_expense = sum(t.get('amount', 0) for t in transactions if t.get('type') == 'expense')
            net_balance = total_income - total_expense
            
            summary_data = [
                ("Total Income", f"+${total_income:,.2f}", PDFService.COLOR_SUCCESS),
                ("Total Expenses", f"-${total_expense:,.2f}", PDFService.COLOR_DANGER),
                ("Net Balance", f"${net_balance:,.2f}", 
                 PDFService.COLOR_PRIMARY if net_balance >= 0 else PDFService.COLOR_DANGER)
            ]
            
            card_width, card_height, x_start, y_start = 55, 30, 15, pdf.get_y()
            
            for label, value, color in summary_data:
                pdf.set_draw_color(230, 233, 236)
                pdf.set_fill_color(255, 255, 255)
                pdf.rect(x_start, y_start, card_width, card_height, style='DF')
                
                pdf.set_font("helvetica", "B", 14)
                pdf.set_text_color(*color)
                pdf.set_xy(x_start + 5, y_start + 5)
                pdf.cell(card_width - 10, 10, value, ln=True)
                
                pdf.set_font("helvetica", "", 9)
                pdf.set_text_color(*PDFService.COLOR_MUTED)
                pdf.set_xy(x_start + 5, y_start + 18)
                pdf.cell(0, 6, label, ln=True)
                x_start += card_width + 7
            
            pdf.ln(40)
        
        # --- Budget Overview with Progress Bars ---
        if budgets:
            pdf.set_font("helvetica", "B", 16)
            pdf.set_text_color(*PDFService.COLOR_DARK)
            pdf.cell(0, 12, "Budget Overview", ln=True)
            pdf.ln(2)
            
            pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 11)
            
            pdf.cell(45, 12, "Category", 0, 0, "L", True)
            pdf.cell(35, 12, "Limit", 0, 0, "R", True)
            pdf.cell(35, 12, "Spent", 0, 0, "R", True)
            pdf.cell(35, 12, "Remaining", 0, 0, "R", True)
            pdf.cell(40, 12, "Progress", 0, 1, "C", True)
            
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(*PDFService.COLOR_TEXT)
            
            for idx, b in enumerate(budgets):
                y_pos = pdf.get_y()
                
                if idx % 2 == 0:
                    pdf.set_fill_color(250, 251, 252)
                    pdf.rect(15, y_pos, 180, 12, style='F')
                
                pdf.set_xy(15, y_pos + 3)
                category = str(b.get("category", "Uncategorized"))[:18]
                pdf.cell(45, 8, category)
                
                # Convert to float to avoid Decimal issues
                limit = float(b.get('monthly_limit', 0) or 0)
                spent = float(b.get('spent_amount', 0) or 0)
                remaining = limit - spent
                percentage = (spent / limit * 100) if limit > 0 else 0
                
                status_color = (PDFService.COLOR_DANGER if spent > limit 
                              else PDFService.COLOR_WARNING if percentage >= 80 
                              else PDFService.COLOR_SUCCESS)
                
                pdf.cell(35, 8, f"${limit:,.2f}", 0, 0, "R")
                pdf.set_text_color(*status_color)
                pdf.cell(35, 8, f"${spent:,.2f}", 0, 0, "R")
                pdf.set_text_color(*PDFService.COLOR_TEXT)
                
                remaining_text = f"${remaining:,.2f}" if remaining >= 0 else f"-${abs(remaining):,.2f}"
                pdf.cell(35, 8, remaining_text, 0, 0, "R")
                
                # Progress bar - ALL values as float
                bar_width = 35.0
                bar_height = 6.0
                bar_x = float(pdf.get_x() + 2)
                bar_y = float(y_pos + 3)
                
                # Background bar
                pdf.set_fill_color(230, 233, 236)
                pdf.rect(bar_x, bar_y, bar_width, bar_height, style='F')
                
                # Progress fill
                if percentage > 0:
                    pdf.set_fill_color(*status_color)
                    fill_width = float((percentage / 100.0) * bar_width)
                    pdf.rect(bar_x, bar_y, fill_width, bar_height, style='F')
                
                pdf.ln(12)
            
            pdf.ln(8)
        
        # --- Transactions Table ---
        if transactions:
            if pdf.get_y() > 200:
                pdf.add_page()
            
            pdf.set_font("helvetica", "B", 16)
            pdf.set_text_color(*PDFService.COLOR_DARK)
            pdf.cell(0, 12, "Recent Transactions", ln=True)
            pdf.ln(2)
            
            pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
            pdf.set_text_color(255, 255, 255)
            pdf.set_font("helvetica", "B", 10)
            
            pdf.cell(30, 11, "Date", 0, 0, "L", True)
            pdf.cell(65, 11, "Category", 0, 0, "L", True)
            pdf.cell(75, 11, "Description", 0, 0, "L", True)
            pdf.cell(30, 11, "Amount", 0, 1, "R", True)
            
            pdf.set_font("helvetica", "", 9)
            pdf.set_text_color(*PDFService.COLOR_TEXT)
            
            for idx, t in enumerate(transactions[:25]):
                if pdf.get_y() > 260:
                    pdf.add_page()
                    pdf.set_fill_color(*PDFService.COLOR_PRIMARY)
                    pdf.set_text_color(255, 255, 255)
                    pdf.set_font("helvetica", "B", 10)
                    pdf.cell(30, 11, "Date", 0, 0, "L", True)
                    pdf.cell(65, 11, "Category", 0, 0, "L", True)
                    pdf.cell(75, 11, "Description", 0, 0, "L", True)
                    pdf.cell(30, 11, "Amount", 0, 1, "R", True)
                    pdf.set_text_color(*PDFService.COLOR_TEXT)
                    pdf.set_font("helvetica", "", 9)
                
                y_pos = pdf.get_y()
                
                if idx % 2 == 0:
                    pdf.set_fill_color(250, 251, 252)
                    pdf.rect(15, y_pos, 180, 10, style='F')
                
                date_str = str(t.get("date", ""))[:10]
                category = str(t.get("category", "Uncategorized"))[:25]
                description = str(t.get("description", "-"))[:30]
                if description == "None":
                    description = "-"
                
                pdf.set_xy(15, y_pos + 2)
                pdf.cell(30, 8, date_str)
                pdf.cell(65, 8, category)
                pdf.cell(75, 8, description)
                
                amount = float(t.get("amount", 0) or 0)
                if t.get("type") == "expense":
                    pdf.set_text_color(*PDFService.COLOR_DANGER)
                    pdf.cell(30, 8, f"-${amount:,.2f}", 0, 0, "R")
                else:
                    pdf.set_text_color(*PDFService.COLOR_SUCCESS)
                    pdf.cell(30, 8, f"+${amount:,.2f}", 0, 0, "R")
                
                pdf.set_text_color(*PDFService.COLOR_TEXT)
                pdf.ln(10)
        
        # --- Footer ---
        pdf.set_y(-20)
        pdf.set_font("helvetica", "I", 8)
        pdf.set_text_color(*PDFService.COLOR_MUTED)
        pdf.cell(0, 10, f"Financial Quest - Page {pdf.page_no()}", 0, 0, "C")
        
        return bytes(pdf.output())
