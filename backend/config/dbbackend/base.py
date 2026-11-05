"""
MySQL backend that skips Django's version check.
XAMPP ships MariaDB 10.4, but Django 5.2+ insists on MariaDB 10.11+.
Everything MedAsset needs (stored procedures, triggers, events) works on 10.4.
"""
from django.db.backends.mysql import base


class DatabaseWrapper(base.DatabaseWrapper):
    def check_database_version_supported(self):
        pass
