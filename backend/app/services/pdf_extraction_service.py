import pypdf
import re
from typing import Dict, Any, Optional
import os
import traceback

def extract_po_details(file_path: str, debug: bool = False) -> Dict[str, Any]:
    """
    Internal service to extract structured data from Purchase Order PDFs.
    Uses pypdf for text extraction and regex for pattern matching.
    
    Args:
        file_path: Path to the PDF file
        debug: If True, prints detailed extraction information
    
    Returns:
        Dictionary containing extracted PO details
    """
    results = {
        "vendor_name": "Unknown Vendor",
        "product_details": "Generated from PDF extraction",
        "quantity": 1,
        "unit_price": 0.0,
        "total_cost": 0.0,
        "purchase_date": None,
        "confidence_score": 0.0
    }
    
    if not os.path.exists(file_path):
        if debug:
            print(f"ERROR: File not found at {file_path}")
        return results

    try:
        reader = pypdf.PdfReader(file_path)
        
        if debug:
            print(f"\n{'='*80}")
            print(f"PDF Extraction Debug for: {file_path}")
            print(f"{'='*80}")
            print(f"Number of pages: {len(reader.pages)}")
        
        # STEP 1: Extract metadata (can contain vendor, date info)
        meta = reader.metadata
        if meta and debug:
            print(f"\n--- Metadata ---")
            print(f"Title: {meta.title}")
            print(f"Author: {meta.author}")
            print(f"Subject: {meta.subject}")
            print(f"Creator: {meta.creator}")
            print(f"Producer: {meta.producer}")
        
        # Try to get vendor from metadata author field
        if meta and meta.author and len(str(meta.author).strip()) > 2:
            author_clean = str(meta.author).strip()
            if author_clean.lower() not in ['details', 'name', 'unknown', 'user']:
                results["vendor_name"] = author_clean
                results["confidence_score"] += 0.2
                if debug:
                    print(f"Vendor from metadata: {author_clean}".encode('ascii', 'ignore').decode('ascii'))
        
        # Try to get date from metadata
        if meta and hasattr(meta, 'creation_date') and meta.creation_date:
            results["purchase_date"] = str(meta.creation_date)
            results["confidence_score"] += 0.1
            if debug:
                print(f"[OK] Date from metadata: {meta.creation_date}")
        
        # STEP 2: Extract text with per-page error handling
        text = ""
        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text += page_text + "\n"
                elif debug:
                    print(f"Warning: Page {i+1} has no text content")
            except Exception as e:
                if debug:
                    print(f"Warning: Could not extract text from page {i+1}: {e}")
                # Continue to next page instead of failing
                continue
        
        if not text.strip():
            if debug:
                print("ERROR: No text could be extracted from any page")
            return results
        
        # STEP 3: Preprocess text for better matching
        # Normalize line endings and whitespace
        text = text.replace('\r\n', '\n')
        text = re.sub(r'\(cid:\d+\)', ' ', text) # Remove font coding artifacts
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r' +', ' ', text)
        
        if debug:
            print(f"\n--- Extracted Text (first 1000 chars) ---")
            print(text[:1000])
            print(f"... (total {len(text)} characters)")
        
        # STEP 4: Extract Total Cost (Highest priority)
        if debug:
            print(f"\n--- Searching for Total Cost ---")
        
        # Improved patterns including Indian formatting (e.g. 4,11,000.00)
        total_patterns = [
            # Explicit labels with currency support
            r"(?:Grand Total|Amount Due|Total Amount|Final Amount|Order Total|Net Payable)[\s:]*[\$€£₹¥]?\s*([\d,]+\.?\d{0,2})",
            r"(?:Total|Amount|Payable)[\s:]*[\$€£₹¥]?\s*([\d,]+\.?\d{0,2})",
            # Standalone currency numbers at end of lines or large values
            r"[\$€£₹¥]\s*([\d,]+\.\d{2})",
            r"TOTAL\s*([\d,]+\.\d{2})"
        ]
        
        best_cost = 0.0
        for pattern in total_patterns:
            matches = re.finditer(pattern, text, re.I | re.MULTILINE)
            for match in matches:
                try:
                    # Clean up commas and spaces (handles both US 1,000.00 and Indian 1,00,000.00)
                    num_str = match.group(1).replace(',', '')
                    val = float(num_str)
                    # If we find a "Grand Total" or similar, it's likely the best
                    if "grand" in pattern.lower() or "due" in pattern.lower():
                        best_cost = val
                        results["confidence_score"] += 0.5
                        break
                    # Otherwise keep largest found
                    if val > best_cost:
                        best_cost = val
                        results["confidence_score"] += 0.3
                except:
                    continue
            if best_cost > 0: break

        results["total_cost"] = best_cost

        # STEP 5: Extract Vendor Name (Priority: Text > Metadata)
        if debug:
            print(f"\n--- Searching for Vendor Name ---")
        
        vendor_found = False
        vendor_patterns = [
            # Look for labels first - refined to exclude "Details" suffix
            r"(?:Vendor|Seller|Supplier|From)(?:\s+Details)?[\s:]*\n?\s*([A-Z][A-Za-z0-9\s\.,\-&]{3,60})(?:\n|$)",
            r"(?:Sold By)[\s:]*\n?\s*([A-Z][A-Za-z0-9\s\.,\-&]{3,60})(?:\n|$)",
            # Top of document fallback
            r"^([A-Z][A-Za-z0-9\s\.&]{3,50})(?:\n|$)"
        ]
        
        for pattern in vendor_patterns:
            match = re.search(pattern, text, re.M | re.I)
            if match:
                cleaned = match.group(1).strip()
                # Surgical cleaning of vendor names
                cleaned = re.sub(r"^(Details|Name|Information)[\s:]*", "", cleaned, flags=re.I).strip()
                
                if len(cleaned) > 2 and cleaned.upper() not in ["PURCHASE ORDER", "PO", "INVOICE", "DETAILS", "BILL TO", "SHIP TO"]:
                    results["vendor_name"] = cleaned
                    results["confidence_score"] += 0.4
                    vendor_found = True
                    if debug: print(f"[OK] Vendor found in text: {cleaned}")
                    break

        # Metadata Fallback
        if not vendor_found and meta and meta.author:
            author_clean = str(meta.author).strip()
            if len(author_clean) > 2 and author_clean.lower() not in ['details', 'name', 'unknown', 'user']:
                results["vendor_name"] = author_clean
                results["confidence_score"] += 0.1 # Lower confidence for metadata
                if debug: print(f"[OK] Vendor from metadata: {author_clean}")

        # STEP 6: Product Details
        if debug:
            print(f"\n--- Searching for Product Details ---")
            
        product_patterns = [
            # Look for the literal item description following headers
            r"(?:Description|Item|Product|Service).+?\n(?:\w+\s+)+\n\s*([A-Z0-9][A-Za-z0-9\s\.,\-&]{5,100})",
            # Fallback to simple description line
            r"(?:Description|Item|Product|Service)[\s:]*\n?\s*([A-Z0-9][A-Za-z0-9\s\.,\-&]{5,100})",
            r"(?:\d+\s*[xX]\s*)([A-Za-z0-9\s\.,\-&]{5,100})" # e.g. "1 x HP Laptop"
        ]
        
        for pattern in product_patterns:
            match = re.search(pattern, text, re.I | re.MULTILINE | re.S)
            if match:
                cleaned = match.group(1).strip()
                # If it looks like more headers, skip it
                if re.search(r"(Price|Total|Qty|Unit)", cleaned, re.I):
                    # Try next line
                    lines = cleaned.split('\n')
                    if len(lines) > 1: cleaned = lines[1].strip()
                    else: continue

                if len(cleaned) > 5:
                    results["product_details"] = cleaned
                    results["confidence_score"] += 0.2
                    if debug: print(f"[OK] Product found: {cleaned}")
                    break

        # STEP 7: Quantity & Date
        qty_match = re.search(r"(?:Qty|Quantity|Units)[\s:]*(\d+)", text, re.I)
        if qty_match:
            results["quantity"] = int(qty_match.group(1))
            results["confidence_score"] += 0.1
            if debug: print(f"[OK] Quantity found: {results['quantity']}")
        
        if not results["purchase_date"]:
            if debug: print(f"\n--- Searching for Date ---")
            date_match = re.search(r"(?:Date|Issued)[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\w+ \d{1,2},? \d{4})", text, re.I)
            if date_match:
                results["purchase_date"] = date_match.group(1)
                results["confidence_score"] += 0.2
                if debug: print(f"[OK] Date found: {results['purchase_date']}")

        # STEP 9: Calculate Unit Price if missing
        if results["total_cost"] > 0 and results["quantity"] > 0:
            results["unit_price"] = round(results["total_cost"] / results["quantity"], 2)
        
        if debug:
            print(f"\n{'='*80}")
            print(f"EXTRACTION RESULTS:")
            print(f"{'='*80}")
            print(f"Vendor Name: {results['vendor_name']}")
            print(f"Total Cost: {results['total_cost']}")
            print(f"Quantity: {results['quantity']}")
            print(f"Unit Price: {results['unit_price']}")
            print(f"Purchase Date: {results['purchase_date']}")
            print(f"Confidence Score: {results['confidence_score']:.2f}")
            print(f"{'='*80}\n")

    except Exception as e:
        error_msg = f"PDF Extraction Error: {str(e)}"
        print(error_msg)
        
        if debug:
            print(f"\n{'='*80}")
            print("FULL ERROR TRACEBACK:")
            print(f"{'='*80}")
            traceback.print_exc()
            print(f"{'='*80}\n")
        
        # In case of encrypted or malformed PDF, return defaults with 0 confidence
        results["error"] = str(e)
        
    return results

def extract_invoice_details(file_path: str) -> Dict[str, Any]:
    """
    Extract structured data from Invoice PDFs.
    Similar to PO extraction but focuses on payment confirmation.
    """
    # Simply reuse PO extractor as patterns are similar
    data = extract_po_details(file_path)
    # Customize if needed
    return data
