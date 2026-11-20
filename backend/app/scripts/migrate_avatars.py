"""Copy referenced Spaces avatars to Supabase, then update the destination DB.

Run from backend after restoring the database to Supabase. Dry-run by default;
pass --apply to copy. Originals are retained. Re-running skips migrated URLs.
"""

import argparse

from app.db.session import SessionLocal
from app.models.user import User
from app.services.avatar_service import AvatarService, get_storage_config, object_key_from_url


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    source = get_storage_config("digitalocean")
    destination = get_storage_config("supabase")
    source_client = AvatarService.get_client(source) if args.apply else None
    target_client = AvatarService.get_client(destination) if args.apply else None
    count = failures = 0
    with SessionLocal() as db:
        for user in db.query(User).filter(User.avatar_url.isnot(None)).all():
            key = object_key_from_url(user.avatar_url, source)
            if key is None:
                continue
            count += 1
            if not args.apply:
                print(f"Would migrate avatar for user #{user.id}")
                continue
            user_id = user.id
            try:
                response = source_client.get_object(Bucket=source.bucket, Key=key)
                with response["Body"] as body:
                    target_client.put_object(
                        Bucket=destination.bucket, Key=key, Body=body.read(),
                        ContentType=response.get("ContentType", "application/octet-stream"),
                    )
                user.avatar_url = f"{destination.public_url}/{key}"
                db.commit()
                print(f"Migrated avatar for user #{user_id}")
            except Exception:
                db.rollback()
                failures += 1
                print(f"Failed to migrate avatar for user #{user_id}; original URL retained")
    print(f"{'Processed' if args.apply else 'Found'} {count} avatars; {failures} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
