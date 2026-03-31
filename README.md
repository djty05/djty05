- 👋 Hi, I'm @djty05
- 👀 I'm interested in merch...
- 🌱 I'm currently learning everything...
- 💞️ I'm looking to collaborate on any solana projects :)...
- 📫 How to reach me TWITTER : tickle_me_Ty ...

<!---
djty05/djty05 is a ✨ special ✨ repository because its `README.md` (this file) appears on your GitHub profile.
You can click the Preview link to take a look at your changes.
--->

---

# Simpro Parts Catalogue Manager

A web-based catalogue management tool for electrical wholesalers. Tracks parts across multiple suppliers, monitors price changes, and highlights the biggest price increases so you stay on top of rising costs.

## Features

- **Parts Catalogue** - Manage internal part numbers with descriptions, categories, sell prices
- **Supplier Cross-References** - Map multiple supplier part numbers to each internal part (Clipsal, NHP, MM Electrical, etc.)
- **Price Tracking** - Automatic detection of price changes when importing updated price lists
- **Price Reports** - Dashboard showing biggest price increases by percentage and dollar amount (7/30/90/365 day views)
- **CSV Import with Validation** - Upload Simpro exports or supplier price lists with column mapping, duplicate detection (fuzzy matching), and review before commit
- **CSV Export** - Download your full catalogue with all supplier mappings
- **Audit Trail** - Every change is logged for accuracy and accountability
- **Search** - Fuzzy search across internal part numbers, descriptions, and supplier part numbers

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app (creates database automatically)
python run.py

# Optional: Load sample electrical wholesale data
python seed_data.py
```

Then open http://localhost:5000

## Import Workflow

1. Go to **Import/Export > Import CSV**
2. Select import type (Internal Catalogue or Supplier Price List)
3. Upload your CSV file
4. Map CSV columns to the correct fields
5. Review: see new parts, updates, price changes, and potential duplicates
6. Commit the import - all changes logged in audit trail

## Tech Stack

- Python / Flask
- SQLite (via SQLAlchemy)
- Bootstrap 5 + Chart.js
- rapidfuzz for fuzzy part number matching
