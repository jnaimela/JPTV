import requests
import sys
import json
from datetime import datetime

class JPTipsAPITester:
    def __init__(self, base_url="https://stake-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_result(self, test_name, success, status_code=None, error=None, response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - Status: {status_code}")
            self.results.append({"test": test_name, "status": "PASS", "status_code": status_code})
        else:
            print(f"❌ {test_name} - Error: {error}")
            self.results.append({"test": test_name, "status": "FAIL", "error": str(error)})
        
        if response_data and isinstance(response_data, dict) and len(str(response_data)) < 200:
            print(f"   Response: {response_data}")

    def test_user_registration(self):
        """Test user registration"""
        test_data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@test.com",
            "username": f"testuser_{datetime.now().strftime('%H%M%S')}",
            "password": "TestPassword123!"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=test_data, timeout=10)
            if response.status_code in [200, 201]:
                data = response.json()
                self.token = data.get("token")
                self.test_user_id = data.get("user", {}).get("id")
                self.log_result("User Registration", True, response.status_code, response_data={"token_received": bool(self.token)})
                return True
            else:
                self.log_result("User Registration", False, error=f"Status {response.status_code}: {response.text[:100]}")
                return False
        except Exception as e:
            self.log_result("User Registration", False, error=str(e))
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        # Try with a test account first
        test_data = {
            "email": "admin@test.com",
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=test_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token")
                self.log_result("User Login", True, response.status_code)
                return True
            else:
                self.log_result("User Login", False, error=f"Status {response.status_code}: {response.text[:100]}")
                return False
        except Exception as e:
            self.log_result("User Login", False, error=str(e))
            return False

    def test_seed_data(self):
        """Test data seeding"""
        try:
            response = requests.post(f"{self.api_url}/seed-data", timeout=15)
            if response.status_code == 200:
                data = response.json()
                self.log_result("Seed Data", True, response.status_code, response_data={"matches_created": data.get("matches", 0)})
                return True
            else:
                self.log_result("Seed Data", False, error=f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Seed Data", False, error=str(e))
            return False

    def test_get_matches(self):
        """Test getting matches"""
        try:
            # Test all matches
            response = requests.get(f"{self.api_url}/matches", timeout=10)
            if response.status_code == 200:
                matches = response.json()
                self.log_result("Get All Matches", True, response.status_code, response_data={"count": len(matches)})
                
                # Test football matches specifically
                response = requests.get(f"{self.api_url}/matches?sport=Football", timeout=10)
                if response.status_code == 200:
                    football_matches = response.json()
                    self.log_result("Get Football Matches", True, response.status_code, response_data={"count": len(football_matches)})
                    return len(matches) > 0
                else:
                    self.log_result("Get Football Matches", False, error=f"Status {response.status_code}")
                    return False
            else:
                self.log_result("Get All Matches", False, error=f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get All Matches", False, error=str(e))
            return False

    def test_get_match_by_id(self, match_id=None):
        """Test getting specific match"""
        if not match_id:
            # Get first match ID
            try:
                response = requests.get(f"{self.api_url}/matches", timeout=10)
                if response.status_code == 200:
                    matches = response.json()
                    if matches:
                        match_id = matches[0]["id"]
                    else:
                        self.log_result("Get Match by ID", False, error="No matches available")
                        return False
                else:
                    self.log_result("Get Match by ID", False, error="Could not get matches list")
                    return False
            except Exception as e:
                self.log_result("Get Match by ID", False, error=f"Error getting matches: {str(e)}")
                return False

        try:
            response = requests.get(f"{self.api_url}/matches/{match_id}", timeout=10)
            if response.status_code == 200:
                match = response.json()
                self.log_result("Get Match by ID", True, response.status_code, response_data={"match": f"{match.get('home_team')} vs {match.get('away_team')}"})
                return match_id
            else:
                self.log_result("Get Match by ID", False, error=f"Status {response.status_code}")
                return None
        except Exception as e:
            self.log_result("Get Match by ID", False, error=str(e))
            return None

    def test_generate_analysis(self, match_id):
        """Test generating analysis for a match"""
        try:
            response = requests.post(f"{self.api_url}/analyses/generate?match_id={match_id}", timeout=30)
            if response.status_code == 200:
                analysis = response.json()
                self.log_result("Generate Analysis", True, response.status_code, 
                              response_data={"prediction": analysis.get("prediction"), "confidence": f"{(analysis.get('confidence', 0) * 100):.0f}%"})
                return True
            else:
                self.log_result("Generate Analysis", False, error=f"Status {response.status_code}: {response.text[:100]}")
                return False
        except Exception as e:
            self.log_result("Generate Analysis", False, error=str(e))
            return False

    def test_get_analysis_preview(self, match_id):
        """Test getting analysis preview (without auth)"""
        try:
            response = requests.get(f"{self.api_url}/analyses/{match_id}", timeout=10)
            if response.status_code == 200:
                analysis = response.json()
                is_locked = analysis.get("locked", False)
                self.log_result("Get Analysis Preview", True, response.status_code, 
                              response_data={"locked": is_locked, "has_preview": bool(analysis.get("preview"))})
                return True
            else:
                self.log_result("Get Analysis Preview", False, error=f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get Analysis Preview", False, error=str(e))
            return False

    def test_get_analysis_with_auth(self, match_id):
        """Test getting analysis with authentication"""
        if not self.token:
            self.log_result("Get Analysis with Auth", False, error="No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.api_url}/analyses/{match_id}", headers=headers, timeout=10)
            if response.status_code == 200:
                analysis = response.json()
                is_locked = analysis.get("locked", False)
                self.log_result("Get Analysis with Auth", True, response.status_code, 
                              response_data={"locked": is_locked})
                return True
            else:
                self.log_result("Get Analysis with Auth", False, error=f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get Analysis with Auth", False, error=str(e))
            return False

    def test_unlock_free_analysis(self, match_id):
        """Test unlocking analysis with free tier"""
        if not self.token:
            self.log_result("Unlock Free Analysis", False, error="No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/analyses/{match_id}/unlock", headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Unlock Free Analysis", True, response.status_code, response_data=result)
                return True
            elif response.status_code == 403:
                # This is expected if free analysis already used
                self.log_result("Unlock Free Analysis", True, response.status_code, response_data={"message": "Free analysis limit reached (expected)"})
                return True
            else:
                self.log_result("Unlock Free Analysis", False, error=f"Status {response.status_code}: {response.text[:100]}")
                return False
        except Exception as e:
            self.log_result("Unlock Free Analysis", False, error=str(e))
            return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log_result("Get User Profile", False, error="No authentication token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.api_url}/user/profile", headers=headers, timeout=10)
            if response.status_code == 200:
                profile = response.json()
                self.log_result("Get User Profile", True, response.status_code, 
                              response_data={"tier": profile.get("subscription_tier"), "free_used": profile.get("free_analyses_used")})
                return True
            else:
                self.log_result("Get User Profile", False, error=f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get User Profile", False, error=str(e))
            return False

    def test_create_checkout_session(self):
        """Test creating Stripe checkout session"""
        if not self.token:
            self.log_result("Create Checkout Session", False, error="No authentication token")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Origin": self.base_url
            }
            data = {"tier": "basic"}
            response = requests.post(f"{self.api_url}/payments/checkout", json=data, headers=headers, timeout=15)
            if response.status_code == 200:
                result = response.json()
                has_url = bool(result.get("url"))
                has_session_id = bool(result.get("session_id"))
                self.log_result("Create Checkout Session", True, response.status_code, 
                              response_data={"has_url": has_url, "has_session_id": has_session_id})
                return result.get("session_id")
            else:
                self.log_result("Create Checkout Session", False, error=f"Status {response.status_code}: {response.text[:100]}")
                return None
        except Exception as e:
            self.log_result("Create Checkout Session", False, error=str(e))
            return None

    def test_get_payment_status(self, session_id):
        """Test getting payment status"""
        if not self.token or not session_id:
            self.log_result("Get Payment Status", False, error="Missing token or session ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.api_url}/payments/status/{session_id}", headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                self.log_result("Get Payment Status", True, response.status_code, 
                              response_data={"payment_status": result.get("payment_status")})
                return True
            else:
                self.log_result("Get Payment Status", False, error=f"Status {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Get Payment Status", False, error=str(e))
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("🔍 Starting JPTips API Testing...")
        print(f"🌐 Base URL: {self.base_url}")
        print("-" * 50)
        
        # Test authentication
        if not self.test_user_registration():
            print("⚠️ Registration failed, trying existing login...")
            self.test_user_login()
        
        # Seed data
        self.test_seed_data()
        
        # Test matches
        if self.test_get_matches():
            match_id = self.test_get_match_by_id()
            
            if match_id:
                # Test analysis flow
                self.test_generate_analysis(match_id)
                self.test_get_analysis_preview(match_id)
                self.test_get_analysis_with_auth(match_id)
                self.test_unlock_free_analysis(match_id)
        
        # Test user profile
        self.test_get_user_profile()
        
        # Test payment flow
        session_id = self.test_create_checkout_session()
        if session_id:
            self.test_get_payment_status(session_id)
        
        # Print summary
        print("-" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed ({(self.tests_passed/self.tests_run*100):.1f}%)")
        
        return self.tests_passed, self.tests_run, self.results

def main():
    tester = JPTipsAPITester()
    passed, total, results = tester.run_all_tests()
    
    # Save detailed results
    detailed_results = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "passed": passed,
            "total": total,
            "success_rate": f"{passed/total*100:.1f}%"
        },
        "results": results
    }
    
    with open("/app/test_reports/backend_api_results.json", "w") as f:
        json.dump(detailed_results, f, indent=2)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())