"""Seed the database with sample electrical wholesale data for demonstration."""
import random
from datetime import datetime, timezone, timedelta
from app import create_app
from app.extensions import db
from app.models.part import Part, PartCategory
from app.models.supplier import Supplier, SupplierPart
from app.models.price import PriceHistory
from app.services.audit_service import log_change

app = create_app()


def seed():
    with app.app_context():
        # Check if already seeded
        if Part.query.first():
            print("Database already has data. Skipping seed.")
            return

        print("Seeding database with sample electrical wholesale data...")

        # Categories
        categories = {}
        for name in [
            "Cable", "Switchgear", "Lighting", "Conduit & Trunking",
            "Data & Comms", "Safety Switches", "Power Points & Switches",
            "Circuit Breakers", "Connectors & Terminals", "Tools & Accessories",
        ]:
            cat = PartCategory(name=name)
            db.session.add(cat)
            categories[name] = cat
        db.session.flush()

        # Suppliers
        suppliers_data = [
            ("Clipsal by Schneider Electric", "CLIP", "orders@clipsal.com.au", "1300 369 233"),
            ("NHP Electrical Engineering", "NHP", "sales@nhp.com.au", "1300 647 647"),
            ("MM Electrical Merchandising", "MMEM", "orders@mmem.com.au", "07 3000 5000"),
            ("Lapp Australia", "LAPP", "sales@lappaustralia.com.au", "1800 931 559"),
            ("Philips Lighting", "PHIL", "trade@philips.com.au", "1300 304 404"),
            ("Legrand Australia", "LEGR", "orders@legrand.com.au", "1300 369 233"),
            ("ABB Australia", "ABB", "sales@au.abb.com", "1800 222 435"),
        ]

        suppliers = {}
        for name, code, email, phone in suppliers_data:
            s = Supplier(name=name, code=code, contact_email=email, contact_phone=phone)
            db.session.add(s)
            suppliers[code] = s
        db.session.flush()

        # Parts with supplier cross-references
        parts_data = [
            # (internal_pn, description, category, sell_price, supplier_mappings)
            # supplier_mapping: (supplier_code, supplier_pn, cost_price)
            ("ELC-TPS-251", "TPS 2.5mm 2C+E Cable 100m", "Cable", 189.00, [
                ("CLIP", "CLP-TPS25100", 142.50), ("MMEM", "MM-TPS2.5-100", 145.00), ("LAPP", "LP-TPS2C25", 140.00),
            ]),
            ("ELC-TPS-401", "TPS 4.0mm 2C+E Cable 100m", "Cable", 265.00, [
                ("CLIP", "CLP-TPS40100", 198.00), ("MMEM", "MM-TPS4.0-100", 201.50),
            ]),
            ("ELC-TPS-601", "TPS 6.0mm 2C+E Cable 100m", "Cable", 385.00, [
                ("CLIP", "CLP-TPS60100", 289.00), ("LAPP", "LP-TPS2C60", 285.50),
            ]),
            ("ELC-SDI-251", "SDI 2.5mm Black Cable 100m", "Cable", 52.00, [
                ("CLIP", "CLP-SDI25BK", 38.50), ("MMEM", "MM-SDI2.5BK", 39.00),
            ]),
            ("ELC-CAT6-305", "Cat6 UTP Cable 305m Box Blue", "Data & Comms", 245.00, [
                ("MMEM", "MM-CAT6-305BLU", 185.00), ("LAPP", "LP-C6UTP305B", 182.00),
            ]),
            ("ELC-RJ45-100", "RJ45 Cat6 Connectors 100pk", "Data & Comms", 45.00, [
                ("MMEM", "MM-RJ45C6-100", 32.00),
            ]),
            ("ELC-CB-120", "Circuit Breaker 1P 20A 6kA", "Circuit Breakers", 18.50, [
                ("CLIP", "CLP-CB120-6K", 12.80), ("NHP", "NHP-MCB1P20A", 13.20), ("ABB", "ABB-S201M-C20", 12.50),
            ]),
            ("ELC-CB-132", "Circuit Breaker 1P 32A 6kA", "Circuit Breakers", 19.50, [
                ("CLIP", "CLP-CB132-6K", 13.50), ("NHP", "NHP-MCB1P32A", 14.00), ("ABB", "ABB-S201M-C32", 13.20),
            ]),
            ("ELC-CB-220", "Circuit Breaker 2P 20A 6kA", "Circuit Breakers", 42.00, [
                ("CLIP", "CLP-CB220-6K", 29.80), ("ABB", "ABB-S202M-C20", 28.50),
            ]),
            ("ELC-RCD-230", "RCD 2P 30mA 25A", "Safety Switches", 89.00, [
                ("CLIP", "CLP-RCD230-25", 62.00), ("NHP", "NHP-RCD2P30MA", 64.50), ("ABB", "ABB-F202AC-25", 60.00),
            ]),
            ("ELC-RCD-430", "RCD 4P 30mA 40A", "Safety Switches", 145.00, [
                ("NHP", "NHP-RCD4P30MA40", 102.00), ("ABB", "ABB-F204AC-40", 98.50),
            ]),
            ("ELC-GPO-10", "Single Power Point 10A", "Power Points & Switches", 6.50, [
                ("CLIP", "CLP-2015", 4.20), ("LEGR", "LG-GPO-10S", 4.50),
            ]),
            ("ELC-GPO-10D", "Double Power Point 10A", "Power Points & Switches", 8.90, [
                ("CLIP", "CLP-2025", 5.80), ("LEGR", "LG-GPO-10D", 6.10),
            ]),
            ("ELC-SW-1G", "Light Switch 1 Gang", "Power Points & Switches", 5.20, [
                ("CLIP", "CLP-30-1G", 3.40), ("LEGR", "LG-SW1G", 3.60),
            ]),
            ("ELC-SW-2G", "Light Switch 2 Gang", "Power Points & Switches", 7.80, [
                ("CLIP", "CLP-30-2G", 5.10), ("LEGR", "LG-SW2G", 5.40),
            ]),
            ("ELC-LED-14W", "LED Downlight 14W 3000K", "Lighting", 22.00, [
                ("PHIL", "PH-DN130B-14W", 15.50), ("CLIP", "CLP-LED14W30K", 16.20),
            ]),
            ("ELC-LED-BAT", "LED Batten 40W 1200mm", "Lighting", 38.00, [
                ("PHIL", "PH-BN120C-40W", 26.00), ("CLIP", "CLP-BAT40-1200", 27.50),
            ]),
            ("ELC-FLOOD-30", "LED Floodlight 30W IP65", "Lighting", 65.00, [
                ("PHIL", "PH-BVP150-30", 45.00),
            ]),
            ("ELC-COND-20", "Conduit 20mm Medium Duty 4m", "Conduit & Trunking", 4.80, [
                ("CLIP", "CLP-MD20-4M", 3.20), ("LEGR", "LG-COND20MD", 3.40),
            ]),
            ("ELC-COND-25", "Conduit 25mm Medium Duty 4m", "Conduit & Trunking", 6.50, [
                ("CLIP", "CLP-MD25-4M", 4.30), ("LEGR", "LG-COND25MD", 4.60),
            ]),
            ("ELC-CONT-3P", "Contactor 3P 25A 240V Coil", "Switchgear", 85.00, [
                ("NHP", "NHP-CL25-310", 58.00), ("ABB", "ABB-AF26-30", 55.50),
            ]),
            ("ELC-ISO-3P", "Isolator Switch 3P 40A", "Switchgear", 42.00, [
                ("NHP", "NHP-ISO3P40A", 28.50), ("ABB", "ABB-OT40F3", 27.00),
            ]),
            ("ELC-TERM-6", "Terminal Connector 6mm 100pk", "Connectors & Terminals", 18.00, [
                ("MMEM", "MM-TERM6-100", 12.00),
            ]),
            ("ELC-GLAND-20", "Cable Gland 20mm IP68 10pk", "Connectors & Terminals", 12.50, [
                ("MMEM", "MM-GLAND20-10", 8.50), ("LEGR", "LG-CG20-10PK", 8.80),
            ]),
            ("ELC-LABEL-KIT", "Label Maker Tape Kit", "Tools & Accessories", 35.00, [
                ("MMEM", "MM-LBL-KIT01", 24.00),
            ]),
        ]

        now = datetime.now(timezone.utc)

        for internal_pn, desc, cat_name, sell_price, supplier_maps in parts_data:
            part = Part(
                internal_part_number=internal_pn,
                description=desc,
                category=categories[cat_name],
                current_sell_price=sell_price,
                unit_of_measure="each" if "100" not in desc and "305" not in desc else "roll" if "Cable" in desc else "each",
            )
            db.session.add(part)
            db.session.flush()

            log_change("part", part.id, "create", source="seed")

            for i, (sup_code, sup_pn, cost) in enumerate(supplier_maps):
                sp = SupplierPart(
                    part=part,
                    supplier=suppliers[sup_code],
                    supplier_part_number=sup_pn,
                    supplier_description=desc,
                    supplier_price=cost,
                    is_preferred=(i == 0),
                    last_price_check=now - timedelta(days=random.randint(1, 60)),
                )
                db.session.add(sp)
                db.session.flush()

                # Create some price history (simulate past increases)
                base_price = cost * random.uniform(0.80, 0.92)
                mid_price = cost * random.uniform(0.90, 0.98)

                for j, (old_p, new_p, days_ago) in enumerate([
                    (base_price, mid_price, random.randint(180, 365)),
                    (mid_price, cost, random.randint(7, 90)),
                ]):
                    change_amt = round(new_p - old_p, 4)
                    change_pct = round((change_amt / old_p) * 100, 2) if old_p > 0 else 0

                    ph = PriceHistory(
                        supplier_part=sp,
                        old_price=round(old_p, 2),
                        new_price=round(new_p, 2),
                        change_amount=round(change_amt, 2),
                        change_percent=change_pct,
                        source="csv_import",
                        recorded_at=now - timedelta(days=days_ago),
                    )
                    db.session.add(ph)

        db.session.commit()
        print(f"Seeded {Part.query.count()} parts, {Supplier.query.count()} suppliers, "
              f"{SupplierPart.query.count()} supplier mappings, {PriceHistory.query.count()} price records.")


if __name__ == "__main__":
    seed()
