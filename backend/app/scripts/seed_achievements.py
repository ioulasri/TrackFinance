from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.models.achievement import Achievement
from app.data.initial_achievements import INITIAL_ACHIEVEMENTS

def seed_achievements():
    db = SessionLocal()
    try:
        existing = db.query(Achievement).count()
        if existing > 0:
            print(f"Achievements already seeded ({existing} found). Skipping.")
            return

        for achievement_data in INITIAL_ACHIEVEMENTS:
            achievement = Achievement(**achievement_data)
            db.add(achievement)
        
        db.commit()
        print(f"Successfully seeded {len(INITIAL_ACHIEVEMENTS)} achievements!")
    
    except Exception as e:
        db.rollback()
        print(f"Error seeding achievements: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_achievements()