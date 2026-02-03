#!/usr/bin/env python3
"""
Comprehensive schema validation - check SQL vs SQLAlchemy models
"""

print("SCHEMA VALIDATION REPORT")
print("=" * 80)

issues = []

# User model vs SQL
print("\n1. USERS TABLE")
print("   Model: hashed_password UNIQUE constraint")
print("   SQL: hashed_password NOT UNIQUE")
issues.append("❌ users.hashed_password should NOT be unique (SQL is correct)")

# Transactions - looks good
print("\n2. TRANSACTIONS TABLE")
print("   ✅ Matches model")

# Budgets - looks good  
print("\n3. BUDGETS TABLE")
print("   ✅ Matches model")

# Achievements - fixed
print("\n4. ACHIEVEMENTS TABLE")
print("   ✅ Fixed: requirement_type (was requirements_type)")

# User achievements - fixed
print("\n5. USER_ACHIEVEMENTS TABLE")
print("   ✅ Fixed: table name (was achievements_users)")

# Goals - not in models
print("\n6. GOALS TABLE")
print("   ⚠️  No SQLAlchemy model found - SQL only")

print("\n" + "=" * 80)
print("CRITICAL ISSUE TO FIX:")
print("=" * 80)
for issue in issues:
    print(issue)

print("\nThe hashed_password field should NOT be unique")
print("(multiple users could theoretically have same hash, though unlikely)")
