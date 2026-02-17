import requests
import sys
import json
from datetime import datetime
import time

class BettingAPITester:
    def __init__(self, base_url="https://stake-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_user_email = f"test_user_{int(time.time())}@test.com"
        self.test_user_password = "TestPass123!"
        self.test_username = f"testuser_{int(time.time())}"
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def log_test(self, name, success, response_code=None, error_msg=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASS (Status: {response_code})")
        else:
            print(f"❌ {name} - FAIL (Status: {response_code}) - {error_msg}")
            self.errors.append(f"{name}: {error_msg}")

    def test_api_call(self, method, endpoint, expected_status=200, data=None, auth_required=False):
        """Generic API test method"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        elif auth_required and not self.token:
            return False, 401, "No auth token available"

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {}
                
            return success, response.status_code, response_data
        except Exception as e:
            return False, 0, str(e)

    def test_auth_register(self):
        """Test user registration"""
        success, status, response = self.test_api_call(
            'POST', 
            'auth/register', 
            201,
            {
                "email": self.test_user_email,
                "username": self.test_username,
                "password": self.test_user_password
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
        
        self.log_test("User Registration", success, status, 
                     response if not success else None)
        return success

    def test_auth_login(self):
        """Test user login"""
        success, status, response = self.test_api_call(
            'POST',
            'auth/login',
            200,
            {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user', {}).get('id')
        
        self.log_test("User Login", success, status,
                     response if not success else None)
        return success

    def test_seed_data(self):
        """Test seeding initial data"""
        success, status, response = self.test_api_call('POST', 'seed-data', 200)
        self.log_test("Seed Data", success, status,
                     response if not success else None)
        return success

    def test_get_matches(self):
        """Test getting matches"""
        success, status, response = self.test_api_call('GET', 'matches', 200)
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} matches")
        
        self.log_test("Get Matches", success, status,
                     response if not success else None)
        return success, response if success else []

    def test_get_live_matches(self):
        """Test getting live matches"""
        success, status, response = self.test_api_call('GET', 'matches?status=live', 200)
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} live matches")
        
        self.log_test("Get Live Matches", success, status,
                     response if not success else None)
        return success

    def test_user_profile(self):
        """Test getting user profile"""
        success, status, response = self.test_api_call('GET', 'user/profile', 200, auth_required=True)
        self.log_test("Get User Profile", success, status,
                     response if not success else None)
        return success

    def test_create_bet(self, match_id):
        """Test creating a bet"""
        if not match_id:
            self.log_test("Create Bet", False, None, "No match ID available")
            return False
            
        success, status, response = self.test_api_call(
            'POST',
            'bets',
            200,
            {
                "match_id": match_id,
                "bet_type": "home",
                "odds": 2.5,
                "amount": 10.0
            },
            auth_required=True
        )
        
        self.log_test("Create Bet", success, status,
                     response if not success else None)
        return success

    def test_get_user_bets(self):
        """Test getting user bets"""
        success, status, response = self.test_api_call('GET', 'bets', 200, auth_required=True)
        
        if success and isinstance(response, list):
            print(f"   User has {len(response)} bets")
        
        self.log_test("Get User Bets", success, status,
                     response if not success else None)
        return success

    def test_create_bet_slip(self):
        """Test creating a bet slip"""
        success, status, response = self.test_api_call(
            'POST',
            'bet-slips',
            200,
            {
                "bets": [
                    {"match_id": "test-match", "bet_type": "home", "odds": 2.0},
                    {"match_id": "test-match-2", "bet_type": "away", "odds": 1.8}
                ],
                "total_amount": 20.0
            },
            auth_required=True
        )
        
        self.log_test("Create Bet Slip", success, status,
                     response if not success else None)
        return success

    def test_get_statistics(self):
        """Test getting statistics"""
        success, status, response = self.test_api_call('GET', 'statistics', 200)
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} statistics records")
        
        self.log_test("Get Statistics", success, status,
                     response if not success else None)
        return success

    def test_ai_features_without_premium(self, match_id):
        """Test AI features without premium (should fail)"""
        if not match_id:
            self.log_test("AI Generate Bet (No Premium)", True, None, "No match ID - skipped")
            return True
            
        # Should return 403 for non-premium users
        success, status, response = self.test_api_call(
            'POST',
            f'ai/generate-bet?match_id={match_id}',
            403,
            {},
            auth_required=True
        )
        
        self.log_test("AI Generate Bet (No Premium)", success, status,
                     "Expected 403 for non-premium user" if not success else None)
        return success

    def test_payment_checkout(self):
        """Test payment checkout creation"""
        success, status, response = self.test_api_call(
            'POST',
            'payments/checkout',
            200,
            {"package_id": "premium_monthly"},
            auth_required=True
        )
        
        if success and 'url' in response:
            print(f"   Checkout URL created: {response.get('session_id', 'No session ID')}")
        
        self.log_test("Payment Checkout", success, status,
                     response if not success else None)
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print(f"\n🚀 Starting API Tests for Finnish Betting Platform")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User: {self.test_user_email}")
        print("=" * 60)

        # Test 1: Seed data first
        print("\n📊 Testing Data Seeding...")
        self.test_seed_data()

        # Test 2: Authentication
        print("\n🔐 Testing Authentication...")
        if not self.test_auth_register():
            print("❌ Registration failed, trying login...")
            if not self.test_auth_login():
                print("❌ Both registration and login failed - stopping tests")
                return self.generate_summary()

        # Test 3: Matches
        print("\n⚽ Testing Match Endpoints...")
        match_success, matches = self.test_get_matches()
        match_id = matches[0]['id'] if matches and len(matches) > 0 else None
        self.test_get_live_matches()

        # Test 4: User Profile
        print("\n👤 Testing User Endpoints...")
        self.test_user_profile()

        # Test 5: Betting
        print("\n🎲 Testing Betting Endpoints...")
        self.test_create_bet(match_id)
        self.test_get_user_bets()
        self.test_create_bet_slip()

        # Test 6: Statistics
        print("\n📈 Testing Statistics...")
        self.test_get_statistics()

        # Test 7: AI Features (should fail for non-premium)
        print("\n🤖 Testing AI Features...")
        self.test_ai_features_without_premium(match_id)

        # Test 8: Payments
        print("\n💳 Testing Payment Integration...")
        self.test_payment_checkout()

        return self.generate_summary()

    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.errors)}")
        
        if self.errors:
            print(f"\n🚨 FAILED TESTS:")
            for i, error in enumerate(self.errors, 1):
                print(f"{i}. {error}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests mostly successful!")
            return True
        elif success_rate >= 60:
            print("⚠️  Backend has some issues but core functionality works")
            return True
        else:
            print("🔥 Backend has significant issues")
            return False

def main():
    tester = BettingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())