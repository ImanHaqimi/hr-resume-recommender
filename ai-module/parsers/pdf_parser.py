"""
PDF Resume Parser
Extracts text from PDF files using PyPDF2
"""
import PyPDF2
from typing import Optional
import os


def parse_pdf(file_path: str) -> Optional[str]:
    """
    Extract text from PDF resume
    
    Args:
        file_path: Path to the PDF file
        
    Returns:
        Extracted text or None if parsing fails
    """
    try:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return None
            
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            # Extract text from all pages
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            
            # Clean up multiple newlines
            text = "\n".join(line.strip() for line in text.split("\n") if line.strip())
            
            return text.strip() if text else None
            
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return None


def is_valid_pdf(file_path: str) -> bool:
    """
    Check if file is a valid PDF
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if valid PDF, False otherwise
    """
    try:
        if not file_path.lower().endswith('.pdf'):
            return False
            
        with open(file_path, 'rb') as file:
            # Check PDF magic number
            header = file.read(4)
            return header == b'%PDF'
    except:
        return False
