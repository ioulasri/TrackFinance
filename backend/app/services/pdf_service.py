from fpdf import FPDF
from datetime import datetime
from typing import List, Dict, Any
import io

class PDFService:
    @staticmethod
    def generate_financial_report(user_data: Dict[str, Any], transactions: List[Dict[str, Any]], budgets: List[Dict[str, Any]]) -> bytes:
        pdf = FPDF()
        pdf.add_page()
        
        # --- Header ---
        pdf.set_font("Arial", "B", 24)
        pdf.set_text_color(33, 37, 41)
        pdf.cell(0, 20, "Financial Quest - Report", ln=True, align="C")
        
        pdf.set_font("Arial", "I", 10)
        pdf.set_text_color(108, 117, 125)
        pdf.cell(0, 10, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align="C")
        pdf.ln(10)
        
        # --- User Summary ---
        pdf.set_font("Arial", "B", 16)
        pdf.set_text_color(0, 123, 255)
        pdf.cell(0, 10, "User Summary", ln=True)
        pdf.set_font("Arial", "", 12)
        pdf.set_text_color(33, 37, 41)
        
        pdf.cell(0, 8, f"Username: {user_data.get('username')}", ln=True)
        pdf.cell(0, 8, f"Total XP: {user_data.get('total_xp', 0)}", ln=True)
        pdf.cell(0, 8, f"Current Level: {user_data.get('current_level', 0)}", ln=True)
        pdf.cell(0, 8, f"Current Streak: {user_data.get('current_streak', 0)} days", ln=True)
        pdf.ln(10)
        
        # --- Budgets Summary ---
        if budgets:
            pdf.set_font("Arial", "B", 16)
            pdf.set_text_color(0, 123, 255)
            pdf.cell(0, 10, "Budget Overview", ln=True)
            
            pdf.set_font("Arial", "B", 12)
            pdf.set_fill_color(248, 249, 250)
            pdf.cell(60, 10, "Category", 1, 0, "C", True)
            pdf.cell(60, 10, "Limit", 1, 0, "C", True)
            pdf.cell(60, 10, "Spent", 1, 1, "C", True)
            
            pdf.set_font("Arial", "", 11)
            for b in budgets:
                pdf.cell(60, 10, str(b.get("category")), 1)
                pdf.cell(60, 10, f"${b.get('monthly_limit', 0):.2f}", 1)
                spent = b.get('spent_amount', 0)
                limit = b.get('monthly_limit', 1)
                if spent > limit:
                    pdf.set_text_color(220, 53, 69) # Red if over budget
                pdf.cell(60, 10, f"${spent:.2f}", 1)
                pdf.set_text_color(33, 37, 41)
                pdf.ln(10)
            pdf.ln(10)
        
        # --- Recent Transactions ---
        if transactions:
            pdf.set_font("Arial", "B", 16)
            pdf.set_text_color(0, 123, 255)
            pdf.cell(0, 10, "Recent Transactions", ln=True)
            
            pdf.set_font("Arial", "B", 12)
            pdf.set_fill_color(248, 249, 250)
            pdf.cell(40, 10, "Date", 1, 0, "C", True)
            pdf.cell(60, 10, "Category", 1, 0, "C", True)
            pdf.cell(40, 10, "Type", 1, 0, "C", True)
            pdf.cell(40, 10, "Amount", 1, 1, "C", True)
            
            pdf.set_font("Arial", "", 10)
            for t in transactions[:20]: # Show top 20
                pdf.cell(40, 10, str(t.get("date")), 1)
                pdf.cell(60, 10, str(t.get("category")), 1)
                pdf.cell(40, 10, str(t.get("type")).capitalize(), 1)
                
                amount = t.get("amount", 0)
                if t.get("type") == "expense":
                    pdf.set_text_color(220, 53, 69)
                    pdf.cell(40, 10, f"-${amount:.2f}", 1)
                else:
                    pdf.set_text_color(40, 167, 69)
                    pdf.cell(40, 10, f"+${amount:.2f}", 1)
                pdf.set_text_color(33, 37, 41)
                pdf.ln(10)
        
        # Output to bytes
        buffer = io.BytesIO()
        pdf_output = pdf.output()
        if isinstance(pdf_output, bytearray):
            buffer.write(pdf_output)
        else:
            buffer.write(pdf_output.encode('latin1') if isinstance(pdf_output, str) else pdf_output)
            
        return buffer.getvalue()
