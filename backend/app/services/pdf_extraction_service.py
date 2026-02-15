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
                print(f"✓ Date from metadata: {meta.creation_date}")
        
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
        text = re.sub(r'\n+', '\n', text)  # Remove multiple newlines
        text = re.sub(r' +', ' ', text)    # Remove multiple spaces
        
        if debug:
            print(f"\n--- Extracted Text (first 500 chars) ---")
            print(text[:500])
            print(f"... (total {len(text)} characters)")
        
        
        # STEP 4: Extract Total Cost (Highest priority)
        if debug:
            print(f"\n--- Searching for Total Cost ---")
        
        # Look for "Total: $1,234.56" or "Amount: 1234.56"
        total_patterns = [
            r"(?:Total|Grand Total|Amount Due|Net Amount|Final Amount|Order Total|Purchase Total)[\s:]*[\$€£₹¥]?\s*([\d,]+\.?\d{0,2})",
            r"(?:TOTAL|AMOUNT|SUBTOTAL)[\s:]*[\$€£₹¥]?\s*([\d,]+\.?\d{0,2})",
            r"[\$€£₹¥]\s*([\d,]+\.\d{2})"
        ]
        for pattern in total_patterns:
            match = re.search(pattern, text, re.I | re.MULTILINE)
            if match:
                try:
                    results["total_cost"] = float(match.group(1).replace(',', ''))
                    results["confidence_score"] += 0.4
                    if debug:
                        print(f"✓ Total cost found: {results['total_cost']} (pattern: {pattern[:50]}...)")
                    break
                except:
                    continue

        if debug:
            print(f"\n--- Searching for Product Details ---")
            
        product_patterns = [
            r"(?:Description|Item|Product|Service)[\s:]*[\n]?\s*([A-Za-z0-9\s\.,\-&]{5,100})",
            r"(?:PART NO|MODEL)[\s:]*([A-Za-z0-9\s\.\-]+)",
            r"([0-9]{1,2}\s*[xX]\s*[A-Za-z0-9\s\.,\-&]{5,50})" # e.g. "1 x HP Laptop"
        ]
        
        for pattern in product_patterns:
            match = re.search(pattern, text, re.I | re.MULTILINE)
            if match:
                cleaned = match.group(1).strip()
                if len(cleaned) > 5 and cleaned.lower() not in ['description', 'details', 'shipping']:
                     results["product_details"] = cleaned
                     results["confidence_score"] += 0.2
                     if debug:
                         print(f"✓ Product found: {cleaned}")
                     break

        # STEP 5: Extract Vendor Name with improved multi-line support
        if debug:
            print(f"\n--- Searching for Vendor Name ---")
        
        # Look for vendor in text content (if not found in metadata)
        if results["vendor_name"] == "Unknown Vendor":
            vendor_patterns = [
                # Multi-line pattern: "Vendor:" on one line, name on next
                r"(?:Vendor|Seller|Supplier)[\s:]*\n\s*([A-Za-z0-9\s\.,\-&]+?)(?:\n|$)",
                # Standard pattern: "Vendor: Name" on same line
                r"(?:Vendor|Seller|Supplier|From)[\s:]+([A-Za-z0-9\s\.,\-&]+?)(?:\n|$)",
                # "Sold By" pattern
                r"Sold By[\s:]+([A-Za-z0-9\s\.,\-&]+)",
                # "To:" pattern (buyer/seller inversion)
                r"To:[\s]+([A-Za-z0-9\s\.,\-&]+)"
            ]
            
            for i, pattern in enumerate(vendor_patterns):
                match = re.search(pattern, text, re.I | re.MULTILINE)
                if match:
                    cleaned = match.group(1).strip()
                    # Validation: Ignore generic labels captured by mistake
                    if len(cleaned) > 2 and cleaned.lower() not in ['details', 'name', 'address', 'signature', 'date', 'invoice']: 
                        results["vendor_name"] = cleaned
                        results["confidence_score"] += 0.3
                        if debug:
                            print(f"✓ Vendor found: {cleaned} (pattern #{i+1})")
                        break
                    elif debug:
                        print(f"  Pattern #{i+1} matched '{cleaned}' but rejected".encode('ascii', 'ignore').decode('ascii'))


        # STEP 6: Fallback cost extraction if primary patterns failed
        if results["total_cost"] == 0.0:
            if debug:
                print(f"\n--- Using Fallback: Largest Number Heuristic ---")
            
            # Find the largest number in the document that looks like currency
            all_numbers = re.findall(r"(?:[\$€£₹]|\b)([\d,]+\.\d{2})(\b|\s)", text)
            if not all_numbers:
                 # Try integers or looser floats
                 all_numbers = re.findall(r"\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)", text)
            
            if debug and all_numbers:
                print(f"  Found {len(all_numbers)} number candidates")
            
            max_val = 0.0
            for num_str in all_numbers:
                if isinstance(num_str, tuple): num_str = num_str[0]
                try:
                    val = float(num_str.replace(',', ''))
                    # Filter out likely years/phone numbers/IDs (heuristic constraints)
                    if 10.0 < val < 1000000.0 and val != 2026: 
                        if val > max_val:
                            max_val = val
                except:
                    continue
            
            if max_val > 0:
                results["total_cost"] = max_val
                results["confidence_score"] += 0.2  # Lower confidence
                if debug:
                    print(f"✓ Fallback cost found: {max_val} (low confidence)")
            elif debug:
                print(f"  No valid numbers found in fallback")
        
        # STEP 7: Extract Quantity
        if debug:
            print(f"\n--- Searching for Quantity ---")
        
        qty_match = re.search(r"(?:Qty|Quantity|Units)[\s:]*(\d+)", text, re.I)
        if qty_match:
            results["quantity"] = int(qty_match.group(1))
            results["confidence_score"] += 0.1
            if debug:
                print(f"✓ Quantity found: {results['quantity']}")

        # STEP 8: Extract Date (if not found in metadata)
        if not results["purchase_date"]:
            if debug:
                print(f"\n--- Searching for Date ---")
            
            date_match = re.search(r"(?:Date|Issued)[\s:]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\w+ \d{1,2},? \d{4})", text, re.I)
            if date_match:
                results["purchase_date"] = date_match.group(1)
                results["confidence_score"] += 0.2
                if debug:
                    print(f"✓ Date found: {results['purchase_date']}")

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
