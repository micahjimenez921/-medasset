"""
python manage.py create_admin

Creates the FIRST administrator. It only works while there are no users at all
(the database enforces this). The password is typed here (hidden), checked
against the password policy and stored only as a salted hash.
Every other account is then created from the Users page by that administrator.
"""
from getpass import getpass

from django.core.management.base import BaseCommand, CommandError
from django.db import DatabaseError

from api import passwords
from api.db import call_proc


class Command(BaseCommand):
    help = "Create the first MedAsset administrator."

    def handle(self, *args, **options):
        self.stdout.write("Create the first MedAsset administrator\n")
        username = input("Username (e.g. jdelacruz): ").strip().lower()
        full_name = input("Full name: ").strip()
        email = input("Email (optional): ").strip()
        password = getpass("Password (min 10 chars, upper+lower+number): ")
        problem = passwords.policy_error(password, username)
        if problem:
            raise CommandError(problem)
        if getpass("Repeat password: ") != password:
            raise CommandError("Passwords do not match.")
        try:
            call_proc(None, "sp_bootstrap_admin", [username, full_name, email, passwords.hash_password(password)])
        except Exception as error:  # business rule messages come through as API errors
            raise CommandError(getattr(error, "detail", None) or str(error))
        self.stdout.write(self.style.SUCCESS(f"Administrator '{username}' created. You can sign in now."))
