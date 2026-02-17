#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class JPTipsAPITester:
    def __init__(self, base_url="https://stake-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.admin_user = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=15)

            print(f"   Status: {response.status_code}")
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin user login with specific credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "j.niemelanjml@gmail.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_user = response.get('user', {})
            print(f"   Admin user details: is_admin={self.admin_user.get('is_admin')}, tier={self.admin_user.get('subscription_tier')}")
            return True
        return False

    def test_live_scores_endpoint(self):
        """Test live scores API endpoint"""
        success, response = self.run_test(
            "Live Scores API",
            "GET",
            "live-scores",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            # Check first live score structure
            score = response[0]
            required_fields = ['id', 'home_team', 'away_team', 'home_score', 'away_score', 'status', 'league']
            missing_fields = [field for field in required_fields if field not in score]
            if missing_fields:
                print(f"   ⚠️  Missing fields in live score: {missing_fields}")
                return False
            print(f"   ✅ Live scores format valid. Found {len(response)} live matches")
            return True
        return False

    def test_news_endpoint(self):
        """Test news feed API endpoint"""
        success, response = self.run_test(
            "News Feed API",
            "GET",
            "news",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            # Check first news item structure
            news = response[0]
            required_fields = ['id', 'title', 'summary', 'source', 'published_at', 'category']
            missing_fields = [field for field in required_fields if field not in news]
            if missing_fields:
                print(f"   ⚠️  Missing fields in news item: {missing_fields}")
                return False
            print(f"   ✅ News format valid. Found {len(response)} news items")
            return True
        return False

    def test_matches_with_odds(self):
        """Test matches endpoint returns odds data"""
        success, response = self.run_test(
            "Matches with Live Odds",
            "GET",
            "matches",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            match = response[0]
            odds_fields = ['home_odds', 'away_odds', 'last_odds_update']
            missing_odds = [field for field in odds_fields if field not in match or match[field] is None]
            if missing_odds:
                print(f"   ⚠️  Missing odds fields: {missing_odds}")
                return False
            print(f"   ✅ Found match with odds: {match['home_team']} vs {match['away_team']} - Odds: {match['home_odds']}/{match.get('draw_odds', 'N/A')}/{match['away_odds']}")
            return True, response[0]['id']  # Return match ID for odds update test
        return False, None

    def test_odds_update(self, match_id):
        """Test live odds update endpoint"""
        if not match_id:
            return False
            
        success, response = self.run_test(
            "Live Odds Update",
            "POST",
            f"matches/{match_id}/update-odds",
            200
        )
        if success and 'home_odds' in response and 'away_odds' in response:
            print(f"   ✅ Odds updated: {response['home_odds']}/{response.get('draw_odds', 'N/A')}/{response['away_odds']}")
            print(f"   Last update: {response.get('last_odds_update')}")
            return True
        return False

    def test_admin_analysis_access(self):
        """Test admin user can access any analysis without payment"""
        if not self.admin_token:
            print("   ❌ No admin token available")
            return False

        # First get matches to find one with analysis
        matches_success, matches = self.run_test(
            "Get Matches for Analysis Test",
            "GET", 
            "matches",
            200
        )
        
        if not matches_success or not matches:
            return False
            
        match_id = matches[0]['id']
        
        # Generate analysis for the match
        gen_success, _ = self.run_test(
            "Generate Analysis",
            "POST",
            f"analyses/generate?match_id={match_id}",
            200
        )
        
        if not gen_success:
            print("   ⚠️  Analysis generation failed, trying existing analysis")
        
        # Try to get analysis as admin
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        success, response = self.run_test(
            "Admin Analysis Access",
            "GET",
            f"analyses/{match_id}",
            200,
            headers=headers
        )
        
        if success and response:
            is_locked = response.get('locked', True)
            has_full_analysis = response.get('full_analysis') is not None
            has_stats = response.get('stats_analysis') is not None
            
            if not is_locked and has_full_analysis and has_stats:
                print(f"   ✅ Admin has unlimited access to analysis")
                return True
            else:
                print(f"   ❌ Admin access issue - locked: {is_locked}, full_analysis: {has_full_analysis}, stats: {has_stats}")
                return False
        return False

    def test_seed_data(self):
        """Test seed data endpoint creates admin user and data"""
        success, response = self.run_test(
            "Seed Data",
            "POST",
            "seed-data",
            200
        )
        if success:
            print(f"   ✅ Seed data: {response.get('message', 'completed')}")
            return True
        return False

def main():
    print("🚀 Starting JPTips API Testing - New Features Focus")
    print("=" * 60)
    
    tester = JPTipsAPITester()
    
    # Test all new features
    tester.test_seed_data()
    
    # Test admin login first
    if not tester.test_admin_login():
        print("\n❌ Admin login failed - stopping admin tests")
    else:
        print(f"\n✅ Admin login successful! User: {tester.admin_user.get('email')}")
    
    # Test live features
    tester.test_live_scores_endpoint()
    tester.test_news_endpoint()
    
    # Test odds system
    odds_success, match_id = tester.test_matches_with_odds()
    if odds_success:
        tester.test_odds_update(match_id)
    
    # Test admin privileges
    if tester.admin_token:
        tester.test_admin_analysis_access()

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())