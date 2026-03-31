from flask import Flask
from config import Config
from app.extensions import db, migrate


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Enable WAL mode for SQLite (better concurrent access)
    with app.app_context():
        from sqlalchemy import event

        @event.listens_for(db.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    # Register blueprints
    from app.routes.main import main_bp
    from app.routes.parts import parts_bp
    from app.routes.suppliers import suppliers_bp
    from app.routes.prices import prices_bp
    from app.routes.imports import imports_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(parts_bp, url_prefix="/parts")
    app.register_blueprint(suppliers_bp, url_prefix="/suppliers")
    app.register_blueprint(prices_bp, url_prefix="/prices")
    app.register_blueprint(imports_bp, url_prefix="/import")

    # Create tables if they don't exist
    with app.app_context():
        from app import models  # noqa: F401

        db.create_all()

    return app
