from flask import Blueprint, render_template, request, redirect, url_for, flash
from app.extensions import db
from app.models.correction import CorrectionRule
from app.models.supplier import Supplier

corrections_bp = Blueprint("corrections", __name__)


@corrections_bp.route("/")
def list_rules():
    rules = CorrectionRule.query.filter_by(is_active=True).order_by(CorrectionRule.created_at.desc()).all()
    return render_template("corrections/list.html", rules=rules)


@corrections_bp.route("/new", methods=["GET", "POST"])
def create_rule():
    if request.method == "POST":
        rule = CorrectionRule(
            match_field=request.form["match_field"],
            match_value=request.form["match_value"].strip(),
            supplier_id=request.form.get("supplier_id", type=int) or None,
            action=request.form["action"],
            target_field=request.form["target_field"],
            target_value=request.form.get("target_value", "").strip(),
            reason=request.form.get("reason", "").strip() or None,
        )
        db.session.add(rule)
        db.session.commit()
        flash("Correction rule created. It will auto-apply on future imports.", "success")
        return redirect(url_for("corrections.list_rules"))

    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return render_template("corrections/form.html", rule=None, suppliers=suppliers, is_new=True)


@corrections_bp.route("/<int:rule_id>/edit", methods=["GET", "POST"])
def edit_rule(rule_id):
    rule = db.session.get(CorrectionRule, rule_id) or CorrectionRule.query.get_or_404(rule_id)

    if request.method == "POST":
        rule.match_field = request.form["match_field"]
        rule.match_value = request.form["match_value"].strip()
        rule.supplier_id = request.form.get("supplier_id", type=int) or None
        rule.action = request.form["action"]
        rule.target_field = request.form["target_field"]
        rule.target_value = request.form.get("target_value", "").strip()
        rule.reason = request.form.get("reason", "").strip() or None
        db.session.commit()
        flash("Correction rule updated.", "success")
        return redirect(url_for("corrections.list_rules"))

    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.name).all()
    return render_template("corrections/form.html", rule=rule, suppliers=suppliers, is_new=False)


@corrections_bp.route("/<int:rule_id>/delete", methods=["POST"])
def delete_rule(rule_id):
    rule = db.session.get(CorrectionRule, rule_id) or CorrectionRule.query.get_or_404(rule_id)
    rule.is_active = False
    db.session.commit()
    flash("Correction rule deactivated.", "warning")
    return redirect(url_for("corrections.list_rules"))
