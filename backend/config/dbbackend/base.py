from django.db.backends.mysql import base


class DatabaseWrapper(base.DatabaseWrapper):
    """
    Same as Django's MySQL backend, but skips the minimum-version check.
    XAMPP ships MariaDB 10.4; we only run raw stored-procedure calls,
    which work the same on that version.
    """

    def check_database_version_supported(self):
        pass